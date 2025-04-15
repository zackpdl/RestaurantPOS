import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrderStatus } from './utils/orderStore';

export default function SelectTableScreen() {
  const router = useRouter();
  const totalTables = 50;
  const [occupiedTables, setOccupiedTables] = useState<number[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  useEffect(() => {
    loadOccupiedTables();
    loadActiveOrders();
  }, []);

  const loadActiveOrders = async () => {
    try {
      const orders = await AsyncStorage.getItem('orders');
      if (orders) {
        const parsedOrders = JSON.parse(orders);
        const activeOrders = parsedOrders.filter((order: any) => !order.isPaid);
        setActiveOrders(activeOrders);
      }
    } catch (error) {
      console.error('Error loading active orders:', error);
    }
  };

  const handleTableSelect = (tableNumber: number) => {
    if (occupiedTables.includes(tableNumber)) {
      alert('This table is currently occupied');
      return;
    }

    const hasActiveOrder = activeOrders.some(
      (order) => order.tableNumber === tableNumber.toString() && !order.isPaid
    );

    if (hasActiveOrder) {
      alert('This table already has an active order');
      return;
    }

    router.push(`/order/dine-in/${tableNumber}`);
  };

  const loadOccupiedTables = async () => {
    const status = await getOrderStatus();
    const occupied = status
      .filter((s: any) => s.type === 'dine-in' && s.isOccupied)
      .map((s: any) => s.number);
    setOccupiedTables(occupied);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/')}>
          <Text style={styles.backButtonText}>← Back to Main Menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Table</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.tableGrid}>
        {[...Array(totalTables)].map((_, index) => {
          const tableNumber = index + 1;
          const isOccupied = occupiedTables.includes(tableNumber);
          
          return (
            <TouchableOpacity
              key={tableNumber}
              style={[
                styles.tableButton,
                isOccupied && styles.tableButtonOccupied
              ]}
              onPress={() => handleTableSelect(tableNumber)}
              disabled={isOccupied}>
              <Text style={[
                styles.tableButtonText,
                isOccupied && styles.tableButtonTextOccupied
              ]}>
                Table {tableNumber}
              </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 10,
    zIndex: 1,
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 20,
  },
  tableButton: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  tableButtonOccupied: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  tableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tableButtonTextOccupied: {
    color: '#ccc',
  },
});