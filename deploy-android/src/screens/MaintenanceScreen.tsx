import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { vehiclesService, maintenanceService } from '../services/api';
import { checkAndScheduleNotifications } from '../services/notifications';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';
import { shadow } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

type StatusLevel = 'critical' | 'warning' | 'ok';

export default function MaintenanceScreen({ navigation }: any) {
  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const STATUS_CONFIG: Record<StatusLevel, { color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = {
    critical: { color: colors.danger,  bg: colors.dangerLight,  icon: 'warning',          label: 'Attention' },
    warning:  { color: colors.warning, bg: colors.warningLight, icon: 'alert-circle',     label: 'À surveiller' },
    ok:       { color: colors.success, bg: colors.successLight, icon: 'checkmark-circle', label: 'OK' },
  };

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

  useFocusEffect(
    useCallback(() => {
      loadStatuses();
      checkAndScheduleNotifications();
    }, [loadStatuses]),
  );

  if (vehiclesLoading || statusLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Entretien</Text>
        <Text style={styles.headerSub}>
          {vehicles?.length || 0} véhicule{(vehicles?.length || 0) > 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={{ padding: 16, paddingTop: 20 }}
        data={vehicles || []}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          /* Notifications toggle */
          <TouchableOpacity
            style={styles.notifCard}
            onPress={async () => {
              await setGlobalEnabled(!globalEnabled);
              await checkAndScheduleNotifications();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.notifLeft}>
              <View style={[styles.notifIconBox, { backgroundColor: globalEnabled ? colors.primaryLight : colors.background }]}>
                <Ionicons
                  name={globalEnabled ? 'notifications' : 'notifications-off-outline'}
                  size={18}
                  color={globalEnabled ? colors.primary : colors.textLight}
                />
              </View>
              <View>
                <Text style={styles.notifTitle}>Notifications d'entretien</Text>
                <Text style={styles.notifSub}>
                  {globalEnabled ? 'Alertes activées' : 'Alertes désactivées'}
                </Text>
              </View>
            </View>
            <Switch
              value={globalEnabled}
              onValueChange={async (val) => {
                await setGlobalEnabled(val);
                await checkAndScheduleNotifications();
              }}
              trackColor={{ false: colors.border, true: colors.primaryMid }}
              thumbColor={globalEnabled ? colors.primary : '#fff'}
            />
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const statuses = vehicleStatuses[item.id] || [];
          const criticalCount = statuses.filter((s: any) => s.status === 'critical').length;
          const warningCount = statuses.filter((s: any) => s.status === 'warning').length;
          const level: StatusLevel = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'ok';
          const cfg = STATUS_CONFIG[level];

          return (
            <TouchableOpacity
              style={styles.vehicleCard}
              onPress={() =>
                navigation.navigate('VehicleMaintenance', {
                  vehicleId: item.id,
                  vehicleName: `${item.brand} ${item.model}`,
                })
              }
              activeOpacity={0.75}
            >
              <View style={[styles.statusBar, { backgroundColor: cfg.color }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.cardTitle}>{item.brand} {item.model}</Text>
                    {item.year && <Text style={styles.cardSub}>Année {item.year}</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                    <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                {(criticalCount > 0 || warningCount > 0) && (
                  <View style={styles.alertRow}>
                    {criticalCount > 0 && (
                      <Text style={[styles.alertChip, { color: colors.danger }]}>
                        {criticalCount} critique{criticalCount > 1 ? 's' : ''}
                      </Text>
                    )}
                    {warningCount > 0 && (
                      <Text style={[styles.alertChip, { color: colors.warning }]}>
                        {warningCount} à surveiller
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.tapHint}>Voir le détail</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textLight} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="construct-outline" size={40} color={colors.textLight} />
            <Text style={styles.emptyText}>Aucun véhicule</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.dark,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
  },

  // Header
  header: {
    backgroundColor: c.dark,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  list: {
    flex: 1,
    backgroundColor: c.background,
  },

  // Notifications card
  notifCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    ...shadow.sm,
  },
  notifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  notifIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  notifSub: {
    fontSize: 11,
    color: c.textLight,
    marginTop: 1,
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadow.sm,
  },
  statusBar: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.text,
  },
  cardSub: {
    fontSize: 12,
    color: c.textMid,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  alertRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  alertChip: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  tapHint: {
    fontSize: 12,
    color: c.textLight,
    flex: 1,
  },

  emptyCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    ...shadow.sm,
  },
  emptyText: {
    color: c.textMid,
    fontSize: 14,
    fontWeight: '500',
  },
});
