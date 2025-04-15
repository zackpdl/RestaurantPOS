import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'food' | 'cocktails' | 'indian';
}

export default function MenuManagementScreen() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItem, setNewItem] = useState<MenuItem>({
    id: '',
    name: '',
    price: 0,
    category: 'food'
  });

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

  const saveMenuItem = async () => {
    if (!newItem.id || !newItem.name || !newItem.price) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      const updatedItems = [...menuItems, newItem];
      await AsyncStorage.setItem('menuItems', JSON.stringify(updatedItems));
      setMenuItems(updatedItems);
      setNewItem({ id: '', name: '', price: 0, category: 'food' });
      Alert.alert('Success', 'Menu item added successfully');
    } catch (error) {
      console.error('Error saving menu item:', error);
      Alert.alert('Error', 'Failed to save menu item');
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    try {
      const updatedItems = menuItems.filter(item => item.id !== itemId);
      await AsyncStorage.setItem('menuItems', JSON.stringify(updatedItems));
      setMenuItems(updatedItems);
    } catch (error) {
      console.error('Error deleting menu item:', error);
      Alert.alert('Error', 'Failed to delete menu item');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu Management</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Item ID (e.g., D1, F1)"
          placeholderTextColor="#666"
          value={newItem.id}
          onChangeText={(text) => setNewItem({ ...newItem, id: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Item Name"
          placeholderTextColor="#666"
          value={newItem.name}
          onChangeText={(text) => setNewItem({ ...newItem, name: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Price"
          placeholderTextColor="#666"
          keyboardType="numeric"
          value={newItem.price.toString()}
          onChangeText={(text) => setNewItem({ ...newItem, price: parseFloat(text) || 0 })}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          {['drinks', 'food', 'cocktails', 'indian'].map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                newItem.category === category && styles.categoryButtonActive
              ]}
              onPress={() => setNewItem({ ...newItem, category: category as MenuItem['category'] })}>
              <Text style={styles.categoryButtonText}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.addButton} onPress={saveMenuItem}>
          <Text style={styles.buttonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.menuList}>
        {menuItems.map((item) => (
          <View key={item.id} style={styles.menuItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemId}>{item.id}</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteMenuItem(item.id)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
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
  inputContainer: {
    gap: 12,
    marginBottom: 20,
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
    color: '#fff',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuList: {
    flex: 1,
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
    gap: 8,
  },
  itemId: {
    color: '#888',
    fontSize: 14,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  itemPrice: {
    color: '#4CAF50',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
  },
});