import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface Order {
  id: string;
  type: 'dine-in' | 'takeaway';
  tableNumber?: string;
  items: OrderItem[];
  total: number;
  timestamp: string;
}

export const saveOrder = async (orderData: Omit<Order, 'id' | 'timestamp'>) => {
  try {
    const existingOrders = await AsyncStorage.getItem('orders') || '[]';
    const orders = JSON.parse(existingOrders);
    
    const newOrder = {
      ...orderData,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString()
    };

    orders.push(newOrder);
    await AsyncStorage.setItem('orders', JSON.stringify(orders));
    return newOrder;
  } catch (error) {
    console.error('Error saving order:', error);
    throw new Error('Failed to save order');
  }
};