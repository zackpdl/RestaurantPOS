import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Printer, Bluetooth, RefreshCw, Check, Trash2 } from 'lucide-react-native';

import {
  discoverPrinters,
  connectPrinter,
  getSavedPrinter,
  savePrinter,
  clearPrinter,
  requestBluetoothPermissions,
  printTestReceipt,
  isBluetoothPrintingAvailable,
  type DiscoveredPrinter,
  type SavedPrinter,
} from '../lib/pos/printer';

export default function PrinterSettingsScreen() {
  const router = useRouter();

  const [available] = useState(isBluetoothPrintingAvailable());
  const [saved, setSaved] = useState<SavedPrinter | null>(null);
  const [devices, setDevices] = useState<DiscoveredPrinter[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<string>('');

  const loadSaved = useCallback(async () => {
    const printer = await getSavedPrinter();
    setSaved(printer);
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const handleScan = async () => {
    setScanning(true);
    setStatus('Requesting Bluetooth permission…');

    try {
      const permitted = await requestBluetoothPermissions();
      if (!permitted) {
        setStatus('');
        Alert.alert(
          'Permission needed',
          'Bluetooth permission is required to find your printer. Enable it in Android Settings → Apps → Restaurant POS → Permissions.'
        );
        setScanning(false);
        return;
      }

      setStatus('Scanning for printers…');
      const found = await discoverPrinters();
      setDevices(found);

      if (found.length === 0) {
        setStatus('No printers found. Make sure the printer is switched on and paired in Android Bluetooth settings.');
      } else {
        setStatus(`Found ${found.length} device${found.length === 1 ? '' : 's'}.`);
      }
    } catch (err: any) {
      console.warn('[printer-settings] scan error', err);
      setStatus('');
      Alert.alert('Scan failed', err?.message || 'Could not scan for Bluetooth devices.');
    } finally {
      setScanning(false);
    }
  };

  const handleSelect = async (device: DiscoveredPrinter) => {
    setConnecting(device.address);
    setStatus(`Connecting to ${device.name}…`);

    try {
      const ok = await connectPrinter(device.address);
      if (!ok) {
        setStatus('');
        Alert.alert('Connection failed', `Could not connect to ${device.name}. Is it switched on and in range?`);
        return;
      }

      const printer: SavedPrinter = {
        address: device.address,
        name: device.name,
        width: saved?.width ?? '58',
      };
      await savePrinter(printer);
      setSaved(printer);
      setStatus(`Connected to ${device.name}.`);
    } catch (err: any) {
      setStatus('');
      Alert.alert('Connection failed', err?.message || 'Unknown error');
    } finally {
      setConnecting(null);
    }
  };

  const handleWidth = async (width: '58' | '80') => {
    if (!saved) return;
    const updated = { ...saved, width };
    await savePrinter(updated);
    setSaved(updated);
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus('Sending test receipt…');
    try {
      const result = await printTestReceipt();
      setStatus(result.message);
      if (!result.ok) {
        Alert.alert('Test print failed', result.message);
      }
    } catch (err: any) {
      setStatus('');
      Alert.alert('Test print failed', err?.message || 'Unknown error');
    } finally {
      setTesting(false);
    }
  };

  const handleForget = async () => {
    await clearPrinter();
    setSaved(null);
    setStatus('Printer forgotten.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Receipt Printer</Text>
      </View>

      {!available && (
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>Bluetooth printing unavailable</Text>
          <Text style={styles.warningText}>
            This build does not include the Bluetooth printing module. Receipts will use the Android
            print dialog instead. Install a build that includes the ESC/POS module to print directly.
          </Text>
        </View>
      )}

      {/* Current printer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current printer</Text>
        {saved ? (
          <View style={styles.savedCard}>
            <View style={styles.savedInfo}>
              <Printer size={20} color="#4CAF50" />
              <View style={styles.savedTextWrap}>
                <Text style={styles.savedName}>{saved.name}</Text>
                <Text style={styles.savedAddress}>{saved.address}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleForget} style={styles.forgetButton}>
              <Trash2 size={18} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.emptyText}>No printer selected yet. Scan below to choose one.</Text>
        )}
      </View>

      {/* Paper width */}
      {saved && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paper width</Text>
          <View style={styles.widthRow}>
            {(['58', '80'] as const).map((w) => (
              <TouchableOpacity
                key={w}
                style={[styles.widthButton, saved.width === w && styles.widthButtonActive]}
                onPress={() => handleWidth(w)}>
                <Text style={[styles.widthText, saved.width === w && styles.widthTextActive]}>
                  {w} mm
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.primaryButton, scanning && styles.buttonDisabled]}
          onPress={handleScan}
          disabled={scanning || !available}>
          {scanning ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Bluetooth size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Scan for printers</Text>
            </>
          )}
        </TouchableOpacity>

        {saved && (
          <TouchableOpacity
            style={[styles.secondaryButton, testing && styles.buttonDisabled]}
            onPress={handleTest}
            disabled={testing || !available}>
            {testing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <RefreshCw size={18} color="#fff" />
                <Text style={styles.secondaryButtonText}>Print test receipt</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>

      {/* Device list */}
      {devices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available devices</Text>
          {devices.map((device) => {
            const isSaved = saved?.address === device.address;
            const isConnecting = connecting === device.address;
            return (
              <TouchableOpacity
                key={device.address}
                style={[styles.deviceCard, isSaved && styles.deviceCardActive]}
                onPress={() => handleSelect(device)}
                disabled={connecting !== null}>
                <View style={styles.deviceInfo}>
                  <Printer size={18} color={isSaved ? '#4CAF50' : '#888'} />
                  <View style={styles.deviceTextWrap}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceAddress}>
                      {device.address} · {device.paired ? 'paired' : 'discovered'}
                    </Text>
                  </View>
                </View>
                {isConnecting ? (
                  <ActivityIndicator color="#4CAF50" size="small" />
                ) : isSaved ? (
                  <Check size={18} color="#4CAF50" />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.help}>
        <Text style={styles.helpTitle}>Printer not showing up?</Text>
        <Text style={styles.helpText}>1. Switch the printer on and load paper.</Text>
        <Text style={styles.helpText}>
          2. Pair it once in Android Settings → Bluetooth (usually named MTP-II, Printer001, or similar).
        </Text>
        <Text style={styles.helpText}>
          3. Come back here and tap “Scan for printers” — paired devices appear even when the printer is off.
        </Text>
        {Platform.OS === 'android' && (
          <Text style={styles.helpText}>
            4. Allow the Bluetooth permission prompt when it appears — without it Android hides all paired devices.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { padding: 8, marginRight: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  warning: {
    backgroundColor: '#3a2a00',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffb300',
  },
  warningTitle: { color: '#ffb300', fontWeight: 'bold', marginBottom: 6 },
  warningText: { color: '#ddd', fontSize: 13, lineHeight: 19 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e2a1e',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  savedInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  savedTextWrap: { marginLeft: 12, flex: 1 },
  savedName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  savedAddress: { color: '#888', fontSize: 12, marginTop: 2 },
  forgetButton: { padding: 8 },
  emptyText: { color: '#888', fontSize: 14 },
  widthRow: { flexDirection: 'row' },
  widthButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#333',
    marginRight: 10,
  },
  widthButtonActive: { backgroundColor: '#4CAF50' },
  widthText: { color: '#888', fontWeight: 'bold' },
  widthTextActive: { color: '#fff' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
  },
  secondaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  buttonDisabled: { opacity: 0.6 },
  status: { color: '#aaa', fontSize: 13, marginTop: 12, lineHeight: 19 },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  deviceCardActive: { backgroundColor: '#1e2a1e', borderWidth: 1, borderColor: '#4CAF50' },
  deviceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deviceTextWrap: { marginLeft: 12, flex: 1 },
  deviceName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  deviceAddress: { color: '#888', fontSize: 12, marginTop: 2 },
  help: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#555',
  },
  helpTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 8 },
  helpText: { color: '#aaa', fontSize: 13, lineHeight: 20, marginBottom: 4 },
});
