import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { loadMockMenuItems } from './utils/mockData';

export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
    loadMockMenuItems();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4' }}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>Welcome to Restaurant POS</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/select-table')}>
            <Text style={styles.buttonText}>Dine-In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/select-takeaway')}>
            <Text style={styles.buttonText}>Takeaway</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.menuButton]}
            onPress={() => router.push('/menu-management')}>
            <Text style={styles.buttonText}>Manage Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.ordersButton]}
            onPress={() => router.push('/orders')}>
            <Text style={styles.buttonText}>View Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
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
  menuButton: {
    backgroundColor: '#FF9800',
  },
  ordersButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});