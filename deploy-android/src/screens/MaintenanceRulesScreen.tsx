import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../services/api';
import { Picker } from '@react-native-picker/picker';

const PART_TYPE_LABELS: Record<string, string> = {
  VIDANGE: 'Vidange',
  FILTRE_AIR: 'Filtre à air',
  FILTRE_CARBURANT: 'Filtre carburant',
  BOUGIES: 'Bougies',
  FILTRE_HABITACLE: 'Filtre habitacle',
  KIT_DISTRIBUTION: 'Kit distribution',
  POMPE_EAU: 'Pompe à eau',
  COURROIE_ACCESSOIRES: 'Courroie accessoires',
  LIQUIDE_REFROIDISSEMENT: 'Liquide refroidissement',
  PLAQUETTES_AV: 'Plaquettes avant',
  PLAQUETTES_AR: 'Plaquettes arrière',
  DISQUES_AV: 'Disques avant',
  DISQUES_AR: 'Disques arrière',
  LIQUIDE_FREIN: 'Liquide de frein',
  PNEUS_AV: 'Pneus avant',
  PNEUS_AR: 'Pneus arrière',
  BATTERIE: 'Batterie',
  CONTROLE_TECHNIQUE: 'Contrôle technique',
};

const PART_TYPE_TO_CATEGORY: Record<string, string> = {
  VIDANGE: 'MOTEUR', FILTRE_AIR: 'MOTEUR', FILTRE_CARBURANT: 'MOTEUR',
  BOUGIES: 'MOTEUR', FILTRE_HABITACLE: 'MOTEUR', LIQUIDE_REFROIDISSEMENT: 'MOTEUR',
  KIT_DISTRIBUTION: 'DISTRIBUTION', POMPE_EAU: 'DISTRIBUTION', COURROIE_ACCESSOIRES: 'DISTRIBUTION',
  PLAQUETTES_AV: 'FREINAGE', PLAQUETTES_AR: 'FREINAGE', DISQUES_AV: 'FREINAGE',
  DISQUES_AR: 'FREINAGE', LIQUIDE_FREIN: 'FREINAGE',
  PNEUS_AV: 'LIAISON_SOL', PNEUS_AR: 'LIAISON_SOL',
  BATTERIE: 'ADMINISTRATIF', CONTROLE_TECHNIQUE: 'ADMINISTRATIF',
};

const ALL_STANDARD_TYPES = Object.keys(PART_TYPE_LABELS);

const CATEGORY_OPTIONS = [
  { value: 'MOTEUR', label: 'Moteur' },
  { value: 'DISTRIBUTION', label: 'Distribution' },
  { value: 'FREINAGE', label: 'Freinage' },
  { value: 'LIAISON_SOL', label: 'Liaison au sol' },
  { value: 'ADMINISTRATIF', label: 'Administratif' },
  { value: 'CLIMATISATION', label: 'Climatisation' },
];

