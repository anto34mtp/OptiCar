import api from './api';

export interface GlobalStats {
  totalVehicles: number;
  totalRefuels: number;
  totalSpent: number;
  totalLiters: number;
  totalDistance: number;
  averageConsumption: number | null;
  averageCostPerKm: number | null;
}

export interface VehicleStats {
  vehicleId: string;
  totalRefuels: number;
  totalSpent: number;
  totalLiters: number;
  totalDistance: number;
  averageConsumption: number | null;
  averageCostPerKm: number | null;
  averagePricePerLiter: number | null;
  lastRefuelDate: string | null;
}

export interface ConsumptionDataPoint {
  date: string;
  consumption: number;
  vehicleId: string;
}

export interface ExpenseDataPoint {
  period: string;
  amount: number;
}

export const statsService = {
  async getGlobalStats(): Promise<GlobalStats> {
    const response = await api.get('/stats/summary');
    return response.data;
  },

  async getVehicleStats(vehicleId: string): Promise<VehicleStats> {
    const response = await api.get(`/stats/vehicle/${vehicleId}`);
    return response.data;
  },

  async getConsumptionHistory(params?: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ConsumptionDataPoint[]> {
    const response = await api.get('/stats/consumption', { params });
    return response.data;
  },

  async getExpensesByPeriod(params?: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ExpenseDataPoint[]> {
    const response = await api.get('/stats/expenses', { params });
    return response.data;
  },

  async getFuelPriceHistory(params?: {
    vehicleId?: string;
  }) {
    const response = await api.get('/stats/fuel-prices', { params });
    return response.data;
  },

  async getVehicleComparison() {
    const response = await api.get('/stats/comparison');
    return response.data;
  },

  async getTotalCosts() {
    const response = await api.get('/stats/total-costs');
    return response.data;
  },
};
