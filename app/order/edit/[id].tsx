import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { Feather } from '@expo/vector-icons';

interface MenuItem {
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
  items: MenuItem[];
  total: number;
  timestamp: string;
}

const EditOrder = () => {
  const { id } = useLocalSearchParams();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load menu items
        const savedMenu = await AsyncStorage.getItem('menuItems');
        if (savedMenu) setMenuItems(JSON.parse(savedMenu));

        // Load existing order
        const savedOrders = await AsyncStorage.getItem('orders');
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          const existingOrder = orders.find((o: Order) => o.id === id);
          if (existingOrder) setOrder(existingOrder);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [id]);

  const saveOrder = async () => {
    if (!order) return;

    try {
      const savedOrders = await AsyncStorage.getItem('orders');
      let orders = savedOrders ? JSON.parse(savedOrders) : [];
      
      // Update existing order
      orders = orders.map((o: Order) => o.id === order.id ? order : o);
      
      await AsyncStorage.setItem('orders', JSON.stringify(orders));
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const updateQuantity = (item: MenuItem, increase: boolean) => {
    if (!order) return;

    const updatedItems = [...order.items];
    const existingItem = updatedItems.find(i => i.id === item.id);

    if (existingItem) {
      if (increase) {
        existingItem.quantity += 1;
      } else if (existingItem.quantity > 1) {
        existingItem.quantity -= 1;
      } else {
        const index = updatedItems.indexOf(existingItem);
        updatedItems.splice(index, 1);
      }
    } else if (increase) {
      updatedItems.push({ ...item, quantity: 1 });
    }

    const total = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    setOrder({
      ...order,
      items: updatedItems,
      total
    });
  };

  const handleSave = async () => {
    await saveOrder();
    router.back();
  };

  const renderItem = ({ item }: { item: MenuItem }) => {
    const quantity = order?.items.find(i => i.id === item.id)?.quantity || 0;

    return (
      <View style={tw`flex-row justify-between items-center border-b border-gray-300 py-3 px-2`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-lg font-semibold`}>{item.name}</Text>
          <Text style={tw`text-sm text-gray-600`}>${item.price.toFixed(2)}</Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <Pressable onPress={() => updateQuantity(item, false)} style={tw`p-2`}>
            <Feather name="minus-circle" size={24} color="black" />
          </Pressable>
          <Text style={tw`px-3`}>{quantity}</Text>
          <Pressable onPress={() => updateQuantity(item, true)} style={tw`p-2`}>
            <Feather name="plus-circle" size={24} color="black" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <FlatList
        data={menuItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
      <View style={tw`border-t border-gray-300 p-4`}>
        <Text style={tw`text-lg font-bold`}>Total: ${order?.total.toFixed(2) || '0.00'}</Text>
        <Pressable
          onPress={handleSave}
          style={tw`bg-blue-500 p-3 rounded-full mt-2 items-center`}
        >
          <Text style={tw`text-white font-bold`}>Save Changes</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default EditOrder;