import { useState } from 'react';
import DatePickerModal from '../components/DatePickerModal';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../services/api';

const PART_TYPES = [
  { value: 'VIDANGE', label: 'Vidange' },
  { value: 'FILTRE_AIR', label: 'Filtre à air' },
  { value: 'FILTRE_CARBURANT', label: 'Filtre carburant' },
  { value: 'BOUGIES', label: 'Bougies' },
  { value: 'FILTRE_HABITACLE', label: 'Filtre habitacle' },
  { value: 'KIT_DISTRIBUTION', label: 'Kit distribution' },
  { value: 'POMPE_EAU', label: 'Pompe à eau' },
  { value: 'COURROIE_ACCESSOIRES', label: 'Courroie accessoires' },
  { value: 'LIQUIDE_REFROIDISSEMENT', label: 'Liquide refroidissement' },
  { value: 'PLAQUETTES_AV', label: 'Plaquettes avant' },
  { value: 'PLAQUETTES_AR', label: 'Plaquettes arrière' },
  { value: 'DISQUES_AV', label: 'Disques avant' },
  { value: 'DISQUES_AR', label: 'Disques arrière' },
  { value: 'LIQUIDE_FREIN', label: 'Liquide de frein' },
  { value: 'PNEUS_AV', label: 'Pneus avant' },
  { value: 'PNEUS_AR', label: 'Pneus arrière' },
  { value: 'BATTERIE', label: 'Batterie' },
  { value: 'CONTROLE_TECHNIQUE', label: 'Contrôle technique' },
];

export default function AddMaintenanceScreen({ route, navigation }: any) {
  const { vehicleId } = route.params;
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'manual' | 'scan'>('manual');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  const [partType, setPartType] = useState('VIDANGE');
  const [price, setPrice] = useState('');
  const [garage, setGarage] = useState('');
  const [notes, setNotes] = useState('');
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: any) => maintenanceService.createRecord(vehicleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-status', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-predictions', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-records', vehicleId] });
      Alert.alert('Succès', 'Entretien enregistré');
      navigation.goBack();
    },
    onError: () => Alert.alert('Erreur', "Erreur lors de l'enregistrement"),
  });

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets[0].base64) {
      setScanImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets[0].base64) {
      setScanImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleScan = async () => {
    if (!scanImage) return;
    setScanning(true);
    try {
      const result = await maintenanceService.scanInvoice(vehicleId, scanImage);
      if (result.date) setDate(result.date);
      if (result.mileage) setMileage(String(result.mileage));
      if (result.totalPrice) setPrice(String(result.totalPrice));
      if (result.garage) setGarage(result.garage);
      if (result.partTypes?.length > 0) setPartType(result.partTypes[0]);
      setMode('manual');
      Alert.alert('Analyse terminée', 'Vérifiez les champs pré-remplis');
    } catch {
      Alert.alert('Erreur', "Erreur lors de l'analyse");
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = () => {
    if (!mileage || !date) {
      Alert.alert('Erreur', 'Date et kilométrage requis');
      return;
    }
    createMutation.mutate({
      date: new Date(date).toISOString(),
      mileage: parseInt(mileage),
      partType,
      price: price ? parseFloat(price) : undefined,
      garage: garage || undefined,
      notes: notes || undefined,
      sourceType: scanImage ? 'SCAN' : 'MANUAL',
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Mode tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'manual' && styles.tabActive]}
          onPress={() => setMode('manual')}
        >
          <Text style={[styles.tabText, mode === 'manual' && styles.tabTextActive]}>Manuel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'scan' && styles.tabActive]}
          onPress={() => setMode('scan')}
        >
          <Text style={[styles.tabText, mode === 'scan' && styles.tabTextActive]}>Scanner</Text>
        </TouchableOpacity>
      </View>

      {mode === 'scan' && (
        <View style={styles.scanSection}>
          <View style={styles.scanButtons}>
            <TouchableOpacity style={styles.btnSecondary} onPress={takePhoto}>
              <Text style={styles.btnSecondaryText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={pickImage}>
              <Text style={styles.btnSecondaryText}>Galerie</Text>
            </TouchableOpacity>
          </View>
          {scanImage && (
            <Image source={{ uri: scanImage }} style={styles.preview} resizeMode="contain" />
          )}
          <TouchableOpacity
            style={[styles.btnPrimary, (!scanImage || scanning) && { opacity: 0.5 }]}
            onPress={handleScan}
            disabled={!scanImage || scanning}
          >
            {scanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Analyser</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {mode === 'manual' && (
        <View style={styles.form}>
          <Text style={styles.label}>Date</Text>
          <DatePickerModal
            visible={showDatePicker}
            value={date}
            onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
            onCancel={() => setShowDatePicker(false)}
          />
          <TouchableOpacity
            style={[styles.input, { justifyContent: 'center' }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ fontSize: 15, color: '#111827' }}>📅 {date}</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Kilométrage</Text>
          <TextInput style={styles.input} value={mileage} onChangeText={setMileage} keyboardType="numeric" />

          <Text style={styles.label}>Type de pièce</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={partType} onValueChange={setPartType}>
              {PART_TYPES.map((pt) => (
                <Picker.Item key={pt.value} label={pt.label} value={pt.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Prix (€)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />

          <Text style={styles.label}>Garage</Text>
          <TextInput style={styles.input} value={garage} onChangeText={setGarage} />

          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes} multiline />

          <TouchableOpacity
            style={[styles.btnPrimary, createMutation.isPending && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            <Text style={styles.btnPrimaryText}>
              {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  tabs: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 14, color: '#6b7280' },
  tabTextActive: { color: '#3b82f6', fontWeight: '600' },
  scanSection: { marginBottom: 16 },
  scanButtons: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
  form: {},
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14 },
  pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 },
  btnPrimary: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnSecondaryText: { color: '#374151', fontWeight: '600', fontSize: 14 },
});
