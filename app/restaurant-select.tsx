import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { RESTAURANTS } from '../lib/pos/menuData';
import { loadSession, saveSelectedRestaurant } from '../lib/pos/storage';

export default function RestaurantSelectScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'staff' | null>(null);

  useEffect(() => {
    const load = async () => {
      const session = await loadSession();
      if (!session) {
        Alert.alert('Session expired', 'Please login again.');
        router.replace('/');
        return;
      }
      setRole(session.role);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSelect = async (restaurant: string) => {
    await saveSelectedRestaurant(restaurant);
    router.push('/tables');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Restaurant</Text>
      <Text style={styles.subtitle}>Role: {role}</Text>

      <View style={styles.list}>
        {RESTAURANTS.map((restaurant) => (
          <TouchableOpacity
            key={restaurant}
            style={styles.card}
            onPress={() => handleSelect(restaurant)}>
            <Text style={styles.cardText}>{restaurant}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {role === 'admin' && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/admin')}>
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#aaa',
    marginBottom: 24,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  adminButton: {
    marginTop: 24,
    backgroundColor: '#FF9800',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
