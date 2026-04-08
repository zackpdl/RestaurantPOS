import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import {
  clearOrders,
  closeOrderById,
  deleteOrderById,
  fetchOrders,
  subscribeToOrders,
} from '../lib/pos/orderUtils';
import { printReceipt } from '../lib/pos/printer';
import { loadSelectedRestaurant, loadSession } from '../lib/pos/storage';
import { RESTAURANTS } from '../lib/pos/menuData';
import { setOrderStatus } from '../lib/pos/orderStore';


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
  isClosed?: boolean;
  closedAt?: string | null;
}


export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [role, setRole] = useState<'admin' | 'staff' | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>(RESTAURANTS[0]);

  useEffect(() => {
    const init = async () => {
      const session = await loadSession();
      if (!session) {
        Alert.alert('Session expired', 'Please login again.');
        router.replace('/');
        return;
      }
      setRole(session.role);
      const stored = await loadSelectedRestaurant();
      if (stored) {
        setSelectedRestaurant(stored);
      }
      await loadOrders(stored ?? selectedRestaurant);
    };

    init();
  }, [router, selectedRestaurant]);

  useEffect(() => {
    const unsubscribe = subscribeToOrders(() => {
      loadOrders(selectedRestaurant);
    });

    return unsubscribe;
  }, [selectedRestaurant]);

  const loadOrders = async (restaurant?: string) => {
    try {
      const data = await fetchOrders(restaurant);
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    }
  };

  const deleteOrder = async (orderId: string) => {
    Alert.alert('Delete Order', 'Are you sure you want to delete this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteOrderById(orderId);
            await loadOrders();
            Alert.alert('Success', 'Order deleted successfully');
          } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', 'Failed to delete order');
          }
        },
      },
    ]);
  };

  const clearAllData = async () => {
    try {
      await clearOrders();
      setOrders([]);
      Alert.alert('Success', 'All data has been cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  const printOrder = async (order: Order) => {
    try {
      await printReceipt({
        restaurant: 'Restaurant POS',
        tableLabel: order.type === 'dine-in' ? `Table ${order.tableNumber}` : 'Takeaway',
        headerLine: `Date: ${order.timestamp}`,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: order.total,
        taxEnabled: false,
        tax: 0,
        total: order.total,
      });
    } catch (error) {
      console.error('Error printing order:', error);
      alert('Error printing order');
    }
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

  const handleCloseOrder = async (orderId: string) => {
    try {
      const order = orders.find((item) => item.id === orderId);
      await closeOrderById(orderId);
      if (order?.type && order.tableNumber) {
        const tableNumber = Number(order.tableNumber);
        if (!Number.isNaN(tableNumber)) {
          await setOrderStatus(order.type, tableNumber, false);
        }
      }
      await loadOrders(selectedRestaurant);
    } catch (error) {
      console.error('Close order error:', error);
      Alert.alert('Error', 'Failed to close order');
    }
  };

  const openOrders = useMemo(
    () => orders.filter((order) => !order.isClosed),
    [orders]
  );
  const closedOrders = useMemo(
    () => orders.filter((order) => order.isClosed),
    [orders]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Text style={styles.backButtonText}>← Back to Main Menu</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Orders</Text>
          {role === 'admin' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={clearAllData}>
              <Text style={styles.actionButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.restaurantList}>
        {RESTAURANTS.map((restaurant) => (
          <TouchableOpacity
            key={restaurant}
            style={[
              styles.restaurantButton,
              selectedRestaurant === restaurant && styles.restaurantButtonActive,
            ]}
            onPress={() => {
              setSelectedRestaurant(restaurant);
              loadOrders(restaurant);
            }}>
            <Text style={styles.restaurantButtonText}>{restaurant}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.ordersList}>
        <Text style={styles.sectionTitle}>Live Orders</Text>
        {openOrders.length === 0 && (
          <Text style={styles.emptyText}>No open orders.</Text>
        )}
        {openOrders.map((order) => (
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
                  style={[styles.actionButton, styles.closeButton]}
                  onPress={() => handleCloseOrder(order.id)}>
                  <Text style={styles.actionButtonText}>Close</Text>
                </TouchableOpacity>
                {role === 'admin' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteOrder(order.id)}>
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Order History</Text>
        {closedOrders.length === 0 && (
          <Text style={styles.emptyText}>No closed orders.</Text>
        )}
        {closedOrders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderType}>
                {order.type === 'dine-in' ? `Table ${order.tableNumber}` : 'Takeaway'}
              </Text>
              <Text style={styles.orderTime}>{order.closedAt ?? order.timestamp}</Text>
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
                  style={[styles.actionButton, styles.printButton]}
                  onPress={() => printOrder(order)}>
                  <Text style={styles.actionButtonText}>Print</Text>
                </TouchableOpacity>
                {role === 'admin' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteOrder(order.id)}>
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
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
  restaurantList: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  restaurantButton: {
    backgroundColor: '#1e1e1e',
    paddingVertical: 8,
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
  sectionTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    marginBottom: 16,
  },
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
  closeButton: { backgroundColor: '#4CAF50' },
  deleteButton: { backgroundColor: '#F44336' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