export default function MaintenanceRulesScreen({ route }: any) {
  const { vehicleId } = route.params;
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKm, setEditKm] = useState('');
  const [editMonths, setEditMonths] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addPartType, setAddPartType] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customPartType, setCustomPartType] = useState('');
  const [customCategory, setCustomCategory] = useState('MOTEUR');
  const [addKm, setAddKm] = useState('');
  const [addMonths, setAddMonths] = useState('');

  const { data: rules, isLoading } = useQuery({
    queryKey: ['maintenance-rules', vehicleId],
    queryFn: () => maintenanceService.getRules(vehicleId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-rules', vehicleId] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-status', vehicleId] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-predictions', vehicleId] });
  };

  const initMutation = useMutation({
    mutationFn: () => maintenanceService.initDefaults(vehicleId),
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => maintenanceService.updateRule(id, data),
    onSuccess: () => {
      invalidateAll();
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => maintenanceService.deleteRule(id),
    onSuccess: invalidateAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => maintenanceService.createRule(vehicleId, data),
    onSuccess: () => {
      invalidateAll();
      setShowAddModal(false);
      resetAddForm();
    },
    onError: () => Alert.alert('Erreur', 'Impossible d\'ajouter la règle'),
  });

  const resetAddForm = () => {
    setAddPartType('');
    setIsCustom(false);
    setCustomPartType('');
    setCustomCategory('MOTEUR');
    setAddKm('');
    setAddMonths('');
  };

  const existingPartTypes = new Set((rules || []).map((r: any) => r.partType));
  const availableStandardTypes = ALL_STANDARD_TYPES.filter((t) => !existingPartTypes.has(t));

  const handleAddRule = () => {
    const partType = isCustom ? customPartType.trim().toUpperCase().replace(/\s+/g, '_') : addPartType;
    if (!partType) {
      Alert.alert('Erreur', 'Veuillez sélectionner ou saisir un type de pièce');
      return;
    }
    if (!addKm && !addMonths) {
      Alert.alert('Erreur', 'Renseignez au moins un intervalle (km ou mois)');
      return;
    }
    const category = isCustom ? customCategory : (PART_TYPE_TO_CATEGORY[partType] || 'MOTEUR');
    createMutation.mutate({
      partType,
      category,
      intervalKm: addKm ? parseInt(addKm) : null,
      intervalMonths: addMonths ? parseInt(addMonths) : null,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {(!rules || rules.length === 0) && (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => initMutation.mutate()}
            disabled={initMutation.isPending}
          >
            <Text style={styles.btnPrimaryText}>
              {initMutation.isPending ? 'Initialisation...' : 'Initialiser par défaut'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btnAdd, (!rules || rules.length === 0) && { flex: 0 }]}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.btnAddText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rules || []}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <View style={styles.ruleCard}>
            <Text style={styles.ruleName}>{PART_TYPE_LABELS[item.partType] || item.partType}</Text>

            {editingId === item.id ? (
              <View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Km:</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editKm}
                    onChangeText={setEditKm}
                    keyboardType="numeric"
                    placeholder="km"
                  />
                  <Text style={styles.editLabel}>Mois:</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editMonths}
                    onChangeText={setEditMonths}
                    keyboardType="numeric"
                    placeholder="mois"
                  />
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={() =>
                      updateMutation.mutate({
                        id: item.id,
                        data: {
                          intervalKm: editKm ? parseInt(editKm) : null,
                          intervalMonths: editMonths ? parseInt(editMonths) : null,
                        },
                      })
                    }
                  >
                    <Text style={{ color: '#22c55e', fontWeight: '600' }}>Sauver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)}>
                    <Text style={{ color: '#6b7280' }}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.ruleInfo}>
                  {item.intervalKm ? `${item.intervalKm.toLocaleString()} km` : '—'}
                  {' · '}
                  {item.intervalMonths ? `${item.intervalMonths} mois` : '—'}
                </Text>
                <View style={styles.ruleActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingId(item.id);
                      setEditKm(item.intervalKm?.toString() || '');
                      setEditMonths(item.intervalMonths?.toString() || '');
                    }}
                  >
                    <Text style={{ color: '#3b82f6', fontSize: 13 }}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Supprimer', 'Supprimer cette règle ?', [
                        { text: 'Annuler' },
                        { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                      ])
                    }
                  >
                    <Text style={{ color: '#ef4444', fontSize: 13 }}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucune règle. Initialisez par défaut ou ajoutez manuellement.</Text>}
      />

      {/* Add Rule Modal */}
      <Modal transparent animationType="slide" visible={showAddModal} onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView>
              <Text style={styles.modalTitle}>Ajouter une règle</Text>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, !isCustom && styles.toggleBtnActive]}
                  onPress={() => setIsCustom(false)}
                >
                  <Text style={[styles.toggleBtnText, !isCustom && styles.toggleBtnTextActive]}>Standard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, isCustom && styles.toggleBtnActive]}
                  onPress={() => setIsCustom(true)}
                >
                  <Text style={[styles.toggleBtnText, isCustom && styles.toggleBtnTextActive]}>Personnalisé</Text>
                </TouchableOpacity>
              </View>

              {isCustom ? (
                <>
                  <Text style={styles.fieldLabel}>Nom de la pièce</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Ex: Filtre à huile de boîte"
                    value={customPartType}
                    onChangeText={setCustomPartType}
                  />
                  <Text style={styles.fieldLabel}>Catégorie</Text>
                  <View style={styles.pickerWrap}>
                    <Picker selectedValue={customCategory} onValueChange={setCustomCategory}>
                      {CATEGORY_OPTIONS.map((c) => (
                        <Picker.Item key={c.value} label={c.label} value={c.value} />
                      ))}
                    </Picker>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Type de pièce</Text>
                  <View style={styles.pickerWrap}>
                    <Picker selectedValue={addPartType} onValueChange={setAddPartType}>
                      <Picker.Item label="Choisir..." value="" />
                      {availableStandardTypes.map((t) => (
                        <Picker.Item key={t} label={PART_TYPE_LABELS[t]} value={t} />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>Intervalle kilométrique</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Ex: 15000"
                value={addKm}
                onChangeText={setAddKm}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Intervalle en mois</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Ex: 12"
                value={addMonths}
                onChangeText={setAddMonths}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAddRule}
                disabled={createMutation.isPending}
              >
                <Text style={styles.modalSaveBtnText}>
                  {createMutation.isPending ? 'Ajout...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowAddModal(false); resetAddForm(); }}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  btnPrimary: { flex: 1, backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnAdd: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnAddText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  ruleCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  ruleName: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  ruleInfo: { fontSize: 13, color: '#6b7280' },
  ruleActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  editLabel: { fontSize: 13, color: '#6b7280' },
  editInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, width: 70, fontSize: 13 },
  editActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleBtnText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  toggleBtnTextActive: { color: '#111827' },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  fieldInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15 },
  pickerWrap: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, backgroundColor: '#fff' },
  modalSaveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  modalSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalCancelBtn: { padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#6b7280', fontSize: 14 },
});
