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
import { useState } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { vehiclesService, refuelsService, refuelsExtService } from '../services/api';
import { BRAND_LIST, BRAND_MODELS } from '../data/vehicleBrands';

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
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {vehicle?.brand} {vehicle?.model}
        </Text>
        <View style={styles.badges}>
          <View style={styles.fuelBadge}>
            <Text style={styles.fuelText}>{vehicle?.fuelType}</Text>
          </View>
          {vehicle?.year && (
            <Text style={styles.year}>{vehicle.year}</Text>
          )}
          {vehicle?.co2PerKm && (
            <Text style={styles.year}>{vehicle.co2PerKm} g CO2/km</Text>
          )}
        </View>
      </View>

      {/* Current mileage */}
      <View style={styles.mileageCard}>
        <Text style={styles.mileageLabel}>Kilométrage actuel</Text>
        <Text style={styles.mileageValue}>
          {(vehicle?.stats?.currentMileage || 0).toLocaleString()} km
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Dépenses</Text>
          <Text style={styles.statValue}>
            {formatCurrency(vehicle?.stats?.totalSpent || 0)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Consommation</Text>
          <Text style={styles.statValue}>
            {vehicle?.stats?.averageConsumption
              ? `${vehicle.stats.averageConsumption.toFixed(1)} L/100`
              : 'N/A'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>
            {vehicle?.stats?.totalDistance?.toLocaleString()} km
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pleins</Text>
          <Text style={styles.statValue}>{vehicle?.stats?.totalRefuels || 0}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddRefuel', { vehicleId: id })}
        >
          <Text style={styles.addButtonText}>+ Ajouter un plein</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.maintenanceButton}
          onPress={() => navigation.navigate('VehicleMaintenance', { vehicleId: id, vehicleName: `${vehicle?.brand} ${vehicle?.model}` })}
        >
          <Text style={styles.maintenanceButtonText}>Entretiens</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.insuranceButton}
          onPress={() => navigation.navigate('Insurance', { vehicleId: id, vehicleName: `${vehicle?.brand} ${vehicle?.model}` })}
        >
          <Text style={styles.insuranceButtonText}>Assurance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Supprimer</Text>
        </TouchableOpacity>
      </View>

      {/* Refuels history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique des pleins</Text>

        {refuels?.length === 0 ? (
          <Text style={styles.emptyText}>Aucun plein enregistré</Text>
        ) : (
          refuels?.map((refuel: any) => (
            <View key={refuel.id} style={styles.refuelCard}>
              {editingId === refuel.id ? (
                <View>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Km:</Text>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="numeric"
                      value={String(editForm.mileage || '')}
                      onChangeText={(v) => setEditForm({ ...editForm, mileage: Number(v) })}
                    />
                  </View>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Litres:</Text>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="numeric"
                      value={String(editForm.liters || '')}
                      onChangeText={(v) => setEditForm({ ...editForm, liters: Number(v) })}
                    />
                  </View>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Prix/L:</Text>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="numeric"
                      value={String(editForm.pricePerLiter || '')}
                      onChangeText={(v) => setEditForm({ ...editForm, pricePerLiter: Number(v) })}
                    />
                  </View>
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Total:</Text>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="numeric"
                      value={String(editForm.totalPrice || '')}
                      onChangeText={(v) => setEditForm({ ...editForm, totalPrice: Number(v) })}
                    />
                  </View>
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={() => updateRefuelMutation.mutate({ refuelId: refuel.id, data: editForm })}
                    >
                      <Text style={styles.saveBtnText}>Sauver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingId(null)}>
                      <Text style={styles.cancelText}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.refuelHeader}>
                    <Text style={styles.refuelDate}>{formatDate(refuel.date)}</Text>
                    <Text style={styles.refuelTotal}>{formatCurrency(refuel.totalPrice)}</Text>
                  </View>
                  <View style={styles.refuelDetails}>
                    <Text style={styles.refuelDetail}>
                      {refuel.liters.toFixed(2)} L @ {refuel.pricePerLiter.toFixed(3)} €/L
                    </Text>
                    <Text style={styles.refuelDetail}>
                      {refuel.mileage.toLocaleString()} km
                    </Text>
                  </View>
                  {refuel.consumption && (
                    <Text style={styles.refuelConsumption}>
                      {refuel.consumption.toFixed(1)} L/100km
                    </Text>
                  )}
                  <View style={styles.refuelActions}>
                    <TouchableOpacity
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
                      <Text style={styles.editText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRefuel(refuel.id)}>
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
              >
                {BRAND_LIST.map((b) => (
                  <Picker.Item key={b} label={b} value={b} />
                ))}
              </Picker>
            </View>

            {editSelectedBrand === 'Autre' && (
              <TextInput
                style={styles.input}
                placeholder="Saisir la marque"
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
                  >
                    <Picker.Item label="-- Choisir un modèle --" value="" />
                    {editModelOptions.map((m) => (
                      <Picker.Item key={m} label={m} value={m} />
                    ))}
                  </Picker>
                </View>
                {editSelectedModel === 'Autre' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Saisir le modèle"
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
                value={editVehicleForm.model}
                onChangeText={(text) => setEditVehicleForm({ ...editVehicleForm, model: text })}
              />
            )}

            <Text style={styles.fieldLabel}>Carburant</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={editVehicleForm.fuelType}
                onValueChange={(value) => setEditVehicleForm({ ...editVehicleForm, fuelType: value })}
              >
                {fuelTypes.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Année (optionnel)"
              value={editVehicleForm.year}
              onChangeText={(text) => setEditVehicleForm({ ...editVehicleForm, year: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="CO2 g/km (optionnel, ex: 120)"
              value={editVehicleForm.co2PerKm}
              onChangeText={(text) => setEditVehicleForm({ ...editVehicleForm, co2PerKm: text })}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveVehicle}
                disabled={!editVehicleForm.brand || !editVehicleForm.model}
              >
                <Text style={styles.saveButtonText}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: 'white' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  fuelBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  fuelText: { color: '#1d4ed8', fontSize: 12, fontWeight: '500' },
  year: { color: '#6b7280' },
  mileageCard: { backgroundColor: '#eff6ff', marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  mileageLabel: { fontSize: 13, color: '#3b82f6', fontWeight: '500' },
  mileageValue: { fontSize: 28, fontWeight: 'bold', color: '#1d4ed8', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  statCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, width: '47%' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 4 },
  actions: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 6, gap: 12 },
  addButton: { flex: 1, backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center' },
  addButtonText: { color: 'white', fontWeight: '600' },
  editButton: { backgroundColor: '#dbeafe', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#3b82f6' },
  editButtonText: { color: '#3b82f6', fontWeight: '600' },
  maintenanceButton: { flex: 1, backgroundColor: '#ecfdf5', padding: 16, borderRadius: 12, alignItems: 'center' },
  maintenanceButtonText: { color: '#059669', fontWeight: '600' },
  insuranceButton: { flex: 1, backgroundColor: '#f3e8ff', padding: 16, borderRadius: 12, alignItems: 'center' },
  insuranceButtonText: { color: '#7c3aed', fontWeight: '600' },
  deleteButton: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, alignItems: 'center' },
  deleteButtonText: { color: '#dc2626', fontWeight: '600' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  emptyText: { color: '#6b7280', textAlign: 'center', padding: 20 },
  refuelCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  refuelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refuelDate: { fontWeight: '600', color: '#111827' },
  refuelTotal: { fontWeight: 'bold', color: '#111827', fontSize: 16 },
  refuelDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  refuelDetail: { color: '#6b7280', fontSize: 14 },
  refuelConsumption: { marginTop: 8, color: '#059669', fontWeight: '500' },
  refuelActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  editText: { color: '#3b82f6', fontSize: 13, fontWeight: '500' },
  deleteText: { color: '#dc2626', fontSize: 13, fontWeight: '500' },
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  editLabel: { width: 60, fontSize: 13, color: '#6b7280' },
  editInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  saveBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cancelText: { color: '#6b7280', fontSize: 13, paddingVertical: 8 },
  // Edit vehicle modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12 },
  pickerContainer: { backgroundColor: '#f3f4f6', borderRadius: 12, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#e5e7eb', alignItems: 'center' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '600' },
});
