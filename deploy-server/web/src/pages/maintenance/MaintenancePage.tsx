import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { vehiclesService } from '../../services/vehicles';
import { maintenanceService, MaintenanceStatus } from '../../services/maintenance';

function HealthBadge({ statuses }: { statuses: MaintenanceStatus[] }) {
  if (statuses.length === 0) {
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Non configuré</span>;
  }
  const hasCritical = statuses.some((s) => s.status === 'critical');
  const hasWarning = statuses.some((s) => s.status === 'warning');

  if (hasCritical) {
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Attention requise</span>;
  }
  if (hasWarning) {
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">A surveiller</span>;
  }
  return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">OK</span>;
}

interface VehicleWithStatus {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  statuses: MaintenanceStatus[];
}

export default function MaintenancePage() {
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesService.getAll(),
  });

  const { data: vehiclesWithStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['maintenance-overview'],
    queryFn: async () => {
      if (!vehicles || vehicles.length === 0) return [];
      const results: VehicleWithStatus[] = [];
      for (const v of vehicles) {
        try {
          const statuses = await maintenanceService.getStatus(v.id);
          results.push({ id: v.id, brand: v.brand, model: v.model, year: v.year, statuses });
        } catch {
          results.push({ id: v.id, brand: v.brand, model: v.model, year: v.year, statuses: [] });
        }
      }
      return results;
    },
    enabled: !!vehicles && vehicles.length > 0,
  });

  const isLoading = vehiclesLoading || statusLoading;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Entretien véhicules</h1>

      {isLoading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : !vehiclesWithStatus || vehiclesWithStatus.length === 0 ? (
        <div className="text-gray-500">
          Aucun véhicule.{' '}
          <Link to="/vehicles" className="text-primary-600 hover:underline">
            Ajouter un véhicule
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehiclesWithStatus.map((v) => {
            const criticalCount = v.statuses.filter((s) => s.status === 'critical').length;
            const warningCount = v.statuses.filter((s) => s.status === 'warning').length;

            return (
              <Link
                key={v.id}
                to={`/maintenance/${v.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {v.brand} {v.model}
                  </h3>
                  <HealthBadge statuses={v.statuses} />
                </div>
                {v.year && <p className="text-sm text-gray-500 mb-2">Année {v.year}</p>}
                {v.statuses.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {criticalCount > 0 && (
                      <span className="text-red-600 mr-3">{criticalCount} critique(s)</span>
                    )}
                    {warningCount > 0 && (
                      <span className="text-orange-600">{warningCount} à surveiller</span>
                    )}
                    {criticalCount === 0 && warningCount === 0 && (
                      <span className="text-green-600">Tout est en ordre</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
