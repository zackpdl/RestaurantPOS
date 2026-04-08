import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Bill, fetchBills, subscribeToBills } from '../lib/pos/bills';
import { clearActiveBillId, clearCart, loadSelectedRestaurant, saveActiveBillId, saveCart } from '../lib/pos/storage';

const TOTAL_TABLES = 50;

export default function TablesScreen() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<string | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const selected = await loadSelectedRestaurant();
      if (!selected) {
        Alert.alert('Missing restaurant', 'Please select a restaurant.');
        router.replace('/restaurant-select');
        return;
      }
      setRestaurant(selected);
      const list = await fetchBills(selected, { includeClosed: false });
      setBills(list);
      setLoading(false);
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!restaurant) return;
    const unsubscribe = subscribeToBills(async () => {
      const list = await fetchBills(restaurant, { includeClosed: false });
      setBills(list);
    });

    return unsubscribe;
  }, [restaurant]);

  const latestByTable = useMemo(() => {
    const map = new Map<number, Bill>();
    for (const bill of bills) {
      if (!map.has(bill.table_number)) {
        map.set(bill.table_number, bill);
      }
    }
    return map;
  }, [bills]);

  const handleTablePress = async (tableNumber: number) => {
    if (!restaurant) return;

    const existing = latestByTable.get(tableNumber);
    if (existing) {
      await saveCart(restaurant, tableNumber, {
        items: existing.items,
        taxEnabled: existing.tax_enabled,
      });
      await saveActiveBillId(restaurant, tableNumber, existing.id);
    } else {
      await clearCart(restaurant, tableNumber);
      await clearActiveBillId(restaurant, tableNumber);
    }

    router.push({ pathname: '/menu/[table]', params: { table: String(tableNumber) } });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/restaurant-select')}>
          <Text style={styles.backText}>← Restaurants</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{restaurant} Tables</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => router.push('/bill-history')}>
              <Text style={styles.historyText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => router.push('/menu-management')}>
              <Text style={styles.menuText}>Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.tableGrid}>
        {[...Array(TOTAL_TABLES)].map((_, index) => {
          const tableNumber = index + 1;
          const hasBill = latestByTable.has(tableNumber);
          return (
            <TouchableOpacity
              key={tableNumber}
              style={[styles.tableButton, hasBill && styles.tableButtonActive]}
              onPress={() => handleTablePress(tableNumber)}>
              <Text style={styles.tableText}>Table {tableNumber}</Text>
              {hasBill && <Text style={styles.tableHint}>Open Bill</Text>}
            </TouchableOpacity>
          );
        })}
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
  header: {
    gap: 8,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  historyButton: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  historyText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  menuButton: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  menuText: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  tableButton: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  tableButtonActive: {
    borderColor: '#4CAF50',
  },
  tableText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableHint: {
    color: '#4CAF50',
    fontSize: 10,
    marginTop: 4,
  },
});
