import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { saveSession, loadSession } from '../lib/pos/storage';

export default function LoginScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!pin.trim()) {
      Alert.alert('PIN required', 'Please enter your PIN.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('pin', pin)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        Alert.alert('Invalid PIN', 'Please try again.');
        return;
      }

      await saveSession({ userId: data.id, role: data.role, pin });
      router.replace('/restaurant-select');
    } catch (error) {
      console.error('Login error:', error);
      const cached = await loadSession();
      if (cached?.pin === pin) {
        router.replace('/restaurant-select');
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
