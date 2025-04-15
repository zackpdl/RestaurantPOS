import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { saveOrder } from '../../utils/orderUtils';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'food' | 'cocktails' | 'indian';
}

interface OrderItem extends MenuItem {
  quantity: number;
}

export default function DineInOrderScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuItem['category'] | 'all'>('all');

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const savedItems = await AsyncStorage.getItem('menuItems');
      if (savedItems) {
        setMenuItems(JSON.parse(savedItems));
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const addItemBySearch = (item: MenuItem) => {
    const existingItem = orderItems.find((orderItem) => orderItem.id === item.id);
    if (existingItem) {
      setOrderItems(
        orderItems.map((orderItem) =>
          orderItem.id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        )
      );
    } else {
      setOrderItems([...orderItems, { ...item, quantity: 1 }]);
    }
    setSearchQuery('');
  };

  const removeItem = (itemId: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, change: number) => {
    setOrderItems(
      orderItems.map((item) => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter((item) => item.quantity > 0)
    );
  };

  const getTotal = () => {
    return orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = 
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories: (MenuItem['category'] | 'all')[] = ['all', 'drinks', 'food', 'cocktails', 'indian'];

  const printBill = async () => {
    const html = `
      <html>
        <body style="font-family: 'Helvetica'; padding: 20px;">
          <h1 style="text-align: center;">Restaurant Name</h1>
          <p style="text-align: center;">Table ${id}</p>
          <p style="text-align: center;">Date: ${new Date().toLocaleString()}</p>
          <hr/>
          <table style="width: 100%;">
            <tr>
              <th style="text-align: left;">Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
            ${orderItems
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
              <td style="text-align: right; font-weight: bold;">$${getTotal().toFixed(2)}</td>
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
      setOrderItems([]);
      router.back();
    } catch (error) {
      console.error('Error printing bill:', error);
      alert('Error printing bill');
    }
  };

  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      alert('Please add items to the order');
      return;
    }

    try {
      const order = await saveOrder({
        type: 'dine-in',
        tableNumber: id as string,
        items: orderItems,
        total: getTotal()
      });

      alert('Order saved successfully');
      setOrderItems([]);
      router.push('/orders');
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Failed to save order');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Table {id} Order</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search by ID or name..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category)}>
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category && styles.categoryButtonTextActive
            ]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.menuList}>
        {searchQuery && filteredItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => addItemBySearch(item)}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemId}>{item.id}</Text>
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.orderContainer}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <ScrollView style={styles.orderList}>
          {orderItems.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemTotal}>
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
        <Text style={{ color: '#4CAF50', fontSize: 20, fontWeight: 'bold' }}>Total: ${getTotal().toFixed(2)}</Text>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.saveButton, { opacity: orderItems.length > 0 ? 1 : 0.5 }]}
            onPress={handleSaveOrder}
            disabled={orderItems.length === 0}>
            <Text style={styles.buttonText}>Save Order</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.printButton, { opacity: orderItems.length > 0 ? 1 : 0.5 }]}
            onPress={printBill}
            disabled={orderItems.length === 0}>
            <Text style={styles.buttonText}>Print Bill</Text>
          </TouchableOpacity>
        </View>
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
  searchContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#333',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
  },
  categoryButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  menuList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemId: {
    color: '#888',
    fontSize: 14,
    marginRight: 8,
    minWidth: 40,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  itemPrice: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
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
  itemTotal: {
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
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  printButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});