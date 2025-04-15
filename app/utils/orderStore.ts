import AsyncStorage from '@react-native-async-storage/async-storage';

interface OrderStatus {
  type: 'dine-in' | 'takeaway';
  number: number;
  isOccupied: boolean;
}

export const getOrderStatus = async () => {
  try {
    const status = await AsyncStorage.getItem('orderStatus');
    return status ? JSON.parse(status) : [];
  } catch (error) {
    console.error('Error getting order status:', error);
    return [];
  }
};

export const setOrderStatus = async (type: string, number: number, isOccupied: boolean) => {
  try {
    const currentStatus = await getOrderStatus();
    const existingIndex = currentStatus.findIndex(
      (status: OrderStatus) => status.type === type && status.number === number
    );

    if (existingIndex >= 0) {
      currentStatus[existingIndex].isOccupied = isOccupied;
    } else {
      currentStatus.push({ type, number, isOccupied });
    }

    await AsyncStorage.setItem('orderStatus', JSON.stringify(currentStatus));
  } catch (error) {
    console.error('Error setting order status:', error);
  }
};