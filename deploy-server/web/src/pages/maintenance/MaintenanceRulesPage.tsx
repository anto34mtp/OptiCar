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
  PNEUS_AV: 'Pneus avant',
  PNEUS_AR: 'Pneus arrière',
  BATTERIE: 'Batterie',
  CONTROLE_TECHNIQUE: 'Contrôle technique',
};

const PART_TYPE_TO_CATEGORY: Record<string, string> = {
  VIDANGE: 'MOTEUR', FILTRE_AIR: 'MOTEUR', FILTRE_CARBURANT: 'MOTEUR',
  BOUGIES: 'MOTEUR', FILTRE_HABITACLE: 'MOTEUR', LIQUIDE_REFROIDISSEMENT: 'MOTEUR',
  KIT_DISTRIBUTION: 'DISTRIBUTION', POMPE_EAU: 'DISTRIBUTION', COURROIE_ACCESSOIRES: 'DISTRIBUTION',
  PLAQUETTES_AV: 'FREINAGE', PLAQUETTES_AR: 'FREINAGE', DISQUES_AV: 'FREINAGE',
  DISQUES_AR: 'FREINAGE', LIQUIDE_FREIN: 'FREINAGE',
  PNEUS_AV: 'LIAISON_SOL', PNEUS_AR: 'LIAISON_SOL',
  BATTERIE: 'ADMINISTRATIF', CONTROLE_TECHNIQUE: 'ADMINISTRATIF',
};

const ALL_STANDARD_TYPES = Object.keys(PART_TYPE_LABELS);

const CATEGORY_LABELS: Record<string, string> = {
  MOTEUR: 'Moteur',
  CLIMATISATION: 'Climatisation',
  DISTRIBUTION: 'Distribution',
  FREINAGE: 'Freinage',
  LIAISON_SOL: 'Liaison au sol',
  ADMINISTRATIF: 'Administratif',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export default function MaintenanceRulesPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKm, setEditKm] = useState('');
  const [editMonths, setEditMonths] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [addPartType, setAddPartType] = useState('');
  const [customPartType, setCustomPartType] = useState('');
  const [customCategory, setCustomCategory] = useState('MOTEUR');
  const [addKm, setAddKm] = useState('');
  const [addMonths, setAddMonths] = useState('');

  const { data: rules, isLoading } = useQuery({
    queryKey: ['maintenance-rules', vehicleId],
    queryFn: () => maintenanceService.getRules(vehicleId!),
    enabled: !!vehicleId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-rules', vehicleId] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-status', vehicleId] });
  };

  const initDefaultsMutation = useMutation({
    mutationFn: () => maintenanceService.initDefaults(vehicleId!),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaintenanceRule> }) =>
      maintenanceService.updateRule(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => maintenanceService.deleteRule(id),
    onSuccess: invalidate,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<MaintenanceRule, 'id' | 'vehicleId'>) =>
      maintenanceService.createRule(vehicleId!, data),
    onSuccess: () => { invalidate(); setShowAddForm(false); resetAddForm(); },
  });

  const resetAddForm = () => {
    setAddPartType(''); setIsCustom(false); setCustomPartType('');
    setCustomCategory('MOTEUR'); setAddKm(''); setAddMonths('');
  };

  const handleAddRule = () => {
    const partType = isCustom
      ? customPartType.trim().toUpperCase().replace(/\s+/g, '_')
      : addPartType;
    if (!partType) return;
    const category = isCustom ? customCategory : (PART_TYPE_TO_CATEGORY[partType] || 'MOTEUR');
    createMutation.mutate({
      category,
      partType,
      intervalKm: addKm ? parseInt(addKm) : null,
      intervalMonths: addMonths ? parseInt(addMonths) : null,
    });
  };

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

  const existingPartTypes = new Set((rules || []).map((r) => r.partType));
  const availableStandardTypes = ALL_STANDARD_TYPES.filter((t) => !existingPartTypes.has(t));

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
        <div className="flex gap-2">
          {(!rules || rules.length === 0) && (
            <button
              onClick={() => initDefaultsMutation.mutate()}
              disabled={initDefaultsMutation.isPending}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {initDefaultsMutation.isPending ? 'Initialisation...' : 'Initialiser par défaut'}
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            + Ajouter une règle
          </button>
        </div>
      </div>

      {/* Add rule form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Nouvelle règle</h2>

          {/* Standard / Custom toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setIsCustom(false)}
              className={`px-4 py-2 text-sm rounded-lg border ${!isCustom ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              Standard
            </button>
            <button
              onClick={() => setIsCustom(true)}
              className={`px-4 py-2 text-sm rounded-lg border ${isCustom ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              Personnalisé
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {isCustom ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom de la pièce</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Ex: Filtre boîte"
                    value={customPartType}
                    onChange={(e) => setCustomPartType(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Type de pièce</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={addPartType}
                  onChange={(e) => setAddPartType(e.target.value)}
                >
                  <option value="">Choisir...</option>
                  {availableStandardTypes.map((t) => (
                    <option key={t} value={t}>{PART_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Intervalle km</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: 15000"
                value={addKm}
                onChange={(e) => setAddKm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Intervalle mois</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: 12"
                value={addMonths}
                onChange={(e) => setAddMonths(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddRule}
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); resetAddForm(); }}
              className="px-5 py-2 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

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
