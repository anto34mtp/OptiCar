import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { statsService } from '../../services/stats';
import { vehiclesService } from '../../services/vehicles';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function formatKg(grams: number): string {
  const kg = grams / 1000;
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export default function StatsPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  });

  const { data: globalStats } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: statsService.getGlobalStats,
  });

  const { data: consumptionData } = useQuery({
    queryKey: ['stats', 'consumption', selectedVehicleId],
    queryFn: () => statsService.getConsumptionHistory({ vehicleId: selectedVehicleId || undefined }),
  });

  const { data: expensesData } = useQuery({
    queryKey: ['stats', 'expenses', selectedVehicleId],
    queryFn: () => statsService.getExpensesByPeriod({ vehicleId: selectedVehicleId || undefined }),
  });

  const { data: fuelPricesData } = useQuery({
    queryKey: ['stats', 'fuel-prices', selectedVehicleId],
    queryFn: () => statsService.getFuelPriceHistory({ vehicleId: selectedVehicleId || undefined }),
  });

  const { data: co2Data } = useQuery({
    queryKey: ['stats', 'co2'],
    queryFn: () => statsService.getCo2Stats(),
  });

  const co2MonthlyChartData = co2Data?.co2ByMonth?.map((m: any) => ({
    month: m.month,
    co2: Math.round(m.co2Grams / 1000),
  })) || [];

  const consumptionChartData = consumptionData?.map((d) => ({
    date: format(new Date(d.date), 'dd/MM', { locale: fr }),
    consumption: Math.round(d.consumption * 10) / 10,
  }));

  const expensesChartData = expensesData?.map((d) => ({
    period: d.period,
    amount: Math.round(d.amount * 100) / 100,
  }));

  const fuelPricesChartData = fuelPricesData?.map((d: { date: string; pricePerLiter: number }) => ({
    date: format(new Date(d.date), 'dd/MM', { locale: fr }),
    price: d.pricePerLiter,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-gray-600">Analysez vos dépenses et votre consommation</p>
        </div>
        <div className="w-64">
          <Select
            id="vehicle-filter"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            options={[
              { value: '', label: 'Tous les véhicules' },
              ...(vehicles?.map((v) => ({
                value: v.id,
                label: `${v.brand} ${v.model}`,
              })) || []),
            ]}
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm font-medium text-gray-500">Dépenses totales</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(globalStats?.totalSpent || 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Consommation moyenne</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {globalStats?.averageConsumption
              ? `${globalStats.averageConsumption.toFixed(1)} L/100km`
              : 'N/A'}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Distance totale</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {globalStats?.totalDistance?.toLocaleString('fr-FR')} km
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Litres consommés</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {globalStats?.totalLiters?.toFixed(0)} L
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumption chart */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Évolution de la consommation</h2>
          {consumptionChartData?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={consumptionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  formatter={(value: number) => [`${value} L/100km`, 'Consommation']}
                />
                <Line
                  type="monotone"
                  dataKey="consumption"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Pas assez de données
            </div>
          )}
        </Card>

        {/* Expenses chart */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dépenses par mois</h2>
          {expensesChartData?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expensesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Dépenses']}
                />
                <Bar dataKey="amount" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Pas assez de données
            </div>
          )}
        </Card>

        {/* Fuel prices chart */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Évolution du prix du carburant</h2>
          {fuelPricesChartData?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fuelPricesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(3)} €/L`, 'Prix']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  name="Prix/L"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Pas assez de données
            </div>
          )}
        </Card>
      </div>

      {/* CO2 Section */}
      {co2Data && (
        <>
          <div className="border-t border-emerald-200 pt-8">
            <h2 className="text-xl font-bold text-emerald-700 mb-6">Empreinte CO2</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-600 text-white rounded-xl shadow-sm p-6">
              <p className="text-emerald-100 text-sm font-medium">Emissions totales</p>
              <p className="text-3xl font-bold mt-1">{formatKg(co2Data.totalCo2Grams)}</p>
              <p className="text-emerald-200 text-sm mt-1">CO2</p>
            </div>
          </div>

          {/* CO2 Monthly chart */}
          {co2MonthlyChartData.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Emissions mensuelles (kg CO2)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={co2MonthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`${value} kg`, 'CO2']}
                  />
                  <Bar dataKey="co2" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* CO2 per vehicle table */}
          {co2Data.co2ByVehicle?.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">CO2 par véhicule</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Véhicule</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">CO2 total</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">g/km</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {co2Data.co2ByVehicle.map((v: any) => (
                      <tr key={v.vehicleId} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium text-gray-900">{v.brand} {v.model}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                          {v.totalCo2 > 0 ? formatKg(v.totalCo2) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {v.co2PerKm ? `${v.co2PerKm} g/km` : 'Non renseigné'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {v.totalDistance > 0 ? `${v.totalDistance.toLocaleString('fr-FR')} km` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
