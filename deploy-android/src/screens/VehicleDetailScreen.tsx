import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { vehiclesService, refuelsService, refuelsExtService } from '../services/api';
import { BRAND_LIST, BRAND_MODELS } from '../data/vehicleBrands';
import { shadow, fuelColors } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

const fuelTypes = ['SP95', 'SP98', 'E10', 'E85', 'DIESEL', 'ELECTRIC'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR');
}

export default function VehicleDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { id } = route.params;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Edit vehicle state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSelectedBrand, setEditSelectedBrand] = useState('');
  const [editCustomBrand, setEditCustomBrand] = useState('');
  const [editSelectedModel, setEditSelectedModel] = useState('');
  const [editCustomModel, setEditCustomModel] = useState('');
  const [editVehicleForm, setEditVehicleForm] = useState({
    brand: '',
    model: '',
    fuelType: 'SP95',
    year: '',
    co2PerKm: '',
  });

  const { data: vehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicles', id, 'stats'],
    queryFn: () => vehiclesService.getWithStats(id),
  });

  const { data: refuels } = useQuery({
    queryKey: ['refuels', id],
    queryFn: () => refuelsService.getByVehicle(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => vehiclesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      navigation.goBack();
    },
  });

  const deleteRefuelMutation = useMutation({
    mutationFn: (refuelId: string) => refuelsExtService.delete(refuelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuels', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'stats'] });
    },
  });

  const updateRefuelMutation = useMutation({
    mutationFn: ({ refuelId, data }: { refuelId: string; data: any }) =>
      refuelsExtService.update(refuelId, data),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['refuels', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'stats'] });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: (data: any) => vehiclesService.update(id, data),
    onSuccess: () => {
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'stats'] });
    },
    onError: () => {
      Alert.alert('Erreur', 'Impossible de modifier le véhicule');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le véhicule',
      'Êtes-vous sûr ? Tous les pleins associés seront supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const handleDeleteRefuel = (refuelId: string) => {
    Alert.alert('Supprimer ce plein ?', '', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteRefuelMutation.mutate(refuelId) },
    ]);
  };

  const openEditModal = () => {
    const brand = vehicle?.brand || '';
    const model = vehicle?.model || '';
    const isBrandInList = BRAND_LIST.includes(brand) && brand !== 'Autre';
    const isModelInList = isBrandInList && BRAND_MODELS[brand]?.includes(model);

    setEditSelectedBrand(isBrandInList ? brand : 'Autre');
    setEditCustomBrand(isBrandInList ? '' : brand);
    setEditSelectedModel(isModelInList ? model : (isBrandInList ? 'Autre' : ''));
    setEditCustomModel(isModelInList ? '' : model);
    setEditVehicleForm({
      brand,
      model,
      fuelType: vehicle?.fuelType || 'SP95',
      year: vehicle?.year ? String(vehicle.year) : '',
      co2PerKm: vehicle?.co2PerKm ? String(vehicle.co2PerKm) : '',
    });
    setShowEditModal(true);
  };

  const handleSaveVehicle = () => {
    const data: any = {
      brand: editVehicleForm.brand,
      model: editVehicleForm.model,
      fuelType: editVehicleForm.fuelType,
    };
    if (editVehicleForm.year) data.year = parseInt(editVehicleForm.year);
    if (editVehicleForm.co2PerKm) data.co2PerKm = parseInt(editVehicleForm.co2PerKm);
    updateVehicleMutation.mutate(data);
  };

  const editModelOptions = editSelectedBrand !== 'Autre' && BRAND_MODELS[editSelectedBrand]
    ? [...BRAND_MODELS[editSelectedBrand], 'Autre']
    : [];

  if (vehicleLoading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const fuelColor = fuelColors[vehicle?.fuelType] || fuelColors['SP95'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={[styles.fuelBadge, { backgroundColor: fuelColor.bg, borderColor: fuelColor.border }]}>
            <Ionicons name="flame-outline" size={12} color={fuelColor.text} />
            <Text style={[styles.fuelText, { color: fuelColor.text }]}>{vehicle?.fuelType}</Text>
          </View>
          {vehicle?.co2PerKm && (
            <View style={styles.co2Badge}>
              <Ionicons name="leaf-outline" size={12} color={colors.success} />
              <Text style={styles.co2Text}>{vehicle.co2PerKm} g CO₂/km</Text>
            </View>
          )}
        </View>
        <Text style={styles.heroTitle}>{vehicle?.brand} {vehicle?.model}</Text>
        {vehicle?.year && (
          <Text style={styles.heroYear}>{vehicle.year}</Text>
        )}
      </View>

      {/* Mileage Card */}
      <View style={styles.mileageCard}>
        <View style={styles.mileageLeft}>
          <View style={styles.mileageIconWrap}>
            <Ionicons name="speedometer-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.mileageLabel}>Kilométrage actuel</Text>
        </View>
        <Text style={styles.mileageValue}>
          {(vehicle?.stats?.currentMileage || 0).toLocaleString('fr-FR')} <Text style={styles.mileageUnit}>km</Text>
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(vehicle?.stats?.totalSpent || 0)}</Text>
          <Text style={styles.statLabel}>Dépenses</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="speedometer-outline" size={20} color={colors.warning} />
          </View>
          <Text style={styles.statValue}>
            {vehicle?.stats?.averageConsumption
              ? `${vehicle.stats.averageConsumption.toFixed(1)} L/100`
              : 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Consommation</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.successLight }]}>
            <Ionicons name="navigate-outline" size={20} color={colors.success} />
          </View>
          <Text style={styles.statValue}>
            {(vehicle?.stats?.totalDistance || 0).toLocaleString('fr-FR')} km
          </Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.purpleLight }]}>
            <Ionicons name="water-outline" size={20} color={colors.purple} />
          </View>
          <Text style={styles.statValue}>{vehicle?.stats?.totalRefuels || 0}</Text>
          <Text style={styles.statLabel}>Pleins</Text>
        </View>
      </View>

      {/* Primary Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddRefuel', { vehicleId: id })}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Ajouter un plein</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
      </View>

      {/* Secondary Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.maintenanceButton}
          onPress={() => navigation.navigate('VehicleMaintenance', { vehicleId: id, vehicleName: `${vehicle?.brand} ${vehicle?.model}` })}
        >
          <Ionicons name="construct-outline" size={16} color={colors.success} />
          <Text style={styles.maintenanceButtonText}>Entretiens</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.insuranceButton}
          onPress={() => navigation.navigate('Insurance', { vehicleId: id, vehicleName: `${vehicle?.brand} ${vehicle?.model}` })}
        >
          <Ionicons name="shield-outline" size={16} color={colors.purple} />
          <Text style={styles.insuranceButtonText}>Assurance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Refuels History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique des pleins</Text>

        {refuels?.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="water-outline" size={36} color={colors.textLight} />
            <Text style={styles.emptyText}>Aucun plein enregistré</Text>
            <Text style={styles.emptySubText}>Ajoutez votre premier plein ci-dessus</Text>
          </View>
        ) : (
          refuels?.map((refuel: any) => (
            <View key={refuel.id} style={styles.refuelCard}>
              {editingId === refuel.id ? (
                <View>
                  <Text style={styles.editSectionLabel}>Modifier le plein</Text>
                  <View style={styles.editRow}>
                    <View style={styles.editLabelWrap}>
                      <Ionicons name="speedometer-outline" size={14} color={colors.textLight} />
                      <Text style={styles.editLabel}>Km</Text>
                    </View>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="numeric"
                      value={String(editForm.mileage || '')}
                      onChangeText={(v) => setEditForm({ ...editForm, mileage: Number(v) })}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.editRow}>
                    <View style={styles.editLabelWrap}>
                      <Ionicons name="water-outline" size={14} color={colors.textLight} />
                      <Text style={styles.editLabel}>Litres</Text>
                    </View>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="numeric"
                      value={String(editForm.liters || '')}
                      onChangeText={(v) => setEditForm({ ...editForm, liters: Number(v) })}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.editRow}>
                    <View style={styles.editLabelWrap}>
                      <Ionicons name="pricetag-outline" size={14} color={colors.textLight} />
                      <Text style={styles.editLabel}>Prix/L</Text>
                    </View>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="numeric"
                      value={String(editForm.pricePerLiter || '')}
                      onChangeText={(v) => setEditForm({ ...editForm, pricePerLiter: Number(v) })}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.editRow}>
                    <View style={styles.editLabelWrap}>
                      <Ionicons name="cash-outline" size={14} color={colors.textLight} />
                      <Text style={styles.editLabel}>Total</Text>
                    </View>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="numeric"
                      value={String(editForm.totalPrice || '')}
                      onChangeText={(v) => setEditForm({ ...editForm, totalPrice: Number(v) })}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={() => updateRefuelMutation.mutate({ refuelId: refuel.id, data: editForm })}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text style={styles.saveBtnText}>Sauvegarder</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingId(null)}>
                      <Text style={styles.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.refuelHeader}>
                    <View style={styles.refuelDateRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMid} />
                      <Text style={styles.refuelDate}>{formatDate(refuel.date)}</Text>
                    </View>
                    <Text style={styles.refuelTotal}>{formatCurrency(refuel.totalPrice)}</Text>
                  </View>
                  <View style={styles.refuelDetails}>
                    <Text style={styles.refuelDetail}>
                      <Ionicons name="water-outline" size={12} color={colors.textLight} />{' '}
                      {refuel.liters.toFixed(2)} L @ {refuel.pricePerLiter.toFixed(3)} €/L
                    </Text>
                    <Text style={styles.refuelDetail}>
                      {refuel.mileage.toLocaleString('fr-FR')} km
                    </Text>
                  </View>
                  {refuel.consumption && (
                    <View style={styles.consumptionBadge}>
                      <Ionicons name="trending-up-outline" size={12} color={colors.success} />
                      <Text style={styles.refuelConsumption}>
                        {refuel.consumption.toFixed(1)} L/100km
                      </Text>
                    </View>
                  )}
                  <View style={styles.refuelActions}>
                    <TouchableOpacity
                      style={styles.refuelActionBtn}
                      onPress={() => {
                        setEditingId(refuel.id);
                        setEditForm({
                          mileage: refuel.mileage,
                          liters: refuel.liters,
                          pricePerLiter: refuel.pricePerLiter,
                          totalPrice: refuel.totalPrice,
                        });
                      }}
                    >
                      <Ionicons name="create-outline" size={14} color={colors.primary} />
                      <Text style={styles.editText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.refuelActionBtn}
                      onPress={() => handleDeleteRefuel(refuel.id)}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      <Text style={styles.deleteText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))
        )}
      </View>

      {/* Edit Vehicle Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Modifier le véhicule</Text>

              <Text style={styles.fieldLabel}>Marque</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editSelectedBrand}
                  onValueChange={(value) => {
                    setEditSelectedBrand(value);
                    setEditSelectedModel('');
                    setEditCustomModel('');
                    if (value !== 'Autre') {
                      setEditVehicleForm({ ...editVehicleForm, brand: value, model: '' });
                      setEditCustomBrand('');
                    } else {
                      setEditVehicleForm({ ...editVehicleForm, brand: editCustomBrand, model: '' });
                    }
                  }}
                  dropdownIconColor={colors.textMid}
                >
                  {BRAND_LIST.map((b) => (
                    <Picker.Item key={b} label={b} value={b} color={colors.text} />
                  ))}
                </Picker>
              </View>

              {editSelectedBrand === 'Autre' && (
                <TextInput
                  style={styles.input}
                  placeholder="Saisir la marque"
                  placeholderTextColor={colors.textLight}
                  value={editCustomBrand}
                  onChangeText={(text) => {
                    setEditCustomBrand(text);
                    setEditVehicleForm({ ...editVehicleForm, brand: text });
                  }}
                />
              )}

              <Text style={styles.fieldLabel}>Modèle</Text>
              {editSelectedBrand !== 'Autre' && editModelOptions.length > 0 ? (
                <>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editSelectedModel}
                      onValueChange={(value) => {
                        setEditSelectedModel(value);
                        if (value !== 'Autre') {
                          setEditVehicleForm({ ...editVehicleForm, model: value });
                          setEditCustomModel('');
                        } else {
                          setEditVehicleForm({ ...editVehicleForm, model: editCustomModel });
                        }
                      }}
                      dropdownIconColor={colors.textMid}
                    >
                      <Picker.Item label="-- Choisir un modèle --" value="" color={colors.textMid} />
                      {editModelOptions.map((m) => (
                        <Picker.Item key={m} label={m} value={m} color={colors.text} />
                      ))}
                    </Picker>
                  </View>
                  {editSelectedModel === 'Autre' && (
                    <TextInput
                      style={styles.input}
                      placeholder="Saisir le modèle"
                      placeholderTextColor={colors.textLight}
                      value={editCustomModel}
                      onChangeText={(text) => {
                        setEditCustomModel(text);
                        setEditVehicleForm({ ...editVehicleForm, model: text });
                      }}
                    />
                  )}
                </>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Saisir le modèle"
                  placeholderTextColor={colors.textLight}
                  value={editVehicleForm.model}
                  onChangeText={(text) => setEditVehicleForm({ ...editVehicleForm, model: text })}
                />
              )}

              <Text style={styles.fieldLabel}>Carburant</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editVehicleForm.fuelType}
                  onValueChange={(value) => setEditVehicleForm({ ...editVehicleForm, fuelType: value })}
                  dropdownIconColor={colors.textMid}
                >
                  {fuelTypes.map((type) => (
                    <Picker.Item key={type} label={type} value={type} color={colors.text} />
                  ))}
                </Picker>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Année (optionnel)"
                placeholderTextColor={colors.textLight}
                value={editVehicleForm.year}
                onChangeText={(text) => setEditVehicleForm({ ...editVehicleForm, year: text })}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="CO2 g/km (optionnel, ex: 120)"
                placeholderTextColor={colors.textLight}
                value={editVehicleForm.co2PerKm}
                onChangeText={(text) => setEditVehicleForm({ ...editVehicleForm, co2PerKm: text })}
                keyboardType="numeric"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelModalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveModalButton, (!editVehicleForm.brand || !editVehicleForm.model) && { opacity: 0.5 }]}
                  onPress={handleSaveVehicle}
                  disabled={!editVehicleForm.brand || !editVehicleForm.model}
                >
                  <Text style={styles.saveModalButtonText}>
                    {updateVehicleMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  loadingText: { color: c.textMid, fontSize: 16 },

  // Hero
  heroCard: {
    backgroundColor: c.dark,
    padding: 24,
    paddingBottom: 32,
    ...shadow.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  fuelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  fuelText: { fontSize: 12, fontWeight: '700' },
  co2Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.successLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  co2Text: { fontSize: 12, color: c.success, fontWeight: '600' },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  heroYear: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  // Mileage
  mileageCard: {
    backgroundColor: c.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: c.primaryMid,
    ...shadow.sm,
  },
  mileageLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mileageIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mileageLabel: { fontSize: 13, color: c.primary, fontWeight: '600' },
  mileageValue: { fontSize: 26, fontWeight: '800', color: c.primary },
  mileageUnit: { fontSize: 14, fontWeight: '500', color: c.primaryDark },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  statCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 16,
    width: '47.5%',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: c.border,
    ...shadow.sm,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: { fontSize: 12, color: c.textLight, marginTop: 4, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '700', color: c.text },

  // Actions
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  addButton: {
    flex: 1,
    backgroundColor: c.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...shadow.sm,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  editButton: {
    backgroundColor: c.card,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  editButtonText: { color: c.primary, fontWeight: '700', fontSize: 15 },
  maintenanceButton: {
    flex: 1,
    backgroundColor: c.successLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  maintenanceButtonText: { color: c.successDark, fontWeight: '600', fontSize: 14 },
  insuranceButton: {
    flex: 1,
    backgroundColor: c.purpleLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  insuranceButtonText: { color: c.purple, fontWeight: '600', fontSize: 14 },
  deleteButton: {
    backgroundColor: c.dangerLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 14 },
  emptyCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyText: { color: c.textMid, fontSize: 15, fontWeight: '600', marginTop: 4 },
  emptySubText: { color: c.textLight, fontSize: 13 },

  // Refuel cards
  refuelCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    ...shadow.sm,
  },
  refuelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refuelDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refuelDate: { fontWeight: '600', color: c.textMid, fontSize: 14 },
  refuelTotal: { fontWeight: '800', color: c.text, fontSize: 20 },
  refuelDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  refuelDetail: { color: c.textMid, fontSize: 13 },
  consumptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: c.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  refuelConsumption: { color: c.success, fontWeight: '600', fontSize: 12 },
  refuelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 12,
  },
  refuelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: c.background,
  },
  editText: { color: c.primary, fontSize: 13, fontWeight: '600' },
  deleteText: { color: c.danger, fontSize: 13, fontWeight: '600' },

  // Inline edit
  editSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textLight,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  editLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 68 },
  editLabel: { fontSize: 13, color: c.textMid, fontWeight: '500' },
  editInput: {
    flex: 1,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.text,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  saveBtn: {
    backgroundColor: c.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    backgroundColor: c.background,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  cancelBtnText: { color: c.textMid, fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: c.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: c.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.textMid, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: c.text,
    marginBottom: 4,
  },
  pickerContainer: {
    backgroundColor: c.inputBg,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: c.inputBorder,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 8 },
  cancelModalBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: c.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  cancelModalBtnText: { color: c.textMid, fontWeight: '600' },
  saveModalButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
  saveModalButtonText: { color: '#fff', fontWeight: '700' },
});
