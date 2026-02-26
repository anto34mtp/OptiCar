import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService, MaintenanceStatus, MaintenanceRecord } from '../../services/maintenance';
import { vehiclesService } from '../../services/vehicles';

const PART_TYPE_LABELS: Record<string, string> = {
  VIDANGE: 'Vidange',
  FILTRE_AIR: 'Filtre à air',
  FILTRE_CARBURANT: 'Filtre carburant',
  BOUGIES: 'Bougies',
  FILTRE_HABITACLE: 'Filtre habitacle',
  KIT_DISTRIBUTION: 'Kit distribution',
  POMPE_EAU: 'Pompe à eau',
  COURROIE_ACCESSOIRES: 'Courroie accessoires',
  LIQUIDE_REFROIDISSEMENT: 'Liquide refroidissement',
  PLAQUETTES_AV: 'Plaquettes avant',
  PLAQUETTES_AR: 'Plaquettes arrière',
  DISQUES_AV: 'Disques avant',
  DISQUES_AR: 'Disques arrière',
  LIQUIDE_FREIN: 'Liquide de frein',
  PNEUS: 'Pneus',
  BATTERIE: 'Batterie',
  CONTROLE_TECHNIQUE: 'Contrôle technique',
};

const CATEGORY_LABELS: Record<string, string> = {
  MOTEUR: 'Moteur',
  CLIMATISATION: 'Climatisation',
  DISTRIBUTION: 'Distribution',
  FREINAGE: 'Freinage',
  LIAISON_SOL: 'Liaison au sol',
  ADMINISTRATIF: 'Administratif',
};

