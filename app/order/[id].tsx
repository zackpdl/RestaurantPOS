import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface OrderItem extends MenuItem {
  quantity: number;
}

export default function OrderScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [itemNumber, setItemNumber] = useState('');

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

  const addItemByNumber = () => {
    const item = menuItems.find((item) => item.id === itemNumber);
    if (item) {
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
      setItemNumber('');
    } else {
      alert('Item not found');
    }
  };

  const removeItem = (itemId: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId));
  };

  const getTotal = () => {
    return orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const printBill = async () => {
    const orderType = id === 'takeaway' ? 'Takeaway' : `Table ${id}`;
    const html = `
      <html>
        <body style="font-family: 'Helvetica'; padding: 20px;">
          <h1 style="text-align: center;">Restaurant Name</h1>
          <p style="text-align: center;">${orderType}</p>
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
                <td style="text-align: right;">$${(item.price * item.quantity).toFixed(
                  2
                )}</td>
              </tr>
            `
              )
              .join('')}
            <tr>
              <td colspan="3" style="text-align: right; font-weight: bold;">Total:</td>
              <td style="text-align: right; font-weight: bold;">$${getTotal().toFixed(
                2
              )}</td>
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
      // Clear order after printing
      setOrderItems([]);
      router.back();
    } catch (error) {
      console.error('Error printing bill:', error);
      alert('Error printing bill');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {id === 'takeaway' ? 'Takeaway Order' : `Table ${id} Order`}
      </Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter item number"
          placeholderTextColor="#666"
          value={itemNumber}
          onChangeText={setItemNumber}
          keyboardType="numeric"
          onSubmitEditing={addItemByNumber}
        />
        <TouchableOpacity style={styles.addButton} onPress={addItemByNumber}>
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.orderList}>
        {orderItems.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>
                ${item.price.toFixed(2)} x {item.quantity}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeItem(item.id)}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total: ${getTotal().toFixed(2)}</Text>
        <TouchableOpacity
          style={[styles.printButton, { opacity: orderItems.length > 0 ? 1 : 0.5 }]}
          onPress={printBill}
          disabled={orderItems.length === 0}>
          <Text style={styles.buttonText}>Print Bill</Text>
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
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderList: {
    flex: 1,
  },
  orderItem: {
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
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemPrice: {
    color: '#888',
    marginTop: 4,
  },
  removeButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
    marginTop: 16,
  },
  totalText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  printButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
});