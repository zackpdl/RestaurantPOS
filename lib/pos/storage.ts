import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'admin' | 'staff';

export type Session = {
  userId?: string;
  role: UserRole;
  pin: string;
};

const KEYS = {
  session: 'pos.session',
  restaurant: 'pos.restaurant',
  bills: (restaurant: string) => `pos.bills.${restaurant}`,
  cart: (restaurant: string, tableNumber: number) =>
    `pos.cart.${restaurant}.table.${tableNumber}`,
  activeBill: (restaurant: string, tableNumber: number) =>
    `pos.activeBill.${restaurant}.table.${tableNumber}`,
};

export const saveSession = async (session: Session) => {
  await AsyncStorage.setItem(KEYS.session, JSON.stringify(session));
};

export const loadSession = async (): Promise<Session | null> => {
  const raw = await AsyncStorage.getItem(KEYS.session);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  await AsyncStorage.removeItem(KEYS.session);
};

export const saveSelectedRestaurant = async (restaurant: string) => {
  await AsyncStorage.setItem(KEYS.restaurant, restaurant);
};

export const loadSelectedRestaurant = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEYS.restaurant);
};

export const loadBillCache = async <T>(restaurant: string): Promise<T[] | null> => {
  const raw = await AsyncStorage.getItem(KEYS.bills(restaurant));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
};

export const saveBillCache = async <T>(restaurant: string, bills: T[]) => {
  await AsyncStorage.setItem(KEYS.bills(restaurant), JSON.stringify(bills));
};

export const saveCart = async <T>(
  restaurant: string,
  tableNumber: number,
  cart: T
) => {
  await AsyncStorage.setItem(KEYS.cart(restaurant, tableNumber), JSON.stringify(cart));
};

export const loadCart = async <T>(
  restaurant: string,
  tableNumber: number
): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(KEYS.cart(restaurant, tableNumber));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const clearCart = async (restaurant: string, tableNumber: number) => {
  await AsyncStorage.removeItem(KEYS.cart(restaurant, tableNumber));
};

export const saveActiveBillId = async (
  restaurant: string,
  tableNumber: number,
  billId: string
) => {
  await AsyncStorage.setItem(KEYS.activeBill(restaurant, tableNumber), billId);
};

export const loadActiveBillId = async (
  restaurant: string,
  tableNumber: number
): Promise<string | null> => {
  return AsyncStorage.getItem(KEYS.activeBill(restaurant, tableNumber));
};

export const clearActiveBillId = async (restaurant: string, tableNumber: number) => {
  await AsyncStorage.removeItem(KEYS.activeBill(restaurant, tableNumber));
};
