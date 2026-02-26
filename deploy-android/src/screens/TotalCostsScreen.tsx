import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { statsService } from '../services/api';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function TotalCostsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['total-costs'],
    queryFn: () => statsService.getTotalCosts(),
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  if (!data) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Coût total</Text>

      {/* Summary cards */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, { borderLeftColor: '#3b82f6' }]}>
          <Text style={styles.cardLabel}>Carburant</Text>
          <Text style={[styles.cardValue, { color: '#3b82f6' }]}>{formatCurrency(data.fuelTotal)}</Text>
        </View>
        <View style={[styles.card, { borderLeftColor: '#f97316' }]}>
          <Text style={styles.cardLabel}>Entretien</Text>
          <Text style={[styles.cardValue, { color: '#f97316' }]}>{formatCurrency(data.maintenanceTotal)}</Text>
        </View>
      </View>
      <View style={styles.cardsRow}>
        <View style={[styles.card, { borderLeftColor: '#8b5cf6' }]}>
          <Text style={styles.cardLabel}>Assurance</Text>
          <Text style={[styles.cardValue, { color: '#8b5cf6' }]}>{formatCurrency(data.insuranceTotal)}</Text>
        </View>
        <View style={[styles.card, { borderLeftColor: '#111827' }]}>
          <Text style={styles.cardLabel}>Total</Text>
          <Text style={[styles.cardValue, { color: '#111827' }]}>{formatCurrency(data.grandTotal)}</Text>
        </View>
      </View>

      {/* Monthly breakdown */}
      {data.costsByMonth.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dépenses par mois</Text>
          {data.costsByMonth.map((m: any) => (
            <View key={m.month} style={styles.monthRow}>
              <Text style={styles.monthLabel}>{m.month}</Text>
              <View style={styles.monthBars}>
                {m.fuel > 0 && (
                  <View style={[styles.barSegment, { backgroundColor: '#3b82f6', flex: m.fuel }]} />
                )}
                {m.maintenance > 0 && (
                  <View style={[styles.barSegment, { backgroundColor: '#f97316', flex: m.maintenance }]} />
                )}
                {m.insurance > 0 && (
                  <View style={[styles.barSegment, { backgroundColor: '#8b5cf6', flex: m.insurance }]} />
                )}
              </View>
              <Text style={styles.monthTotal}>{formatCurrency(m.total)}</Text>
            </View>
          ))}
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} /><Text style={styles.legendText}>Carburant</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f97316' }]} /><Text style={styles.legendText}>Entretien</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} /><Text style={styles.legendText}>Assurance</Text></View>
          </View>
        </View>
      )}

      {/* By vehicle */}
      {data.costsByVehicle.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coûts par véhicule</Text>
          {data.costsByVehicle.map((v: any) => (
            <View key={v.vehicleId} style={styles.vehicleCard}>
              <Text style={styles.vehicleName}>{v.brand} {v.model}</Text>
              <View style={styles.vehicleRow}>
                <Text style={[styles.vehicleAmount, { color: '#3b82f6' }]}>{formatCurrency(v.fuel)}</Text>
                <Text style={[styles.vehicleAmount, { color: '#f97316' }]}>{formatCurrency(v.maintenance)}</Text>
                <Text style={[styles.vehicleAmount, { color: '#8b5cf6' }]}>{formatCurrency(v.insurance)}</Text>
              </View>
              <Text style={styles.vehicleTotal}>Total: {formatCurrency(v.total)}</Text>
            </View>
          ))}
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
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  cardLabel: { fontSize: 12, color: '#6b7280' },
  cardValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  section: { marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  monthLabel: { width: 70, fontSize: 12, color: '#6b7280' },
  monthBars: { flex: 1, flexDirection: 'row', height: 16, borderRadius: 4, overflow: 'hidden' },
  barSegment: { height: 16 },
  monthTotal: { width: 80, fontSize: 12, fontWeight: '600', color: '#111827', textAlign: 'right' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#6b7280' },
  vehicleCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  vehicleName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vehicleAmount: { fontSize: 13, fontWeight: '500' },
  vehicleTotal: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginTop: 6, textAlign: 'right' },
});
