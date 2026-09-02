import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'admin' | 'staff';

export type Session = {
  userId?: string;
  role: UserRole;
  pin: string;
  restaurant?: string;
};

const KEYS = {
  session: 'pos.session',
  restaurant: 'pos.restaurant',
  bills: (restaurant: string) => `pos.bills.${restaurant}`,
  cart: (restaurant: string, tableKey: string) =>
    `pos.cart.${restaurant}.table.${tableKey}`,
  activeBill: (restaurant: string, tableKey: string) =>
    `pos.activeBill.${restaurant}.table.${tableKey}`,
};

export const normalizeCustomTableLabel = (label?: string | null) => {
  const normalized = label?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const buildTableKey = (
  tableNumber: number,
  customLabel?: string | null
) => {
  const normalized = normalizeCustomTableLabel(customLabel);
  return normalized
    ? `${tableNumber}__${encodeURIComponent(normalized.toLowerCase())}`
    : String(tableNumber);
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
  tableKey: string,
  cart: T
) => {
  await AsyncStorage.setItem(KEYS.cart(restaurant, tableKey), JSON.stringify(cart));
};

export const loadCart = async <T>(
  restaurant: string,
  tableKey: string
): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(KEYS.cart(restaurant, tableKey));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const clearCart = async (restaurant: string, tableKey: string) => {
  await AsyncStorage.removeItem(KEYS.cart(restaurant, tableKey));
};

export const saveActiveBillId = async (
  restaurant: string,
  tableKey: string,
  billId: string
) => {
  await AsyncStorage.setItem(KEYS.activeBill(restaurant, tableKey), billId);
};

export const loadActiveBillId = async (
  restaurant: string,
  tableKey: string
): Promise<string | null> => {
  return AsyncStorage.getItem(KEYS.activeBill(restaurant, tableKey));
};

export const clearActiveBillId = async (restaurant: string, tableKey: string) => {
  await AsyncStorage.removeItem(KEYS.activeBill(restaurant, tableKey));
};
