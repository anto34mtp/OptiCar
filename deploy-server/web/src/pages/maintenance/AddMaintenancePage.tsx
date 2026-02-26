import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../../services/maintenance';

const PART_TYPES = [
  { value: 'VIDANGE', label: 'Vidange' },
  { value: 'FILTRE_AIR', label: 'Filtre à air' },
  { value: 'FILTRE_CARBURANT', label: 'Filtre carburant' },
  { value: 'BOUGIES', label: 'Bougies' },
  { value: 'FILTRE_HABITACLE', label: 'Filtre habitacle' },
  { value: 'KIT_DISTRIBUTION', label: 'Kit distribution' },
  { value: 'POMPE_EAU', label: 'Pompe à eau' },
  { value: 'COURROIE_ACCESSOIRES', label: 'Courroie accessoires' },
  { value: 'LIQUIDE_REFROIDISSEMENT', label: 'Liquide refroidissement' },
  { value: 'PLAQUETTES_AV', label: 'Plaquettes avant' },
  { value: 'PLAQUETTES_AR', label: 'Plaquettes arrière' },
  { value: 'DISQUES_AV', label: 'Disques avant' },
  { value: 'DISQUES_AR', label: 'Disques arrière' },
  { value: 'LIQUIDE_FREIN', label: 'Liquide de frein' },
  { value: 'PNEUS', label: 'Pneus' },
  { value: 'BATTERIE', label: 'Batterie' },
  { value: 'CONTROLE_TECHNIQUE', label: 'Contrôle technique' },
];

export default function AddMaintenancePage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'manual' | 'scan'>('manual');

  // Manual form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState('');
  const [partType, setPartType] = useState('VIDANGE');
  const [price, setPrice] = useState('');
  const [garage, setGarage] = useState('');
  const [notes, setNotes] = useState('');

  // Scan state
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: any) => maintenanceService.createRecord(vehicleId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-status', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-predictions', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs', vehicleId] });
      navigate(`/maintenance/${vehicleId}`);
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      date: new Date(date).toISOString(),
      mileage: parseInt(mileage),
      partType,
      price: price ? parseFloat(price) : undefined,
      garage: garage || undefined,
      notes: notes || undefined,
      sourceType: 'MANUAL',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setScanImage(reader.result as string);
      setScanResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!scanImage || !vehicleId) return;
    setScanning(true);
    try {
      const result = await maintenanceService.scanInvoice(vehicleId, scanImage);
      setScanResult(result);
      // Pre-fill form from scan
      if (result.date) setDate(result.date);
      if (result.mileage) setMileage(String(result.mileage));
      if (result.totalPrice) setPrice(String(result.totalPrice));
      if (result.garage) setGarage(result.garage);
      if (result.partTypes?.length > 0) setPartType(result.partTypes[0]);
      setTab('manual'); // Switch to manual to review/edit
    } catch (err) {
      alert('Erreur lors du scan');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-primary-600 hover:underline mb-4">
        &larr; Retour
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ajouter un entretien</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab('manual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'manual' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
          }`}
        >
          Saisie manuelle
        </button>
        <button
          onClick={() => setTab('scan')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'scan' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
          }`}
        >
          Scanner une facture
        </button>
      </div>

      {tab === 'scan' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />
          {scanImage && (
            <div className="mb-4">
              <img src={scanImage} alt="Facture" className="max-h-64 rounded border" />
            </div>
          )}
          <button
            onClick={handleScan}
            disabled={!scanImage || scanning}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {scanning ? 'Analyse en cours...' : 'Analyser'}
          </button>
          {scanResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              Analyse terminée. Les champs ont été pré-remplis. Vérifiez et validez ci-dessous.
            </div>
          )}
        </div>
      )}

      {(tab === 'manual' || scanResult) && (
        <form onSubmit={handleManualSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kilométrage</label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de pièce</label>
            <select
              value={partType}
              onChange={(e) => setPartType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {PART_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Garage</label>
            <input
              type="text"
              value={garage}
              onChange={(e) => setGarage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">Erreur lors de l'enregistrement</p>
          )}
        </form>
      )}
    </div>
  );
}
