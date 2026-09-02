import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { MenuItem } from '../lib/pos/menuData';
import { loadSelectedRestaurant } from '../lib/pos/storage';
import { loadMenu, saveMenu, syncMenuWithSupabase, saveMenuToSupabase } from '../lib/pos/menuStore';

export default function MenuManagementScreen() {
  const [restaurant, setRestaurant] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<MenuItem['category'] | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleSync = async () => {
    if (!restaurant) return;
    setIsLoading(true);
    try {
      const syncedItems = await syncMenuWithSupabase(restaurant);
      setMenuItems(syncedItems);
      Alert.alert('Success', `Synced ${syncedItems.length} items from cloud`);
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Error', 'Failed to sync with cloud. Check your connection.');
    } finally {
      setIsLoading(false);
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
      setMenuItems(updatedItems);
      setNewItem({ id: '', name: '', price: 0, category: 'main' });
      Alert.alert('Pending', 'Item added to list. Remember to Save to sync with cloud.');
    } catch (error) {
      console.error('Error adding menu item:', error);
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updatePrice = (itemId: string, priceText: string) => {
    const price = Number(priceText);
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, price: Number.isNaN(price) ? 0 : price } : item
      )
    );
  };

  const updateName = (itemId: string, name: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, name } : item
      )
    );
  };

  const updateCategory = (itemId: string, category: MenuItem['category']) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, category } : item
      )
    );
  };

  const saveAllChanges = async () => {
    if (!restaurant) return;
    setIsSaving(true);
    try {
      await saveMenu(restaurant, menuItems);
      await saveMenuToSupabase(restaurant, menuItems);
      Alert.alert('Saved', 'Menu updated locally and in the cloud.');
    } catch (error) {
      console.error('Error saving menu:', error);
      Alert.alert('Error', 'Saved locally, but failed to sync to cloud.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Menu Management</Text>
          {restaurant && <Text style={styles.subtitle}>{restaurant}</Text>}
        </View>
        <TouchableOpacity 
          style={[styles.syncButton, isLoading && styles.disabledButton]} 
          onPress={handleSync}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>Sync Cloud</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="ID"
          placeholderTextColor="#666"
          value={newItem.id}
          onChangeText={(text) => setNewItem({ ...newItem, id: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Name"
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
                {category.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.addButton} onPress={saveMenuItem}>
          <Text style={styles.buttonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'drinks', 'main', 'indian'] as const).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterTab, selectedFilter === cat && styles.filterTabActive]}
            onPress={() => setSelectedFilter(cat)}>
            <Text style={[styles.filterTabText, selectedFilter === cat && styles.filterTabTextActive]}>
              {cat.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.menuList}>
        {menuItems
          .filter(item => selectedFilter === 'all' || item.category === selectedFilter)
          .sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
            if (numA !== numB) return numA - numB;
            return a.id.localeCompare(b.id, undefined, { numeric: true });
          })
          .map((item) => (
            <View key={item.id} style={styles.menuItem}>
              <View style={styles.itemInfo}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemId}>{item.id}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                    {(['drinks', 'main', 'indian'] as const).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => updateCategory(item.id, cat)}
                        style={[
                          styles.categoryBadge, 
                          item.category === cat ? styles[`badge_${cat}` as keyof typeof styles] : { backgroundColor: '#444' }
                        ]}>
                        <Text style={styles.categoryBadgeText}>{cat.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <TextInput
                  style={styles.itemNameInput}
                  value={item.name}
                  onChangeText={(text) => updateName(item.id, text)}
                  placeholder="Item Name"
                  placeholderTextColor="#666"
                />
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

      <TouchableOpacity 
        style={[styles.saveButton, isSaving && styles.disabledButton]} 
        onPress={saveAllChanges}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Menu (Sync Cloud)</Text>
        )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  syncButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.5,
  },
  subtitle: {
    color: '#aaa',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#333',
    borderColor: '#4CAF50',
  },
  filterTabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterTabTextActive: {
    color: '#4CAF50',
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
    marginBottom: 4,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#333',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
  },
  categoryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  badge_main: {
    backgroundColor: '#2196F3',
  },
  badge_drinks: {
    backgroundColor: '#FF9800',
  },
  badge_indian: {
    backgroundColor: '#9C27B0',
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemId: {
    color: '#888',
    fontSize: 14,
  },
  itemNameInput: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: '#1e1e1e',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 4,
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
