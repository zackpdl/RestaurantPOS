import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function OrderViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const savedOrders = await AsyncStorage.getItem('orders');
      if (savedOrders) {
        const orders = JSON.parse(savedOrders);
        const foundOrder = orders.find((o: Order) => o.id === id);
        if (foundOrder) {
          setOrder(foundOrder);
        }
      }
    } catch (error) {
      console.error('Error loading order:', error);
    }
  };

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Order not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Summary</Text>
        <Text style={styles.subtitle}>
          {order.type === 'dine-in' ? `Table ${order.number}` : `Takeaway #${order.number}`}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(order.timestamp).toLocaleString()}
        </Text>
      </View>

      <ScrollView style={styles.itemsList}>
        {order.items.map((item, index) => (
          <View key={index} style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>${order.total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/')}>
          <Text style={styles.backButtonText}>Back to Main Page</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#4CAF50',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#888',
  },
  itemsList: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#888',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
    gap: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  backButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});