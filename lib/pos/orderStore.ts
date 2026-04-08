import { supabase } from '../supabase';

export const getOrderStatus = async () => {
  try {
    const { data, error } = await supabase
      .from('order_status')
      .select('*');

    if (error) throw error;

    return (data || []).map((row: any) => ({
      type: row.type,
      number: Number(row.number),
      isOccupied: row.is_occupied,
    }));
  } catch (error) {
    console.error('Error getting order status:', error);
    return [];
  }
};

export const setOrderStatus = async (type: string, number: number, isOccupied: boolean) => {
  try {
    const numberText = String(number);
    const { data: existing, error: selectError } = await supabase
      .from('order_status')
      .select('id')
      .eq('type', type)
      .eq('number', numberText)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('order_status')
        .update({ is_occupied: isOccupied })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('order_status')
        .insert({ type, number: numberText, is_occupied: isOccupied });
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error setting order status:', error);
  }
};
