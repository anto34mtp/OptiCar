import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { statsService, vehiclesService } from '../services/api';
import { shadow } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

const { width } = Dimensions.get('window');

function MiniBarChart({ data, color, colors }: { data: { label: string; value: number }[]; color: string; colors: ThemeColors }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 5, paddingTop: 8 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: colors.textLight, marginBottom: 3 }}>
            {d.value > 0
              ? typeof d.value === 'number' && d.value > 999
                ? `${(d.value / 1000).toFixed(1)}k`
                : String(Math.round(d.value))
              : ''}
          </Text>
          <View
            style={{
              width: '100%',
              height: Math.max((d.value / max) * 56, d.value > 0 ? 4 : 2),
              backgroundColor: d.value > 0 ? color : colors.border,
              borderRadius: 4,
              opacity: 0.65 + (i / Math.max(data.length - 1, 1)) * 0.35,
            }}
          />
          <Text style={{ fontSize: 8, color: colors.textLight, marginTop: 4, textAlign: 'center' }}>
            {d.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function fmt(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
}
function fmtKg(g: number) {
  const kg = g / 1000;
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(1)} kg`;
}
function toMonthLabel(isoMonth: string, long = false) {
  const parts = isoMonth.split('-');
  if (parts.length < 2) return isoMonth;
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: long ? 'long' : 'short' });
}

type Tab = 'costs' | 'fuel' | 'eco';

const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'costs', label: 'Coûts',     icon: 'wallet-outline' },
  { key: 'fuel',  label: 'Carburant', icon: 'water-outline' },
  { key: 'eco',   label: 'CO2',       icon: 'leaf-outline' },
];

export default function StatsScreen() {
  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('costs');
  const [fuelVehicleId, setFuelVehicleId] = useState<string | null>(null);

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  });

  const { data: vehicleStats } = useQuery({
    queryKey: ['stats', 'vehicle', fuelVehicleId],
    queryFn: () => statsService.getVehicleStats(fuelVehicleId!),
    enabled: !!fuelVehicleId,
  });

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

  const grand    = costs?.grandTotal ?? 0;
  const fuelAmt  = costs?.fuelTotal ?? 0;
  const maintAmt = costs?.maintenanceTotal ?? 0;
  const insAmt   = costs?.insuranceTotal ?? 0;
  const fuelPct  = grand > 0 ? (fuelAmt / grand) * 100 : 0;
  const maintPct = grand > 0 ? (maintAmt / grand) * 100 : 0;
  const insPct   = grand > 0 ? (insAmt / grand) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistiques</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t.icon}
                size={15}
                color={active ? colors.primary : colors.textLight}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* ── COÛTS ── */}
            {tab === 'costs' && (
              <View>
                <View style={styles.grandCard}>
                  <Text style={styles.grandLabel}>Total général</Text>
                  <Text style={styles.grandValue}>{fmt(grand)}</Text>
                  <Text style={styles.grandSub}>
                    {(global?.totalDistance ?? 0).toLocaleString('fr-FR')} km parcourus
                  </Text>
                </View>

                <View style={styles.triRow}>
                  {[
                    { label: 'Carburant', value: fuelAmt,  pct: fuelPct,  color: colors.primary },
                    { label: 'Entretien', value: maintAmt, pct: maintPct, color: colors.warning },
                    { label: 'Assurance', value: insAmt,   pct: insPct,   color: colors.purple },
                  ].map((item) => (
                    <View key={item.label} style={[styles.triCard, { borderTopColor: item.color }]}>
                      <Text style={styles.triLabel}>{item.label}</Text>
                      <Text style={[styles.triValue, { color: item.color }]}>{fmt(item.value)}</Text>
                      <Text style={styles.triPct}>{item.pct.toFixed(0)}%</Text>
                    </View>
                  ))}
                </View>

                {grand > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Répartition</Text>
                    <View style={styles.stackBar}>
                      {fuelPct > 0 && <View style={[styles.stackSeg, { flex: fuelPct, backgroundColor: colors.primary }]} />}
                      {maintPct > 0 && <View style={[styles.stackSeg, { flex: maintPct, backgroundColor: colors.warning }]} />}
                      {insPct > 0 && <View style={[styles.stackSeg, { flex: insPct, backgroundColor: colors.purple }]} />}
                    </View>
                    <View style={styles.legend}>
                      {[
                        { c: colors.primary, l: 'Carburant' },
                        { c: colors.warning, l: 'Entretien' },
                        { c: colors.purple,  l: 'Assurance' },
                      ].map((x) => (
                        <View key={x.l} style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: x.c }]} />
                          <Text style={styles.legendText}>{x.l}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {(costs?.costsByMonth?.length ?? 0) > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Répartition mensuelle</Text>
                    {costs!.costsByMonth.slice(-6).map((m: any) => {
                      const fp = m.total > 0 ? (m.fuel / m.total) * 100 : 0;
                      const mp = m.total > 0 ? (m.maintenance / m.total) * 100 : 0;
                      const ip = m.total > 0 ? (m.insurance / m.total) * 100 : 0;
                      return (
                        <View key={m.month} style={styles.monthCard}>
                          <View style={styles.monthCardHeader}>
                            <Text style={styles.monthCardLabel}>
                              {toMonthLabel(m.month, true)} {m.month.split('-')[0]}
                            </Text>
                            <Text style={styles.monthCardTotal}>{fmt(m.total)}</Text>
                          </View>
                          {[
                            { label: 'Carburant', pct: fp,  color: colors.primary },
                            { label: 'Entretien',  pct: mp, color: colors.warning },
                            { label: 'Assurance',  pct: ip, color: colors.purple },
                          ].map((row) => (
                            <View key={row.label} style={styles.barRow}>
                              <Text style={styles.barLabel}>{row.label}</Text>
                              <View style={styles.barTrack}>
                                <View
                                  style={[
                                    styles.barFill,
                                    { width: `${Math.max(row.pct, 0)}%` as any, backgroundColor: row.color },
                                  ]}
                                />
                              </View>
                              <Text style={styles.barPct}>{row.pct.toFixed(0)}%</Text>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                )}

                {(costs?.costsByMonth?.length ?? 0) > 1 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Suivi du coût mensuel</Text>
                    <View style={styles.trendCard}>
                      <MiniBarChart
                        data={costs!.costsByMonth.slice(-6).map((m: any) => ({
                          label: toMonthLabel(m.month),
                          value: m.total,
                        }))}
                        color={colors.primary}
                        colors={colors}
                      />
                    </View>
                  </View>
                )}

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
                            {vFPct > 0 && <View style={[styles.stackSeg, { flex: vFPct, backgroundColor: colors.primary }]} />}
                            {vMPct > 0 && <View style={[styles.stackSeg, { flex: vMPct, backgroundColor: colors.warning }]} />}
                            {vIPct > 0 && <View style={[styles.stackSeg, { flex: vIPct, backgroundColor: colors.purple }]} />}
                          </View>
                          <View style={styles.vehicleAmounts}>
                            <Text style={[styles.amtLabel, { color: colors.primary }]}>⛽ {fmt(v.fuel)}</Text>
                            <Text style={[styles.amtLabel, { color: colors.warning }]}>🔧 {fmt(v.maintenance)}</Text>
                            <Text style={[styles.amtLabel, { color: colors.purple }]}>🛡 {fmt(v.insurance)}</Text>
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
                {/* Vehicle filter */}
                {(vehicles?.length ?? 0) > 1 && (
                  <View style={styles.filterRow}>
                    <TouchableOpacity
                      style={[styles.filterChip, !fuelVehicleId && styles.filterChipActive]}
                      onPress={() => setFuelVehicleId(null)}
                    >
                      <Ionicons name="globe-outline" size={13} color={!fuelVehicleId ? colors.primary : colors.textMid} />
                      <Text style={[styles.filterChipText, !fuelVehicleId && styles.filterChipTextActive]}>Global</Text>
                    </TouchableOpacity>
                    {vehicles!.map((v: any) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.filterChip, fuelVehicleId === v.id && styles.filterChipActive]}
                        onPress={() => setFuelVehicleId(v.id)}
                      >
                        <Ionicons name="car-outline" size={13} color={fuelVehicleId === v.id ? colors.primary : colors.textMid} />
                        <Text style={[styles.filterChipText, fuelVehicleId === v.id && styles.filterChipTextActive]}>
                          {v.brand} {v.model}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {(() => {
                  const src = fuelVehicleId ? vehicleStats : global;
                  return (
                    <>
                      <View style={styles.kpiGrid}>
                        {[
                          { icon: 'water' as const,    value: src?.averageConsumption?.toFixed(1) ?? 'N/A', label: 'L/100km',     color: colors.primary },
                          { icon: 'cash' as const,      value: src?.averageCostPerKm?.toFixed(3) ?? 'N/A',  label: '€/km',        color: colors.success },
                          { icon: 'navigate' as const,  value: `${((src?.totalDistance ?? 0) / 1000).toFixed(0)}k`,             label: 'km total',    color: colors.purple },
                          { icon: 'beaker' as const,    value: (src?.totalLiters ?? 0).toFixed(0),          label: 'litres total', color: colors.warning },
                        ].map((kpi) => (
                          <View key={kpi.label} style={styles.kpiCard}>
                            <View style={[styles.kpiIconBox, { backgroundColor: kpi.color + '15' }]}>
                              <Ionicons name={kpi.icon} size={20} color={kpi.color} />
                            </View>
                            <Text style={styles.kpiValue}>{kpi.value}</Text>
                            <Text style={styles.kpiLabel}>{kpi.label}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={[styles.section, { backgroundColor: colors.card, borderRadius: 14, padding: 14, ...shadow.sm }]}>
                        {[
                          { label: 'Dépenses carburant', value: fmt(src?.totalSpent ?? 0) },
                          { label: 'Nombre de pleins',   value: String(src?.totalRefuels ?? 0) },
                          ...(!fuelVehicleId ? [{ label: 'Nombre de véhicules', value: String(global?.totalVehicles ?? 0) }] : []),
                        ].map((row, i, arr) => (
                          <View
                            key={row.label}
                            style={[
                              styles.detailRow,
                              i === arr.length - 1 && { borderBottomWidth: 0 },
                            ]}
                          >
                            <Text style={styles.detailLabel}>{row.label}</Text>
                            <Text style={styles.detailValue}>{row.value}</Text>
                          </View>
                        ))}
                      </View>

                      {(src?.averageConsumption ?? 0) > 8 && (
                        <View style={styles.tipCard}>
                          <Ionicons name="bulb-outline" size={22} color="#92400e" />
                          <Text style={styles.tipText}>
                            Consommation élevée. Vérifiez la pression des pneus et adoptez une conduite plus souple.
                          </Text>
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            )}

            {/* ── CO2 ── */}
            {tab === 'eco' && (
              <View>
                {co2 ? (
                  <>
                    <View style={styles.co2Banner}>
                      <View style={styles.co2IconCircle}>
                        <Ionicons name="leaf" size={28} color={colors.success} />
                      </View>
                      <Text style={styles.co2Label}>Émissions totales</Text>
                      <Text style={styles.co2Value}>{fmtKg(co2.totalCo2Grams)}</Text>
                      <Text style={styles.co2Sub}>CO2 émis depuis le suivi</Text>
                    </View>

                    {(co2.co2ByMonth?.length ?? 0) > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Émissions par mois</Text>
                        {co2.co2ByMonth.slice(-6).map((m: any) => {
                          const kg = Math.round(m.co2Grams / 1000);
                          const maxKg = Math.max(
                            ...co2.co2ByMonth.map((x: any) => Math.round(x.co2Grams / 1000)),
                            1,
                          );
                          return (
                            <View key={m.month} style={styles.barRow}>
                              <Text style={styles.barLabel}>{toMonthLabel(m.month)}</Text>
                              <View style={[styles.barTrack, { backgroundColor: colors.successLight }]}>
                                <View
                                  style={[
                                    styles.barFill,
                                    { width: `${(kg / maxKg) * 100}%` as any, backgroundColor: colors.success },
                                  ]}
                                />
                              </View>
                              <Text style={[styles.barPct, { color: colors.successDark }]}>{kg}kg</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {(co2.co2ByMonth?.length ?? 0) > 1 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Suivi des émissions CO2</Text>
                        <View style={styles.trendCard}>
                          <MiniBarChart
                            data={co2.co2ByMonth.slice(-6).map((m: any) => ({
                              label: toMonthLabel(m.month),
                              value: Math.round(m.co2Grams / 1000),
                            }))}
                            color={colors.success}
                            colors={colors}
                          />
                        </View>
                      </View>
                    )}

                    {(co2.co2ByVehicle?.length ?? 0) > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Par véhicule</Text>
                        {co2.co2ByVehicle.map((v: any) => (
                          <View key={v.vehicleId} style={styles.vehicleCard}>
                            <View style={styles.vehicleHeader}>
                              <Text style={styles.vehicleName}>{v.brand} {v.model}</Text>
                              <Text style={[styles.vehicleTotal, { color: colors.successDark }]}>
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
                    <Ionicons name="leaf-outline" size={40} color={colors.textLight} />
                    <Text style={styles.emptyText}>
                      Aucune donnée CO2.{'\n'}Renseignez les émissions de vos véhicules.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
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
  center: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: c.textMid,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },

  // Header
  header: {
    backgroundColor: c.dark,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: c.dark,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: c.darkMid,
  },
  tabBtnActive: {
    backgroundColor: c.primaryLight,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textLight,
  },
  tabLabelActive: {
    color: c.primary,
  },

  // Grand total
  grandCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: c.primaryDark,
    ...shadow.md,
  },
  grandLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '500' },
  grandValue: { color: '#fff', fontSize: 38, fontWeight: '800', marginTop: 4 },
  grandSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6 },

  // 3 catégories
  triRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  triCard: {
    flex: 1, backgroundColor: c.card, borderRadius: 12, padding: 12,
    borderTopWidth: 3, borderWidth: 1, borderColor: c.border,
    ...shadow.sm,
  },
  triLabel: { fontSize: 11, color: c.textLight, marginBottom: 4 },
  triValue: { fontSize: 15, fontWeight: '700' },
  triPct: { fontSize: 11, color: c.textLight, marginTop: 2 },

  // Stacked bar
  stackBar: {
    flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden',
    backgroundColor: c.border, marginVertical: 8,
  },
  stackSeg: { height: 8 },

  // Legend
  legend: { flexDirection: 'row', gap: 14, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: c.textMid },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 12,
  },

  // Monthly card
  monthCard: {
    backgroundColor: c.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: c.border, ...shadow.sm,
  },
  monthCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  monthCardLabel: { fontSize: 13, fontWeight: '600', color: c.textMid },
  monthCardTotal: { fontSize: 13, fontWeight: '700', color: c.text },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  barLabel: { width: 68, fontSize: 11, color: c.textMid },
  barTrack: { flex: 1, height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { width: 32, fontSize: 11, fontWeight: '600', color: c.textMid, textAlign: 'right' },

  // Trend chart
  trendCard: {
    backgroundColor: c.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: c.border, ...shadow.sm,
  },

  // Vehicle card
  vehicleCard: {
    backgroundColor: c.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: c.border, ...shadow.sm,
  },
  vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  vehicleName: { fontSize: 14, fontWeight: '600', color: c.text },
  vehicleTotal: { fontSize: 14, fontWeight: '700', color: c.text },
  vehicleAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  amtLabel: { fontSize: 12, fontWeight: '500' },

  // Vehicle filter
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  filterChipActive: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textMid,
  },
  filterChipTextActive: {
    color: c.primary,
    fontWeight: '700',
  },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: {
    backgroundColor: c.card, borderRadius: 14, padding: 16,
    width: (width - 56) / 2, alignItems: 'center',
    borderWidth: 1, borderColor: c.border, ...shadow.sm,
  },
  kpiIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: c.text },
  kpiLabel: { fontSize: 11, color: c.textLight, marginTop: 3, fontWeight: '500' },

  // Detail rows
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderLight,
  },
  detailLabel: { fontSize: 13, color: c.textMid },
  detailValue: { fontSize: 13, fontWeight: '600', color: c.text },

  // Tip
  tipCard: {
    backgroundColor: '#fefce8', borderRadius: 12, padding: 16,
    flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: '#fde68a', marginTop: 8,
    alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontSize: 13, color: '#854d0e', lineHeight: 20 },

  // CO2
  co2Banner: {
    borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 16,
    backgroundColor: c.darkMid, ...shadow.md,
  },
  co2IconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.successLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  co2Label: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
  co2Value: { color: '#fff', fontSize: 38, fontWeight: '800', marginTop: 4 },
  co2Sub: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 6 },
});
