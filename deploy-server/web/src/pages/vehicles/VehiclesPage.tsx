import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesService, CreateVehicleData } from '../../services/vehicles';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const brandOptions = [
  { value: 'Renault', label: 'Renault' },
  { value: 'Peugeot', label: 'Peugeot' },
  { value: 'Citroën', label: 'Citroën' },
  { value: 'Dacia', label: 'Dacia' },
  { value: 'Toyota', label: 'Toyota' },
  { value: 'Volkswagen', label: 'Volkswagen' },
  { value: 'Ford', label: 'Ford' },
  { value: 'Audi', label: 'Audi' },
  { value: 'BMW', label: 'BMW' },
  { value: 'Mercedes', label: 'Mercedes' },
  { value: 'Opel', label: 'Opel' },
  { value: 'Fiat', label: 'Fiat' },
  { value: 'Hyundai', label: 'Hyundai' },
  { value: 'Kia', label: 'Kia' },
  { value: 'Nissan', label: 'Nissan' },
  { value: 'Seat', label: 'Seat' },
  { value: 'Skoda', label: 'Skoda' },
  { value: 'Volvo', label: 'Volvo' },
  { value: 'Autre', label: 'Autre' },
];

const fuelTypeOptions = [
  { value: 'SP95', label: 'Sans Plomb 95' },
  { value: 'SP98', label: 'Sans Plomb 98' },
  { value: 'E10', label: 'E10' },
  { value: 'E85', label: 'E85 (Éthanol)' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'ELECTRIC', label: 'Électrique' },
];

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('Renault');
  const [formData, setFormData] = useState<CreateVehicleData>({
    brand: 'Renault',
    model: '',
    fuelType: 'SP95',
  });

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateVehicleData) => vehiclesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowForm(false);
      setSelectedBrand('Renault');
      setFormData({ brand: 'Renault', model: '', fuelType: 'SP95' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes véhicules</h1>
          <p className="text-gray-600">Gérez vos véhicules et leur consommation</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Ajouter un véhicule'}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nouveau véhicule</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                id="brand"
                label="Marque"
                value={selectedBrand}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBrand(val);
                  if (val !== 'Autre') {
                    setFormData({ ...formData, brand: val });
                  } else {
                    setFormData({ ...formData, brand: '' });
                  }
                }}
                options={brandOptions}
              />
              {selectedBrand === 'Autre' && (
                <Input
                  id="customBrand"
                  label="Marque (autre)"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                  placeholder="Saisir la marque"
                />
              )}
              <Input
                id="model"
                label="Modèle"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
                placeholder="Ex: Clio"
              />
              <Select
                id="fuelType"
                label="Type de carburant"
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                options={fuelTypeOptions}
              />
              <Input
                id="year"
                type="number"
                label="Année (optionnel)"
                value={formData.year || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    year: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Ex: 2020"
                min={1900}
                max={new Date().getFullYear() + 1}
              />
              <Input
                id="co2PerKm"
                type="number"
                label="CO2 g/km (optionnel)"
                value={formData.co2PerKm || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    co2PerKm: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Ex: 120"
                min={0}
                max={1000}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                Ajouter
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Vehicles list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : vehicles?.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">Vous n'avez pas encore de véhicule</p>
          <Button onClick={() => setShowForm(true)}>Ajouter votre premier véhicule</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles?.map((vehicle) => (
            <Link key={vehicle.id} to={`/vehicles/${vehicle.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    {vehicle.year && (
                      <p className="text-sm text-gray-500">{vehicle.year}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                    {vehicle.fuelType}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    {vehicle._count?.refuels || 0} pleins enregistrés
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
