import AsyncStorage from '@react-native-async-storage/async-storage';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'food' | 'cocktails' | 'indian';
}

const mockMenuItems: MenuItem[] = [
  // Drinks
  { id: 'D1', name: 'Coca Cola', price: 2.50, category: 'drinks' },
  { id: 'D2', name: 'Sprite', price: 2.50, category: 'drinks' },
  { id: 'D3', name: 'Iced Tea', price: 3.00, category: 'drinks' },
  { id: 'D4', name: 'Coffee', price: 3.50, category: 'drinks' },
  
  // Food
  { id: 'F1', name: 'Hamburger', price: 12.99, category: 'food' },
  { id: 'F2', name: 'Cheeseburger', price: 13.99, category: 'food' },
  { id: 'F3', name: 'French Fries', price: 4.99, category: 'food' },
  { id: 'F4', name: 'Caesar Salad', price: 9.99, category: 'food' },
  
  // Cocktails
  { id: 'C1', name: 'Margarita', price: 8.99, category: 'cocktails' },
  { id: 'C2', name: 'Mojito', price: 8.99, category: 'cocktails' },
  { id: 'C3', name: 'Piña Colada', price: 9.99, category: 'cocktails' },
  { id: 'C4', name: 'Martini', price: 10.99, category: 'cocktails' },
  
  // Indian
  { id: 'I1', name: 'Butter Chicken', price: 15.99, category: 'indian' },
  { id: 'I2', name: 'Chicken Tikka', price: 14.99, category: 'indian' },
  { id: 'I3', name: 'Naan Bread', price: 3.99, category: 'indian' },
  { id: 'I4', name: 'Biryani', price: 16.99, category: 'indian' },
];

export const loadMockMenuItems = async () => {
  try {
    const existingItems = await AsyncStorage.getItem('menuItems');
    if (!existingItems) {
      await AsyncStorage.setItem('menuItems', JSON.stringify(mockMenuItems));
      console.log('Mock menu items loaded successfully');
    }
  } catch (error) {
    console.error('Error loading mock menu items:', error);
  }
};