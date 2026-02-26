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
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { maintenanceService, maintenanceExtService } from '../services/api';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';
import { checkAndScheduleNotifications } from '../services/notifications';

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

function WearBar({ percent, status }: { percent: number | null; status: string }) {
  const p = percent ?? 0;
  const color = status === 'critical' ? '#ef4444' : status === 'warning' ? '#f97316' : '#22c55e';
  return (
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${Math.min(p, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function VehicleMaintenanceScreen({ route, navigation }: any) {
  const { vehicleId, vehicleName } = route.params;
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const { isVehicleEnabled, setVehicleEnabled } = useNotificationSettingsStore();

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
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{vehicleName}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('MaintenanceRules', { vehicleId, vehicleName })}
        >
          <Text style={styles.btnSecondaryText}>Configurer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('AddMaintenance', { vehicleId, vehicleName })}
        >
          <Text style={styles.btnPrimaryText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.notifRow}>
        <Text style={styles.notifText}>Notifications ce véhicule</Text>
        <Switch
          value={isVehicleEnabled(vehicleId)}
          onValueChange={(val) => {
            setVehicleEnabled(vehicleId, val);
            if (val) checkAndScheduleNotifications();
          }}
          trackColor={{ true: '#3b82f6' }}
        />
      </View>

      {!statuses || statuses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aucune règle configurée</Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { marginTop: 12 }]}
            onPress={() => navigation.navigate('MaintenanceRules', { vehicleId, vehicleName })}
          >
            <Text style={styles.btnPrimaryText}>Configurer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Wear gauges */}
          {Object.entries(byCategory).map(([cat, items]) => (
            <View key={cat} style={{ marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>{CATEGORY_LABELS[cat] || cat}</Text>
              {items.map((s: any) => (
                <View key={s.ruleId} style={styles.gaugeCard}>
                  <View style={styles.gaugeHeader}>
                    <Text style={styles.gaugeName}>{PART_TYPE_LABELS[s.partType] || s.partType}</Text>
                    <Text style={styles.gaugePercent}>{s.wearPercent !== null ? `${s.wearPercent}%` : '—'}</Text>
                  </View>
                  <WearBar percent={s.wearPercent} status={s.status} />
                  <Text style={styles.gaugeInfo}>
                    {s.lastDate ? `Dernier: ${new Date(s.lastDate).toLocaleDateString('fr-FR')}` : 'Aucun historique'}
                    {s.nextEstimatedDate ? ` · Prochain: ${new Date(s.nextEstimatedDate).toLocaleDateString('fr-FR')}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {/* 6-month estimate */}
          {predictions?.sixMonthEstimate?.total > 0 && (
            <View style={styles.estimateCard}>
              <Text style={styles.estimateTitle}>Estimation 6 mois</Text>
              <Text style={styles.estimateAmount}>{predictions.sixMonthEstimate.total.toFixed(2)} €</Text>
              <Text style={styles.estimateInfo}>
                {predictions.sixMonthEstimate.items.length} entretien(s) prévu(s)
              </Text>
            </View>
          )}

          {/* Costs */}
          {costs && costs.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>Coûts par année</Text>
              {costs.map((c: any) => (
                <View key={c.year} style={styles.costRow}>
                  <Text style={styles.costYear}>{c.year}</Text>
                  <Text style={styles.costAmount}>{c.total.toFixed(2)} €</Text>
                </View>
              ))}
            </View>
          )}
          {/* Maintenance records history */}
          {records && records.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>Historique des entretiens</Text>
              {records.map((r: any) => (
                <View key={r.id} style={styles.gaugeCard}>
                  {editingId === r.id ? (
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
                        <Text style={styles.editLabel}>Prix:</Text>
                        <TextInput
                          style={styles.editInput}
                          keyboardType="numeric"
                          value={String(editForm.price ?? '')}
                          onChangeText={(v) => setEditForm({ ...editForm, price: Number(v) })}
                        />
                      </View>
                      <View style={styles.editRow}>
                        <Text style={styles.editLabel}>Garage:</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editForm.garage || ''}
                          onChangeText={(v) => setEditForm({ ...editForm, garage: v })}
                        />
                      </View>
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.saveBtn}
                          onPress={() => updateRecordMutation.mutate({ id: r.id, data: editForm })}
                        >
                          <Text style={styles.saveBtnText}>Sauver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingId(null)}>
                          <Text style={styles.cancelBtnText}>Annuler</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.gaugeHeader}>
                        <Text style={styles.gaugeName}>{PART_TYPE_LABELS[r.partType] || r.partType}</Text>
                        <Text style={styles.gaugePercent}>{r.price != null ? formatCurrency(r.price) : '—'}</Text>
                      </View>
                      <Text style={styles.gaugeInfo}>
                        {new Date(r.date).toLocaleDateString('fr-FR')} · {r.mileage?.toLocaleString()} km
                        {r.garage ? ` · ${r.garage}` : ''}
                      </Text>
                      <View style={styles.recordActions}>
                        <TouchableOpacity onPress={() => {
                          setEditingId(r.id);
                          setEditForm({ mileage: r.mileage, price: r.price, garage: r.garage });
                        }}>
                          <Text style={styles.editBtnText}>Modifier</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          Alert.alert('Supprimer cet entretien ?', '', [
                            { text: 'Annuler', style: 'cancel' },
                            { text: 'Supprimer', style: 'destructive', onPress: () => deleteRecordMutation.mutate(r.id) },
                          ]);
                        }}>
                          <Text style={styles.deleteBtnText}>Supprimer</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  btnPrimary: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnSecondary: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnSecondaryText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1f2937', marginBottom: 10 },
  gaugeCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  gaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  gaugeName: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  gaugePercent: { fontSize: 12, color: '#6b7280' },
  barBg: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  gaugeInfo: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  estimateCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#bfdbfe' },
  estimateTitle: { fontSize: 14, fontWeight: '600', color: '#1e3a5f' },
  estimateAmount: { fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginTop: 4 },
  estimateInfo: { fontSize: 12, color: '#3b82f6', marginTop: 4 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  costYear: { fontSize: 14, fontWeight: '500', color: '#374151' },
  costAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  recordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  editBtnText: { color: '#3b82f6', fontSize: 13, fontWeight: '500' },
  deleteBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '500' },
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  editLabel: { width: 60, fontSize: 13, color: '#6b7280' },
  editInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  saveBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cancelBtnText: { color: '#6b7280', fontSize: 13, paddingVertical: 8 },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  notifText: { fontSize: 15, fontWeight: '500', color: '#111827' },
});
