import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Bill,
  fetchBills,
  getBillTableDisplay,
  normalizeBillTableLabel,
  subscribeToBills,
} from '../lib/pos/bills';
import { loadSelectedRestaurant, normalizeCustomTableLabel } from '../lib/pos/storage';

const TOTAL_TABLES = 50;

export default function TablesScreen() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<string | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [customLabelInput, setCustomLabelInput] = useState('');

  const refreshBills = useCallback(async () => {
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
  }, [router]);

  useEffect(() => {
    refreshBills();
  }, [refreshBills]);

  useFocusEffect(
    useCallback(() => {
        refreshBills();
        return undefined;
      },
      [refreshBills]
    )
  );

  useEffect(() => {
    if (!restaurant) return;
    const unsubscribe = subscribeToBills(async () => {
      const list = await fetchBills(restaurant, { includeClosed: false });
      setBills(list);
    });

    return unsubscribe;
  }, [restaurant]);

  const openBillsByTable = useMemo(() => {
    const map = new Map<number, Bill[]>();
    for (const bill of bills) {
      const existing = map.get(bill.table_number) ?? [];
      existing.push(bill);
      map.set(bill.table_number, existing);
    }
    return map;
  }, [bills]);

  const openBill = async (tableNumber: number, customLabel?: string | null) => {
    if (!restaurant) return;
    const normalizedLabel = normalizeCustomTableLabel(customLabel);

    router.push({
      pathname: '/menu/[table]',
      params: normalizedLabel
        ? { table: String(tableNumber), customLabel: normalizedLabel }
        : { table: String(tableNumber) },
    });
  };

  const openCustomModal = (tableNumber?: number) => {
    setSelectedTableNumber(tableNumber ?? null);
    setCustomLabelInput('');
    setCustomModalVisible(true);
  };

  const handleCreateCustomTable = async () => {
    const normalizedLabel = normalizeCustomTableLabel(customLabelInput);
    if (!selectedTableNumber || !normalizedLabel) {
      Alert.alert('Missing details', 'Choose a table and enter a custom label.');
      return;
    }

    setCustomModalVisible(false);
    await openBill(selectedTableNumber, normalizedLabel);
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
            <TouchableOpacity
              style={styles.customButton}
              onPress={() => openCustomModal()}>
              <Text style={styles.customButtonText}>Custom Table</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.tableScroll}
        contentContainerStyle={styles.tableGrid}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled>
        {[...Array(TOTAL_TABLES)].map((_, index) => {
          const tableNumber = index + 1;
          const tableBills = openBillsByTable.get(tableNumber) ?? [];
          const mainBill =
            tableBills.find((bill) => !normalizeBillTableLabel(bill.table_label)) ?? null;
          const customBills = tableBills.filter((bill) => normalizeBillTableLabel(bill.table_label));
          return (
            <View
              key={tableNumber}
              style={[styles.tableButton, tableBills.length > 0 && styles.tableButtonActive]}>
              <TouchableOpacity
                style={styles.tableMainArea}
                onPress={() => openBill(tableNumber)}>
                <Text style={styles.tableText}>Table {tableNumber}</Text>
                <Text style={styles.tableHint}>
                  {mainBill ? 'Main bill open' : 'Open main bill'}
                </Text>
                {customBills.length > 0 && (
                  <Text style={styles.customHint}>
                    {customBills.length} custom bill{customBills.length > 1 ? 's' : ''}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tableAction}
                onPress={() => openCustomModal(tableNumber)}>
                <Text style={styles.tableActionText}>+ Custom</Text>
              </TouchableOpacity>
              {customBills.length > 0 && (
                <View style={styles.customBillList}>
                  {customBills.map((bill) => (
                    <TouchableOpacity
                      key={bill.id}
                      style={styles.customBillChip}
                      onPress={() => openBill(tableNumber, bill.table_label)}>
                      <Text numberOfLines={1} style={styles.customBillChipText}>
                        {bill.table_label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Table Bill</Text>
            <Text style={styles.modalSubtitle}>
              Use a base table plus a label like Family 1 or Family 3.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={selectedTableNumber ? String(selectedTableNumber) : ''}
              onChangeText={(value) => setSelectedTableNumber(Number(value) || null)}
              placeholder="Table number"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.modalInput}
              value={customLabelInput}
              onChangeText={setCustomLabelInput}
              placeholder="Custom label"
              placeholderTextColor="#666"
            />
            {selectedTableNumber ? (
              <View style={styles.modalExistingSection}>
                <Text style={styles.modalExistingTitle}>Existing custom bills</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.modalExistingList}>
                    {(openBillsByTable.get(selectedTableNumber) ?? [])
                      .filter((bill) => normalizeBillTableLabel(bill.table_label))
                      .map((bill) => (
                        <TouchableOpacity
                          key={bill.id}
                          style={styles.modalExistingChip}
                          onPress={async () => {
                            setCustomModalVisible(false);
                            await openBill(selectedTableNumber, bill.table_label);
                          }}>
                          <Text style={styles.modalExistingChipText}>
                            {getBillTableDisplay(bill)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setCustomModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirm]}
                onPress={handleCreateCustomTable}>
                <Text style={styles.modalButtonText}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  customButton: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  customButtonText: {
    color: '#29B6F6',
    fontWeight: 'bold',
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  tableScroll: {
    flex: 1,
  },
  tableButton: {
    width: '22%',
    minHeight: 128,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 8,
    gap: 8,
  },
  tableButtonActive: {
    borderColor: '#4CAF50',
  },
  tableMainArea: {
    alignItems: 'center',
    gap: 4,
  },
  tableText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableHint: {
    color: '#4CAF50',
    fontSize: 10,
  },
  customHint: {
    color: '#29B6F6',
    fontSize: 10,
  },
  tableAction: {
    backgroundColor: '#263238',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tableActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customBillList: {
    gap: 6,
  },
  customBillChip: {
    backgroundColor: '#102027',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  customBillChipText: {
    color: '#B3E5FC',
    fontSize: 10,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    gap: 10,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#aaa',
  },
  modalInput: {
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalExistingSection: {
    gap: 8,
  },
  modalExistingTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalExistingList: {
    flexDirection: 'row',
    gap: 8,
  },
  modalExistingChip: {
    backgroundColor: '#102027',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalExistingChipText: {
    color: '#B3E5FC',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancel: {
    backgroundColor: '#424242',
  },
  modalConfirm: {
    backgroundColor: '#29B6F6',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
