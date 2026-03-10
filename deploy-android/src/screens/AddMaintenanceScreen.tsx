import { useState, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../services/api';
import { shadow } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

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

  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Mode tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'manual' && styles.tabActive]}
          onPress={() => setMode('manual')}
        >
          <Ionicons
            name="pencil-outline"
            size={16}
            color={mode === 'manual' ? colors.primary : colors.textMid}
          />
          <Text style={[styles.tabText, mode === 'manual' && styles.tabTextActive]}>Manuel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'scan' && styles.tabActive]}
          onPress={() => setMode('scan')}
        >
          <Ionicons
            name="scan-outline"
            size={16}
            color={mode === 'scan' ? colors.primary : colors.textMid}
          />
          <Text style={[styles.tabText, mode === 'scan' && styles.tabTextActive]}>Scanner facture</Text>
        </TouchableOpacity>
      </View>

      {/* Scan mode */}
      {mode === 'scan' && (
        <View style={styles.scanSection}>
          <View style={styles.scanButtons}>
            <TouchableOpacity style={styles.scanCard} onPress={takePhoto}>
              <View style={styles.scanIconWrap}>
                <Ionicons name="camera" size={28} color={colors.primary} />
              </View>
              <Text style={styles.scanCardLabel}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanCard} onPress={pickImage}>
              <View style={styles.scanIconWrap}>
                <Ionicons name="image" size={28} color={colors.primary} />
              </View>
              <Text style={styles.scanCardLabel}>Galerie</Text>
            </TouchableOpacity>
          </View>

          {scanImage && (
            <Image source={{ uri: scanImage }} style={styles.preview} resizeMode="contain" />
          )}

          <TouchableOpacity
            style={[styles.analyzeBtn, (!scanImage || scanning) && styles.btnDisabled]}
            onPress={handleScan}
            disabled={!scanImage || scanning}
          >
            {scanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="flash-outline" size={18} color="#fff" />
                <Text style={styles.analyzeBtnText}>Analyser la facture</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Manual form */}
      {mode === 'manual' && (
        <View style={styles.form}>
          <DatePickerModal
            visible={showDatePicker}
            value={date}
            onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
            onCancel={() => setShowDatePicker(false)}
          />

          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.dateInputText}>{date}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textLight} />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Kilométrage</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="speedometer-outline" size={18} color={colors.textMid} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              value={mileage}
              onChangeText={setMileage}
              keyboardType="numeric"
              placeholder="Ex: 45 000"
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.inputUnit}>km</Text>
          </View>

          <Text style={styles.fieldLabel}>Type d'entretien</Text>
          <View style={styles.pickerContainer}>
            <Ionicons name="construct-outline" size={18} color={colors.textMid} style={{ marginLeft: 14 }} />
            <Picker
              selectedValue={partType}
              onValueChange={setPartType}
              style={styles.picker}
              dropdownIconColor={colors.textMid}
            >
              {PART_TYPES.map((pt) => (
                <Picker.Item key={pt.value} label={pt.label} value={pt.value} color={colors.text} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Prix (€)</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="cash-outline" size={18} color={colors.textMid} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="Ex: 89.00"
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.inputUnit}>€</Text>
          </View>

          <Text style={styles.fieldLabel}>Garage</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="business-outline" size={18} color={colors.textMid} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              value={garage}
              onChangeText={setGarage}
              placeholder="Nom du garage (optionnel)"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Notes complémentaires (optionnel)"
            placeholderTextColor={colors.textLight}
          />

          <TouchableOpacity
            style={[styles.submitBtn, createMutation.isPending && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Enregistrer l'entretien</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background, padding: 16 },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: c.primaryLight,
    ...shadow.sm,
  },
  tabText: { fontSize: 14, color: c.textMid, fontWeight: '500' },
  tabTextActive: { color: c.primary, fontWeight: '700' },

  // Scan section
  scanSection: { marginBottom: 16 },
  scanButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  scanCard: {
    flex: 1,
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: c.primaryMid,
    ...shadow.sm,
  },
  scanIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCardLabel: { fontSize: 14, fontWeight: '700', color: c.text },
  preview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  analyzeBtn: {
    backgroundColor: c.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...shadow.sm,
  },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.45 },

  // Manual form
  form: {},
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.textMid, marginBottom: 8, marginTop: 16 },

  // Date input
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    padding: 14,
  },
  dateInputText: { flex: 1, fontSize: 15, color: c.text, fontWeight: '500' },

  // Input with icon
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  inputInner: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15, color: c.text },
  inputUnit: { paddingRight: 14, fontSize: 14, color: c.textMid, fontWeight: '600' },

  // Picker
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: { flex: 1, color: c.text },

  // Text area
  textArea: {
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: c.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },

  // Submit
  submitBtn: {
    backgroundColor: c.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...shadow.sm,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
