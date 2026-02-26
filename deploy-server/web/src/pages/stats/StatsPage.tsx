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
    </div>
  );
}
