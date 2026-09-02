import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { loadSession, saveSelectedRestaurant, saveSession } from '../lib/pos/storage';
import { RESTAURANTS } from '../lib/pos/menuData';

export default function LoginScreen() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<string>(RESTAURANTS[0]);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!pin.trim()) {
      Alert.alert('PIN required', 'Please enter your PIN.');
      return;
    }
    if (!hasSupabaseConfig) {
      Alert.alert(
        'App configuration error',
        'Supabase settings are missing in this build. Rebuild with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
      );
      return;
    }

    setLoading(true);
    try {
      // Staff login is per-restaurant.
      const staffRes = await supabase
        .from('users')
        .select('id, role, restaurant')
        .eq('pin', pin)
        .eq('role', 'staff')
        .eq('restaurant', restaurant)
        .limit(2);

      if (staffRes.error) throw staffRes.error;
      const staffCount = staffRes.data?.length ?? 0;
      const staffDuplicate = staffCount > 1;
      let legacyDuplicate = false;

      if (!staffDuplicate && staffCount === 1) {
        await saveSession({
          userId: staffRes.data![0].id,
          role: 'staff',
          pin,
          restaurant,
        });
        await saveSelectedRestaurant(restaurant);
        router.replace('/tables');
        return;
      }

      if (staffCount === 0) {
        // Backwards compatibility for older rows without `restaurant` set.
        const legacyRes = await supabase
          .from('users')
          .select('id, role, restaurant')
          .eq('pin', pin)
          .eq('role', 'staff')
          .limit(2);

        if (legacyRes.error) throw legacyRes.error;
        const legacyCount = legacyRes.data?.length ?? 0;
        if (legacyCount === 1) {
          await saveSession({
            userId: legacyRes.data![0].id,
            role: 'staff',
            pin,
            restaurant,
          });
          await saveSelectedRestaurant(restaurant);
          router.replace('/tables');
          return;
        }
        if (legacyCount > 1) {
          legacyDuplicate = true;
        }
      }

      // Admin login is global (not tied to a restaurant).
      const adminRes = await supabase
        .from('users')
        .select('id, role')
        .eq('pin', pin)
        .eq('role', 'admin')
        .limit(2);

      if (adminRes.error) throw adminRes.error;
      const adminCount = adminRes.data?.length ?? 0;
      if (adminCount > 1) {
        Alert.alert('Duplicate PIN', 'Multiple admin users share this PIN. Fix the users table.');
        return;
      }
      if (adminCount === 1) {
        await saveSession({ userId: adminRes.data![0].id, role: 'admin', pin });
        router.replace('/restaurant-select');
        return;
      }

      if (staffDuplicate) {
        Alert.alert('Duplicate PIN', 'Multiple staff users share this PIN for this restaurant. Fix the users table.');
        return;
      }
      if (legacyDuplicate) {
        Alert.alert(
          'PIN needs restaurant',
          'This PIN exists for multiple staff users. Set `users.restaurant` to avoid duplicates.'
        );
        return;
      }
      Alert.alert('Invalid PIN', 'Please try again.');
    } catch (error) {
      console.error('Login error:', error);
      const cached = await loadSession();
      if (cached?.pin === pin) {
        if (cached.role === 'staff' && cached.restaurant) {
          await saveSelectedRestaurant(cached.restaurant);
          router.replace('/tables');
        } else {
          router.replace('/restaurant-select');
        }
        return;
      }
      Alert.alert('Network error', 'Unable to verify PIN. Try again when online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restaurant POS</Text>
      <Text style={styles.subtitle}>Login with PIN</Text>

      <View style={styles.restaurantRow}>
        {RESTAURANTS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.restaurantChip, restaurant === r && styles.restaurantChipActive]}
            onPress={() => setRestaurant(r)}
            disabled={loading}>
            <Text style={[styles.restaurantChipText, restaurant === r && styles.restaurantChipTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter PIN"
        placeholderTextColor="#888"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 4,
  },
  restaurantRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    maxWidth: 320,
    marginBottom: 14,
  },
  restaurantChip: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  restaurantChipActive: {
    borderColor: '#4CAF50',
  },
  restaurantChipText: {
    color: '#aaa',
    fontWeight: 'bold',
    fontSize: 12,
  },
  restaurantChipTextActive: {
    color: '#fff',
  },
  button: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
