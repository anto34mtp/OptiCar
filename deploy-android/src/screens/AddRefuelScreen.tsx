import { useState } from 'react';
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
import { vehiclesService, refuelsService, ocrService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { Picker } from '@react-native-picker/picker';

const sourceTypes = [
  { value: 'TICKET', label: 'Ticket de caisse' },
  { value: 'PUMP', label: 'Pompe à essence' },
  { value: 'MANUAL', label: 'Saisie manuelle' },
];

export default function AddRefuelScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const isLocalMode = useAuthStore((state) => state.isLocalMode);
  const preselectedVehicleId = route.params?.vehicleId;

  const [step, setStep] = useState<'vehicle' | 'capture' | 'verify'>('vehicle');
  const [selectedVehicleId, setSelectedVehicleId] = useState(preselectedVehicleId || '');
  const [sourceType, setSourceType] = useState('TICKET');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    mileage: '',
    pricePerLiter: '',
    liters: '',
    totalPrice: '',
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      refuelsService.create(selectedVehicleId, {
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
      Alert.alert('Erreur', 'Impossible d\'enregistrer le plein');
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
      Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire');
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
      Alert.alert('Erreur OCR', 'Impossible d\'analyser l\'image. Saisissez les données manuellement.');
      setStep('verify');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Step 1: Vehicle selection */}
      {step === 'vehicle' && (
        <View style={styles.section}>
          <Text style={styles.stepTitle}>1. Sélectionner le véhicule</Text>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedVehicleId}
              onValueChange={setSelectedVehicleId}
            >
              <Picker.Item label="Choisir un véhicule..." value="" />
              {vehicles?.map((v: any) => (
                <Picker.Item
                  key={v.id}
                  label={`${v.brand} ${v.model}`}
                  value={v.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Kilométrage actuel</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 45000"
            value={formData.mileage}
            onChangeText={(text) => setFormData({ ...formData, mileage: text })}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.button, (!selectedVehicleId || !formData.mileage) && styles.buttonDisabled]}
            onPress={() => setStep('capture')}
            disabled={!selectedVehicleId || !formData.mileage}
          >
            <Text style={styles.buttonText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Capture */}
      {step === 'capture' && (
        <View style={styles.section}>
          <Text style={styles.stepTitle}>2. Capturer les données</Text>

          <Text style={styles.label}>Type de source</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={sourceType}
              onValueChange={setSourceType}
            >
              {sourceTypes.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>

          {isLocalMode ? (
            <View style={styles.ocrDisabledBox}>
              <Text style={styles.ocrDisabledIcon}>📷</Text>
              <Text style={styles.ocrDisabledTitle}>Scan non disponible</Text>
              <Text style={styles.ocrDisabledText}>
                La reconnaissance de ticket/pompe nécessite un compte.{'\n'}
                Utilisez la saisie manuelle ci-dessous.
              </Text>
            </View>
          ) : isAnalyzing ? (
            <View style={styles.analyzing}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.analyzingText}>Analyse en cours...</Text>
            </View>
          ) : (
            <View style={styles.captureButtons}>
              <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <Text style={styles.captureIcon}>📷</Text>
                <Text style={styles.captureText}>Prendre une photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.captureButton} onPress={pickImage}>
                <Text style={styles.captureIcon}>🖼️</Text>
                <Text style={styles.captureText}>Choisir une image</Text>
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
            <Text style={styles.manualButtonText}>Saisie manuelle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => setStep('vehicle')}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3: Verify */}
      {step === 'verify' && (
        <View style={styles.section}>
          <Text style={styles.stepTitle}>3. Vérifier les données</Text>

          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          )}

          <Text style={styles.label}>Prix au litre (€)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 1.789"
            value={formData.pricePerLiter}
            onChangeText={(text) => setFormData({ ...formData, pricePerLiter: text })}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Quantité (L)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 45.32"
            value={formData.liters}
            onChangeText={(text) => setFormData({ ...formData, liters: text })}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Prix total (€)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 75.50"
            value={formData.totalPrice}
            onChangeText={(text) => setFormData({ ...formData, totalPrice: text })}
            keyboardType="decimal-pad"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Text style={styles.buttonText}>
              {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer le plein'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => setStep('capture')}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  section: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  captureButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  captureButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  captureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  captureText: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  analyzing: {
    alignItems: 'center',
    padding: 40,
  },
  analyzingText: {
    marginTop: 16,
    color: '#6b7280',
  },
  manualButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  manualButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    color: '#6b7280',
  },
  ocrDisabledBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  ocrDisabledIcon: { fontSize: 36 },
  ocrDisabledTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  ocrDisabledText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
});
