import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMenuForRestaurant, MenuItem } from './menuData';

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
