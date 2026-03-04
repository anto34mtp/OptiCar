import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesService } from '../../services/vehicles';
import { refuelsService } from '../../services/refuels';
import { insuranceService, InsuranceRecord } from '../../services/insurance';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BRAND_LIST, BRAND_MODELS } from '../../data/vehicleBrands';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

const INSURANCE_TYPE_LABELS: Record<string, string> = {
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  SEMESTRIEL: 'Semestriel',
  ANNUEL: 'Annuel',
};

const brandOptions = BRAND_LIST.map((b) => ({ value: b, label: b }));

const fuelTypeOptions = [
  { value: 'SP95', label: 'Sans Plomb 95' },
  { value: 'SP98', label: 'Sans Plomb 98' },
  { value: 'E10', label: 'E10' },
  { value: 'E85', label: 'E85 (Éthanol)' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'ELECTRIC', label: 'Électrique' },
];

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Edit refuel state
  const [editingRefuelId, setEditingRefuelId] = useState<string | null>(null);
  const [editRefuel, setEditRefuel] = useState({ mileage: '', liters: '', pricePerLiter: '', totalPrice: '' });

  // Insurance form state
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [insDate, setInsDate] = useState(new Date().toISOString().split('T')[0]);
  const [insAmount, setInsAmount] = useState('');
  const [insType, setInsType] = useState('MENSUEL');
  const [insInsurer, setInsInsurer] = useState('');
  const [insNotes, setInsNotes] = useState('');
  const [editingInsId, setEditingInsId] = useState<string | null>(null);

  // Edit vehicle state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editSelectedBrand, setEditSelectedBrand] = useState('');
  const [editSelectedModel, setEditSelectedModel] = useState('');
  const [editFormData, setEditFormData] = useState({
    brand: '',
    model: '',
    fuelType: 'SP95',
    year: '' as string | number,
    co2PerKm: '' as string | number,
  });

  const { data: vehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicles', id, 'stats'],
    queryFn: () => vehiclesService.getWithStats(id!),
    enabled: !!id,
  });

  const { data: refuels, isLoading: refuelsLoading } = useQuery({
    queryKey: ['refuels', id],
    queryFn: () => refuelsService.getByVehicle(id!),
    enabled: !!id,
  });

  const { data: insurances } = useQuery({
    queryKey: ['insurance', id],
    queryFn: () => insuranceService.getByVehicle(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => vehiclesService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      navigate('/vehicles');
    },
  });

  const deleteRefuelMutation = useMutation({
    mutationFn: (refuelId: string) => refuelsService.delete(refuelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuels', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'stats'] });
    },
  });

  const updateRefuelMutation = useMutation({
    mutationFn: ({ refuelId, data }: { refuelId: string; data: any }) => refuelsService.update(refuelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuels', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'stats'] });
      setEditingRefuelId(null);
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: (data: any) => vehiclesService.update(id!, data),
    onSuccess: () => {
      setShowEditForm(false);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'stats'] });
    },
  });

  const createInsuranceMutation = useMutation({
    mutationFn: (data: any) => insuranceService.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', id] });
      queryClient.invalidateQueries({ queryKey: ['total-costs'] });
      resetInsuranceForm();
    },
  });

  const updateInsuranceMutation = useMutation({
    mutationFn: ({ insId, data }: { insId: string; data: any }) => insuranceService.update(insId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', id] });
      queryClient.invalidateQueries({ queryKey: ['total-costs'] });
      resetInsuranceForm();
    },
  });

  const deleteInsuranceMutation = useMutation({
    mutationFn: (insId: string) => insuranceService.delete(insId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', id] });
      queryClient.invalidateQueries({ queryKey: ['total-costs'] });
    },
  });

  const resetInsuranceForm = () => {
    setShowInsuranceForm(false);
    setEditingInsId(null);
    setInsDate(new Date().toISOString().split('T')[0]);
    setInsAmount('');
    setInsType('MENSUEL');
    setInsInsurer('');
    setInsNotes('');
  };

  const startEditInsurance = (ins: InsuranceRecord) => {
    setEditingInsId(ins.id);
    setShowInsuranceForm(true);
    setInsDate(ins.date.split('T')[0]);
    setInsAmount(String(ins.amount));
    setInsType(ins.type);
    setInsInsurer(ins.insurer || '');
    setInsNotes(ins.notes || '');
  };

  const handleInsuranceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      date: new Date(insDate).toISOString(),
      amount: parseFloat(insAmount),
      type: insType,
      insurer: insInsurer || undefined,
      notes: insNotes || undefined,
    };
    if (editingInsId) {
      updateInsuranceMutation.mutate({ insId: editingInsId, data });
    } else {
      createInsuranceMutation.mutate(data);
    }
  };

  const startEditRefuel = (refuel: any) => {
    setEditingRefuelId(refuel.id);
    setEditRefuel({
      mileage: String(refuel.mileage),
      liters: String(refuel.liters),
      pricePerLiter: String(refuel.pricePerLiter),
      totalPrice: String(refuel.totalPrice),
    });
  };

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ? Tous les pleins associés seront également supprimés.')) {
      deleteMutation.mutate();
    }
  };

  const openEditForm = () => {
    if (!vehicle) return;
    const brand = vehicle.brand || '';
    const model = vehicle.model || '';
    const isBrandInList = BRAND_LIST.includes(brand) && brand !== 'Autre';
    const isModelInList = isBrandInList && BRAND_MODELS[brand]?.includes(model);

    setEditSelectedBrand(isBrandInList ? brand : 'Autre');
    setEditSelectedModel(isModelInList ? model : (isBrandInList ? 'Autre' : ''));
    setEditFormData({
      brand,
      model,
      fuelType: vehicle.fuelType || 'SP95',
      year: vehicle.year || '',
      co2PerKm: vehicle.co2PerKm || '',
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      brand: editFormData.brand,
      model: editFormData.model,
      fuelType: editFormData.fuelType,
    };
    if (editFormData.year) data.year = Number(editFormData.year);
    if (editFormData.co2PerKm) data.co2PerKm = Number(editFormData.co2PerKm);
    updateVehicleMutation.mutate(data);
  };

  const editModelOptions = editSelectedBrand !== 'Autre' && BRAND_MODELS[editSelectedBrand]
    ? [...BRAND_MODELS[editSelectedBrand].map((m) => ({ value: m, label: m })), { value: 'Autre', label: 'Autre' }]
    : [];

  if (vehicleLoading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!vehicle) return <div className="text-center py-12 text-gray-500">Véhicule non trouvé</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/vehicles" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">&larr; Retour aux véhicules</Link>
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.brand} {vehicle.model}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">{vehicle.fuelType}</span>
            {vehicle.year && <span className="text-gray-500 text-sm">{vehicle.year}</span>}
            {vehicle.co2PerKm && <span className="text-gray-500 text-sm">{vehicle.co2PerKm} g CO2/km</span>}
          </div>
        </div>
        <div className="flex gap-3">
          <Link to={`/maintenance/${id}`}><Button variant="secondary">Entretiens</Button></Link>
          <Link to={`/refuel/new?vehicleId=${id}`}><Button>+ Ajouter un plein</Button></Link>
          <Button variant="secondary" onClick={openEditForm}>Modifier</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteMutation.isPending}>Supprimer</Button>
        </div>
      </div>

      {/* Edit vehicle form */}
      {showEditForm && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modifier le véhicule</h2>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                id="editBrand"
                label="Marque"
                value={editSelectedBrand}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditSelectedBrand(val);
                  setEditSelectedModel('');
                  if (val !== 'Autre') {
                    setEditFormData({ ...editFormData, brand: val, model: '' });
                  } else {
                    setEditFormData({ ...editFormData, brand: '', model: '' });
                  }
                }}
                options={brandOptions}
              />
              {editSelectedBrand === 'Autre' && (
                <Input
                  id="editCustomBrand"
                  label="Marque (autre)"
                  value={editFormData.brand}
                  onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                  required
                  placeholder="Saisir la marque"
                />
              )}
              {editSelectedBrand !== 'Autre' && editModelOptions.length > 0 ? (
                <>
                  <Select
                    id="editModel"
                    label="Modèle"
                    value={editSelectedModel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditSelectedModel(val);
                      if (val !== 'Autre') {
                        setEditFormData({ ...editFormData, model: val });
                      } else {
                        setEditFormData({ ...editFormData, model: '' });
                      }
                    }}
                    options={[{ value: '', label: '-- Choisir un modèle --' }, ...editModelOptions]}
                  />
                  {editSelectedModel === 'Autre' && (
                    <Input
                      id="editCustomModel"
                      label="Modèle (autre)"
                      value={editFormData.model}
                      onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                      required
                      placeholder="Saisir le modèle"
                    />
                  )}
                </>
              ) : (
                <Input
                  id="editModel"
                  label="Modèle"
                  value={editFormData.model}
                  onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                  required
                  placeholder="Saisir le modèle"
                />
              )}
              <Select
                id="editFuelType"
                label="Type de carburant"
                value={editFormData.fuelType}
                onChange={(e) => setEditFormData({ ...editFormData, fuelType: e.target.value })}
                options={fuelTypeOptions}
              />
              <Input
                id="editYear"
                type="number"
                label="Année (optionnel)"
                value={editFormData.year}
                onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                placeholder="Ex: 2020"
                min={1900}
                max={new Date().getFullYear() + 1}
              />
              <Input
                id="editCo2"
                type="number"
                label="CO2 g/km (optionnel)"
                value={editFormData.co2PerKm}
                onChange={(e) => setEditFormData({ ...editFormData, co2PerKm: e.target.value })}
                placeholder="Ex: 120"
                min={0}
                max={1000}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowEditForm(false)}>
                Annuler
              </Button>
              <Button type="submit" isLoading={updateVehicleMutation.isPending}>
                Sauvegarder
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card><p className="text-sm font-medium text-gray-500">Kilométrage actuel</p><p className="text-2xl font-bold text-primary-600 mt-1">{formatNumber(vehicle.stats?.currentMileage || 0, 0)} km</p></Card>
        <Card><p className="text-sm font-medium text-gray-500">Dépenses totales</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(vehicle.stats?.totalSpent || 0)}</p></Card>
        <Card><p className="text-sm font-medium text-gray-500">Consommation moyenne</p><p className="text-2xl font-bold text-gray-900 mt-1">{vehicle.stats?.averageConsumption ? `${formatNumber(vehicle.stats.averageConsumption)} L/100km` : 'N/A'}</p></Card>
        <Card><p className="text-sm font-medium text-gray-500">Distance totale</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(vehicle.stats?.totalDistance || 0, 0)} km</p></Card>
        <Card><p className="text-sm font-medium text-gray-500">Nombre de pleins</p><p className="text-2xl font-bold text-gray-900 mt-1">{vehicle.stats?.totalRefuels || 0}</p></Card>
      </div>

      {/* Refuels history */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des pleins</h2>
        {refuelsLoading ? (
          <div className="text-gray-500">Chargement...</div>
        ) : refuels?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Aucun plein enregistré</p>
            <Link to={`/refuel/new?vehicleId=${id}`}><Button>Ajouter votre premier plein</Button></Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Kilométrage</th>
                  <th className="pb-3 font-medium">Litres</th>
                  <th className="pb-3 font-medium">Prix/L</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Consommation</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refuels?.map((refuel) => (
                  <tr key={refuel.id} className="border-b border-gray-50">
                    {editingRefuelId === refuel.id ? (
                      <>
                        <td className="py-3">{format(new Date(refuel.date), 'dd MMM yyyy', { locale: fr })}</td>
                        <td className="py-3"><input type="number" value={editRefuel.mileage} onChange={(e) => setEditRefuel({ ...editRefuel, mileage: e.target.value })} className="w-24 border rounded px-2 py-1 text-sm" /></td>
                        <td className="py-3"><input type="number" step="0.01" value={editRefuel.liters} onChange={(e) => setEditRefuel({ ...editRefuel, liters: e.target.value })} className="w-20 border rounded px-2 py-1 text-sm" /></td>
                        <td className="py-3"><input type="number" step="0.001" value={editRefuel.pricePerLiter} onChange={(e) => setEditRefuel({ ...editRefuel, pricePerLiter: e.target.value })} className="w-20 border rounded px-2 py-1 text-sm" /></td>
                        <td className="py-3"><input type="number" step="0.01" value={editRefuel.totalPrice} onChange={(e) => setEditRefuel({ ...editRefuel, totalPrice: e.target.value })} className="w-20 border rounded px-2 py-1 text-sm" /></td>
                        <td className="py-3">-</td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => updateRefuelMutation.mutate({ refuelId: refuel.id, data: { mileage: parseInt(editRefuel.mileage), liters: parseFloat(editRefuel.liters), pricePerLiter: parseFloat(editRefuel.pricePerLiter), totalPrice: parseFloat(editRefuel.totalPrice) } })} className="text-green-600 hover:text-green-800 text-sm">Sauver</button>
                          <button onClick={() => setEditingRefuelId(null)} className="text-gray-500 hover:text-gray-700 text-sm">Annuler</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3">{format(new Date(refuel.date), 'dd MMM yyyy', { locale: fr })}</td>
                        <td className="py-3">{formatNumber(refuel.mileage, 0)} km</td>
                        <td className="py-3">{formatNumber(refuel.liters, 2)} L</td>
                        <td className="py-3">{formatNumber(refuel.pricePerLiter, 3)} €</td>
                        <td className="py-3 font-medium">{formatCurrency(refuel.totalPrice)}</td>
                        <td className="py-3">{refuel.consumption ? `${formatNumber(refuel.consumption, 1)} L/100km` : '-'}</td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => startEditRefuel(refuel)} className="text-primary-600 hover:text-primary-800 text-sm">Modifier</button>
                          <button onClick={() => { if (confirm('Supprimer ce plein ?')) deleteRefuelMutation.mutate(refuel.id); }} className="text-red-600 hover:text-red-800 text-sm">Supprimer</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Insurance section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Assurance</h2>
          <button onClick={() => { resetInsuranceForm(); setShowInsuranceForm(true); }} className="text-sm text-primary-600 hover:text-primary-800">+ Ajouter</button>
        </div>

        {showInsuranceForm && (
          <form onSubmit={handleInsuranceSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Date</label>
                <input type="date" value={insDate} onChange={(e) => setInsDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Montant (€)</label>
                <input type="number" step="0.01" value={insAmount} onChange={(e) => setInsAmount(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Type</label>
                <select value={insType} onChange={(e) => setInsType(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="MENSUEL">Mensuel</option>
                  <option value="TRIMESTRIEL">Trimestriel</option>
                  <option value="SEMESTRIEL">Semestriel</option>
                  <option value="ANNUEL">Annuel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Assureur</label>
                <input type="text" value={insInsurer} onChange={(e) => setInsInsurer(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700">
                {editingInsId ? 'Modifier' : 'Ajouter'}
              </button>
              <button type="button" onClick={resetInsuranceForm} className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-800">Annuler</button>
            </div>
          </form>
        )}

        {!insurances || insurances.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun paiement d'assurance enregistré</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Montant</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Assureur</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {insurances.map((ins) => (
                  <tr key={ins.id} className="border-b border-gray-50">
                    <td className="py-3">{format(new Date(ins.date), 'dd MMM yyyy', { locale: fr })}</td>
                    <td className="py-3 font-medium">{formatCurrency(ins.amount)}</td>
                    <td className="py-3">{INSURANCE_TYPE_LABELS[ins.type] || ins.type}</td>
                    <td className="py-3">{ins.insurer || '-'}</td>
                    <td className="py-3 text-right space-x-2">
                      <button onClick={() => startEditInsurance(ins)} className="text-primary-600 hover:text-primary-800 text-sm">Modifier</button>
                      <button onClick={() => { if (confirm('Supprimer ?')) deleteInsuranceMutation.mutate(ins.id); }} className="text-red-600 hover:text-red-800 text-sm">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
