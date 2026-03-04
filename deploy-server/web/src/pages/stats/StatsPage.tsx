import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { statsService } from '../../services/stats';
import { vehiclesService } from '../../services/vehicles';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Tab = 'costs' | 'fuel' | 'eco';

function fmt(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}
function fmtNum(v: number, d = 0) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
}
function fmtKg(grams: number) {
  const kg = grams / 1000;
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(1)} kg`;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'costs', label: 'Coûts' },
  { key: 'fuel',  label: 'Carburant' },
  { key: 'eco',   label: 'Écologie CO2' },
];


function KpiCard({ label, value, sub, color = '#111827', bg = 'white' }: {
  label: string; value: string; sub?: string; color?: string; bg?: string;
}) {
  return (
    <div style={{ backgroundColor: bg }} className="rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  );
}

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>('costs');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: vehiclesService.getAll });
  const { data: costs, isLoading: costsLoading } = useQuery({ queryKey: ['total-costs'], queryFn: statsService.getTotalCosts });
  const { data: globalStats } = useQuery({ queryKey: ['stats', 'global'], queryFn: statsService.getGlobalStats });
  const { data: consumptionData } = useQuery({
    queryKey: ['stats', 'consumption', selectedVehicleId],
    queryFn: () => statsService.getConsumptionHistory({ vehicleId: selectedVehicleId || undefined }),
  });
  const { data: fuelPricesData } = useQuery({
    queryKey: ['stats', 'fuel-prices', selectedVehicleId],
    queryFn: () => statsService.getFuelPriceHistory({ vehicleId: selectedVehicleId || undefined }),
  });
  const { data: co2Data } = useQuery({ queryKey: ['stats', 'co2'], queryFn: statsService.getCo2Stats });

  const consumptionChart = consumptionData?.map((d) => ({
    date: format(new Date(d.date), 'dd/MM', { locale: fr }),
    conso: Math.round(d.consumption * 10) / 10,
  })) ?? [];

  const fuelChart = fuelPricesData?.map((d: any) => ({
    date: format(new Date(d.date), 'dd/MM', { locale: fr }),
    prix: d.pricePerLiter,
  })) ?? [];

  const co2Chart = co2Data?.co2ByMonth?.map((m: any) => ({
    month: m.month,
    co2: Math.round(m.co2Grams / 1000),
  })) ?? [];

  const grandTotal = costs?.grandTotal ?? 0;
  const fuelPct   = grandTotal > 0 ? ((costs?.fuelTotal ?? 0) / grandTotal) * 100 : 0;
  const maintPct  = grandTotal > 0 ? ((costs?.maintenanceTotal ?? 0) / grandTotal) * 100 : 0;
  const insPct    = grandTotal > 0 ? ((costs?.insuranceTotal ?? 0) / grandTotal) * 100 : 0;

  const vehicleOptions = [
    { value: '', label: 'Tous les véhicules' },
    ...(vehicles?.map((v) => ({ value: v.id, label: `${v.brand} ${v.model}` })) ?? []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-gray-500 text-sm mt-1">Coûts, carburant et empreinte CO2</p>
        </div>
        <div className="w-56">
          <Select
            id="vehicle-filter"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            options={vehicleOptions}
          />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ONGLET COÛTS ── */}
      {tab === 'costs' && (
        <div className="space-y-6">
          {costsLoading ? (
            <div className="text-gray-400 py-12 text-center">Chargement...</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-span-2 lg:col-span-1 rounded-2xl p-5 shadow-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                  <p className="text-blue-100 text-sm font-medium">Total général</p>
                  <p className="text-3xl font-bold mt-1">{fmt(grandTotal)}</p>
                  <p className="text-blue-200 text-xs mt-2">{fmtNum(globalStats?.totalDistance ?? 0)} km parcourus</p>
                </div>
                <KpiCard label="Carburant" value={fmt(costs?.fuelTotal ?? 0)} sub={`${fuelPct.toFixed(0)}% du total`} color="#2563eb" />
                <KpiCard label="Entretien" value={fmt(costs?.maintenanceTotal ?? 0)} sub={`${maintPct.toFixed(0)}% du total`} color="#ea580c" />
                <KpiCard label="Assurance" value={fmt(costs?.insuranceTotal ?? 0)} sub={`${insPct.toFixed(0)}% du total`} color="#7c3aed" />
              </div>

              {/* Répartition visuelle */}
              <Card>
                <h2 className="text-base font-semibold text-gray-800 mb-4">Répartition des dépenses</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Carburant', value: costs?.fuelTotal ?? 0, pct: fuelPct, color: '#3b82f6' },
                    { label: 'Entretien', value: costs?.maintenanceTotal ?? 0, pct: maintPct, color: '#f97316' },
                    { label: 'Assurance', value: costs?.insuranceTotal ?? 0, pct: insPct, color: '#8b5cf6' },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="font-medium text-gray-700">{row.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs">{row.pct.toFixed(0)}%</span>
                          <span className="font-semibold text-gray-900">{fmt(row.value)}</span>
                        </div>
                      </div>
                      <PctBar pct={row.pct} color={row.color} />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Chart mensuel */}
              {(costs?.costsByMonth?.length ?? 0) > 0 && (
                <Card>
                  <h2 className="text-base font-semibold text-gray-800 mb-4">Dépenses mensuelles</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costs!.costsByMonth} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                      <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l) => `Mois : ${l}`} />
                      <Legend />
                      <Bar dataKey="fuel" name="Carburant" fill="#3b82f6" stackId="a" radius={[0,0,0,0]} />
                      <Bar dataKey="maintenance" name="Entretien" fill="#f97316" stackId="a" />
                      <Bar dataKey="insurance" name="Assurance" fill="#8b5cf6" stackId="a" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Tableau par véhicule */}
              {(costs?.costsByVehicle?.length ?? 0) > 0 && (
                <Card>
                  <h2 className="text-base font-semibold text-gray-800 mb-4">Coûts par véhicule</h2>
                  <div className="space-y-3">
                    {costs!.costsByVehicle.map((v: any) => {
                      const vTotal = v.total;
                      const vFuelPct = vTotal > 0 ? (v.fuel / vTotal) * 100 : 0;
                      const vMaintPct = vTotal > 0 ? (v.maintenance / vTotal) * 100 : 0;
                      const vInsPct  = vTotal > 0 ? (v.insurance / vTotal) * 100 : 0;
                      return (
                        <div key={v.vehicleId} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-gray-900">{v.brand} {v.model}</p>
                            <p className="text-lg font-bold text-gray-900">{fmt(vTotal)}</p>
                          </div>
                          <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-3">
                            {vFuelPct > 0 && <div style={{ width: `${vFuelPct}%`, backgroundColor: '#3b82f6' }} />}
                            {vMaintPct > 0 && <div style={{ width: `${vMaintPct}%`, backgroundColor: '#f97316' }} />}
                            {vInsPct > 0 && <div style={{ width: `${vInsPct}%`, backgroundColor: '#8b5cf6' }} />}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-xs text-gray-400">Carburant</p>
                              <p className="text-sm font-semibold text-blue-600">{fmt(v.fuel)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Entretien</p>
                              <p className="text-sm font-semibold text-orange-600">{fmt(v.maintenance)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Assurance</p>
                              <p className="text-sm font-semibold text-purple-600">{fmt(v.insurance)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ONGLET CARBURANT ── */}
      {tab === 'fuel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Dépenses carburant" value={fmt(globalStats?.totalSpent ?? 0)} />
            <KpiCard label="Consommation moy." value={globalStats?.averageConsumption ? `${globalStats.averageConsumption.toFixed(1)} L/100` : 'N/A'} />
            <KpiCard label="Distance totale" value={`${fmtNum(globalStats?.totalDistance ?? 0)} km`} />
            <KpiCard label="Litres consommés" value={`${fmtNum(globalStats?.totalLiters ?? 0)} L`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-base font-semibold text-gray-800 mb-4">Évolution de la consommation</h2>
              {consumptionChart.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={consumptionChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}L`} />
                    <Tooltip formatter={(v: number) => [`${v} L/100km`, 'Consommation']} />
                    <Line type="monotone" dataKey="conso" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Pas assez de données</div>
              )}
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-gray-800 mb-4">Prix du carburant (€/L)</h2>
              {fuelChart.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={fuelChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={['dataMin - 0.1', 'dataMax + 0.1']} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(2)}€`} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(3)} €/L`, 'Prix']} />
                    <Line type="monotone" dataKey="prix" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Pas assez de données</div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── ONGLET ÉCOLOGIE ── */}
      {tab === 'eco' && co2Data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
              <p className="text-green-100 text-sm font-medium">Émissions totales</p>
              <p className="text-3xl font-bold mt-1">{fmtKg(co2Data.totalCo2Grams)}</p>
              <p className="text-green-200 text-xs mt-2">CO2 émis</p>
            </div>
          </div>

          {co2Chart.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-gray-800 mb-4">Émissions mensuelles (kg CO2)</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={co2Chart} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}kg`} />
                  <Tooltip formatter={(v: number) => [`${v} kg`, 'CO2']} />
                  <Bar dataKey="co2" radius={[4,4,0,0]}>
                    {co2Chart.map((_: any, i: number) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#10b981' : '#34d399'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {co2Data.co2ByVehicle?.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-gray-800 mb-4">CO2 par véhicule</h2>
              <div className="space-y-3">
                {co2Data.co2ByVehicle.map((v: any) => (
                  <div key={v.vehicleId} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{v.brand} {v.model}</p>
                      <p className="font-bold text-emerald-600">{v.totalCo2 > 0 ? fmtKg(v.totalCo2) : 'N/A'}</p>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span>{v.co2PerKm ? `${v.co2PerKm} g/km` : 'g/km non renseigné'}</span>
                      {v.totalDistance > 0 && <span>{fmtNum(v.totalDistance)} km</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
      {tab === 'eco' && !co2Data && (
        <div className="text-gray-400 py-12 text-center text-sm">Aucune donnée CO2. Renseignez les émissions de vos véhicules.</div>
      )}
    </div>
  );
}
