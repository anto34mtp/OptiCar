import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsService } from '../services/api';

const { width } = Dimensions.get('window');

function fmt(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
}
function fmtKg(g: number) {
  const kg = g / 1000;
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(1)} kg`;
}

type Tab = 'costs' | 'fuel' | 'eco';

export default function StatsScreen() {
  const [tab, setTab] = useState<Tab>('costs');

  const { data: costs, isLoading: costsLoading } = useQuery({
    queryKey: ['total-costs'],
    queryFn: () => statsService.getTotalCosts(),
  });

  const { data: global, isLoading: globalLoading } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: statsService.getGlobalStats,
  });

  const { data: co2 } = useQuery({
    queryKey: ['stats', 'co2'],
    queryFn: statsService.getCo2Stats,
  });

  const isLoading = costsLoading || globalLoading;

  const grand   = costs?.grandTotal ?? 0;
  const fuelAmt = costs?.fuelTotal ?? 0;
  const maintAmt = costs?.maintenanceTotal ?? 0;
  const insAmt  = costs?.insuranceTotal ?? 0;
  const fuelPct  = grand > 0 ? (fuelAmt / grand) * 100 : 0;
  const maintPct = grand > 0 ? (maintAmt / grand) * 100 : 0;
  const insPct   = grand > 0 ? (insAmt / grand) * 100 : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Statistiques</Text>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {([
          { key: 'costs', label: 'Coûts' },
          { key: 'fuel',  label: 'Carburant' },
          { key: 'eco',   label: 'CO2' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <>
          {/* ── COÛTS ── */}
          {tab === 'costs' && (
            <View>
              {/* Grand total banner */}
              <View style={styles.grandCard}>
                <Text style={styles.grandLabel}>Total général</Text>
                <Text style={styles.grandValue}>{fmt(grand)}</Text>
                <Text style={styles.grandSub}>
                  {(global?.totalDistance ?? 0).toLocaleString('fr-FR')} km parcourus
                </Text>
              </View>

              {/* 3 catégories */}
              <View style={styles.triRow}>
                <View style={[styles.triCard, { borderTopColor: '#3b82f6' }]}>
                  <Text style={styles.triLabel}>Carburant</Text>
                  <Text style={[styles.triValue, { color: '#2563eb' }]}>{fmt(fuelAmt)}</Text>
                  <Text style={styles.triPct}>{fuelPct.toFixed(0)}%</Text>
                </View>
                <View style={[styles.triCard, { borderTopColor: '#f97316' }]}>
                  <Text style={styles.triLabel}>Entretien</Text>
                  <Text style={[styles.triValue, { color: '#ea580c' }]}>{fmt(maintAmt)}</Text>
                  <Text style={styles.triPct}>{maintPct.toFixed(0)}%</Text>
                </View>
                <View style={[styles.triCard, { borderTopColor: '#8b5cf6' }]}>
                  <Text style={styles.triLabel}>Assurance</Text>
                  <Text style={[styles.triValue, { color: '#7c3aed' }]}>{fmt(insAmt)}</Text>
                  <Text style={styles.triPct}>{insPct.toFixed(0)}%</Text>
                </View>
              </View>

              {/* Répartition barre */}
              {grand > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Répartition</Text>
                  <View style={styles.stackBar}>
                    {fuelPct > 0 && <View style={[styles.stackSeg, { flex: fuelPct, backgroundColor: '#3b82f6' }]} />}
                    {maintPct > 0 && <View style={[styles.stackSeg, { flex: maintPct, backgroundColor: '#f97316' }]} />}
                    {insPct > 0 && <View style={[styles.stackSeg, { flex: insPct, backgroundColor: '#8b5cf6' }]} />}
                  </View>
                  <View style={styles.legend}>
                    {[
                      { c: '#3b82f6', l: 'Carburant' },
                      { c: '#f97316', l: 'Entretien' },
                      { c: '#8b5cf6', l: 'Assurance' },
                    ].map((x) => (
                      <View key={x.l} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: x.c }]} />
                        <Text style={styles.legendText}>{x.l}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Par mois */}
              {(costs?.costsByMonth?.length ?? 0) > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dépenses par mois</Text>
                  {costs!.costsByMonth.slice(-6).map((m: any) => (
                    <View key={m.month} style={styles.monthRow}>
                      <Text style={styles.monthLabel}>{m.month}</Text>
                      <View style={styles.monthBarWrap}>
                        {m.fuel > 0 && <View style={[styles.monthSeg, { flex: m.fuel, backgroundColor: '#3b82f6' }]} />}
                        {m.maintenance > 0 && <View style={[styles.monthSeg, { flex: m.maintenance, backgroundColor: '#f97316' }]} />}
                        {m.insurance > 0 && <View style={[styles.monthSeg, { flex: m.insurance, backgroundColor: '#8b5cf6' }]} />}
                      </View>
                      <Text style={styles.monthTotal}>{fmt(m.total)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Par véhicule */}
              {(costs?.costsByVehicle?.length ?? 0) > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Par véhicule</Text>
                  {costs!.costsByVehicle.map((v: any) => {
                    const vTotal = v.total;
                    const vFPct = vTotal > 0 ? (v.fuel / vTotal) * 100 : 0;
                    const vMPct = vTotal > 0 ? (v.maintenance / vTotal) * 100 : 0;
                    const vIPct = vTotal > 0 ? (v.insurance / vTotal) * 100 : 0;
                    return (
                      <View key={v.vehicleId} style={styles.vehicleCard}>
                        <View style={styles.vehicleHeader}>
                          <Text style={styles.vehicleName}>{v.brand} {v.model}</Text>
                          <Text style={styles.vehicleTotal}>{fmt(vTotal)}</Text>
                        </View>
                        <View style={styles.stackBar}>
                          {vFPct > 0 && <View style={[styles.stackSeg, { flex: vFPct, backgroundColor: '#3b82f6' }]} />}
                          {vMPct > 0 && <View style={[styles.stackSeg, { flex: vMPct, backgroundColor: '#f97316' }]} />}
                          {vIPct > 0 && <View style={[styles.stackSeg, { flex: vIPct, backgroundColor: '#8b5cf6' }]} />}
                        </View>
                        <View style={styles.vehicleAmounts}>
                          <Text style={[styles.amtLabel, { color: '#2563eb' }]}>⛽ {fmt(v.fuel)}</Text>
                          <Text style={[styles.amtLabel, { color: '#ea580c' }]}>🔧 {fmt(v.maintenance)}</Text>
                          <Text style={[styles.amtLabel, { color: '#7c3aed' }]}>🛡 {fmt(v.insurance)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ── CARBURANT ── */}
          {tab === 'fuel' && (
            <View>
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiIcon}>⛽</Text>
                  <Text style={styles.kpiValue}>{global?.averageConsumption?.toFixed(1) ?? 'N/A'}</Text>
                  <Text style={styles.kpiLabel}>L/100km</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiIcon}>💶</Text>
                  <Text style={styles.kpiValue}>{global?.averageCostPerKm?.toFixed(3) ?? 'N/A'}</Text>
                  <Text style={styles.kpiLabel}>€/km</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiIcon}>📏</Text>
                  <Text style={styles.kpiValue}>{((global?.totalDistance ?? 0) / 1000).toFixed(0)}k</Text>
                  <Text style={styles.kpiLabel}>km total</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiIcon}>🪣</Text>
                  <Text style={styles.kpiValue}>{(global?.totalLiters ?? 0).toFixed(0)}</Text>
                  <Text style={styles.kpiLabel}>litres total</Text>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dépenses carburant</Text>
                  <Text style={styles.detailValue}>{fmt(global?.totalSpent ?? 0)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nombre de pleins</Text>
                  <Text style={styles.detailValue}>{global?.totalRefuels ?? 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nombre de véhicules</Text>
                  <Text style={styles.detailValue}>{global?.totalVehicles ?? 0}</Text>
                </View>
              </View>

              {(global?.averageConsumption ?? 0) > 8 && (
                <View style={styles.tipCard}>
                  <Text style={styles.tipIcon}>💡</Text>
                  <Text style={styles.tipText}>
                    Consommation élevée. Vérifiez la pression des pneus et adoptez une conduite plus souple.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── CO2 ── */}
          {tab === 'eco' && (
            <View>
              {co2 ? (
                <>
                  <View style={styles.co2Banner}>
                    <Text style={styles.co2Label}>Émissions totales</Text>
                    <Text style={styles.co2Value}>{fmtKg(co2.totalCo2Grams)}</Text>
                    <Text style={styles.co2Sub}>CO2 émis</Text>
                  </View>

                  {(co2.co2ByMonth?.length ?? 0) > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Émissions par mois (kg)</Text>
                      {co2.co2ByMonth.slice(-6).map((m: any) => {
                        const kg = Math.round(m.co2Grams / 1000);
                        const maxKg = Math.max(...co2.co2ByMonth.map((x: any) => Math.round(x.co2Grams / 1000)), 1);
                        return (
                          <View key={m.month} style={styles.monthRow}>
                            <Text style={styles.monthLabel}>{m.month}</Text>
                            <View style={[styles.co2BarBg]}>
                              <View style={[styles.co2Bar, { width: `${(kg / maxKg) * 100}%` }]} />
                            </View>
                            <Text style={styles.monthTotal}>{kg} kg</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {(co2.co2ByVehicle?.length ?? 0) > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Par véhicule</Text>
                      {co2.co2ByVehicle.map((v: any) => (
                        <View key={v.vehicleId} style={styles.vehicleCard}>
                          <View style={styles.vehicleHeader}>
                            <Text style={styles.vehicleName}>{v.brand} {v.model}</Text>
                            <Text style={[styles.vehicleTotal, { color: '#059669' }]}>
                              {v.totalCo2 > 0 ? fmtKg(v.totalCo2) : 'N/A'}
                            </Text>
                          </View>
                          <Text style={styles.detailLabel}>
                            {v.co2PerKm ? `${v.co2PerKm} g/km` : 'g/km non renseigné'}
                            {v.totalDistance > 0 ? `  ·  ${v.totalDistance.toLocaleString('fr-FR')} km` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.center}>
                  <Text style={styles.emptyText}>
                    Aucune donnée CO2.{'\n'}Renseignez les émissions de vos véhicules.
                  </Text>
                </View>
              )}
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
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  center: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#9ca3af', textAlign: 'center', lineHeight: 22 },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabLabel: { fontSize: 13, fontWeight: '500', color: '#9ca3af' },
  tabLabelActive: { color: '#111827', fontWeight: '600' },

  // Grand total
  grandCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16,
    backgroundColor: '#2563eb' },
  grandLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  grandValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 4 },
  grandSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },

  // 3 catégories
  triRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  triCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderTopWidth: 3, borderWidth: 1, borderColor: '#e5e7eb' },
  triLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  triValue: { fontSize: 15, fontWeight: 'bold' },
  triPct: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  // Stacked bar
  stackBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden',
    backgroundColor: '#e5e7eb', marginVertical: 8 },
  stackSeg: { height: 8 },

  // Legend
  legend: { flexDirection: 'row', gap: 14, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6b7280' },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },

  // Monthly rows
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  monthLabel: { width: 64, fontSize: 11, color: '#6b7280' },
  monthBarWrap: { flex: 1, flexDirection: 'row', height: 16, borderRadius: 4, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  monthSeg: { height: 16 },
  monthTotal: { width: 72, fontSize: 11, fontWeight: '600', color: '#111827', textAlign: 'right' },

  // Vehicle card
  vehicleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  vehicleName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  vehicleTotal: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  vehicleAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  amtLabel: { fontSize: 12, fontWeight: '500' },

  // KPI grid (fuel tab)
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18,
    width: (width - 56) / 2, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb' },
  kpiIcon: { fontSize: 26, marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  kpiLabel: { fontSize: 11, color: '#9ca3af', marginTop: 3 },

  // Detail rows
  detailRow: { flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 13, color: '#6b7280' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827' },

  // Tip
  tipCard: { backgroundColor: '#fefce8', borderRadius: 12, padding: 16,
    flexDirection: 'row', borderWidth: 1, borderColor: '#fde68a', marginTop: 8 },
  tipIcon: { fontSize: 22, marginRight: 10 },
  tipText: { flex: 1, fontSize: 13, color: '#854d0e', lineHeight: 20 },

  // CO2
  co2Banner: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16,
    backgroundColor: '#059669' },
  co2Label: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  co2Value: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 4 },
  co2Sub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },
  co2BarBg: { flex: 1, height: 14, backgroundColor: '#d1fae5', borderRadius: 7, overflow: 'hidden' },
  co2Bar: { height: 14, backgroundColor: '#10b981', borderRadius: 7 },
});
