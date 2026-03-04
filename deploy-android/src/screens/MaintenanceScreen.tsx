import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { vehiclesService, maintenanceService } from '../services/api';
import { checkAndScheduleNotifications } from '../services/notifications';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';

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

export default function MaintenanceScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { globalEnabled, setGlobalEnabled, loadSettings, isLoaded } = useNotificationSettingsStore();

  useEffect(() => {
    if (!isLoaded) loadSettings();
  }, []);

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesService.getAll(),
  });

  const [vehicleStatuses, setVehicleStatuses] = useState<Record<string, any[]>>({});
  const [statusLoading, setStatusLoading] = useState(false);

  const loadStatuses = useCallback(() => {
    if (!vehicles || vehicles.length === 0) return;
    setStatusLoading(true);
    Promise.all(
      vehicles.map(async (v: any) => {
        try {
          const statuses = await maintenanceService.getStatus(v.id);
          return { id: v.id, statuses };
        } catch {
          return { id: v.id, statuses: [] };
        }
      }),
    ).then((results) => {
      const map: Record<string, any[]> = {};
      for (const r of results) map[r.id] = r.statuses;
      setVehicleStatuses(map);
      setStatusLoading(false);
    });
  }, [vehicles]);

  // Refresh statuses and notifications every time screen gets focus
  useFocusEffect(
    useCallback(() => {
      loadStatuses();
      checkAndScheduleNotifications();
    }, [loadStatuses])
  );

  if (vehiclesLoading || statusLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entretien</Text>
      <View style={styles.notifRow}>
        <Text style={styles.notifText}>Notifications entretien</Text>
        <Switch
          value={globalEnabled}
          onValueChange={async (val) => {
            await setGlobalEnabled(val);
            await checkAndScheduleNotifications();
          }}
          trackColor={{ true: '#3b82f6' }}
        />
      </View>
      <FlatList
        data={vehicles || []}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => {
          const statuses = vehicleStatuses[item.id] || [];
          const criticalCount = statuses.filter((s: any) => s.status === 'critical').length;
          const warningCount = statuses.filter((s: any) => s.status === 'warning').length;
          const badgeColor = criticalCount > 0 ? '#ef4444' : warningCount > 0 ? '#f97316' : '#22c55e';
          const badgeText = criticalCount > 0 ? 'Attention' : warningCount > 0 ? 'A surveiller' : 'OK';

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('VehicleMaintenance', { vehicleId: item.id, vehicleName: `${item.brand} ${item.model}` })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.brand} {item.model}</Text>
                <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
                  <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
                </View>
              </View>
              {item.year && <Text style={styles.cardSubtitle}>Année {item.year}</Text>}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Aucun véhicule</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  notifText: { fontSize: 15, fontWeight: '500', color: '#111827' },
});
