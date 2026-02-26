import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService, MaintenanceRule } from '../../services/maintenance';

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

export default function MaintenanceRulesPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKm, setEditKm] = useState('');
  const [editMonths, setEditMonths] = useState('');

  const { data: rules, isLoading } = useQuery({
    queryKey: ['maintenance-rules', vehicleId],
    queryFn: () => maintenanceService.getRules(vehicleId!),
    enabled: !!vehicleId,
  });

  const initDefaultsMutation = useMutation({
    mutationFn: () => maintenanceService.initDefaults(vehicleId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-rules', vehicleId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaintenanceRule> }) =>
      maintenanceService.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-rules', vehicleId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => maintenanceService.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-rules', vehicleId] });
    },
  });

  const startEdit = (rule: MaintenanceRule) => {
    setEditingId(rule.id);
    setEditKm(rule.intervalKm?.toString() || '');
    setEditMonths(rule.intervalMonths?.toString() || '');
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({
      id,
      data: {
        intervalKm: editKm ? parseInt(editKm) : null,
        intervalMonths: editMonths ? parseInt(editMonths) : null,
      },
    });
  };

  // Group by category
  const byCategory: Record<string, MaintenanceRule[]> = {};
  if (rules) {
    for (const r of rules) {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-primary-600 hover:underline mb-4">
        &larr; Retour
      </button>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Règles d'entretien</h1>
        {(!rules || rules.length === 0) && (
          <button
            onClick={() => initDefaultsMutation.mutate()}
            disabled={initDefaultsMutation.isPending}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {initDefaultsMutation.isPending ? 'Initialisation...' : 'Initialiser par défaut'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-gray-500">Chargement...</div>
      ) : !rules || rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          Aucune règle configurée. Cliquez sur "Initialiser par défaut" pour commencer.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                {CATEGORY_LABELS[category] || category}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Pièce</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Intervalle km</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Intervalle mois</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-4 py-3">{PART_TYPE_LABELS[rule.partType] || rule.partType}</td>
                        <td className="px-4 py-3">
                          {editingId === rule.id ? (
                            <input
                              type="number"
                              value={editKm}
                              onChange={(e) => setEditKm(e.target.value)}
                              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          ) : (
                            rule.intervalKm ? `${rule.intervalKm.toLocaleString()} km` : '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingId === rule.id ? (
                            <input
                              type="number"
                              value={editMonths}
                              onChange={(e) => setEditMonths(e.target.value)}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          ) : (
                            rule.intervalMonths ? `${rule.intervalMonths} mois` : '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingId === rule.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEdit(rule.id)}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                Sauver
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEdit(rule)}
                                className="text-primary-600 hover:text-primary-800 text-sm"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Supprimer cette règle ?')) {
                                    deleteMutation.mutate(rule.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
