import api from './api';

export interface MaintenanceRule {
  id: string;
  vehicleId: string;
  category: string;
  partType: string;
  intervalKm: number | null;
  intervalMonths: number | null;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string;
  mileage: number;
  partType: string;
  price: number | null;
  garage: string | null;
  notes: string | null;
  sourceType: string;
  scanFileUrl: string | null;
}

export interface MaintenanceStatus {
  ruleId: string;
  category: string;
  partType: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastDate: string | null;
  lastMileage: number | null;
  kmSinceLast: number | null;
  monthsSinceLast: number | null;
  wearPercent: number | null;
  nextEstimatedDate: string | null;
  status: 'ok' | 'warning' | 'critical' | 'unknown';
}

export interface PredictionItem {
  partType: string;
  category: string;
  estimatedDate: string | null;
  estimatedPrice: number | null;
  wearPercent: number | null;
  status: string;
}

export interface Predictions {
  timeline: PredictionItem[];
  sixMonthEstimate: {
    items: PredictionItem[];
    total: number;
  };
}

export interface CostByYear {
  year: number;
  total: number;
}

export interface MaintenanceScanResult {
  date: string | null;
  mileage: number | null;
  totalPrice: number | null;
  partTypes: string[];
  garage: string | null;
  rawText: string;
}

export const maintenanceService = {
  // Rules
  async getRules(vehicleId: string): Promise<MaintenanceRule[]> {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/rules`);
    return response.data;
  },

  async createRule(vehicleId: string, data: Omit<MaintenanceRule, 'id' | 'vehicleId'>): Promise<MaintenanceRule> {
    const response = await api.post(`/vehicles/${vehicleId}/maintenance/rules`, data);
    return response.data;
  },

  async initDefaults(vehicleId: string): Promise<MaintenanceRule[]> {
    const response = await api.post(`/vehicles/${vehicleId}/maintenance/rules/defaults`);
    return response.data;
  },

  async updateRule(id: string, data: Partial<MaintenanceRule>): Promise<MaintenanceRule> {
    const response = await api.patch(`/maintenance/rules/${id}`, data);
    return response.data;
  },

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/maintenance/rules/${id}`);
  },

  // Records
  async getRecords(vehicleId: string): Promise<MaintenanceRecord[]> {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/records`);
    return response.data;
  },

  async createRecord(vehicleId: string, data: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'scanFileUrl'>): Promise<MaintenanceRecord> {
    const response = await api.post(`/vehicles/${vehicleId}/maintenance/records`, data);
    return response.data;
  },

  async updateRecord(id: string, data: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const response = await api.patch(`/maintenance/records/${id}`, data);
    return response.data;
  },

  async deleteRecord(id: string): Promise<void> {
    await api.delete(`/maintenance/records/${id}`);
  },

  // Status & Predictions
  async getStatus(vehicleId: string): Promise<MaintenanceStatus[]> {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/status`);
    return response.data;
  },

  async getPredictions(vehicleId: string): Promise<Predictions> {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/predictions`);
    return response.data;
  },

  async getCosts(vehicleId: string): Promise<CostByYear[]> {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/costs`);
    return response.data;
  },

  // Scan
  async scanInvoice(vehicleId: string, image: string): Promise<MaintenanceScanResult> {
    const response = await api.post(`/vehicles/${vehicleId}/maintenance/scan`, { image });
    return response.data;
  },
};