function WearGauge({ status }: { status: MaintenanceStatus }) {
  const percent = status.wearPercent ?? 0;
  const color = status.status === 'critical' ? 'bg-red-500' : status.status === 'warning' ? 'bg-orange-400' : 'bg-green-500';
  const bgColor = status.status === 'critical' ? 'bg-red-100' : status.status === 'warning' ? 'bg-orange-100' : 'bg-green-100';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">
          {PART_TYPE_LABELS[status.partType] || status.partType}
        </span>
        <span className="text-xs text-gray-500">
          {status.wearPercent !== null ? `${status.wearPercent}%` : '—'}
        </span>
      </div>
      <div className={`w-full h-2 rounded-full ${bgColor}`}>
        <div
          className={`h-2 rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {status.lastDate ? (
          <>Dernier: {new Date(status.lastDate).toLocaleDateString('fr-FR')}</>
        ) : (
          'Aucun historique'
        )}
        {status.nextEstimatedDate && (
          <> · Prochain: {new Date(status.nextEstimatedDate).toLocaleDateString('fr-FR')}</>
        )}
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function VehicleMaintenancePage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const queryClient = useQueryClient();
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MaintenanceRecord>>({});

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehiclesService.getOne(vehicleId!),
    enabled: !!vehicleId,
  });

  const { data: statuses, isLoading: statusLoading } = useQuery({
    queryKey: ['maintenance-status', vehicleId],
    queryFn: () => maintenanceService.getStatus(vehicleId!),
    enabled: !!vehicleId,
  });

  const { data: predictions } = useQuery({
    queryKey: ['maintenance-predictions', vehicleId],
    queryFn: () => maintenanceService.getPredictions(vehicleId!),
    enabled: !!vehicleId,
  });

  const { data: costs } = useQuery({
    queryKey: ['maintenance-costs', vehicleId],
    queryFn: () => maintenanceService.getCosts(vehicleId!),
    enabled: !!vehicleId,
  });

  const { data: records } = useQuery({
    queryKey: ['maintenance-records', vehicleId],
    queryFn: () => maintenanceService.getRecords(vehicleId!),
    enabled: !!vehicleId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => maintenanceService.deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-status', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs', vehicleId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaintenanceRecord> }) =>
      maintenanceService.updateRecord(id, data),
    onSuccess: () => {
      setEditingRecord(null);
      queryClient.invalidateQueries({ queryKey: ['maintenance-records', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-status', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs', vehicleId] });
    },
  });

  // Group statuses by category
  const byCategory: Record<string, MaintenanceStatus[]> = {};
  if (statuses) {
    for (const s of statuses) {
      if (!byCategory[s.category]) byCategory[s.category] = [];
      byCategory[s.category].push(s);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/maintenance" className="text-sm text-primary-600 hover:underline mb-1 block">
            &larr; Retour
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Chargement...'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/maintenance/${vehicleId}/rules`}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Configurer
          </Link>
          <Link
            to={`/maintenance/${vehicleId}/add`}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            + Ajouter
          </Link>
        </div>
      </div>

      {statusLoading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : !statuses || statuses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">Aucune règle d'entretien configurée.</p>
          <Link
            to={`/maintenance/${vehicleId}/rules`}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Configurer les règles
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Wear gauges by category */}
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                {CATEGORY_LABELS[category] || category}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <WearGauge key={s.ruleId} status={s} />
                ))}
              </div>
            </div>
          ))}

          {/* Predictions timeline */}
          {predictions && predictions.timeline.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Prochains entretiens</h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Pièce</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date estimée</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Coût estimé</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">État</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {predictions.timeline.map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">{PART_TYPE_LABELS[p.partType] || p.partType}</td>
                        <td className="px-4 py-3">
                          {p.estimatedDate ? new Date(p.estimatedDate).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {p.estimatedPrice !== null ? `${p.estimatedPrice.toFixed(2)} €` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.status === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : p.status === 'warning'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {p.status === 'critical' ? 'Urgent' : p.status === 'warning' ? 'Bientôt' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 6-month estimate */}
              {predictions.sixMonthEstimate.total > 0 && (
                <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4">
                  <h3 className="font-medium text-blue-900 mb-1">Estimation 6 mois</h3>
                  <p className="text-2xl font-bold text-blue-700">
                    {predictions.sixMonthEstimate.total.toFixed(2)} €
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {predictions.sixMonthEstimate.items.length} entretien(s) prévu(s)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Costs by year */}
          {costs && costs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Coûts par année</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-end gap-2 h-40">
                  {(() => {
                    const maxCost = Math.max(...costs.map((c) => c.total));
                    return costs.map((c) => (
                      <div key={c.year} className="flex-1 flex flex-col items-center">
                        <span className="text-xs text-gray-600 mb-1">{c.total.toFixed(0)}€</span>
                        <div
                          className="w-full bg-primary-500 rounded-t"
                          style={{ height: `${maxCost > 0 ? (c.total / maxCost) * 100 : 0}%`, minHeight: '4px' }}
                        />
                        <span className="text-xs text-gray-500 mt-1">{c.year}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Maintenance records history */}
          {records && records.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Historique des entretiens</h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Pièce</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Kilométrage</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Prix</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Garage</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map((r: MaintenanceRecord) => (
                      <tr key={r.id}>
                        {editingRecord === r.id ? (
                          <>
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                className="border rounded px-2 py-1 text-sm w-32"
                                value={editForm.date?.split('T')[0] || ''}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              />
                            </td>
                            <td className="px-4 py-2">{PART_TYPE_LABELS[r.partType] || r.partType}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                className="border rounded px-2 py-1 text-sm w-24"
                                value={editForm.mileage || ''}
                                onChange={(e) => setEditForm({ ...editForm, mileage: Number(e.target.value) })}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                className="border rounded px-2 py-1 text-sm w-24"
                                value={editForm.price ?? ''}
                                onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                className="border rounded px-2 py-1 text-sm w-28"
                                value={editForm.garage || ''}
                                onChange={(e) => setEditForm({ ...editForm, garage: e.target.value })}
                              />
                            </td>
                            <td className="px-4 py-2 text-right space-x-2">
                              <button
                                className="text-green-600 hover:underline text-xs"
                                onClick={() => updateMutation.mutate({
                                  id: r.id,
                                  data: {
                                    ...editForm,
                                    date: editForm.date ? new Date(editForm.date).toISOString() : undefined,
                                  },
                                })}
                              >
                                Sauver
                              </button>
                              <button
                                className="text-gray-500 hover:underline text-xs"
                                onClick={() => setEditingRecord(null)}
                              >
                                Annuler
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                            <td className="px-4 py-3">{PART_TYPE_LABELS[r.partType] || r.partType}</td>
                            <td className="px-4 py-3">{r.mileage.toLocaleString()} km</td>
                            <td className="px-4 py-3">{r.price !== null ? formatCurrency(r.price) : '—'}</td>
                            <td className="px-4 py-3">{r.garage || '—'}</td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                className="text-blue-600 hover:underline text-xs"
                                onClick={() => {
                                  setEditingRecord(r.id);
                                  setEditForm({
                                    date: r.date,
                                    mileage: r.mileage,
                                    price: r.price,
                                    garage: r.garage,
                                  });
                                }}
                              >
                                Modifier
                              </button>
                              <button
                                className="text-red-600 hover:underline text-xs"
                                onClick={() => {
                                  if (confirm('Supprimer cet entretien ?')) {
                                    deleteMutation.mutate(r.id);
                                  }
                                }}
                              >
                                Supprimer
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
