import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
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

function formatKg(grams: number): string {
  const kg = grams / 1000;
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
}

export default function EcoScreen() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: statsService.getGlobalStats,
  });

  const { data: co2Data, isLoading: co2Loading } = useQuery({
    queryKey: ['co2-stats'],
    queryFn: () => statsService.getCo2Stats(),
  });

  if (statsLoading || co2Loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  const maxMonthCo2 = co2Data?.co2ByMonth?.length > 0
    ? Math.max(...co2Data.co2ByMonth.map((m: any) => m.co2Grams))
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Statistiques & Eco</Text>
          <Text style={styles.subtitle}>Vue d'ensemble de vos dépenses et empreinte CO2</Text>
        </View>

        {/* === STATS SECTION === */}

        {/* Main stat */}
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

        {/* === CO2 SECTION === */}

        {co2Data && (
          <View style={styles.co2Section}>
            <View style={styles.co2Divider}>
              <View style={styles.co2DividerLine} />
              <Text style={styles.co2DividerText}>Empreinte CO2</Text>
              <View style={styles.co2DividerLine} />
            </View>

            {/* CO2 Summary card */}
            <View style={styles.co2SummaryCard}>
              <Text style={styles.co2SummaryLabel}>Emissions totales</Text>
              <Text style={styles.co2SummaryValue}>{formatKg(co2Data.totalCo2Grams)}</Text>
              <Text style={styles.co2SummarySubtext}>CO2</Text>
            </View>

            {/* Monthly chart */}
            {co2Data.co2ByMonth.length > 0 && (
              <View style={styles.co2SubSection}>
                <Text style={styles.sectionTitle}>Emissions mensuelles</Text>
                {co2Data.co2ByMonth.map((m: any) => (
                  <View key={m.month} style={styles.monthRow}>
                    <Text style={styles.monthLabel}>{m.month}</Text>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.co2Bar,
                          { flex: maxMonthCo2 > 0 ? m.co2Grams / maxMonthCo2 : 0 },
                        ]}
                      />
                      <View style={{ flex: maxMonthCo2 > 0 ? 1 - m.co2Grams / maxMonthCo2 : 1 }} />
                    </View>
                    <Text style={styles.monthValue}>{formatKg(m.co2Grams)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Annual summary */}
            {co2Data.co2ByYear.length > 0 && (
              <View style={styles.co2SubSection}>
                <Text style={styles.sectionTitle}>Bilan annuel</Text>
                <View style={styles.yearGrid}>
                  {co2Data.co2ByYear.map((y: any) => (
                    <View key={y.year} style={styles.yearCard}>
                      <Text style={styles.yearLabel}>{y.year}</Text>
                      <Text style={styles.yearValue}>{formatKg(y.co2Grams)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Per vehicle */}
            {co2Data.co2ByVehicle.length > 0 && (
              <View style={styles.co2SubSection}>
                <Text style={styles.sectionTitle}>CO2 par véhicule</Text>
                {co2Data.co2ByVehicle.map((v: any) => (
                  <View key={v.vehicleId} style={styles.vehicleCard}>
                    <Text style={styles.vehicleName}>{v.brand} {v.model}</Text>
                    <View style={styles.vehicleStats}>
                      <View style={styles.vehicleStat}>
                        <Text style={styles.vehicleStatLabel}>CO2 total</Text>
                        <Text style={styles.vehicleStatValue}>
                          {v.totalCo2 > 0 ? formatKg(v.totalCo2) : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.vehicleStat}>
                        <Text style={styles.vehicleStatLabel}>Taux CO2</Text>
                        <Text style={styles.vehicleStatValue}>
                          {v.co2PerKm ? `${v.co2PerKm} g/km` : 'Non renseigné'}
                        </Text>
                      </View>
                      <View style={styles.vehicleStat}>
                        <Text style={styles.vehicleStatLabel}>Distance</Text>
                        <Text style={styles.vehicleStatValue}>
                          {v.totalDistance > 0 ? `${v.totalDistance.toLocaleString('fr-FR')} km` : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {co2Data.co2ByVehicle.every((v: any) => !v.co2PerKm) && (
              <View style={styles.co2TipCard}>
                <Text style={styles.co2TipTitle}>Conseil</Text>
                <Text style={styles.co2TipText}>
                  Renseignez le taux de CO2 (g/km) lors de l'ajout d'un véhicule pour calculer votre empreinte carbone. Cette information se trouve sur la carte grise (champ V.7).
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
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

  // CO2 section styles
  co2Section: {
    paddingHorizontal: 16,
  },
  co2Divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  co2DividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d1fae5',
  },
  co2DividerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  co2SummaryCard: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  co2SummaryLabel: { color: '#d1fae5', fontSize: 14 },
  co2SummaryValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 4 },
  co2SummarySubtext: { color: '#d1fae5', fontSize: 14, marginTop: 2 },
  co2SubSection: { marginBottom: 20 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  monthLabel: { width: 70, fontSize: 12, color: '#6b7280' },
  barContainer: { flex: 1, flexDirection: 'row', height: 16, borderRadius: 4, overflow: 'hidden', backgroundColor: '#f3f4f6' },
  co2Bar: { backgroundColor: '#10b981', height: 16, borderRadius: 4 },
  monthValue: { width: 70, fontSize: 12, fontWeight: '600', color: '#111827', textAlign: 'right' },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  yearCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  yearLabel: { fontSize: 14, color: '#6b7280' },
  yearValue: { fontSize: 20, fontWeight: 'bold', color: '#059669', marginTop: 4 },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  vehicleName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  vehicleStats: { flexDirection: 'row', justifyContent: 'space-between' },
  vehicleStat: { alignItems: 'center', flex: 1 },
  vehicleStatLabel: { fontSize: 11, color: '#6b7280' },
  vehicleStatValue: { fontSize: 13, fontWeight: '600', color: '#059669', marginTop: 2 },
  co2TipCard: {
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  co2TipTitle: { fontWeight: '600', color: '#065f46', marginBottom: 4 },
  co2TipText: { color: '#065f46', fontSize: 13, lineHeight: 18 },
});
