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
import { statsService, vehiclesService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, isLocalMode, localUserName } = useAuthStore();
  const displayName = localUserName || user?.name || 'Utilisateur';

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
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={statsLoading || vehiclesLoading} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour, {displayName}</Text>
            <Text style={styles.subtitle}>Votre tableau de bord</Text>
          </View>
          {isLocalMode ? (
            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerButton}>
              <Text style={styles.registerText}>Créer un compte</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick action */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddRefuel')}
        >
          <Text style={styles.addButtonText}>+ Ajouter un plein</Text>
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Dépenses totales</Text>
            <Text style={styles.statValue}>{formatCurrency(stats?.totalSpent || 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Consommation</Text>
            <Text style={styles.statValue}>
              {stats?.averageConsumption
                ? `${stats.averageConsumption.toFixed(1)} L/100km`
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Coût/km</Text>
            <Text style={styles.statValue}>
              {stats?.averageCostPerKm
                ? `${stats.averageCostPerKm.toFixed(3)} €`
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pleins</Text>
            <Text style={styles.statValue}>{stats?.totalRefuels || 0}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: '#10b981' }]}>
            <Text style={styles.statLabel}>CO2 total</Text>
            <Text style={[styles.statValue, { color: '#059669' }]}>
              {co2Stats?.totalCo2Grams
                ? `${(co2Stats.totalCo2Grams / 1000).toFixed(1)} kg`
                : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Vehicles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes véhicules</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Vehicles')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {vehicles?.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucun véhicule</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Vehicles')}>
                <Text style={styles.emptyLink}>Ajouter un véhicule</Text>
              </TouchableOpacity>
            </View>
          ) : (
            vehicles?.slice(0, 3).map((vehicle: any) => (
              <TouchableOpacity
                key={vehicle.id}
                style={styles.vehicleCard}
                onPress={() => navigation.navigate('VehicleDetail', { id: vehicle.id })}
              >
                <View>
                  <Text style={styles.vehicleName}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  <Text style={styles.vehicleInfo}>
                    {vehicle._count?.refuels || 0} pleins
                  </Text>
                </View>
                <View style={styles.fuelBadge}>
                  <Text style={styles.fuelText}>{vehicle.fuelType}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  registerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAll: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  fuelBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fuelText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyLink: {
    color: '#3b82f6',
    fontWeight: '500',
  },
});
