import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { statsService } from '../services/api';

const { width } = Dimensions.get('window');

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export default function StatsScreen() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: statsService.getGlobalStats,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Statistiques</Text>
          <Text style={styles.subtitle}>Vue d'ensemble de vos dépenses</Text>
        </View>

        {/* Main stats */}
        <View style={styles.mainStat}>
          <Text style={styles.mainStatLabel}>Dépenses totales</Text>
          <Text style={styles.mainStatValue}>
            {formatCurrency(stats?.totalSpent || 0)}
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⛽</Text>
            <Text style={styles.statValue}>
              {stats?.averageConsumption?.toFixed(1) || 'N/A'}
            </Text>
            <Text style={styles.statLabel}>L/100km</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>
              {stats?.averageCostPerKm?.toFixed(3) || 'N/A'}
            </Text>
            <Text style={styles.statLabel}>€/km</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🚗</Text>
            <Text style={styles.statValue}>{stats?.totalVehicles || 0}</Text>
            <Text style={styles.statLabel}>Véhicules</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statValue}>{stats?.totalRefuels || 0}</Text>
            <Text style={styles.statLabel}>Pleins</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Détails</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Distance totale parcourue</Text>
            <Text style={styles.detailValue}>
              {stats?.totalDistance?.toLocaleString('fr-FR') || 0} km
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Carburant total consommé</Text>
            <Text style={styles.detailValue}>
              {stats?.totalLiters?.toFixed(0) || 0} L
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nombre de véhicules</Text>
            <Text style={styles.detailValue}>{stats?.totalVehicles || 0}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nombre de pleins</Text>
            <Text style={styles.detailValue}>{stats?.totalRefuels || 0}</Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Conseils</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              Ajoutez régulièrement vos pleins pour obtenir des statistiques précises sur votre consommation.
            </Text>
          </View>
          {stats?.averageConsumption && stats.averageConsumption > 8 && (
            <View style={styles.tipCard}>
              <Text style={styles.tipIcon}>🔧</Text>
              <Text style={styles.tipText}>
                Votre consommation moyenne semble élevée. Vérifiez la pression de vos pneus et adoptez une conduite plus souple.
              </Text>
            </View>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  mainStat: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  mainStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  mainStatValue: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: (width - 56) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  detailsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailLabel: {
    color: '#6b7280',
  },
  detailValue: {
    fontWeight: '600',
    color: '#111827',
  },
  tipsSection: {
    padding: 20,
  },
  tipCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    color: '#374151',
    lineHeight: 22,
  },
});
