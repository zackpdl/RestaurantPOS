import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Bill, deleteAllBillsForRestaurant, deleteBill, fetchBills, subscribeToBills } from '../lib/pos/bills';
import { loadSession, saveSelectedRestaurant } from '../lib/pos/storage';
import { RESTAURANTS } from '../lib/pos/menuData';

export default function AdminScreen() {
  const router = useRouter();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>(RESTAURANTS[0]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteAll, setPendingDeleteAll] = useState(false);

  useEffect(() => {
    const init = async () => {
      const session = await loadSession();
      if (!session) {
        Alert.alert('Session expired', 'Please login again.');
        router.replace('/');
        return;
      }
      if (session.role !== 'admin') {
        Alert.alert('Not allowed', 'Admin access only.');
        router.replace('/restaurant-select');
        return;
      }
      await saveSelectedRestaurant(RESTAURANTS[0]);
      setLoading(false);
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!selectedRestaurant) return;
    const loadBills = async () => {
      const list = await fetchBills(selectedRestaurant);
      setBills(list);
    };

    loadBills();

    const unsubscribe = subscribeToBills(async () => {
      const list = await fetchBills(selectedRestaurant);
      setBills(list);
    });

    return unsubscribe;
  }, [selectedRestaurant]);

  const handleDelete = async (billId: string) => {
    console.log('Admin delete pressed:', billId);
    setPendingDeleteId(billId);
    setPendingDeleteAll(false);
    setPinInput('');
    setPinModalVisible(true);
  };

  const handleDeleteAll = async () => {
    if (bills.length === 0) {
      Alert.alert('No bills', 'There are no bills to delete.');
      return;
    }
    setPendingDeleteId(null);
    setPendingDeleteAll(true);
    setPinInput('');
    setPinModalVisible(true);
  };

  const confirmDelete = async () => {
    try {
      const session = await loadSession();
      if (!session || session.role !== 'admin') {
        Alert.alert('Not allowed', 'Admin access only.');
        return;
      }
      if (session.pin !== pinInput) {
        Alert.alert('Invalid PIN', 'Please try again.');
        return;
      }
      if (pendingDeleteAll) {
        await deleteAllBillsForRestaurant(selectedRestaurant);
      } else if (pendingDeleteId) {
        await deleteBill(pendingDeleteId);
      } else {
        return;
      }
      const list = await fetchBills(selectedRestaurant);
      setBills(list);
      setPinModalVisible(false);
      setPendingDeleteId(null);
      setPendingDeleteAll(false);
    } catch (error) {
      console.error('Delete bill error:', error);
      Alert.alert('Delete failed', 'Unable to delete this bill.');
    }
  };

  const restaurantButtons = useMemo(
    () =>
      RESTAURANTS.map((restaurant) => (
        <TouchableOpacity
          key={restaurant}
          style={[
            styles.restaurantButton,
            selectedRestaurant === restaurant && styles.restaurantButtonActive,
          ]}
          onPress={() => setSelectedRestaurant(restaurant)}>
          <Text style={styles.restaurantButtonText}>{restaurant}</Text>
        </TouchableOpacity>
      )),
    [selectedRestaurant]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/restaurant-select')}>
          <Text style={styles.backText}>← Restaurants</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
      </View>

      <View style={styles.restaurantList}>{restaurantButtons}</View>
      <View style={styles.adminActions}>
        <TouchableOpacity style={styles.deleteAllButton} onPress={handleDeleteAll}>
          <Text style={styles.deleteAllButtonText}>Delete All Bills</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {bills.length === 0 && (
          <Text style={styles.emptyText}>No bills yet.</Text>
        )}
        {bills.map((bill) => (
          <View key={bill.id} style={styles.billCard}>
            <View style={styles.billHeader}>
              <Text style={styles.billTitle}>Table {bill.table_number}</Text>
              <Text style={styles.billTotal}>{bill.total.toFixed(2)}</Text>
            </View>
            <Text style={styles.billMeta}>{new Date(bill.created_at).toLocaleString()}</Text>
            <Text style={styles.billMeta}>Items: {bill.items.length}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(bill.id)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {pinModalVisible && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pendingDeleteAll ? 'Delete All Bills' : 'Delete Bill'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Enter Admin PIN to continue.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="PIN"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  setPinModalVisible(false);
                  setPendingDeleteId(null);
                  setPendingDeleteAll(false);
                }}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirm]}
                onPress={confirmDelete}>
                <Text style={styles.modalButtonText}>
                  {pendingDeleteAll ? 'Delete All' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    gap: 6,
    marginBottom: 12,
  },
  backText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  restaurantList: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  adminActions: {
    marginBottom: 12,
  },
  deleteAllButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#B71C1C',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  deleteAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  restaurantButton: {
    backgroundColor: '#1e1e1e',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  restaurantButtonActive: {
    borderColor: '#4CAF50',
  },
  restaurantButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  emptyText: {
    color: '#888',
    marginTop: 12,
  },
  billCard: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  billTotal: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  billMeta: {
    color: '#aaa',
    marginBottom: 4,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#E53935',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: '#aaa',
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: '#121212',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 10,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modalCancel: {
    backgroundColor: '#757575',
  },
  modalConfirm: {
    backgroundColor: '#E53935',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
