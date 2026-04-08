import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { MenuItem } from '../lib/pos/menuData';
import { loadSelectedRestaurant } from '../lib/pos/storage';
import { loadMenu, saveMenu } from '../lib/pos/menuStore';

export default function MenuManagementScreen() {
  const [restaurant, setRestaurant] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItem, setNewItem] = useState<MenuItem>({
    id: '',
    name: '',
    price: 0,
    category: 'main'
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const selected = await loadSelectedRestaurant();
      if (!selected) return;
      setRestaurant(selected);
      const items = await loadMenu(selected);
      setMenuItems(items);
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const saveMenuItem = async () => {
    if (!newItem.id || !newItem.name || !newItem.price) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!restaurant) return;
    try {
      const updatedItems = [...menuItems, newItem];
      await saveMenu(restaurant, updatedItems);
      setMenuItems(updatedItems);
      setNewItem({ id: '', name: '', price: 0, category: 'main' });
      Alert.alert('Success', 'Menu item added successfully');
    } catch (error) {
      console.error('Error saving menu item:', error);
      Alert.alert('Error', 'Failed to save menu item');
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    if (!restaurant) return;
    try {
      const updatedItems = menuItems.filter(item => item.id !== itemId);
      await saveMenu(restaurant, updatedItems);
      setMenuItems(updatedItems);
    } catch (error) {
      console.error('Error deleting menu item:', error);
      Alert.alert('Error', 'Failed to delete menu item');
    }
  };

  const updatePrice = (itemId: string, priceText: string) => {
    const price = Number(priceText);
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, price: Number.isNaN(price) ? 0 : price } : item
      )
    );
  };

  const saveAllChanges = async () => {
    if (!restaurant) return;
    try {
      await saveMenu(restaurant, menuItems);
      Alert.alert('Saved', 'Menu updated successfully');
    } catch (error) {
      console.error('Error saving menu:', error);
      Alert.alert('Error', 'Failed to save menu');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu Management</Text>
      {restaurant && <Text style={styles.subtitle}>{restaurant}</Text>}

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
          {['drinks', 'main', 'indian'].map((category) => (
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
              <TextInput
                style={styles.priceInput}
                value={String(item.price)}
                onChangeText={(text) => updatePrice(item.id, text)}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteMenuItem(item.id)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.saveButton} onPress={saveAllChanges}>
        <Text style={styles.buttonText}>Save Menu</Text>
      </TouchableOpacity>
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
  subtitle: {
    color: '#aaa',
    marginBottom: 12,
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
  priceInput: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
    width: 90,
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
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
});
