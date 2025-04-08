import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface OrderItem extends MenuItem {
  quantity: number;
}

const MENU_ITEMS: MenuItem[] = [
  { id: '1', name: 'Burger', price: 12.99 },
  { id: '2', name: 'Pizza', price: 15.99 },
  { id: '3', name: 'Pasta', price: 13.99 },
  { id: '4', name: 'Steak', price: 24.99 },
  { id: '5', name: 'Fries', price: 4.99 },
  { id: '6', name: 'Soda', price: 2.99 },
];

export default function OrderScreen() {
  const { type, id } = useLocalSearchParams();
  const router = useRouter();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const addItem = (menuItem: MenuItem) => {
    setOrderItems((current) => {
      const existingItem = current.find((item) => item.id === menuItem.id);
      if (existingItem) {
        return current.map((item) =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { ...menuItem, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, change: number) => {
    setOrderItems((current) =>
      current
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + change) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const getTotal = () => {
    return orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const saveOrder = async () => {
    try {
      const orderId = Date.now().toString();
      const newOrder = {
        id: orderId,
        type: type === 'dine-in' ? 'dine-in' : 'takeaway',
        number: parseInt(id as string),
        items: orderItems,
        total: getTotal(),
        timestamp: Date.now(),
      };

      const savedOrders = await AsyncStorage.getItem('orders');
      const orders = savedOrders ? JSON.parse(savedOrders) : [];
      orders.push(newOrder);
      await AsyncStorage.setItem('orders', JSON.stringify(orders));

      router.push(`/order-view/${orderId}`);
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Order for {type === 'dine-in' ? `Table ${id}` : `Takeaway #${id}`}
      </Text>

      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Menu</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => addItem(item)}>
              <Text style={styles.menuItemName}>{item.name}</Text>
              <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.orderContainer}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <ScrollView style={styles.orderList}>
          {orderItems.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, -1)}>
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, 1)}>
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Text style={styles.total}>Total: ${getTotal().toFixed(2)}</Text>
        <TouchableOpacity
          style={[styles.saveButton, { opacity: orderItems.length > 0 ? 1 : 0.5 }]}
          onPress={saveOrder}
          disabled={orderItems.length === 0}>
          <Text style={styles.saveButtonText}>Save Order & View</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  menuContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  menuItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  menuItemPrice: {
    color: '#4CAF50',
    fontSize: 14,
  },
  orderContainer: {
    flex: 1,
  },
  orderList: {
    flex: 1,
  },
  orderItem: {
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemPrice: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantity: {
    color: '#fff',
    fontSize: 16,
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
    gap: 16,
  },
  total: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});