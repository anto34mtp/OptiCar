import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { vehiclesService } from '../../services/vehicles';
import { refuelsService, CreateRefuelData } from '../../services/refuels';
import { ocrService, OcrResult } from '../../services/ocr';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const sourceTypeOptions = [
  { value: 'TICKET', label: 'Ticket de caisse' },
  { value: 'PUMP', label: 'Pompe à essence' },
  { value: 'MANUAL', label: 'Saisie manuelle' },
];

export default function AddRefuelPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedVehicleId = searchParams.get('vehicleId');

  const [step, setStep] = useState<'vehicle' | 'capture' | 'verify' | 'confirm'>('vehicle');
  const [selectedVehicleId, setSelectedVehicleId] = useState(preselectedVehicleId || '');
  const [sourceType, setSourceType] = useState<'ticket' | 'pump' | 'manual'>('ticket');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [formData, setFormData] = useState<CreateRefuelData>({
    mileage: 0,
    pricePerLiter: 0,
    liters: 0,
    totalPrice: 0,
    sourceType: 'TICKET',
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateRefuelData) => refuelsService.create(selectedVehicleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['refuels'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setStep('confirm');
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setIsAnalyzing(true);

      try {
        const result = await ocrService.analyze(base64, sourceType === 'pump' ? 'pump' : 'ticket');
        setOcrResult(result.data);
        setFormData((prev) => ({
          ...prev,
          pricePerLiter: result.data.pricePerLiter || prev.pricePerLiter,
          liters: result.data.liters || prev.liters,
          totalPrice: result.data.totalPrice || prev.totalPrice,
          sourceType: sourceType === 'pump' ? 'PUMP' : 'TICKET',
        }));
        setStep('verify');
      } catch (error) {
        console.error('OCR failed:', error);
        alert('Erreur lors de l\'analyse de l\'image. Veuillez réessayer ou saisir les données manuellement.');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  }, [sourceType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleManualEntry = () => {
    setSourceType('manual');
    setFormData((prev) => ({ ...prev, sourceType: 'MANUAL' }));
    setStep('verify');
  };

  if (step === 'confirm') {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Plein enregistré</h2>
          <p className="text-gray-600 mb-6">Votre plein a été ajouté avec succès.</p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate(`/vehicles/${selectedVehicleId}`)}>
              Voir le véhicule
            </Button>
            <Button onClick={() => {
              setStep('vehicle');
              setFormData({ mileage: 0, pricePerLiter: 0, liters: 0, totalPrice: 0, sourceType: 'TICKET' });
              setImagePreview(null);
              setOcrResult(null);
            }}>
              Ajouter un autre plein
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajouter un plein</h1>
        <p className="text-gray-600">Enregistrez un nouveau plein de carburant</p>
      </div>

      {/* Step 1: Select vehicle */}
      {step === 'vehicle' && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Sélectionner le véhicule</h2>
          <Select
            id="vehicle"
            label="Véhicule"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            options={[
              { value: '', label: 'Choisir un véhicule...' },
              ...(vehicles?.map((v) => ({
                value: v.id,
                label: `${v.brand} ${v.model}`,
              })) || []),
            ]}
          />

          <div className="mt-6">
            <Input
              id="mileage"
              type="number"
              label="Kilométrage actuel"
              value={formData.mileage || ''}
              onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) || 0 })}
              placeholder="Ex: 45000"
              required
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setStep('capture')}
              disabled={!selectedVehicleId || !formData.mileage}
            >
              Continuer
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Capture */}
      {step === 'capture' && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Source des données</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setSourceType('ticket')}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                sourceType === 'ticket'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">🧾</span>
              <p className="mt-2 font-medium">Ticket de caisse</p>
            </button>
            <button
              type="button"
              onClick={() => setSourceType('pump')}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                sourceType === 'pump'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">⛽</span>
              <p className="mt-2 font-medium">Pompe à essence</p>
            </button>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            {isAnalyzing ? (
              <div>
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-600">Analyse en cours...</p>
              </div>
            ) : (
              <>
                <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <p className="mt-4 text-gray-600">
                  Glissez une photo ici ou cliquez pour sélectionner
                </p>
              </>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep('vehicle')}>
              Retour
            </Button>
            <Button variant="secondary" onClick={handleManualEntry}>
              Saisie manuelle
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Verify */}
      {step === 'verify' && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Vérifier les données</h2>

          {imagePreview && (
            <div className="mb-4">
              <img src={imagePreview} alt="Capture" className="max-h-48 mx-auto rounded-lg" />
              {ocrResult && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  Confiance OCR: {Math.round(ocrResult.confidence * 100)}%
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="pricePerLiter"
                type="number"
                step="0.001"
                label="Prix au litre (€)"
                value={formData.pricePerLiter || ''}
                onChange={(e) => setFormData({ ...formData, pricePerLiter: parseFloat(e.target.value) || 0 })}
                required
              />
              <Input
                id="liters"
                type="number"
                step="0.01"
                label="Quantité (L)"
                value={formData.liters || ''}
                onChange={(e) => setFormData({ ...formData, liters: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <Input
              id="totalPrice"
              type="number"
              step="0.01"
              label="Prix total (€)"
              value={formData.totalPrice || ''}
              onChange={(e) => setFormData({ ...formData, totalPrice: parseFloat(e.target.value) || 0 })}
              required
            />

            <Select
              id="sourceType"
              label="Type de source"
              value={formData.sourceType}
              onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
              options={sourceTypeOptions}
            />

            <div className="flex justify-between pt-4">
              <Button type="button" variant="secondary" onClick={() => setStep('capture')}>
                Retour
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                Enregistrer le plein
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
