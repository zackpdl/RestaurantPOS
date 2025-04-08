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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const savedOrders = await AsyncStorage.getItem('orders');
      if (savedOrders) {
        const parsedOrders = JSON.parse(savedOrders);
        // Sort orders by timestamp, most recent first
        parsedOrders.sort((a: Order, b: Order) => b.timestamp - a.timestamp);
        setOrders(parsedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const viewOrder = (orderId: string) => {
    router.push(`/order-view/${orderId}`);
  };

  const clearAllOrders = async () => {
    try {
      await AsyncStorage.removeItem('orders');
      setOrders([]);
    } catch (error) {
      console.error('Error clearing orders:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Orders</Text>
        {orders.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAllOrders}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No orders found</Text>
          <TouchableOpacity
            style={styles.newOrderButton}
            onPress={() => router.push('/')}>
            <Text style={styles.buttonText}>Create New Order</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push('/')}>
        <Text style={styles.buttonText}>Back to Main Menu</Text>
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 18,
    textAlign: 'center',
  },
  newOrderButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});