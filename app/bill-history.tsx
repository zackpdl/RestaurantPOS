import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bill, deleteClosedBills, fetchBills } from '../lib/pos/bills';
import { loadSelectedRestaurant, loadSession } from '../lib/pos/storage';

export default function BillHistoryScreen() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'staff' | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    const init = async () => {
      const session = await loadSession();
      if (!session) {
        Alert.alert('Session expired', 'Please login again.');
        router.replace('/');
        return;
      }
      setRole(session.role);
      const selected = await loadSelectedRestaurant();
      if (!selected) {
        Alert.alert('Missing restaurant', 'Please select a restaurant.');
        router.replace('/restaurant-select');
        return;
      }
      setRestaurant(selected);
      const list = await fetchBills(selected, { includeClosed: true });
      console.log('History: fetched bills', list);
      setBills(list.filter((bill) => bill.is_closed));
    };

    init();
  }, [router]);

  const todayLabel = useMemo(() => new Date().toLocaleDateString(), []);

  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return bills.reduce((sum, bill) => {
      const date = new Date(bill.closed_at ?? bill.created_at).toDateString();
      if (date === today) return sum + bill.total;
      return sum;
    }, 0);
  }, [bills]);

  const totalAll = useMemo(() => {
    return bills.reduce((sum, bill) => sum + bill.total, 0);
  }, [bills]);

  const handleClearHistory = async () => {
    if (!restaurant) return;
    Alert.alert('Clear History', 'This will delete all closed bills.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteClosedBills(restaurant);
            setBills([]);
          } catch (error) {
            console.error('Clear history error:', error);
            Alert.alert('Error', 'Failed to clear history');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/tables')}>
          <Text style={styles.backText}>← Tables</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{restaurant ?? ''} History</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Today Total ({todayLabel})</Text>
        <Text style={styles.summaryValue}>{todayTotal.toFixed(2)}</Text>
        <Text style={styles.summaryLabel}>Total (All History)</Text>
        <Text style={styles.summaryValue}>{totalAll.toFixed(2)}</Text>
      </View>

      {role === 'admin' && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
          <Text style={styles.clearText}>Clear History</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.list}>
        {bills.length === 0 && <Text style={styles.emptyText}>No closed bills yet.</Text>}
        {bills.map((bill) => (
          <View key={bill.id} style={styles.billCard}>
            <View style={styles.billHeader}>
              <Text style={styles.billTitle}>Table {bill.table_number}</Text>
              <Text style={styles.billTotal}>{bill.total.toFixed(2)}</Text>
            </View>
            <Text style={styles.billMeta}>
              {new Date(bill.closed_at ?? bill.created_at).toLocaleString()}
            </Text>
            <Text style={styles.billMeta}>Items: {bill.items.length}</Text>
          </View>
        ))}
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
  summaryCard: {
    backgroundColor: '#1e1e1e',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#aaa',
    marginBottom: 4,
  },
  summaryValue: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#E53935',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  clearText: {
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
});
