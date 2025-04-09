import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'food' | 'cocktails' | 'indian';
}

export default function SettingsScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItem, setNewItem] = useState({
    id: '',
    name: '',
    price: '',
    category: 'food' as MenuItem['category']
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
    if (!newItem.id || !newItem.name || !newItem.price || !newItem.category) {
      alert('Please fill all fields');
      return;
    }

    const updatedItems = [...menuItems, { ...newItem, price: parseFloat(newItem.price) }];
    try {
      await AsyncStorage.setItem('menuItems', JSON.stringify(updatedItems));
      setMenuItems(updatedItems);
      setNewItem({ id: '', name: '', price: '', category: 'food' });
    } catch (error) {
      console.error('Error saving menu item:', error);
    }
  };

  const categories: MenuItem['category'][] = ['drinks', 'food', 'cocktails', 'indian'];

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                newItem.category === category && styles.categoryButtonActive
              ]}
              onPress={() => setNewItem({ ...newItem, category })}>
              <Text style={[
                styles.categoryButtonText,
                newItem.category === category && styles.categoryButtonTextActive
              ]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={saveMenuItem}>
          <Text style={styles.buttonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu Items</Text>
        {categories.map((category) => (
          <View key={category}>
            <Text style={styles.categoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)} Menu
            </Text>
            {menuItems
              .filter((item) => item.category === category)
              .map((item) => (
                <View key={item.id} style={styles.menuItem}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemId}>{item.id}</Text>
                    <Text style={styles.itemText}>{item.name}</Text>
                  </View>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </View>
              ))}
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
  categoryContainer: {
    flexDirection: 'row',
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
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemId: {
    color: '#888',
    fontSize: 14,
    marginRight: 8,
    minWidth: 40,
  },
  itemText: {
    color: '#fff',
    fontSize: 16,
  },
  itemPrice: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
});