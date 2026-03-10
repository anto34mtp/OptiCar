import { useState, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { vehiclesService } from '../services/api';
import { BRAND_LIST, BRAND_MODELS } from '../data/vehicleBrands';
import { shadow, fuelColors } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

const fuelTypes = ['SP95', 'SP98', 'E10', 'E85', 'DIESEL', 'ELECTRIC'];

export default function VehiclesScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showModal, setShowModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('Renault');
  const [customBrand, setCustomBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customModel, setCustomModel] = useState('');
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

  const resetForm = () => {
    setSelectedBrand('Renault');
    setCustomBrand('');
    setSelectedModel('');
    setCustomModel('');
    setFormData({ brand: 'Renault', model: '', fuelType: 'SP95', year: '', co2PerKm: '' });
  };

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
      resetForm();
    },
    onError: () => {
      Alert.alert('Erreur', 'Impossible de créer le véhicule');
    },
  });

  const modelOptions =
    selectedBrand !== 'Autre' && BRAND_MODELS[selectedBrand]
      ? [...BRAND_MODELS[selectedBrand], 'Autre']
      : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes véhicules</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
        {isLoading ? (
          <Text style={styles.loading}>Chargement...</Text>
        ) : vehicles?.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={() => setShowModal(true)}>
            <Ionicons name="car-outline" size={40} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Aucun véhicule</Text>
            <Text style={styles.emptyLink}>Ajouter votre premier véhicule</Text>
          </TouchableOpacity>
        ) : (
          vehicles?.map((vehicle: any) => {
            const fc = fuelColors[vehicle.fuelType] || fuelColors['SP95'];
            return (
              <TouchableOpacity
                key={vehicle.id}
                style={styles.vehicleCard}
                onPress={() => navigation.navigate('VehicleDetail', { id: vehicle.id })}
                activeOpacity={0.75}
              >
                <View style={[styles.vehicleIconBox, { backgroundColor: fc.bg }]}>
                  <Ionicons name="car" size={22} color={fc.text} />
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  <Text style={styles.vehicleMeta}>
                    {vehicle._count?.refuels || 0} pleins
                    {vehicle.year ? `  ·  ${vehicle.year}` : ''}
                  </Text>
                </View>
                <View style={styles.vehicleRight}>
                  <View style={[styles.fuelBadge, { backgroundColor: fc.bg, borderColor: fc.border }]}>
                    <Text style={[styles.fuelText, { color: fc.text }]}>{vehicle.fuelType}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textLight} style={{ marginTop: 6 }} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nouveau véhicule</Text>

              <Text style={styles.fieldLabel}>Marque</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedBrand}
                  onValueChange={(value) => {
                    setSelectedBrand(value);
                    setSelectedModel('');
                    setCustomModel('');
                    if (value !== 'Autre') {
                      setFormData({ ...formData, brand: value, model: '' });
                      setCustomBrand('');
                    } else {
                      setFormData({ ...formData, brand: customBrand, model: '' });
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
                  placeholderTextColor={colors.textLight}
                  value={customBrand}
                  onChangeText={(text) => {
                    setCustomBrand(text);
                    setFormData({ ...formData, brand: text });
                  }}
                />
              )}

              <Text style={styles.fieldLabel}>Modèle</Text>
              {selectedBrand !== 'Autre' && modelOptions.length > 0 ? (
                <>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedModel}
                      onValueChange={(value) => {
                        setSelectedModel(value);
                        if (value !== 'Autre') {
                          setFormData({ ...formData, model: value });
                          setCustomModel('');
                        } else {
                          setFormData({ ...formData, model: customModel });
                        }
                      }}
                    >
                      <Picker.Item label="-- Choisir un modèle --" value="" />
                      {modelOptions.map((m) => (
                        <Picker.Item key={m} label={m} value={m} />
                      ))}
                    </Picker>
                  </View>
                  {selectedModel === 'Autre' && (
                    <TextInput
                      style={styles.input}
                      placeholder="Saisir le modèle"
                      placeholderTextColor={colors.textLight}
                      value={customModel}
                      onChangeText={(text) => {
                        setCustomModel(text);
                        setFormData({ ...formData, model: text });
                      }}
                    />
                  )}
                </>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Saisir le modèle"
                  placeholderTextColor={colors.textLight}
                  value={formData.model}
                  onChangeText={(text) => setFormData({ ...formData, model: text })}
                />
              )}

              <Text style={styles.fieldLabel}>Carburant</Text>
              <View style={styles.fuelPicker}>
                {fuelTypes.map((type) => {
                  const fc = fuelColors[type] || fuelColors['SP95'];
                  const selected = formData.fuelType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.fuelOption,
                        { borderColor: selected ? fc.text : colors.border, backgroundColor: selected ? fc.bg : colors.card },
                      ]}
                      onPress={() => setFormData({ ...formData, fuelType: type })}
                    >
                      <Text style={[styles.fuelOptionText, { color: selected ? fc.text : colors.textMid }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Année</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2020"
                    placeholderTextColor={colors.textLight}
                    value={formData.year}
                    onChangeText={(text) => setFormData({ ...formData, year: text })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>CO2 g/km</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="120"
                    placeholderTextColor={colors.textLight}
                    value={formData.co2PerKm}
                    onChangeText={(text) => setFormData({ ...formData, co2PerKm: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, (!formData.brand || !formData.model) && { opacity: 0.5 }]}
                  onPress={() => createMutation.mutate()}
                  disabled={!formData.brand || !formData.model}
                >
                  <Text style={styles.submitButtonText}>
                    {createMutation.isPending ? 'Création...' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.dark,
  },

  // Header
  header: {
    backgroundColor: c.dark,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  list: {
    flex: 1,
    backgroundColor: c.background,
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    ...shadow.sm,
  },
  vehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: '600',
    color: c.text,
  },
  vehicleMeta: {
    fontSize: 12,
    color: c.textMid,
    marginTop: 3,
  },
  vehicleRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  fuelBadge: {
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fuelText: {
    fontSize: 11,
    fontWeight: '600',
  },

  loading: {
    textAlign: 'center',
    color: c.textLight,
    marginTop: 40,
  },
  emptyCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    ...shadow.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textMid,
  },
  emptyLink: {
    color: c.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: c.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMid,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: c.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: c.text,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  pickerContainer: {
    backgroundColor: c.background,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  fuelPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  fuelOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  fuelOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: c.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  cancelButtonText: {
    color: c.textMid,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: c.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
