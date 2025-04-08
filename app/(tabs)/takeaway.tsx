import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function TakeawayScreen() {
  const router = useRouter();

  const handleNewOrder = () => {
    router.push('/order/takeaway');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Takeaway Orders</Text>
      <TouchableOpacity style={styles.newOrderButton} onPress={handleNewOrder}>
        <Text style={styles.buttonText}>New Takeaway Order</Text>
      </TouchableOpacity>
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
  newOrderButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});