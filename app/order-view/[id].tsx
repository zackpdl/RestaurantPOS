import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface Order {
  id: string;
  type: 'dine-in' | 'takeaway';
  tableNumber?: string;
  items: OrderItem[];
  total: number;
  timestamp: string;
}

export default function OrderViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrder();
  }, []);

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

  const printOrder = async () => {
    if (!order) return;

    const html = `
      <html>
        <body style="font-family: 'Helvetica'; padding: 20px;">
          <h1 style="text-align: center;">Restaurant Name</h1>
          <p style="text-align: center;">${order.type === 'dine-in' ? `Table ${order.tableNumber}` : 'Takeaway'}</p>
          <p style="text-align: center;">Date: ${order.timestamp}</p>
          <hr/>
          <table style="width: 100%;">
            <tr>
              <th style="text-align: left;">Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
            ${order.items
              .map(
                (item) => `
              <tr>
                <td>${item.name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">$${item.price.toFixed(2)}</td>
                <td style="text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
            <tr>
              <td colspan="3" style="text-align: right; font-weight: bold;">Total:</td>
              <td style="text-align: right; font-weight: bold;">$${order.total.toFixed(2)}</td>
            </tr>
          </table>
          <hr/>
          <p style="text-align: center;">Thank you for your visit!</p>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({
        html,
      });
    } catch (error) {
      console.error('Error printing order:', error);
      alert('Error printing order');
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
        <Text style={styles.title}>Order Details</Text>
        <TouchableOpacity style={styles.printButton} onPress={printOrder}>
          <Text style={styles.buttonText}>Print</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.orderType}>
          {order.type === 'dine-in' ? `Table ${order.tableNumber}` : 'Takeaway'}
        </Text>
        <Text style={styles.timestamp}>{order.timestamp}</Text>
      </View>

      <ScrollView style={styles.itemsList}>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.total}>Total: ${order.total.toFixed(2)}</Text>
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
  orderInfo: {
    marginBottom: 20,
  },
  orderType: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#888',
    marginTop: 4,
  },
  itemsList: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  itemQuantity: {
    color: '#888',
    fontSize: 16,
  },
  itemPrice: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
    marginTop: 16,
  },
  total: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  printButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});