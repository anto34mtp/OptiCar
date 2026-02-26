import { useQuery } from '@tanstack/react-query';
import { statsService } from '../../services/stats';
import Card from '../../components/ui/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function TotalCostsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['total-costs'],
    queryFn: () => statsService.getTotalCosts(),
  });

  if (isLoading) {
    return <div className="text-gray-500">Chargement...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Coût total</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm font-medium text-gray-500">Carburant</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(data.fuelTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Entretien</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(data.maintenanceTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Assurance</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(data.insuranceTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.grandTotal)}</p>
        </Card>
      </div>

      {/* Monthly chart */}
      {data.costsByMonth.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dépenses par mois</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.costsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Mois : ${label}`}
              />
              <Legend />
              <Bar dataKey="fuel" name="Carburant" fill="#3b82f6" stackId="a" />
              <Bar dataKey="maintenance" name="Entretien" fill="#f97316" stackId="a" />
              <Bar dataKey="insurance" name="Assurance" fill="#8b5cf6" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* By vehicle table */}
      {data.costsByVehicle.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Coûts par véhicule</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Véhicule</th>
                  <th className="pb-3 font-medium text-right">Carburant</th>
                  <th className="pb-3 font-medium text-right">Entretien</th>
                  <th className="pb-3 font-medium text-right">Assurance</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.costsByVehicle.map((v: any) => (
                  <tr key={v.vehicleId} className="border-b border-gray-50">
                    <td className="py-3 font-medium">{v.brand} {v.model}</td>
                    <td className="py-3 text-right text-blue-600">{formatCurrency(v.fuel)}</td>
                    <td className="py-3 text-right text-orange-600">{formatCurrency(v.maintenance)}</td>
                    <td className="py-3 text-right text-purple-600">{formatCurrency(v.insurance)}</td>
                    <td className="py-3 text-right font-bold">{formatCurrency(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
