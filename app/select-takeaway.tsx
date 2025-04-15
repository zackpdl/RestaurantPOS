import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrderStatus } from './utils/orderStore';

export default function SelectTakeawayScreen() {
  const router = useRouter();
  const totalOrders = 50;
  const [occupiedOrders, setOccupiedOrders] = useState<number[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  useEffect(() => {
    loadOccupiedOrders();
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

  const handleOrderSelect = (orderNumber: number) => {
    if (occupiedOrders.includes(orderNumber)) {
      alert('This order number is currently in use');
      return;
    }

    const hasActiveOrder = activeOrders.some(
      (order) => order.orderNumber === orderNumber.toString() && !order.isPaid
    );

    if (hasActiveOrder) {
      alert('This order number already has an active order');
      return;
    }

    router.push(`/order/takeaway/${orderNumber}`);
  };

  const loadOccupiedOrders = async () => {
    const status = await getOrderStatus();
    const occupied = status
      .filter((s: any) => s.type === 'takeaway' && s.isOccupied)
      .map((s: any) => s.number);
    setOccupiedOrders(occupied);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/')}>
          <Text style={styles.backButtonText}>← Back to Main Menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Takeaway Number</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.orderGrid}>
        {[...Array(totalOrders)].map((_, index) => {
          const orderNumber = index + 1;
          const isOccupied = occupiedOrders.includes(orderNumber);
          
          return (
            <TouchableOpacity
              key={orderNumber}
              style={[
                styles.orderButton,
                isOccupied && styles.orderButtonOccupied
              ]}
              onPress={() => handleOrderSelect(orderNumber)}
              disabled={isOccupied}>
              <Text style={[
                styles.orderButtonText,
                isOccupied && styles.orderButtonTextOccupied
              ]}>
                Order {orderNumber}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  orderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 20,
  },
  orderButton: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  orderButtonOccupied: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderButtonTextOccupied: {
    color: '#ccc',
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
});