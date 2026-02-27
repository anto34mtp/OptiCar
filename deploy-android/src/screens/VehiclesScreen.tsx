import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { vehiclesService } from '../services/api';

const fuelTypes = ['SP95', 'SP98', 'E10', 'E85', 'DIESEL', 'ELECTRIC'];

const BRAND_LIST = [
  'Renault', 'Peugeot', 'Citroën', 'Dacia', 'Toyota', 'Volkswagen',
  'Ford', 'Audi', 'BMW', 'Mercedes', 'Opel', 'Fiat', 'Hyundai',
  'Kia', 'Nissan', 'Seat', 'Skoda', 'Volvo', 'Autre',
];

export default function VehiclesScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('Renault');
  const [customBrand, setCustomBrand] = useState('');
  const [formData, setFormData] = useState({
    brand: 'Renault',
    model: '',
    fuelType: 'SP95',
    year: '',
    co2PerKm: '',
  });

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      vehiclesService.create({
        brand: formData.brand,
        model: formData.model,
        fuelType: formData.fuelType,
        year: formData.year ? parseInt(formData.year) : undefined,
        co2PerKm: formData.co2PerKm ? parseInt(formData.co2PerKm) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowModal(false);
      setSelectedBrand('Renault');
      setCustomBrand('');
      setFormData({ brand: 'Renault', model: '', fuelType: 'SP95', year: '', co2PerKm: '' });
    },
    onError: () => {
      Alert.alert('Erreur', 'Impossible de créer le véhicule');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes véhicules</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {isLoading ? (
          <Text style={styles.loading}>Chargement...</Text>
        ) : vehicles?.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun véhicule enregistré</Text>
            <TouchableOpacity onPress={() => setShowModal(true)}>
              <Text style={styles.emptyLink}>Ajouter votre premier véhicule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          vehicles?.map((vehicle: any) => (
            <TouchableOpacity
              key={vehicle.id}
              style={styles.vehicleCard}
              onPress={() => navigation.navigate('VehicleDetail', { id: vehicle.id })}
            >
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>
                  {vehicle.brand} {vehicle.model}
                </Text>
                {vehicle.year && (
                  <Text style={styles.vehicleYear}>{vehicle.year}</Text>
                )}
                <Text style={styles.vehicleRefuels}>
                  {vehicle._count?.refuels || 0} pleins
                </Text>
              </View>
              <View style={styles.fuelBadge}>
                <Text style={styles.fuelText}>{vehicle.fuelType}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Vehicle Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouveau véhicule</Text>

            <Text style={styles.fieldLabel}>Marque</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedBrand}
                onValueChange={(value) => {
                  setSelectedBrand(value);
                  if (value !== 'Autre') {
                    setFormData({ ...formData, brand: value });
                    setCustomBrand('');
                  } else {
                    setFormData({ ...formData, brand: customBrand });
                  }
                }}
              >
                {BRAND_LIST.map((b) => (
                  <Picker.Item key={b} label={b} value={b} />
                ))}
              </Picker>
            </View>

            {selectedBrand === 'Autre' && (
              <TextInput
                style={styles.input}
                placeholder="Saisir la marque"
                value={customBrand}
                onChangeText={(text) => {
                  setCustomBrand(text);
                  setFormData({ ...formData, brand: text });
                }}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Modèle"
              value={formData.model}
              onChangeText={(text) => setFormData({ ...formData, model: text })}
            />

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.fuelType}
                onValueChange={(value) => setFormData({ ...formData, fuelType: value })}
              >
                {fuelTypes.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Année (optionnel)"
              value={formData.year}
              onChangeText={(text) => setFormData({ ...formData, year: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="CO2 g/km (optionnel, ex: 120)"
              value={formData.co2PerKm}
              onChangeText={(text) => setFormData({ ...formData, co2PerKm: text })}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => createMutation.mutate()}
                disabled={!formData.brand || !formData.model}
              >
                <Text style={styles.submitButtonText}>
                  {createMutation.isPending ? 'Création...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  list: {
    padding: 20,
  },
  loading: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 40,
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  vehicleYear: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  vehicleRefuels: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  fuelBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fuelText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyLink: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
