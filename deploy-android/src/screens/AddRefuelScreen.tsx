import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { vehiclesService, refuelsService, ocrService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { Picker } from '@react-native-picker/picker';
import DatePickerModal from '../components/DatePickerModal';
import { shadow } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

const sourceTypes = [
  { value: 'TICKET', label: 'Ticket de caisse', icon: 'receipt-outline' as const },
  { value: 'PUMP', label: 'Pompe', icon: 'flame-outline' as const },
  { value: 'MANUAL', label: 'Manuel', icon: 'pencil-outline' as const },
];

type Step = 'vehicle' | 'capture' | 'verify';

export default function AddRefuelScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const isLocalMode = useAuthStore((state) => state.isLocalMode);
  const preselectedVehicleId = route.params?.vehicleId;

  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState<Step>('vehicle');
  const [selectedVehicleId, setSelectedVehicleId] = useState(preselectedVehicleId || '');
  const [sourceType, setSourceType] = useState('TICKET');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    pricePerLiter: '',
    liters: '',
    totalPrice: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handlePricePerLiter = (text: string) => {
    setFormData((prev) => {
      const newData = { ...prev, pricePerLiter: text };
      const val = parseFloat(text);
      if (!isNaN(val) && val > 0) {
        const liters = parseFloat(prev.liters);
        const total = parseFloat(prev.totalPrice);
        if (!isNaN(liters) && liters > 0) {
          newData.totalPrice = (val * liters).toFixed(2);
        } else if (!isNaN(total) && total > 0) {
          newData.liters = (total / val).toFixed(2);
        }
      }
      return newData;
    });
  };

  const handleLiters = (text: string) => {
    setFormData((prev) => {
      const newData = { ...prev, liters: text };
      const val = parseFloat(text);
      if (!isNaN(val) && val > 0) {
        const ppl = parseFloat(prev.pricePerLiter);
        const total = parseFloat(prev.totalPrice);
        if (!isNaN(ppl) && ppl > 0) {
          newData.totalPrice = (ppl * val).toFixed(2);
        } else if (!isNaN(total) && total > 0) {
          newData.pricePerLiter = (total / val).toFixed(2);
        }
      }
      return newData;
    });
  };

  const handleTotalPrice = (text: string) => {
    setFormData((prev) => {
      const newData = { ...prev, totalPrice: text };
      const val = parseFloat(text);
      if (!isNaN(val) && val > 0) {
        const liters = parseFloat(prev.liters);
        const ppl = parseFloat(prev.pricePerLiter);
        if (!isNaN(liters) && liters > 0) {
          newData.pricePerLiter = (val / liters).toFixed(2);
        } else if (!isNaN(ppl) && ppl > 0) {
          newData.liters = (val / ppl).toFixed(2);
        }
      }
      return newData;
    });
  };

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  });

  const [mileageChecking, setMileageChecking] = useState(false);

  const handleContinue = async () => {
    const enteredMileage = parseInt(formData.mileage);
    if (!selectedVehicleId || isNaN(enteredMileage)) {
      setStep('capture');
      return;
    }

    setMileageChecking(true);
    try {
      const vehicleData = await vehiclesService.getWithStats(selectedVehicleId);
      const currentMileage = vehicleData?.stats?.currentMileage ?? 0;

      if (currentMileage > 0 && enteredMileage < currentMileage) {
        Alert.alert(
          'Kilométrage incorrect',
          `Le kilométrage saisi (${enteredMileage.toLocaleString('fr-FR')} km) est inférieur au dernier kilométrage enregistré (${currentMileage.toLocaleString('fr-FR')} km).\n\nVoulez-vous corriger ou continuer quand même ?`,
          [
            { text: 'Corriger', style: 'cancel' },
            { text: 'Continuer quand même', onPress: () => setStep('capture') },
          ]
        );
      } else {
        setStep('capture');
      }
    } catch {
      setStep('capture');
    } finally {
      setMileageChecking(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      refuelsService.create(selectedVehicleId, {
        date: new Date(formData.date).toISOString(),
        mileage: parseInt(formData.mileage),
        pricePerLiter: parseFloat(formData.pricePerLiter),
        liters: parseFloat(formData.liters),
        totalPrice: parseFloat(formData.totalPrice),
        sourceType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['refuels'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      Alert.alert('Succès', 'Le plein a été enregistré', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: () => {
      Alert.alert('Erreur', "Impossible d'enregistrer le plein");
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await analyzeImage(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à la caméra est nécessaire");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await analyzeImage(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const analyzeImage = async (base64: string, uri: string) => {
    setImageUri(uri);
    setIsAnalyzing(true);

    try {
      const ocrType = sourceType === 'PUMP' ? 'pump' : 'ticket';
      const result = await ocrService.analyze(`data:image/jpeg;base64,${base64}`, ocrType);

      if (result.data) {
        setFormData({
          ...formData,
          pricePerLiter: result.data.pricePerLiter?.toString() || formData.pricePerLiter,
          liters: result.data.liters?.toString() || formData.liters,
          totalPrice: result.data.totalPrice?.toString() || formData.totalPrice,
        });
      }
      setStep('verify');
    } catch (error) {
      Alert.alert('Erreur OCR', "Impossible d'analyser l'image. Saisissez les données manuellement.");
      setStep('verify');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Smart calc: which field would be auto-computed
  const getAutoCalcHint = (field: 'pricePerLiter' | 'liters' | 'totalPrice') => {
    const ppl = parseFloat(formData.pricePerLiter);
    const liters = parseFloat(formData.liters);
    const total = parseFloat(formData.totalPrice);
    const hasPpl = !isNaN(ppl) && ppl > 0;
    const hasLiters = !isNaN(liters) && liters > 0;
    const hasTotal = !isNaN(total) && total > 0;

    if (field === 'totalPrice' && hasPpl && hasLiters) return true;
    if (field === 'liters' && hasPpl && hasTotal) return true;
    if (field === 'pricePerLiter' && hasLiters && hasTotal) return true;
    return false;
  };

  const stepIndex = step === 'vehicle' ? 0 : step === 'capture' ? 1 : 2;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {['Véhicule', 'Capture', 'Vérifier'].map((label, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[
              styles.stepDot,
              i === stepIndex && styles.stepDotActive,
              i < stepIndex && styles.stepDotDone,
            ]}>
              {i < stepIndex
                ? <Ionicons name="checkmark" size={13} color="#fff" />
                : <Text style={[styles.stepDotText, i === stepIndex && styles.stepDotTextActive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, i === stepIndex && styles.stepLabelActive]}>{label}</Text>
            {i < 2 && <View style={[styles.stepLine, i < stepIndex && styles.stepLineDone]} />}
          </View>
        ))}
      </View>

      {/* Step 1: Vehicle selection */}
      {step === 'vehicle' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sélectionner le véhicule</Text>

          <Text style={styles.fieldLabel}>Véhicule</Text>
          <View style={styles.pickerCard}>
            <Ionicons name="car-outline" size={18} color={colors.textMid} style={{ marginLeft: 14 }} />
            <Picker
              selectedValue={selectedVehicleId}
              onValueChange={setSelectedVehicleId}
              style={styles.picker}
              dropdownIconColor={colors.textMid}
            >
              <Picker.Item label="Choisir un véhicule..." value="" color={colors.textLight} />
              {vehicles?.map((v: any) => (
                <Picker.Item
                  key={v.id}
                  label={`${v.brand} ${v.model}`}
                  value={v.id}
                  color={colors.text}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Kilométrage actuel</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="speedometer-outline" size={18} color={colors.textMid} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              placeholder="Ex: 45 000"
              placeholderTextColor={colors.textLight}
              value={formData.mileage}
              onChangeText={(text) => setFormData({ ...formData, mileage: text })}
              keyboardType="numeric"
            />
            <Text style={styles.inputUnit}>km</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!selectedVehicleId || !formData.mileage || mileageChecking) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selectedVehicleId || !formData.mileage || mileageChecking}
          >
            {mileageChecking
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={styles.primaryButtonText}>Continuer</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Capture */}
      {step === 'capture' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capturer les données</Text>

          <Text style={styles.fieldLabel}>Type de source</Text>
          <View style={styles.sourceTypeRow}>
            {sourceTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.sourceTypeChip, sourceType === type.value && styles.sourceTypeChipActive]}
                onPress={() => setSourceType(type.value)}
              >
                <Ionicons
                  name={type.icon}
                  size={14}
                  color={sourceType === type.value ? colors.primary : colors.textMid}
                />
                <Text style={[styles.sourceTypeText, sourceType === type.value && styles.sourceTypeTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLocalMode ? (
            <View style={styles.ocrDisabledBox}>
              <View style={styles.ocrDisabledIconWrap}>
                <Ionicons name="camera-outline" size={34} color={colors.textLight} />
              </View>
              <Text style={styles.ocrDisabledTitle}>Scan non disponible</Text>
              <Text style={styles.ocrDisabledText}>
                La reconnaissance de ticket/pompe nécessite un compte.{'\n'}
                Utilisez la saisie manuelle ci-dessous.
              </Text>
            </View>
          ) : isAnalyzing ? (
            <View style={styles.analyzingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.analyzingText}>Analyse en cours...</Text>
              <Text style={styles.analyzingSubText}>L'IA extrait les données de votre image</Text>
            </View>
          ) : (
            <View style={styles.captureButtons}>
              <TouchableOpacity style={styles.captureCard} onPress={takePhoto}>
                <View style={styles.captureIconWrap}>
                  <Ionicons name="camera" size={34} color={colors.primary} />
                </View>
                <Text style={styles.captureCardTitle}>Prendre une photo</Text>
                <Text style={styles.captureCardSub}>Appareil photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.captureCard} onPress={pickImage}>
                <View style={styles.captureIconWrap}>
                  <Ionicons name="image" size={34} color={colors.primary} />
                </View>
                <Text style={styles.captureCardTitle}>Choisir une image</Text>
                <Text style={styles.captureCardSub}>Depuis la galerie</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => {
              setSourceType('MANUAL');
              setStep('verify');
            }}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.textMid} />
            <Text style={styles.manualButtonText}>Saisie manuelle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => setStep('vehicle')}>
            <Ionicons name="arrow-back" size={16} color={colors.textLight} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3: Verify */}
      {step === 'verify' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vérifier les données</Text>

          <DatePickerModal
            visible={showDatePicker}
            value={formData.date}
            onConfirm={(d) => { setFormData((p) => ({ ...p, date: d })); setShowDatePicker(false); }}
            onCancel={() => setShowDatePicker(false)}
          />

          <Text style={styles.fieldLabel}>Date du plein</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.dateInputText}>{formData.date}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textLight} />
          </TouchableOpacity>

          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          )}

          {/* Smart calc info banner */}
          <View style={styles.calcInfoBanner}>
            <Ionicons name="flash" size={14} color={colors.primary} />
            <Text style={styles.calcInfoText}>Les champs manquants sont calculés automatiquement</Text>
          </View>

          <Text style={styles.fieldLabel}>Prix au litre (€)</Text>
          <View style={[styles.inputWithIcon, getAutoCalcHint('pricePerLiter') && styles.inputAutoCalc]}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textMid} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              placeholder="Ex: 1.789"
              placeholderTextColor={colors.textLight}
              value={formData.pricePerLiter}
              onChangeText={handlePricePerLiter}
              keyboardType="decimal-pad"
            />
            {getAutoCalcHint('pricePerLiter') && (
              <Ionicons name="flash" size={14} color={colors.primary} style={{ marginRight: 12 }} />
            )}
          </View>

          <Text style={styles.fieldLabel}>Quantité (L)</Text>
          <View style={[styles.inputWithIcon, getAutoCalcHint('liters') && styles.inputAutoCalc]}>
            <Ionicons name="water-outline" size={18} color={colors.textMid} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              placeholder="Ex: 45.32"
              placeholderTextColor={colors.textLight}
              value={formData.liters}
              onChangeText={handleLiters}
              keyboardType="decimal-pad"
            />
            {getAutoCalcHint('liters') && (
              <Ionicons name="flash" size={14} color={colors.primary} style={{ marginRight: 12 }} />
            )}
          </View>

          <Text style={styles.fieldLabel}>Prix total (€)</Text>
          <View style={[styles.inputWithIcon, getAutoCalcHint('totalPrice') && styles.inputAutoCalc]}>
            <Ionicons name="cash-outline" size={18} color={colors.textMid} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              placeholder="Ex: 75.50"
              placeholderTextColor={colors.textLight}
              value={formData.totalPrice}
              onChangeText={handleTotalPrice}
              keyboardType="decimal-pad"
            />
            {getAutoCalcHint('totalPrice') && (
              <Ionicons name="flash" size={14} color={colors.primary} style={{ marginRight: 12 }} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, createMutation.isPending && styles.buttonDisabled]}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Enregistrer le plein</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => setStep('capture')}>
            <Ionicons name="arrow-back" size={16} color={colors.textLight} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.background,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: c.primary, borderColor: c.primary },
  stepDotDone: { backgroundColor: c.success, borderColor: c.success },
  stepDotText: { fontSize: 12, fontWeight: '700', color: c.textLight },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: c.textLight, marginLeft: 6, fontWeight: '500' },
  stepLabelActive: { color: c.primary, fontWeight: '700' },
  stepLine: { width: 28, height: 2, backgroundColor: c.border, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: c.success },

  // Section
  section: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.textMid, marginBottom: 8, marginTop: 16 },

  // Picker card
  pickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    marginBottom: 4,
    overflow: 'hidden',
  },
  picker: { flex: 1, color: c.text },

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
  inputAutoCalc: {
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
  },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  inputInner: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15, color: c.text },
  inputUnit: { paddingRight: 14, fontSize: 14, color: c.textMid, fontWeight: '600' },

  // Buttons
  primaryButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    ...shadow.sm,
  },
  buttonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Source type chips
  sourceTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  sourceTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  sourceTypeChipActive: { backgroundColor: c.primaryLight, borderColor: c.primary },
  sourceTypeText: { fontSize: 13, color: c.textMid, fontWeight: '500' },
  sourceTypeTextActive: { color: c.primary, fontWeight: '700' },

  // Capture cards
  captureButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  captureCard: {
    flex: 1,
    backgroundColor: c.card,
    borderWidth: 2,
    borderColor: c.primaryMid,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    ...shadow.sm,
  },
  captureIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  captureCardTitle: { color: c.text, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  captureCardSub: { color: c.textLight, fontSize: 12, textAlign: 'center' },

  // Analyzing
  analyzingBox: {
    alignItems: 'center',
    padding: 44,
    gap: 12,
    backgroundColor: c.card,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  analyzingText: { color: c.text, fontWeight: '700', fontSize: 16 },
  analyzingSubText: { color: c.textLight, fontSize: 13 },

  // OCR disabled
  ocrDisabledBox: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  ocrDisabledIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ocrDisabledTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  ocrDisabledText: { fontSize: 13, color: c.textLight, textAlign: 'center', lineHeight: 20 },

  // Manual / back
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    backgroundColor: c.card,
  },
  manualButtonText: { color: c.textMid, fontWeight: '600', fontSize: 15 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    marginTop: 8,
  },
  backButtonText: { color: c.textLight, fontSize: 14 },

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

  // Preview
  preview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 4, marginTop: 12 },

  // Smart calc banner
  calcInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  calcInfoText: { fontSize: 12, color: c.primary, fontWeight: '500', flex: 1 },
});
