import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
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

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      setOrders([]);
      Alert.alert('Success', 'All data has been cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear data');
    }
  };

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

  const printOrder = async (order: Order) => {
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
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Error printing order:', error);
      alert('Error printing order');
    }
  };

  const deleteOrder = async (orderId: string) => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Step 1: Get current orders
              const savedOrders = await AsyncStorage.getItem('orders');
              if (!savedOrders) return;

              const allOrders = JSON.parse(savedOrders);
              const orderToDelete = allOrders.find((o: Order) => o.id === orderId);
              if (!orderToDelete) return;

              // Update orders
              const updatedOrders = allOrders.filter((order: Order) => order.id !== orderId);
              await AsyncStorage.setItem('orders', JSON.stringify(updatedOrders));
              setOrders(updatedOrders);

              // Update order status for both types
              const orderStatusStr = await AsyncStorage.getItem('orderStatus');
              if (orderStatusStr) {
                const currentStatus = JSON.parse(orderStatusStr);
                const updatedStatus = currentStatus.map((s: any) => {
                  if (s.type === orderToDelete.type) {
                    if (orderToDelete.type === 'dine-in' && s.number?.toString() === orderToDelete.tableNumber) {
                      return { ...s, isOccupied: false };
                    }
                    if (orderToDelete.type === 'takeaway' && s.number?.toString() === orderToDelete.id) {
                      return { ...s, isOccupied: false };
                    }
                  }
                  return s;
                });
                await AsyncStorage.setItem('orderStatus', JSON.stringify(updatedStatus));
              }

              Alert.alert('Success', 'Order deleted successfully');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete order');
            }
          }
        }
      ]
    );
  };

  const editOrder = (order: Order) => {
    const path =
      order.type === 'dine-in'
        ? `/order/dine-in/${order.tableNumber}`
        : `/order/takeaway/${order.id}`;

    router.push({
      pathname: path,
      params: {
        orderId: order.id,
        isEditing: true,
        existingItems: JSON.stringify(order.items),
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Text style={styles.backButtonText}>← Back to Main Menu</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Orders History</Text>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={clearAllData}
          >
            <Text style={styles.actionButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.ordersList}>
        {orders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderType}>
                {order.type === 'dine-in' ? `Table ${order.tableNumber}` : 'Takeaway'}
              </Text>
              <Text style={styles.orderTime}>{order.timestamp}</Text>
            </View>
            <View style={styles.orderItems}>
              {order.items.map((item) => (
                <Text key={item.id} style={styles.orderItem}>
                  {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                </Text>
              ))}
            </View>
            <View style={styles.orderFooter}>
              <Text style={styles.orderTotal}>Total: ${order.total.toFixed(2)}</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => editOrder(order)}>
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.printButton]}
                  onPress={() => printOrder(order)}>
                  <Text style={styles.actionButtonText}>Print</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => {
                    console.log('Delete button pressed for order:', order.id);
                    deleteOrder(order.id);
                  }}>
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 40, // To account for the back button
  },
  backButton: { position: 'absolute', left: 0, padding: 10, zIndex: 1 },
  backButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  ordersList: { flex: 1 },
  orderCard: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderType: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  orderTime: { color: '#888', fontSize: 14 },
  orderItems: { marginBottom: 12 },
  orderItem: { color: '#fff', fontSize: 16, marginBottom: 4 },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 12,
  },
  orderTotal: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  printButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonGroup: { flexDirection: 'row', gap: 8 },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButton: { backgroundColor: '#FF9800' },
  deleteButton: { backgroundColor: '#F44336' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
