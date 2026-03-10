import { useState, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { maintenanceService } from '../services/api';
import { Picker } from '@react-native-picker/picker';
import { shadow } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

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

  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
    onError: () => Alert.alert('Erreur', "Impossible d'ajouter la règle"),
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top action row */}
      <View style={styles.topRow}>
        {(!rules || rules.length === 0) && (
          <TouchableOpacity
            style={styles.initBtn}
            onPress={() => initMutation.mutate()}
            disabled={initMutation.isPending}
          >
            {initMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="flash-outline" size={15} color="#fff" />
                <Text style={styles.initBtnText}>Initialiser par défaut</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Rules list */}
      <FlatList
        data={rules || []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="settings-outline" size={36} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Aucune règle configurée</Text>
            <Text style={styles.emptyText}>
              Initialisez les règles par défaut ou ajoutez-en manuellement
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={styles.ruleIconWrap}>
                <Ionicons name="construct-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.ruleName}>{PART_TYPE_LABELS[item.partType] || item.partType}</Text>
            </View>

            {editingId === item.id ? (
              <View style={styles.editFormWrap}>
                <View style={styles.editIntervalRow}>
                  <View style={styles.editIntervalField}>
                    <Text style={styles.editIntervalLabel}>Intervalle km</Text>
                    <View style={styles.editInputWrap}>
                      <Ionicons name="speedometer-outline" size={14} color={colors.textMid} />
                      <TextInput
                        style={styles.editInput}
                        value={editKm}
                        onChangeText={setEditKm}
                        keyboardType="numeric"
                        placeholder="ex: 15000"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                  </View>
                  <View style={styles.editIntervalField}>
                    <Text style={styles.editIntervalLabel}>Intervalle mois</Text>
                    <View style={styles.editInputWrap}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMid} />
                      <TextInput
                        style={styles.editInput}
                        value={editMonths}
                        onChangeText={setEditMonths}
                        keyboardType="numeric"
                        placeholder="ex: 12"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.saveBtn}
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
                    <Ionicons name="checkmark" size={14} color="#fff" />
                    <Text style={styles.saveBtnText}>Sauver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingId(null)}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.ruleIntervals}>
                  {item.intervalKm ? (
                    <View style={styles.intervalBadge}>
                      <Ionicons name="speedometer-outline" size={12} color={colors.primary} />
                      <Text style={styles.intervalBadgeText}>
                        {item.intervalKm.toLocaleString()} km
                      </Text>
                    </View>
                  ) : null}
                  {item.intervalMonths ? (
                    <View style={styles.intervalBadge}>
                      <Ionicons name="calendar-outline" size={12} color={colors.success} />
                      <Text style={[styles.intervalBadgeText, { color: colors.success }]}>
                        {item.intervalMonths} mois
                      </Text>
                    </View>
                  ) : null}
                  {!item.intervalKm && !item.intervalMonths && (
                    <Text style={styles.noInterval}>Aucun intervalle défini</Text>
                  )}
                </View>
                <View style={styles.ruleActions}>
                  <TouchableOpacity
                    style={styles.ruleActionBtn}
                    onPress={() => {
                      setEditingId(item.id);
                      setEditKm(item.intervalKm?.toString() || '');
                      setEditMonths(item.intervalMonths?.toString() || '');
                    }}
                  >
                    <Ionicons name="create-outline" size={14} color={colors.primary} />
                    <Text style={styles.ruleActionEdit}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ruleActionBtn, { backgroundColor: colors.dangerLight }]}
                    onPress={() =>
                      Alert.alert('Supprimer', 'Supprimer cette règle ?', [
                        { text: 'Annuler' },
                        { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    <Text style={styles.ruleActionDelete}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      />

      {/* Add Rule Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={showAddModal}
        onRequestClose={() => { setShowAddModal(false); resetAddForm(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Ajouter une règle</Text>

              {/* Toggle Standard / Custom */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, !isCustom && styles.toggleBtnActive]}
                  onPress={() => setIsCustom(false)}
                >
                  <Ionicons
                    name="list-outline"
                    size={14}
                    color={!isCustom ? colors.primary : colors.textMid}
                  />
                  <Text style={[styles.toggleBtnText, !isCustom && styles.toggleBtnTextActive]}>
                    Standard
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, isCustom && styles.toggleBtnActive]}
                  onPress={() => setIsCustom(true)}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={14}
                    color={isCustom ? colors.primary : colors.textMid}
                  />
                  <Text style={[styles.toggleBtnText, isCustom && styles.toggleBtnTextActive]}>
                    Personnalisé
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustom ? (
                <>
                  <Text style={styles.fieldLabel}>Nom de la pièce</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="construct-outline" size={16} color={colors.textMid} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputInner}
                      placeholder="Ex: Filtre à huile de boîte"
                      placeholderTextColor={colors.textLight}
                      value={customPartType}
                      onChangeText={setCustomPartType}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>Catégorie</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={customCategory}
                      onValueChange={setCustomCategory}
                      dropdownIconColor={colors.textMid}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <Picker.Item key={c.value} label={c.label} value={c.value} color={colors.text} />
                      ))}
                    </Picker>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Type de pièce</Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={addPartType}
                      onValueChange={setAddPartType}
                      dropdownIconColor={colors.textMid}
                    >
                      <Picker.Item label="Choisir..." value="" color={colors.textLight} />
                      {availableStandardTypes.map((t) => (
                        <Picker.Item key={t} label={PART_TYPE_LABELS[t]} value={t} color={colors.text} />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>Intervalle kilométrique</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="speedometer-outline" size={16} color={colors.textMid} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputInner}
                  placeholder="Ex: 15 000"
                  placeholderTextColor={colors.textLight}
                  value={addKm}
                  onChangeText={setAddKm}
                  keyboardType="numeric"
                />
                <Text style={styles.inputUnit}>km</Text>
              </View>

              <Text style={styles.fieldLabel}>Intervalle en mois</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="calendar-outline" size={16} color={colors.textMid} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputInner}
                  placeholder="Ex: 12"
                  placeholderTextColor={colors.textLight}
                  value={addMonths}
                  onChangeText={setAddMonths}
                  keyboardType="numeric"
                />
                <Text style={styles.inputUnit}>mois</Text>
              </View>

              <TouchableOpacity
                style={[styles.modalSaveBtn, createMutation.isPending && { opacity: 0.5 }]}
                onPress={handleAddRule}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.modalSaveBtnText}>Ajouter la règle</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowAddModal(false); resetAddForm(); }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },

  // Top row
  topRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
  initBtn: {
    flex: 1,
    backgroundColor: c.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...shadow.sm,
  },
  initBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  addBtn: {
    backgroundColor: c.success,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    ...shadow.sm,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Empty
  emptyCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: c.textMid, marginTop: 4 },
  emptyText: { fontSize: 13, color: c.textLight, textAlign: 'center', lineHeight: 20 },

  // Rule cards
  ruleCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    ...shadow.sm,
  },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ruleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleName: { fontSize: 15, fontWeight: '700', color: c.text, flex: 1 },

  // Interval badges
  ruleIntervals: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10, justifyContent: 'center' },
  intervalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: c.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  intervalBadgeText: { fontSize: 12, color: c.primary, fontWeight: '600' },
  noInterval: { fontSize: 12, color: c.textLight, fontStyle: 'italic' },

  // Rule actions
  ruleActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    paddingTop: 10,
  },
  ruleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: c.primaryLight,
  },
  ruleActionEdit: { color: c.primary, fontSize: 13, fontWeight: '600' },
  ruleActionDelete: { color: c.danger, fontSize: 13, fontWeight: '600' },

  // Edit form
  editFormWrap: {
    backgroundColor: c.background,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  editIntervalRow: { flexDirection: 'row', gap: 10 },
  editIntervalField: { flex: 1 },
  editIntervalLabel: { fontSize: 11, fontWeight: '600', color: c.textLight, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  editInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  editInput: { flex: 1, fontSize: 14, color: c.text },
  editActions: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  saveBtn: {
    backgroundColor: c.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  cancelBtnText: { color: c.textMid, fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 14,
    maxHeight: '90%',
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
  modalTitle: { fontSize: 18, fontWeight: '800', color: c.text, marginBottom: 16, textAlign: 'center' },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: c.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: c.card,
    ...shadow.sm,
  },
  toggleBtnText: { fontSize: 14, color: c.textMid, fontWeight: '500' },
  toggleBtnTextActive: { color: c.primary, fontWeight: '700' },

  // Form fields
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.textMid, marginBottom: 8, marginTop: 14 },
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
  pickerWrap: {
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Modal buttons
  modalSaveBtn: {
    backgroundColor: c.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...shadow.sm,
  },
  modalSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalCancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  modalCancelText: { color: c.textMid, fontSize: 14, fontWeight: '500' },
});
