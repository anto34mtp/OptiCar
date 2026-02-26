import api from './api';

export interface InsuranceRecord {
  id: string;
  vehicleId: string;
  date: string;
  amount: number;
  type: string;
  insurer: string | null;
  notes: string | null;
}

export const insuranceService = {
  async getByVehicle(vehicleId: string): Promise<InsuranceRecord[]> {
    const response = await api.get(`/vehicles/${vehicleId}/insurance`);
    return response.data;
  },

  async create(vehicleId: string, data: Omit<InsuranceRecord, 'id' | 'vehicleId'>): Promise<InsuranceRecord> {
    const response = await api.post(`/vehicles/${vehicleId}/insurance`, data);
    return response.data;
  },

  async update(id: string, data: Partial<InsuranceRecord>): Promise<InsuranceRecord> {
    const response = await api.patch(`/insurance/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/insurance/${id}`);
  },
};
