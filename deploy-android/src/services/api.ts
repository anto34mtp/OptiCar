import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// API URL from environment variable or default for development
const API_URL = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/api`
  : 'http://192.168.1.100:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await SecureStore.getItemAsync('refreshToken');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          await SecureStore.setItemAsync('accessToken', accessToken);
          await SecureStore.setItemAsync('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          await SecureStore.deleteItemAsync('user');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth service
export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(email: string, password: string, name?: string) {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
};

// Vehicles service
export const vehiclesService = {
  async getAll() {
    const response = await api.get('/vehicles');
    return response.data;
  },

  async getOne(id: string) {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  async getWithStats(id: string) {
    const response = await api.get(`/vehicles/${id}/stats`);
    return response.data;
  },

  async create(data: { brand: string; model: string; fuelType: string; year?: number; co2PerKm?: number }) {
    const response = await api.post('/vehicles', data);
    return response.data;
  },

  async update(id: string, data: Partial<{ brand: string; model: string; fuelType: string; year: number; co2PerKm: number }>) {
    const response = await api.patch(`/vehicles/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    await api.delete(`/vehicles/${id}`);
  },
};

// Refuels service
export const refuelsService = {
  async getByVehicle(vehicleId: string) {
    const response = await api.get(`/vehicles/${vehicleId}/refuels`);
    return response.data;
  },

  async create(vehicleId: string, data: {
    mileage: number;
    pricePerLiter: number;
    liters: number;
    totalPrice: number;
    sourceType: string;
  }) {
    const response = await api.post(`/vehicles/${vehicleId}/refuels`, data);
    return response.data;
  },
};

// OCR service
export const ocrService = {
  async analyze(image: string, sourceType: 'ticket' | 'pump') {
    const response = await api.post('/ocr/analyze', { image, sourceType });
    return response.data;
  },
};

// Maintenance service
export const maintenanceService = {
  async getRules(vehicleId: string) {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/rules`);
    return response.data;
  },

  async initDefaults(vehicleId: string) {
    const response = await api.post(`/vehicles/${vehicleId}/maintenance/rules/defaults`);
    return response.data;
  },

  async updateRule(id: string, data: any) {
    const response = await api.patch(`/maintenance/rules/${id}`, data);
    return response.data;
  },

  async deleteRule(id: string) {
    await api.delete(`/maintenance/rules/${id}`);
  },

  async getRecords(vehicleId: string) {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/records`);
    return response.data;
  },

  async createRecord(vehicleId: string, data: any) {
    const response = await api.post(`/vehicles/${vehicleId}/maintenance/records`, data);
    return response.data;
  },

  async getStatus(vehicleId: string) {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/status`);
    return response.data;
  },

  async getPredictions(vehicleId: string) {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/predictions`);
    return response.data;
  },

  async getCosts(vehicleId: string) {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance/costs`);
    return response.data;
  },

  async scanInvoice(vehicleId: string, image: string) {
    const response = await api.post(`/vehicles/${vehicleId}/maintenance/scan`, { image });
    return response.data;
  },
};

// Stats service
export const statsService = {
  async getGlobalStats() {
    const response = await api.get('/stats/summary');
    return response.data;
  },

  async getVehicleStats(vehicleId: string) {
    const response = await api.get(`/stats/vehicle/${vehicleId}`);
    return response.data;
  },

  async getTotalCosts() {
    const response = await api.get('/stats/total-costs');
    return response.data;
  },

  async getCo2Stats() {
    const response = await api.get('/stats/co2');
    return response.data;
  },
};

// Refuels extended
export const refuelsExtService = {
  async update(id: string, data: any) {
    const response = await api.patch(`/refuels/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    await api.delete(`/refuels/${id}`);
  },
};

// Insurance service
export const insuranceService = {
  async getByVehicle(vehicleId: string) {
    const response = await api.get(`/vehicles/${vehicleId}/insurance`);
    return response.data;
  },

  async create(vehicleId: string, data: any) {
    const response = await api.post(`/vehicles/${vehicleId}/insurance`, data);
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await api.patch(`/insurance/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    await api.delete(`/insurance/${id}`);
  },
};

// Maintenance extended
export const maintenanceExtService = {
  async updateRecord(id: string, data: any) {
    const response = await api.patch(`/maintenance/records/${id}`, data);
    return response.data;
  },

  async deleteRecord(id: string) {
    await api.delete(`/maintenance/records/${id}`);
  },
};
