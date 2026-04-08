import { supabase } from '../supabase';
import { loadBillCache, saveBillCache } from './storage';

export type BillItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type Bill = {
  id: string;
  restaurant: string;
  table_number: number;
  items: BillItem[];
  subtotal: number;
  tax_enabled: boolean;
  tax: number;
  total: number;
  created_at: string;
  is_closed?: boolean;
  closed_at?: string | null;
};

export const TAX_RATE = 0.07;

export const calculateTotals = (items: BillItem[], taxEnabled: boolean) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = taxEnabled ? subtotal * TAX_RATE : 0;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

export const fetchBills = async (
  restaurant: string,
  options?: { includeClosed?: boolean }
): Promise<Bill[]> => {
  const includeClosed = options?.includeClosed ?? true;
  try {
    let query = supabase
      .from('bills')
      .select('*')
      .eq('restaurant', restaurant);

    if (!includeClosed) {
      query = query.or('is_closed.is.null,is_closed.eq.false');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    const bills = (data as Bill[]) ?? [];
    await saveBillCache(restaurant, bills);
    return bills;
  } catch (error) {
    console.error('Error fetching bills:', error);
    const cached = await loadBillCache<Bill>(restaurant);
    return cached ?? [];
  }
};

export const createBill = async (
  bill: Omit<Bill, 'id' | 'created_at'>
): Promise<Bill> => {
  const { data, error } = await supabase
    .from('bills')
    .insert(bill)
    .select()
    .single();

  if (error) throw error;
  return data as Bill;
};

export const updateBill = async (
  id: string,
  updates: Partial<
    Pick<
      Bill,
      'items' | 'subtotal' | 'tax_enabled' | 'tax' | 'total' | 'is_closed' | 'closed_at'
    >
  >
): Promise<Bill> => {
  const { data, error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Bill;
};

export const deleteBill = async (id: string) => {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) throw error;
};

export const closeBill = async (id: string) => {
  const { data, error } = await supabase
    .from('bills')
    .update({ is_closed: true, closed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Bill;
};

export const fetchLatestOpenBillForTable = async (
  restaurant: string,
  tableNumber: number
): Promise<Bill | null> => {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('restaurant', restaurant)
    .eq('table_number', tableNumber)
    .or('is_closed.is.null,is_closed.eq.false')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? (data as Bill) : null;
};

export const deleteClosedBills = async (restaurant: string) => {
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('restaurant', restaurant)
    .eq('is_closed', true);
  if (error) throw error;
};

export const deleteAllBillsForRestaurant = async (restaurant: string) => {
  const { error } = await supabase.from('bills').delete().eq('restaurant', restaurant);
  if (error) throw error;
};

export const subscribeToBills = (
  onChange: (payload: unknown) => void
) => {
  const channel = supabase
    .channel('bills')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bills' },
      (payload) => onChange(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
