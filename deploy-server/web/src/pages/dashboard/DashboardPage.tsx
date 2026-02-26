import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { statsService } from '../../services/stats';
import { vehiclesService } from '../../services/vehicles';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: statsService.getGlobalStats,
  });

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  });

  const isLoading = statsLoading || vehiclesLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600">Vue d'ensemble de vos dépenses carburant</p>
        </div>
        <Link to="/refuel/new">
          <Button>+ Ajouter un plein</Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm font-medium text-gray-500">Dépenses totales</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {isLoading ? '...' : formatCurrency(stats?.totalSpent || 0)}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-500">Consommation moyenne</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {isLoading
              ? '...'
              : stats?.averageConsumption
                ? `${formatNumber(stats.averageConsumption)} L/100km`
                : 'N/A'}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-500">Coût au kilomètre</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {isLoading
              ? '...'
              : stats?.averageCostPerKm
                ? `${formatNumber(stats.averageCostPerKm, 3)} €/km`
                : 'N/A'}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-gray-500">Nombre de pleins</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {isLoading ? '...' : stats?.totalRefuels || 0}
          </p>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicles */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mes véhicules</h2>
            <Link to="/vehicles" className="text-sm text-primary-600 hover:text-primary-700">
              Voir tout
            </Link>
          </div>

          {vehiclesLoading ? (
            <div className="text-gray-500">Chargement...</div>
          ) : vehicles?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Aucun véhicule enregistré</p>
              <Link to="/vehicles">
                <Button variant="secondary">Ajouter un véhicule</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles?.slice(0, 3).map((vehicle) => (
                <Link
                  key={vehicle.id}
                  to={`/vehicles/${vehicle.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    <p className="text-sm text-gray-500">
                      {vehicle._count?.refuels || 0} pleins
                    </p>
                  </div>
                  <span className="text-sm text-gray-400">{vehicle.fuelType}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Stats summary */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Résumé</h2>
            <Link to="/stats" className="text-sm text-primary-600 hover:text-primary-700">
              Statistiques détaillées
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Véhicules</span>
              <span className="font-medium">{stats?.totalVehicles || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Distance totale</span>
              <span className="font-medium">
                {formatNumber(stats?.totalDistance || 0, 0)} km
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Litres consommés</span>
              <span className="font-medium">
                {formatNumber(stats?.totalLiters || 0, 1)} L
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
