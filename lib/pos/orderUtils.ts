import { supabase } from '../supabase';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface Order {
  id: string;
  restaurant?: string;
  type: 'dine-in' | 'takeaway';
  tableNumber?: string;
  items: OrderItem[];
  total: number;
  timestamp: string;
  isClosed?: boolean;
  closedAt?: string | null;
}

type OrderRow = {
  order_id: string;
  restaurant?: string | null;
  type: 'dine-in' | 'takeaway';
  items: OrderItem[];
  total: number | string;
  timestamp: string;
  table_number: string | null;
  is_closed?: boolean;
  closed_at?: string | null;
};

const mapOrderRow = (row: OrderRow): Order => ({
  id: row.order_id,
  restaurant: row.restaurant ?? undefined,
  type: row.type,
  items: row.items,
  total: typeof row.total === 'string' ? Number(row.total) : row.total,
  timestamp: row.timestamp,
  tableNumber: row.table_number ?? undefined,
  isClosed: row.is_closed ?? false,
  closedAt: row.closed_at ?? null,
});

export const saveOrder = async (orderData: Omit<Order, 'id' | 'timestamp'>) => {
  try {
    const newOrderId = Date.now().toString();
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_id: newOrderId,
        restaurant: orderData.restaurant ?? null,
        type: orderData.type,
        items: orderData.items,
        total: orderData.total,
        timestamp,
        table_number: orderData.tableNumber ?? null,
        is_closed: false,
        closed_at: null,
      })
      .select()
      .single();

    if (error) throw error;
    return mapOrderRow(data as OrderRow);
  } catch (error) {
    console.error('Error saving order:', error);
    throw new Error('Failed to save order');
  }
};

export const fetchOrders = async (restaurant?: string): Promise<Order[]> => {
  const query = supabase.from('orders').select('*');
  const filtered = restaurant ? query.eq('restaurant', restaurant) : query;
  const { data, error } = await filtered.order('timestamp', { ascending: false });

  if (error) throw error;
  return (data as OrderRow[]).map(mapOrderRow);
};

export const fetchOrderById = async (orderId: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapOrderRow(data as OrderRow) : null;
};

export const updateOrderById = async (
  orderId: string,
  updates: Pick<Order, 'items' | 'total' | 'tableNumber'>
): Promise<Order> => {
  const { data, error } = await supabase
    .from('orders')
    .update({
      items: updates.items,
      total: updates.total,
      table_number: updates.tableNumber ?? null,
    })
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) throw error;
  return mapOrderRow(data as OrderRow);
};

export const closeOrderById = async (orderId: string): Promise<Order> => {
  const { data, error } = await supabase
    .from('orders')
    .update({
      is_closed: true,
      closed_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) throw error;
  return mapOrderRow(data as OrderRow);
};

export const deleteOrderById = async (orderId: string) => {
  const { error } = await supabase.from('orders').delete().eq('order_id', orderId);
  if (error) throw error;
};

export const clearOrders = async () => {
  const { error } = await supabase.from('orders').delete().neq('order_id', '');
  if (error) throw error;
};

export const subscribeToOrders = (onChange: (payload: unknown) => void) => {
  const channel = supabase
    .channel('orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => onChange(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
