import { supabase } from '../supabase';
import { loadBillCache, saveBillCache } from './storage';

const isMissingColumnError = (error: unknown, column: string) => {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === 'PGRST204' && typeof e?.message === 'string' && e.message.includes(column);
};

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
  table_label?: string | null;
  items: BillItem[];
  subtotal: number;
  tax_enabled: boolean;
  tax: number;
  total: number;
  created_at: string;
  is_closed?: boolean;
  closed_at?: string | null;
  payment_method?: 'cash' | 'scan' | 'card' | null;
};

export const TAX_RATE = 0.07;

export const normalizeBillTableLabel = (label?: string | null) => {
  const normalized = label?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const getBillTableDisplay = (bill: Pick<Bill, 'table_number' | 'table_label'>) => {
  const normalized = normalizeBillTableLabel(bill.table_label);
  return normalized
    ? `Table ${bill.table_number} - ${normalized}`
    : `Table ${bill.table_number}`;
};

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
  options?: { includeClosed?: boolean; limit?: number }
): Promise<Bill[]> => {
  const includeClosed = options?.includeClosed ?? true;
  const limit = options?.limit ?? 50;
  try {
    let query = supabase
      .from('bills')
      .select('*')
      .eq('restaurant', restaurant);

    if (!includeClosed) {
      query = query.or('is_closed.is.null,is_closed.eq.false');
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

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
  const insert = async (payload: Omit<Bill, 'id' | 'created_at'>) =>
    supabase.from('bills').insert(payload).select().single();

  let { data, error } = await insert(bill);
  if (error && isMissingColumnError(error, 'payment_method')) {
    const { payment_method: _paymentMethod, ...rest } = bill;
    ({ data, error } = await insert(rest));
  }
  if (error && isMissingColumnError(error, 'table_label')) {
    const { table_label: _tableLabel, ...rest } = bill;
    ({ data, error } = await insert(rest));
  }

  if (error) throw error;
  return data as Bill;
};

export const updateBill = async (
  id: string,
  updates: Partial<
    Pick<
      Bill,
      | 'items'
      | 'subtotal'
      | 'tax_enabled'
      | 'tax'
      | 'total'
      | 'is_closed'
      | 'closed_at'
      | 'payment_method'
      | 'table_label'
    >
  >
): Promise<Bill> => {
  const update = async (payload: typeof updates) =>
    supabase.from('bills').update(payload).eq('id', id).select().single();

  let { data, error } = await update(updates);
  if (error && 'payment_method' in updates && isMissingColumnError(error, 'payment_method')) {
    const { payment_method: _paymentMethod, ...rest } = updates as typeof updates & {
      payment_method?: unknown;
    };
    ({ data, error } = await update(rest));
  }
  if (error && 'table_label' in updates && isMissingColumnError(error, 'table_label')) {
    const { table_label: _tableLabel, ...rest } = updates as typeof updates & {
      table_label?: unknown;
    };
    ({ data, error } = await update(rest));
  }

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

export const closeBillWithPayment = async (
  id: string,
  paymentMethod: NonNullable<Bill['payment_method']>
) => {
  const closedAt = new Date().toISOString();
  let { data, error } = await supabase
    .from('bills')
    .update({
      is_closed: true,
      closed_at: closedAt,
      payment_method: paymentMethod,
    })
    .eq('id', id)
    .select()
    .single();

  // If the DB hasn't been migrated yet, allow closing the bill without payment tracking.
  if (error && isMissingColumnError(error, 'payment_method')) {
    ({ data, error } = await supabase
      .from('bills')
      .update({ is_closed: true, closed_at: closedAt })
      .eq('id', id)
      .select()
      .single());
  }

  if (error) throw error;
  return data as Bill;
};

export const fetchLatestOpenBillForTable = async (
  restaurant: string,
  tableNumber: number,
  tableLabel?: string | null
): Promise<Bill | null> => {
  const normalizedLabel = normalizeBillTableLabel(tableLabel);
  let query = supabase
    .from('bills')
    .select('*')
    .eq('restaurant', restaurant)
    .eq('table_number', tableNumber)
    .or('is_closed.is.null,is_closed.eq.false');

  if (normalizedLabel) {
    query = query.eq('table_label', normalizedLabel);
  } else {
    query = query.is('table_label', null);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

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
