import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function SelectTableScreen() {
  const router = useRouter();
  const tables = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Table</Text>
      <ScrollView contentContainerStyle={styles.tablesGrid}>
        {tables.map((table) => (
          <TouchableOpacity
            key={table}
            style={styles.tableButton}
            onPress={() => router.push(`/order/dine-in/${table}`)}>
            <Text style={styles.tableNumber}>{table}</Text>
            <Text style={styles.tableText}>Table</Text>
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
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  tableButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#4CAF50',
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
  tableNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  tableText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
});