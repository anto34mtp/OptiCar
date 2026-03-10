import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { maintenanceService, maintenanceExtService } from '../services/api';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';
import { checkAndScheduleNotifications } from '../services/notifications';
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

const CATEGORY_LABELS: Record<string, string> = {
  MOTEUR: 'Moteur',
  CLIMATISATION: 'Climatisation',
  DISTRIBUTION: 'Distribution',
  FREINAGE: 'Freinage',
  LIAISON_SOL: 'Liaison au sol',
  ADMINISTRATIF: 'Administratif',
};

// Category accent colors (index-based cycling)
const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

function WearBar({ percent, status, colors }: { percent: number | null; status: string; colors: ThemeColors }) {
  const p = percent ?? 0;
  const barColor =
    status === 'critical' ? colors.danger :
    status === 'warning' ? colors.warning :
    colors.success;

  return (
    <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{
        height: 8,
        width: `${Math.min(p, 100)}%`,
        backgroundColor: barColor,
        borderRadius: 4,
      }} />
    </View>
  );
}

export default function VehicleMaintenanceScreen({ route, navigation }: any) {
  const { vehicleId, vehicleName } = route.params;
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const { isVehicleEnabled, setVehicleEnabled, isPartTypeEnabled, setPartTypeEnabled } = useNotificationSettingsStore();

  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: statuses, isLoading } = useQuery({
    queryKey: ['maintenance-status', vehicleId],
    queryFn: () => maintenanceService.getStatus(vehicleId),
    refetchOnWindowFocus: true,
    enabled: isFocused,
    refetchInterval: isFocused ? false : undefined,
  });

  const { data: predictions } = useQuery({
    queryKey: ['maintenance-predictions', vehicleId],
    queryFn: () => maintenanceService.getPredictions(vehicleId),
    enabled: isFocused,
  });

  const { data: costs } = useQuery({
    queryKey: ['maintenance-costs', vehicleId],
    queryFn: () => maintenanceService.getCosts(vehicleId),
    enabled: isFocused,
  });

  const { data: records } = useQuery({
    queryKey: ['maintenance-records', vehicleId],
    queryFn: () => maintenanceService.getRecords(vehicleId),
    enabled: isFocused,
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: string) => maintenanceExtService.deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-status', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs', vehicleId] });
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      maintenanceExtService.updateRecord(id, data),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['maintenance-records', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-status', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs', vehicleId] });
    },
  });

  // Group by category
  const byCategory: Record<string, any[]> = {};
  if (statuses) {
    for (const s of statuses) {
      if (!byCategory[s.category]) byCategory[s.category] = [];
      byCategory[s.category].push(s);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Action bar */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('MaintenanceRules', { vehicleId, vehicleName })}
        >
          <Ionicons name="settings-outline" size={15} color={colors.textMid} />
          <Text style={styles.btnSecondaryText}>Configurer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('AddMaintenance', { vehicleId, vehicleName })}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Notification toggle card */}
      <View style={styles.notifCard}>
        <View style={styles.notifLeft}>
          <View style={styles.notifIconWrap}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.notifText}>Notifications pour ce véhicule</Text>
        </View>
        <Switch
          value={isVehicleEnabled(vehicleId)}
          onValueChange={async (val) => {
            await setVehicleEnabled(vehicleId, val);
            await checkAndScheduleNotifications();
          }}
          trackColor={{ false: colors.switchTrack, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {!statuses || statuses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="construct-outline" size={36} color={colors.textLight} />
          <Text style={styles.emptyText}>Aucune règle configurée</Text>
          <Text style={styles.emptySubText}>Configurez les intervalles d'entretien pour suivre l'usure</Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { marginTop: 16, alignSelf: 'center' }]}
            onPress={() => navigation.navigate('MaintenanceRules', { vehicleId, vehicleName })}
          >
            <Ionicons name="settings-outline" size={15} color="#fff" />
            <Text style={styles.btnPrimaryText}>Configurer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Wear gauges + history per category */}
          {Object.entries(byCategory).map(([cat, items], catIndex) => (
            <View key={cat} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[catIndex % CATEGORY_COLORS.length] }]} />
                <Text style={[styles.categoryTitle, { color: CATEGORY_COLORS[catIndex % CATEGORY_COLORS.length] }]}>
                  {CATEGORY_LABELS[cat] || cat}
                </Text>
              </View>

              {items.map((s: any) => {
                const partRecords = (records || []).filter((r: any) => r.partType === s.partType);
                const wearColor =
                  s.status === 'critical' ? colors.danger :
                  s.status === 'warning' ? colors.warning :
                  colors.success;

                return (
                  <View key={s.ruleId} style={styles.gaugeCard}>
                    <View style={styles.gaugeTopRow}>
                      <View style={styles.gaugeNameRow}>
                        <Text style={styles.gaugeName}>{PART_TYPE_LABELS[s.partType] || s.partType}</Text>
                        <Switch
                          value={isPartTypeEnabled(vehicleId, s.partType)}
                          onValueChange={async (val) => {
                            await setPartTypeEnabled(vehicleId, s.partType, val);
                            await checkAndScheduleNotifications();
                          }}
                          trackColor={{ false: colors.switchTrack, true: colors.primary }}
                          thumbColor="#fff"
                          style={styles.partTypeSwitch}
                        />
                      </View>
                      {s.wearPercent !== null && (
                        <View style={[styles.wearBadge, { backgroundColor: wearColor + '22', borderColor: wearColor + '44' }]}>
                          <Text style={[styles.wearBadgeText, { color: wearColor }]}>{s.wearPercent}%</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.wearBarWrap}>
                      <WearBar percent={s.wearPercent} status={s.status} colors={colors} />
                    </View>

                    <Text style={styles.gaugeInfo}>
                      {s.lastDate
                        ? `Dernier : ${new Date(s.lastDate).toLocaleDateString('fr-FR')}`
                        : 'Aucun historique'}
                      {s.nextEstimatedDate
                        ? `  ·  Prochain : ${new Date(s.nextEstimatedDate).toLocaleDateString('fr-FR')}`
                        : ''}
                    </Text>

                    {partRecords.length > 0 && (
                      <View style={styles.partHistory}>
                        <Text style={styles.partHistoryTitle}>Historique</Text>
                        {partRecords.map((r: any) => (
                          <View key={r.id} style={styles.partHistoryRow}>
                            {editingId === r.id ? (
                              <View style={styles.editFormWrap}>
                                <View style={styles.editRow}>
                                  <Text style={styles.editLabel}>Km</Text>
                                  <TextInput
                                    style={styles.editInput}
                                    keyboardType="numeric"
                                    value={String(editForm.mileage || '')}
                                    onChangeText={(v) => setEditForm({ ...editForm, mileage: Number(v) })}
                                    placeholderTextColor={colors.textLight}
                                    placeholder="kilométrage"
                                  />
                                </View>
                                <View style={styles.editRow}>
                                  <Text style={styles.editLabel}>Prix</Text>
                                  <TextInput
                                    style={styles.editInput}
                                    keyboardType="numeric"
                                    value={String(editForm.price ?? '')}
                                    onChangeText={(v) => setEditForm({ ...editForm, price: Number(v) })}
                                    placeholderTextColor={colors.textLight}
                                    placeholder="montant"
                                  />
                                </View>
                                <View style={styles.editRow}>
                                  <Text style={styles.editLabel}>Garage</Text>
                                  <TextInput
                                    style={styles.editInput}
                                    value={editForm.garage || ''}
                                    onChangeText={(v) => setEditForm({ ...editForm, garage: v })}
                                    placeholderTextColor={colors.textLight}
                                    placeholder="nom du garage"
                                  />
                                </View>
                                <View style={styles.editActions}>
                                  <TouchableOpacity
                                    style={styles.saveBtn}
                                    onPress={() => updateRecordMutation.mutate({ id: r.id, data: editForm })}
                                  >
                                    <Ionicons name="checkmark" size={13} color="#fff" />
                                    <Text style={styles.saveBtnText}>Sauver</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingId(null)}>
                                    <Text style={styles.cancelBtnText}>Annuler</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.partHistoryItem}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.partHistoryDate}>
                                    {new Date(r.date).toLocaleDateString('fr-FR')}
                                    {r.mileage ? `  ·  ${r.mileage.toLocaleString()} km` : ''}
                                    {r.garage ? `  ·  ${r.garage}` : ''}
                                  </Text>
                                  {r.price != null && (
                                    <Text style={styles.partHistoryPrice}>{formatCurrency(r.price)}</Text>
                                  )}
                                </View>
                                <View style={styles.recordActions}>
                                  <TouchableOpacity
                                    style={styles.recordActionBtn}
                                    onPress={() => {
                                      setEditingId(r.id);
                                      setEditForm({ mileage: r.mileage, price: r.price, garage: r.garage });
                                    }}
                                  >
                                    <Ionicons name="create-outline" size={13} color={colors.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.recordActionBtn, { backgroundColor: colors.dangerLight }]}
                                    onPress={() => {
                                      Alert.alert('Supprimer cet entretien ?', '', [
                                        { text: 'Annuler', style: 'cancel' },
                                        { text: 'Supprimer', style: 'destructive', onPress: () => deleteRecordMutation.mutate(r.id) },
                                      ]);
                                    }}
                                  >
                                    <Ionicons name="trash-outline" size={13} color={colors.danger} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          {/* 6-month estimate */}
          {predictions?.sixMonthEstimate?.total > 0 && (
            <View style={styles.estimateCard}>
              <View style={styles.estimateLeft}>
                <View style={styles.estimateIconWrap}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.estimateTitle}>Estimation 6 mois</Text>
                  <Text style={styles.estimateInfo}>
                    {predictions.sixMonthEstimate.items.length} entretien(s) prévu(s)
                  </Text>
                </View>
              </View>
              <Text style={styles.estimateAmount}>
                {predictions.sixMonthEstimate.total.toFixed(2)} €
              </Text>
            </View>
          )}

          {/* Annual costs */}
          {costs && costs.length > 0 && (
            <View style={styles.costsSection}>
              <Text style={styles.sectionTitle}>Coûts par année</Text>
              {costs.map((c: any) => (
                <View key={c.year} style={styles.costRow}>
                  <View style={styles.costYearWrap}>
                    <Ionicons name="time-outline" size={14} color={colors.textMid} />
                    <Text style={styles.costYear}>{c.year}</Text>
                  </View>
                  <Text style={styles.costAmount}>{c.total.toFixed(2)} €</Text>
                </View>
              ))}
            </View>
          )}

          {/* Orphan records (partType not in any rule) */}
          {(() => {
            const rulePartTypes = new Set((statuses || []).map((s: any) => s.partType));
            const orphans = (records || []).filter((r: any) => !rulePartTypes.has(r.partType));
            if (!orphans.length) return null;
            return (
              <View style={styles.costsSection}>
                <Text style={styles.sectionTitle}>Autres entretiens</Text>
                {orphans.map((r: any) => (
                  <View key={r.id} style={styles.gaugeCard}>
                    <View style={styles.gaugeTopRow}>
                      <Text style={styles.gaugeName}>{PART_TYPE_LABELS[r.partType] || r.partType}</Text>
                      <Text style={styles.orphanPrice}>{r.price != null ? formatCurrency(r.price) : '—'}</Text>
                    </View>
                    <Text style={styles.gaugeInfo}>
                      {new Date(r.date).toLocaleDateString('fr-FR')}
                      {r.mileage ? `  ·  ${r.mileage.toLocaleString()} km` : ''}
                      {r.garage ? `  ·  ${r.garage}` : ''}
                    </Text>
                    <View style={styles.recordActions}>
                      <TouchableOpacity
                        style={styles.recordActionBtn}
                        onPress={() => {
                          setEditingId(r.id);
                          setEditForm({ mileage: r.mileage, price: r.price, garage: r.garage });
                        }}
                      >
                        <Ionicons name="create-outline" size={13} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.recordActionBtn, { backgroundColor: colors.dangerLight }]}
                        onPress={() => {
                          Alert.alert('Supprimer cet entretien ?', '', [
                            { text: 'Annuler', style: 'cancel' },
                            { text: 'Supprimer', style: 'destructive', onPress: () => deleteRecordMutation.mutate(r.id) },
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={13} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },

  // Action row
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  btnPrimary: {
    backgroundColor: c.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadow.sm,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: {
    flex: 1,
    backgroundColor: c.card,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnSecondaryText: { color: c.textMid, fontWeight: '600', fontSize: 14 },

  // Notification card
  notifCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.border,
    ...shadow.sm,
  },
  notifLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifText: { fontSize: 14, fontWeight: '600', color: c.text },

  // Empty
  emptyCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 36,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyText: { color: c.textMid, fontSize: 15, fontWeight: '600', marginTop: 4 },
  emptySubText: { color: c.textLight, fontSize: 13, textAlign: 'center' },

  // Category section
  categorySection: { marginBottom: 24 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Gauge card
  gaugeCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    ...shadow.sm,
  },
  gaugeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  gaugeNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  gaugeName: { fontSize: 14, fontWeight: '600', color: c.text, flex: 1 },
  wearBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
  },
  wearBadgeText: { fontSize: 12, fontWeight: '700' },
  wearBarWrap: { marginBottom: 10 },
  partTypeSwitch: { transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] },
  gaugeInfo: { fontSize: 12, color: c.textLight, marginTop: 2 },
  orphanPrice: { fontSize: 14, fontWeight: '700', color: c.text },

  // Part history
  partHistory: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    paddingTop: 10,
  },
  partHistoryTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textLight,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  partHistoryRow: { marginBottom: 6 },
  partHistoryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  partHistoryDate: { fontSize: 12, color: c.textMid },
  partHistoryPrice: { fontSize: 12, fontWeight: '600', color: c.text, marginTop: 2 },

  // Record actions
  recordActions: { flexDirection: 'row', gap: 6 },
  recordActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Edit form
  editFormWrap: {
    backgroundColor: c.background,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  editLabel: { width: 52, fontSize: 12, color: c.textMid, fontWeight: '600' },
  editInput: {
    flex: 1,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: c.text,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  saveBtn: {
    backgroundColor: c.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cancelBtn: {
    backgroundColor: c.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  cancelBtnText: { color: c.textMid, fontSize: 12, fontWeight: '600' },

  // Estimate card
  estimateCard: {
    backgroundColor: c.primaryLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.primaryMid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.sm,
  },
  estimateLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  estimateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimateTitle: { fontSize: 14, fontWeight: '700', color: c.primary },
  estimateAmount: { fontSize: 22, fontWeight: '800', color: c.primary },
  estimateInfo: { fontSize: 12, color: c.primaryDark, marginTop: 2 },

  // Costs
  costsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 12 },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: c.border,
  },
  costYearWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  costYear: { fontSize: 14, fontWeight: '600', color: c.textMid },
  costAmount: { fontSize: 15, fontWeight: '700', color: c.text },
});
