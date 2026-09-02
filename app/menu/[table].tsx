import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  calculateTotals,
  createBill,
  getBillTableDisplay,
  updateBill,
  closeBillWithPayment,
  fetchLatestOpenBillForTable,
  BillItem,
} from '../../lib/pos/bills';
import { MenuItem } from '../../lib/pos/menuData';
import { loadMenu } from '../../lib/pos/menuStore';
import {
  loadSelectedRestaurant,
  normalizeCustomTableLabel,
} from '../../lib/pos/storage';
// `expo lint` sometimes fails to parse this TS module for `import/namespace` even though runtime/bundling is fine.
// eslint-disable-next-line import/namespace
import { printReceipt } from '../../lib/pos/printer';

export default function MenuScreen() {
  const router = useRouter();
  const { table, customLabel } = useLocalSearchParams();
  const tableValue = Array.isArray(table) ? table[0] : table;
  const customLabelValue = Array.isArray(customLabel) ? customLabel[0] : customLabel;
  const tableNumber = Number(tableValue);
  const normalizedCustomLabel = normalizeCustomTableLabel(customLabelValue);
  const tableTitle = normalizedCustomLabel
    ? `Table ${tableNumber} - ${normalizedCustomLabel}`
    : `Table ${tableNumber}`;

  const [restaurant, setRestaurant] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<BillItem[]>([]);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'scan' | 'card'>('cash');
  const [activeBillId, setActiveBillId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuItem['category']>('main');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    const init = async () => {
      const selected = await loadSelectedRestaurant();
      if (!selected) {
        Alert.alert('Missing restaurant', 'Please select a restaurant.');
        router.replace('/restaurant-select');
        return;
      }
      if (!Number.isFinite(tableNumber)) {
        Alert.alert('Invalid table', 'Please choose a valid table.');
        router.replace('/tables');
        return;
      }

      setRestaurant(selected);
      const menu = await loadMenu(selected);
      setMenuItems(menu);

      const latest = await fetchLatestOpenBillForTable(
        selected,
        tableNumber,
        normalizedCustomLabel
      );

      if (latest) {
        setCartItems(latest.items);
        setTaxEnabled(latest.tax_enabled);
        setPaymentMethod(latest.payment_method ?? 'cash');
        setActiveBillId(latest.id);
      } else {
        setCartItems([]);
        setTaxEnabled(false);
        setPaymentMethod('cash');
        setActiveBillId(null);
      }
    };

    init();
  }, [normalizedCustomLabel, router, tableNumber]);

  const groupedMenu = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const groups: Record<string, typeof menuItems> = {
      drinks: [],
      main: [],
      indian: [],
    };
    menuItems.forEach((item) => {
      if (query) {
        const matches =
          item.name.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query);
        if (!matches) return;
      }
      const key = item.category ?? 'main';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [menuItems, searchQuery]);

  const totals = useMemo(() => calculateTotals(cartItems, taxEnabled), [cartItems, taxEnabled]);

  const addItem = (item: BillItem) => {
    setCartItems((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id);
      if (!existing) {
        return [...prev, { ...item, quantity: 1 }];
      }
      return prev.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      );
    });
  };

  const addCustomItem = () => {
    const name = customName.trim();
    const price = Number(customPrice);
    if (!name || Number.isNaN(price) || price <= 0) {
      Alert.alert('Invalid item', 'Enter a name and a valid price.');
      return;
    }
    addItem({ id: `CUST-${Date.now()}`, name, price, quantity: 1 });
    setCustomName('');
    setCustomPrice('');
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== itemId) return item;
          const nextQty = item.quantity + delta;
          return { ...item, quantity: nextQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const persistBill = async (options?: { showSuccess?: boolean }) => {
    if (!restaurant) return;
    if (cartItems.length === 0) {
      if (options?.showSuccess) {
        Alert.alert('Empty cart', 'Add items before saving the bill.');
      }
      return;
    }

    setSaving(true);
    try {
      const payload = {
        restaurant,
        table_number: tableNumber,
        table_label: normalizedCustomLabel,
        items: cartItems,
        subtotal: totals.subtotal,
        tax_enabled: taxEnabled,
        tax: totals.tax,
        total: totals.total,
        payment_method: paymentMethod,
      };

      if (activeBillId) {
        await updateBill(activeBillId, payload);
      } else {
        const created = await createBill(payload);
        setActiveBillId(created.id);
      }

      if (options?.showSuccess) {
        Alert.alert('Saved', 'Bill updated successfully.');
      }
    } catch (error) {
      console.error('Save bill error:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      await persistBill({ showSuccess: true });
    } catch {
      Alert.alert('Network error', 'Unable to save bill right now. Try again later.');
    }
  };

  const handleBackToTables = async () => {
    try {
      await persistBill({ showSuccess: false });
      router.replace('/tables');
    } catch {
      Alert.alert('Network error', 'Unable to update the bill before leaving.');
    }
  };

  const handleClearLocal = async () => {
    setCartItems([]);
    setTaxEnabled(false);
    setPaymentMethod('cash');
    setActiveBillId(null);
  };

  const handleCloseBill = async () => {
    if (!restaurant) return;
    let billId = activeBillId;
    if (!billId) {
      try {
        const latest = await fetchLatestOpenBillForTable(
          restaurant,
          tableNumber,
          normalizedCustomLabel
        );
        console.log('CloseBill: latest open bill', latest);
        billId = latest?.id ?? null;
      } catch (error) {
        console.error('Close bill lookup error:', error);
        Alert.alert('Close failed', 'Unable to find the open bill right now.');
        return;
      }
    }

    console.log('CloseBill: activeBillId', activeBillId, 'resolved billId', billId);
    if (!billId) {
      Alert.alert('No open bill', 'Nothing to close for this table.');
      return;
    }

    const closeWith = async (method: 'cash' | 'scan' | 'card') => {
      try {
        const closed = await closeBillWithPayment(billId!, method);
        console.log('CloseBill: closed bill', closed);
        try {
          const paymentLabel = method === 'cash' ? 'Cash' : method === 'scan' ? 'Scan' : 'Card';
          await printReceipt({
            restaurant,
            tableLabel:
              getBillTableDisplay({
                table_number: tableNumber,
                table_label: normalizedCustomLabel,
              }),
            dateLabel: new Date(closed.closed_at ?? closed.created_at).toLocaleString(),
            paymentLabel,
            items: cartItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            subtotal: totals.subtotal,
            taxEnabled,
            tax: totals.tax,
            total: totals.total,
          });
        } catch (error) {
          console.error('CloseBill: print error:', error);
        }
        await handleClearLocal();
        router.replace('/tables');
      } catch (error) {
        console.error('Close bill error:', error);
        Alert.alert('Close failed', 'Unable to close bill right now.');
      }
    };

    await closeWith(paymentMethod);
  };

  if (!restaurant) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToTables} disabled={saving}>
          <Text style={styles.backText}>← Tables</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{restaurant} • {tableTitle}</Text>
      </View>

      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu</Text>
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Custom item name"
              placeholderTextColor="#666"
              value={customName}
              onChangeText={setCustomName}
            />
            <TextInput
              style={styles.customInput}
              placeholder="Price"
              placeholderTextColor="#666"
              value={customPrice}
              onChangeText={setCustomPrice}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.customAdd} onPress={addCustomItem}>
              <Text style={styles.customAddText}>Add</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID or name"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.tabContainer}>
            {(['drinks', 'main', 'indian'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.tabButton, selectedCategory === cat && styles.tabButtonActive]}
                onPress={() => setSelectedCategory(cat)}>
                <Text style={[styles.tabText, selectedCategory === cat && styles.tabTextActive]}>
                  {cat === 'main' ? 'Main' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.menuListScroll}
            contentContainerStyle={styles.menuList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled>
            <View style={styles.categoryBlock}>
              {groupedMenu[selectedCategory]
                .sort((a, b) => {
                  const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
                  const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
                  if (numA !== numB) return numA - numB;
                  return a.id.localeCompare(b.id, undefined, { numeric: true });
                })
                .map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItem}
                    onPress={() => addItem({ ...item, quantity: 1 })}>
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuId}>{item.id}</Text>
                    <Text style={styles.menuName}>{item.name}</Text>
                  </View>
                  <Text style={styles.menuPrice}>{item.price.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
              {groupedMenu[selectedCategory].length === 0 && (
                <Text style={styles.emptyText}>No items found in this category.</Text>
              )}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cart</Text>
          <ScrollView
            style={styles.cartList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled>
            {cartItems.length === 0 && (
              <Text style={styles.emptyText}>No items yet.</Text>
            )}
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>
                    {item.id} {item.name}
                  </Text>
                  <Text style={styles.cartItemPrice}>
                    {item.price.toFixed(2)} x {item.quantity}
                  </Text>
                </View>
                <View style={styles.cartActions}>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() => updateQuantity(item.id, -1)}>
                    <Text style={styles.qtyText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() => updateQuantity(item.id, 1)}>
                    <Text style={styles.qtyText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.paymentRow}>
            {(['cash', 'scan', 'card'] as const).map((method) => {
              const active = paymentMethod === method;
              const label = method === 'cash' ? 'Cash' : method === 'scan' ? 'Scan' : 'Card';
              return (
                <TouchableOpacity
                  key={method}
                  style={[styles.paymentChip, active && styles.paymentChipActive]}
                  onPress={() => setPaymentMethod(method)}>
                  <Text style={[styles.paymentText, active && styles.paymentTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.toggleButton, taxEnabled && styles.toggleButtonActive]}
            onPress={() => setTaxEnabled((prev) => !prev)}>
            <Text style={styles.toggleText}>
              {taxEnabled ? 'Tax: Enabled (7%)' : 'Tax: Disabled'}
            </Text>
          </TouchableOpacity>

          <View style={styles.totals}>
            <Text style={styles.totalRow}>Subtotal: {totals.subtotal.toFixed(2)}</Text>
            {taxEnabled && (
              <Text style={styles.totalRow}>Tax: {totals.tax.toFixed(2)}</Text>
            )}
            <Text style={styles.totalMain}>Total: {totals.total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.actionButton, saving && styles.actionButtonDisabled]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={styles.actionText}>{activeBillId ? 'Update Bill' : 'Create Bill'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.closeButton]} onPress={handleCloseBill}>
            <Text style={styles.actionText}>Close Bill</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    paddingBottom: 24,
  },
  header: {
    gap: 6,
    marginBottom: 12,
  },
  backText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    padding: 10,
  },
  customAdd: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  customAddText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    padding: 10,
    marginBottom: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  tabText: {
    color: '#aaa',
    fontWeight: 'bold',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#fff',
  },
  menuList: {
    gap: 10,
  },
  menuListScroll: {
    maxHeight: 220,
  },
  categoryBlock: {
    gap: 8,
    marginBottom: 8,
  },
  categoryTitle: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuItem: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#333',
  },
  menuInfo: {
    flex: 1,
    marginRight: 12,
  },
  menuId: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  menuName: {
    color: '#fff',
    fontSize: 15,
  },
  menuPrice: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  cartList: {
    maxHeight: 220,
  },
  emptyText: {
    color: '#888',
    paddingVertical: 8,
  },
  cartItem: {
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  cartItemName: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cartItemPrice: {
    color: '#aaa',
    marginTop: 4,
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    backgroundColor: '#333',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  qtyValue: {
    color: '#fff',
    minWidth: 18,
    textAlign: 'center',
  },
  toggleButton: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleButtonActive: {
    borderColor: '#4CAF50',
  },
  toggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentChip: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  paymentChipActive: {
    borderColor: '#4CAF50',
  },
  paymentText: {
    color: '#aaa',
    fontWeight: 'bold',
  },
  paymentTextActive: {
    color: '#fff',
  },
  totals: {
    marginTop: 10,
    gap: 4,
  },
  totalRow: {
    color: '#ccc',
  },
  totalMain: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  closeButton: {
    backgroundColor: '#E53935',
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
