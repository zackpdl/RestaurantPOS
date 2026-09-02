import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMenuForRestaurant, MenuItem } from './menuData';
import { supabase } from '../supabase';

const menuKey = (restaurant: string) => `pos.menu.${restaurant}`;

export const loadMenu = async (restaurant: string): Promise<MenuItem[]> => {
  const raw = await AsyncStorage.getItem(menuKey(restaurant));
  if (raw) {
    try {
      return JSON.parse(raw) as MenuItem[];
    } catch {
      return getMenuForRestaurant(restaurant);
    }
  }
  const defaultMenu = getMenuForRestaurant(restaurant);
  await AsyncStorage.setItem(menuKey(restaurant), JSON.stringify(defaultMenu));
  return defaultMenu;
};

export const saveMenu = async (restaurant: string, items: MenuItem[]) => {
  await AsyncStorage.setItem(menuKey(restaurant), JSON.stringify(items));
};

export const saveMenuToSupabase = async (restaurant: string, items: MenuItem[]) => {
  const { error } = await supabase
    .from('menu_items')
    .upsert(
      items.map(item => ({
        restaurant,
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category
      })),
      { onConflict: 'restaurant,id' }
    );

  if (error) {
    console.error('Error saving menu to Supabase:', error);
    throw error;
  }
};

export const syncMenuWithSupabase = async (restaurant: string): Promise<MenuItem[]> => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant', restaurant)
    .order('id', { ascending: true });

  if (error) {
    console.error('Error syncing menu from Supabase:', error);
    throw error;
  }

  if (data && data.length > 0) {
    const formattedItems: MenuItem[] = data.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category as MenuItem['category'] || 'main'
    }));
    await saveMenu(restaurant, formattedItems);
    return formattedItems;
  }

  return loadMenu(restaurant);
};
