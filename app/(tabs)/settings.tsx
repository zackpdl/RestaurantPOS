import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

export default function SettingsScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItem, setNewItem] = useState({ id: '', name: '', price: '', category: '' });

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
    if (!newItem.id || !newItem.name || !newItem.price || !newItem.category) {
      alert('Please fill all fields');
      return;
    }

    const updatedItems = [...menuItems, { ...newItem, price: parseFloat(newItem.price) }];
    try {
      await AsyncStorage.setItem('menuItems', JSON.stringify(updatedItems));
      setMenuItems(updatedItems);
      setNewItem({ id: '', name: '', price: '', category: '' });
    } catch (error) {
      console.error('Error saving menu item:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Menu Item</Text>
        <TextInput
          style={styles.input}
          placeholder="Item Number (e.g., 101)"
          placeholderTextColor="#666"
          value={newItem.id}
          onChangeText={(text) => setNewItem({ ...newItem, id: text })}
          keyboardType="numeric"
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
          value={newItem.price}
          onChangeText={(text) => setNewItem({ ...newItem, price: text })}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Category"
          placeholderTextColor="#666"
          value={newItem.category}
          onChangeText={(text) => setNewItem({ ...newItem, category: text })}
        />
        <TouchableOpacity style={styles.button} onPress={saveMenuItem}>
          <Text style={styles.buttonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu Items</Text>
        {menuItems.map((item) => (
          <View key={item.id} style={styles.menuItem}>
            <Text style={styles.itemText}>{item.id} - {item.name}</Text>
            <Text style={styles.itemText}>${item.price.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
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
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemText: {
    color: '#fff',
    fontSize: 16,
  },
});