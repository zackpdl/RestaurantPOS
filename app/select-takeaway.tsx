import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function SelectTakeawayScreen() {
  const router = useRouter();
  const orders = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Takeaway Number</Text>
      <ScrollView contentContainerStyle={styles.ordersGrid}>
        {orders.map((order) => (
          <TouchableOpacity
            key={order}
            style={styles.orderButton}
            onPress={() => router.push(`/order/takeaway/${order}`)}>
            <Text style={styles.orderNumber}>{order}</Text>
            <Text style={styles.orderText}>Takeaway</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  ordersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  orderButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
});