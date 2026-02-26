import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { statsService } from '../services/api';

function formatKg(grams: number): string {
  const kg = grams / 1000;
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
}

export default function EcoScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['co2-stats'],
    queryFn: () => statsService.getCo2Stats(),
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>;
  }

  if (!data) return null;

  const maxMonthCo2 = data.co2ByMonth.length > 0
    ? Math.max(...data.co2ByMonth.map((m: any) => m.co2Grams))
    : 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Empreinte CO2</Text>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Emissions totales</Text>
        <Text style={styles.summaryValue}>{formatKg(data.totalCo2Grams)}</Text>
        <Text style={styles.summarySubtext}>CO2</Text>
      </View>

      {/* Monthly chart */}
      {data.co2ByMonth.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emissions mensuelles</Text>
          {data.co2ByMonth.map((m: any) => (
            <View key={m.month} style={styles.monthRow}>
              <Text style={styles.monthLabel}>{m.month}</Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
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
      {data.co2ByYear.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bilan annuel</Text>
          <View style={styles.yearGrid}>
            {data.co2ByYear.map((y: any) => (
              <View key={y.year} style={styles.yearCard}>
                <Text style={styles.yearLabel}>{y.year}</Text>
                <Text style={styles.yearValue}>{formatKg(y.co2Grams)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Per vehicle */}
      {data.co2ByVehicle.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Par vehicule</Text>
          {data.co2ByVehicle.map((v: any) => (
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
                    {v.co2PerKm ? `${v.co2PerKm} g/km` : 'Non renseigne'}
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

      {data.co2ByVehicle.every((v: any) => !v.co2PerKm) && (
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Conseil</Text>
          <Text style={styles.tipText}>
            Renseignez le taux de CO2 (g/km) lors de l'ajout d'un vehicule pour calculer votre empreinte carbone. Cette information se trouve sur la carte grise (champ V.7).
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 16 },

  summaryCard: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: { color: '#d1fae5', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 4 },
  summarySubtext: { color: '#d1fae5', fontSize: 14, marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  monthLabel: { width: 70, fontSize: 12, color: '#6b7280' },
  barContainer: { flex: 1, flexDirection: 'row', height: 16, borderRadius: 4, overflow: 'hidden', backgroundColor: '#f3f4f6' },
  bar: { backgroundColor: '#10b981', height: 16, borderRadius: 4 },
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

  tipCard: {
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipTitle: { fontWeight: '600', color: '#065f46', marginBottom: 4 },
  tipText: { color: '#065f46', fontSize: 13, lineHeight: 18 },
});
