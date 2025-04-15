import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  type: 'dine-in' | 'takeaway';
  number: number;
  items: OrderItem[];
  total: number;
  timestamp: number;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const savedOrders = await AsyncStorage.getItem('orders');
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const viewOrder = (orderId: string) => {
    router.push(`/order-view/${orderId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All Orders</Text>
      <ScrollView style={styles.ordersList}>
        {orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => viewOrder(order.id)}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderType}>
                {order.type === 'dine-in' ? `Table ${order.number}` : `Takeaway #${order.number}`}
              </Text>
              <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
            </View>
            <Text style={styles.orderTime}>{formatDate(order.timestamp)}</Text>
            <View style={styles.itemsList}>
              {order.items.map((item, index) => (
                <Text key={index} style={styles.itemText}>
                  {item.name} x {item.quantity}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  ordersList: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderTotal: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  orderTime: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  itemText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
});