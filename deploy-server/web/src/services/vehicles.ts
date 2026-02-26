import api from './api';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  fuelType: string;
  year: number | null;
  createdAt: string;
  _count?: {
    refuels: number;
  };
}

export interface CreateVehicleData {
  brand: string;
  model: string;
  fuelType: string;
  year?: number;
  co2PerKm?: number;
}

export const vehiclesService = {
  async getAll(): Promise<Vehicle[]> {
    const response = await api.get('/vehicles');
    return response.data;
  },

  async getOne(id: string): Promise<Vehicle> {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  async getWithStats(id: string) {
    const response = await api.get(`/vehicles/${id}/stats`);
    return response.data;
  },

  async create(data: CreateVehicleData): Promise<Vehicle> {
    const response = await api.post('/vehicles', data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateVehicleData>): Promise<Vehicle> {
    const response = await api.patch(`/vehicles/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/vehicles/${id}`);
  },
};
