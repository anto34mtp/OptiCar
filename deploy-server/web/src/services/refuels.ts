import api from './api';

export interface Refuel {
  id: string;
  date: string;
  mileage: number;
  pricePerLiter: number;
  liters: number;
  totalPrice: number;
  sourceType: string;
  vehicleId: string;
  consumption?: number | null;
  distanceSinceLast?: number | null;
}

export interface CreateRefuelData {
  date?: string;
  mileage: number;
  pricePerLiter: number;
  liters: number;
  totalPrice: number;
  sourceType: string;
}

export const refuelsService = {
  async getByVehicle(vehicleId: string): Promise<Refuel[]> {
    const response = await api.get(`/vehicles/${vehicleId}/refuels`);
    return response.data;
  },

  async getOne(id: string): Promise<Refuel> {
    const response = await api.get(`/refuels/${id}`);
    return response.data;
  },

  async create(vehicleId: string, data: CreateRefuelData): Promise<Refuel> {
    const response = await api.post(`/vehicles/${vehicleId}/refuels`, data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateRefuelData>): Promise<Refuel> {
    const response = await api.patch(`/refuels/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/refuels/${id}`);
  },
};
