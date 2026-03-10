import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { statsService, vehiclesService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { shadow, fuelColors } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';
import ThemePicker from '../components/ThemePicker';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

function getCurrentDate() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

type StatCardProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  styles: any;
};

function StatCard({ icon, iconColor, iconBg, label, value, styles }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, isLocalMode, localUserName } = useAuthStore();
  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const displayName = localUserName || user?.name || 'vous';
  const [showThemePicker, setShowThemePicker] = useState(true);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: statsService.getGlobalStats,
  });

  const { data: vehicles, isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  });

  const { data: co2Stats, refetch: refetchCo2 } = useQuery({
    queryKey: ['co2-stats'],
    queryFn: () => statsService.getCo2Stats(),
  });

  const onRefresh = () => {
    refetchStats();
    refetchVehicles();
    refetchCo2();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={statsLoading || vehiclesLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.heroDate}>{getCurrentDate()}</Text>
            <Text style={styles.heroGreeting}>Bonjour, {displayName} 👋</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowThemePicker(true)} style={{ padding: 6, marginRight: 6 }}>
              <Ionicons name="color-palette-outline" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            {isLocalMode ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.heroBadge}
              >
                <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
                <Text style={styles.heroBadgeText}>Sync</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={logout} style={styles.heroLogout}>
                <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Quick Action ── */}
        <View style={styles.heroAction}>
          <TouchableOpacity
            style={styles.addRefuelBtn}
            onPress={() => navigation.navigate('AddRefuel')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addRefuelText}>Ajouter un plein</Text>
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="wallet-outline"
              iconColor={colors.primary}
              iconBg={colors.primaryLight}
              label="Dépenses totales"
              value={formatCurrency(stats?.totalSpent || 0)}
              styles={styles}
            />
            <StatCard
              icon="speedometer-outline"
              iconColor={colors.warning}
              iconBg={colors.warningLight}
              label="Consommation"
              value={stats?.averageConsumption ? `${stats.averageConsumption.toFixed(1)} L/100` : 'N/A'}
              styles={styles}
            />
            <StatCard
              icon="navigate-outline"
              iconColor={colors.purple}
              iconBg={colors.purpleLight}
              label="Coût / km"
              value={stats?.averageCostPerKm ? `${stats.averageCostPerKm.toFixed(3)} €` : 'N/A'}
              styles={styles}
            />
            <StatCard
              icon="water-outline"
              iconColor={colors.primaryDark}
              iconBg={colors.primaryMid}
              label="Pleins"
              value={String(stats?.totalRefuels || 0)}
              styles={styles}
            />
          </View>

          {/* CO2 Card */}
          <TouchableOpacity
            style={styles.co2Card}
            onPress={() => navigation.navigate('Stats')}
            activeOpacity={0.8}
          >
            <View style={styles.co2Left}>
              <View style={styles.co2IconBox}>
                <Ionicons name="leaf" size={18} color={colors.success} />
              </View>
              <View>
                <Text style={styles.co2Label}>Empreinte CO2 totale</Text>
                <Text style={styles.co2Value}>
                  {co2Stats?.totalCo2Grams
                    ? `${(co2Stats.totalCo2Grams / 1000).toFixed(1)} kg émis`
                    : 'Renseigner les véhicules'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </TouchableOpacity>

          {/* Vehicles Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes véhicules</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Vehicles')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {vehicles?.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyCard}
                onPress={() => navigation.navigate('Vehicles')}
              >
                <Ionicons name="car-outline" size={32} color={colors.textLight} />
                <Text style={styles.emptyText}>Aucun véhicule</Text>
                <Text style={styles.emptyLink}>Ajouter un véhicule →</Text>
              </TouchableOpacity>
            ) : (
              vehicles?.slice(0, 3).map((vehicle: any) => {
                const fc = fuelColors[vehicle.fuelType] || fuelColors['SP95'];
                return (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={styles.vehicleCard}
                    onPress={() => navigation.navigate('VehicleDetail', { id: vehicle.id })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.vehicleIconBox, { backgroundColor: fc.bg }]}>
                      <Ionicons name="car" size={20} color={fc.text} />
                    </View>
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleName}>
                        {vehicle.brand} {vehicle.model}
                      </Text>
                      <Text style={styles.vehicleSub}>
                        {vehicle._count?.refuels || 0} pleins
                        {vehicle.year ? `  ·  ${vehicle.year}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.fuelBadge, { backgroundColor: fc.bg, borderColor: fc.border }]}>
                      <Text style={[styles.fuelText, { color: fc.text }]}>{vehicle.fuelType}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
      <ThemePicker visible={showThemePicker} onClose={() => setShowThemePicker(false)} />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.dark,
  },
  scroll: {
    flex: 1,
    backgroundColor: c.background,
  },

  // Hero
  hero: {
    backgroundColor: c.dark,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  heroGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  heroLogout: {
    padding: 6,
  },

  // Action button in hero
  heroAction: {
    backgroundColor: c.dark,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  addRefuelBtn: {
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    ...shadow.md,
  },
  addRefuelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Content area
  content: {
    padding: 16,
    paddingTop: 20,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 14,
    width: '47%',
    ...shadow.sm,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 11,
    color: c.textLight,
    marginBottom: 3,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: c.text,
  },

  // CO2 Card
  co2Card: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    ...shadow.sm,
  },
  co2Left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  co2IconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  co2Label: {
    fontSize: 11,
    color: c.textLight,
    fontWeight: '500',
    marginBottom: 2,
  },
  co2Value: {
    fontSize: 13,
    fontWeight: '600',
    color: c.text,
  },

  // Section
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.text,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    color: c.primary,
    fontSize: 13,
    fontWeight: '500',
  },

  // Vehicle Cards
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
    width: 42,
    height: 42,
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
  vehicleSub: {
    fontSize: 12,
    color: c.textMid,
    marginTop: 2,
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

  // Empty state
  emptyCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    ...shadow.sm,
  },
  emptyText: {
    color: c.textMid,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyLink: {
    color: c.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
