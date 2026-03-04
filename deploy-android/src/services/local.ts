/**
 * Services locaux — stockage AsyncStorage sans compte serveur
 * Implémente la même interface que les services de api.ts
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEYS = {
  VEHICLES: 'local-vehicles',
  REFUELS: 'local-refuels',
  MAINT_RULES: 'local-maint-rules',
  MAINT_RECORDS: 'local-maint-records',
  INSURANCE: 'local-insurance',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getLocalData<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const str = await AsyncStorage.getItem(key);
    return str ? JSON.parse(str) : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function setLocalData<T>(key: string, data: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return Crypto.randomUUID();
}

// ── Default maintenance rules ─────────────────────────────────────────────────

const DEFAULT_RULES = [
  { partType: 'VIDANGE',              intervalKm: 15000,  intervalMonths: 12 },
  { partType: 'FILTRE_AIR',           intervalKm: 30000,  intervalMonths: 24 },
  { partType: 'FILTRE_CARBURANT',     intervalKm: 30000,  intervalMonths: 24 },
  { partType: 'BOUGIES',              intervalKm: 60000,  intervalMonths: 48 },
  { partType: 'FILTRE_HABITACLE',     intervalKm: 20000,  intervalMonths: 12 },
  { partType: 'KIT_DISTRIBUTION',     intervalKm: 120000, intervalMonths: 60 },
  { partType: 'POMPE_EAU',            intervalKm: 120000, intervalMonths: 60 },
  { partType: 'COURROIE_ACCESSOIRES', intervalKm: 60000,  intervalMonths: 48 },
  { partType: 'LIQUIDE_REFROIDISSEMENT', intervalKm: 60000, intervalMonths: 36 },
  { partType: 'PLAQUETTES_AV',        intervalKm: 40000,  intervalMonths: null },
  { partType: 'PLAQUETTES_AR',        intervalKm: 60000,  intervalMonths: null },
  { partType: 'DISQUES_AV',           intervalKm: 80000,  intervalMonths: null },
  { partType: 'DISQUES_AR',           intervalKm: 100000, intervalMonths: null },
  { partType: 'LIQUIDE_FREIN',        intervalKm: null,   intervalMonths: 24 },
  { partType: 'PNEUS_AV',             intervalKm: 40000,  intervalMonths: null },
  { partType: 'PNEUS_AR',             intervalKm: 50000,  intervalMonths: null },
  { partType: 'BATTERIE',             intervalKm: null,   intervalMonths: 60 },
  { partType: 'CONTROLE_TECHNIQUE',   intervalKm: null,   intervalMonths: 24 },
];

// ── Vehicles ──────────────────────────────────────────────────────────────────

export const localVehiclesService = {
  async getAll() {
    return getLocalData<any[]>(KEYS.VEHICLES, []);
  },

  async getOne(id: string) {
    const vehicles = await getLocalData<any[]>(KEYS.VEHICLES, []);
    const v = vehicles.find((v) => v.id === id);
    if (!v) throw new Error('Vehicle not found');
    return v;
  },

  async getWithStats(id: string) {
    const v = await localVehiclesService.getOne(id);
    const stats = await localStatsService.getVehicleStats(id);
    const refuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    const vRefuels = refuels.filter((r) => r.vehicleId === id);
    return { ...v, ...stats, refuels: vRefuels, _count: { refuels: vRefuels.length } };
  },

  async create(data: any) {
    const vehicles = await getLocalData<any[]>(KEYS.VEHICLES, []);
    const newVehicle = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    await setLocalData(KEYS.VEHICLES, [...vehicles, newVehicle]);
    return newVehicle;
  },

  async update(id: string, data: any) {
    const vehicles = await getLocalData<any[]>(KEYS.VEHICLES, []);
    const updated = vehicles.map((v) => v.id === id ? { ...v, ...data } : v);
    await setLocalData(KEYS.VEHICLES, updated);
    return updated.find((v) => v.id === id);
  },

  async delete(id: string) {
    const vehicles = await getLocalData<any[]>(KEYS.VEHICLES, []);
    await setLocalData(KEYS.VEHICLES, vehicles.filter((v) => v.id !== id));
    // Cascade delete
    const refuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    await setLocalData(KEYS.REFUELS, refuels.filter((r) => r.vehicleId !== id));
    const rules = await getLocalData<any[]>(KEYS.MAINT_RULES, []);
    await setLocalData(KEYS.MAINT_RULES, rules.filter((r) => r.vehicleId !== id));
    const records = await getLocalData<any[]>(KEYS.MAINT_RECORDS, []);
    await setLocalData(KEYS.MAINT_RECORDS, records.filter((r) => r.vehicleId !== id));
    const insurance = await getLocalData<any[]>(KEYS.INSURANCE, []);
    await setLocalData(KEYS.INSURANCE, insurance.filter((i) => i.vehicleId !== id));
  },
};

// ── Refuels ───────────────────────────────────────────────────────────────────

export const localRefuelsService = {
  async getByVehicle(vehicleId: string) {
    const refuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    return refuels
      .filter((r) => r.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  },

  async create(vehicleId: string, data: any) {
    const refuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    const newRefuel = {
      id: generateId(),
      vehicleId,
      ...data,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await setLocalData(KEYS.REFUELS, [...refuels, newRefuel]);
    return newRefuel;
  },
};

export const localRefuelsExtService = {
  async update(id: string, data: any) {
    const refuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    const updated = refuels.map((r) => r.id === id ? { ...r, ...data } : r);
    await setLocalData(KEYS.REFUELS, updated);
    return updated.find((r) => r.id === id);
  },

  async delete(id: string) {
    const refuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    await setLocalData(KEYS.REFUELS, refuels.filter((r) => r.id !== id));
  },
};

// ── Maintenance ───────────────────────────────────────────────────────────────

export const localMaintenanceService = {
  async getRules(vehicleId: string) {
    const rules = await getLocalData<any[]>(KEYS.MAINT_RULES, []);
    return rules.filter((r) => r.vehicleId === vehicleId);
  },

  async initDefaults(vehicleId: string) {
    const rules = await getLocalData<any[]>(KEYS.MAINT_RULES, []);
    const existing = rules.filter((r) => r.vehicleId === vehicleId).map((r) => r.partType);
    const newRules = DEFAULT_RULES
      .filter((d) => !existing.includes(d.partType))
      .map((d) => ({ id: generateId(), vehicleId, ...d, lastServiceKm: null, lastServiceDate: null }));
    await setLocalData(KEYS.MAINT_RULES, [...rules, ...newRules]);
    return newRules;
  },

  async updateRule(id: string, data: any) {
    const rules = await getLocalData<any[]>(KEYS.MAINT_RULES, []);
    const updated = rules.map((r) => r.id === id ? { ...r, ...data } : r);
    await setLocalData(KEYS.MAINT_RULES, updated);
    return updated.find((r) => r.id === id);
  },

  async deleteRule(id: string) {
    const rules = await getLocalData<any[]>(KEYS.MAINT_RULES, []);
    await setLocalData(KEYS.MAINT_RULES, rules.filter((r) => r.id !== id));
  },

  async getRecords(vehicleId: string) {
    const records = await getLocalData<any[]>(KEYS.MAINT_RECORDS, []);
    return records
      .filter((r) => r.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async createRecord(vehicleId: string, data: any) {
    const records = await getLocalData<any[]>(KEYS.MAINT_RECORDS, []);
    const newRecord = { id: generateId(), vehicleId, ...data, createdAt: new Date().toISOString() };
    await setLocalData(KEYS.MAINT_RECORDS, [...records, newRecord]);

    // Mettre à jour la règle correspondante
    const rules = await getLocalData<any[]>(KEYS.MAINT_RULES, []);
    const updated = rules.map((r) =>
      r.vehicleId === vehicleId && r.partType === data.partType
        ? { ...r, lastServiceKm: data.mileage, lastServiceDate: data.date }
        : r
    );
    await setLocalData(KEYS.MAINT_RULES, updated);

    return newRecord;
  },

  async getStatus(vehicleId: string) {
    const rules = await getLocalData<any[]>(KEYS.MAINT_RULES, []);
    const vehicleRules = rules.filter((r) => r.vehicleId === vehicleId);
    const records = await getLocalData<any[]>(KEYS.MAINT_RECORDS, []);
    const refuels = await getLocalData<any[]>(KEYS.REFUELS, []);

    const vRefuels = refuels
      .filter((r) => r.vehicleId === vehicleId)
      .sort((a, b) => b.mileage - a.mileage);
    const currentMileage = vRefuels[0]?.mileage ?? 0;
    const now = Date.now();

    return vehicleRules.map((rule) => {
      const lastRecord = records
        .filter((r) => r.vehicleId === vehicleId && r.partType === rule.partType)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      const lastServiceKm = lastRecord?.mileage ?? rule.lastServiceKm ?? null;
      const lastServiceDate = lastRecord?.date ?? rule.lastServiceDate ?? null;

      let wearPercent = 0;

      if (rule.intervalKm && currentMileage > 0 && lastServiceKm != null) {
        wearPercent = Math.max(wearPercent, ((currentMileage - lastServiceKm) / rule.intervalKm) * 100);
      }
      if (rule.intervalMonths && lastServiceDate) {
        const monthsElapsed = (now - new Date(lastServiceDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        wearPercent = Math.max(wearPercent, (monthsElapsed / rule.intervalMonths) * 100);
      }

      let status = 'ok';
      if (wearPercent >= 100) status = 'critical';
      else if (wearPercent >= 80) status = 'warning';

      return {
        id: rule.id,
        partType: rule.partType,
        status,
        wearPercent: Math.round(wearPercent),
        intervalKm: rule.intervalKm,
        intervalMonths: rule.intervalMonths,
        lastServiceKm,
        lastServiceDate,
        nextServiceKm: rule.intervalKm && lastServiceKm != null ? lastServiceKm + rule.intervalKm : null,
      };
    });
  },

  async getPredictions(vehicleId: string) {
    return localMaintenanceService.getStatus(vehicleId);
  },

  async getCosts(vehicleId: string) {
    const records = await getLocalData<any[]>(KEYS.MAINT_RECORDS, []);
    const vRecords = records.filter((r) => r.vehicleId === vehicleId);
    const total = vRecords.reduce((s, r) => s + (r.price ?? 0), 0);
    const byPartType = vRecords.reduce<Record<string, any>>((acc, r) => {
      if (!acc[r.partType]) acc[r.partType] = { partType: r.partType, total: 0, count: 0 };
      acc[r.partType].total += r.price ?? 0;
      acc[r.partType].count += 1;
      return acc;
    }, {});
    return { total, byPartType: Object.values(byPartType) };
  },

  async scanInvoice(_vehicleId: string, _image: string) {
    throw new Error('OCR non disponible en mode local');
  },
};

export const localMaintenanceExtService = {
  async updateRecord(id: string, data: any) {
    const records = await getLocalData<any[]>(KEYS.MAINT_RECORDS, []);
    const updated = records.map((r) => r.id === id ? { ...r, ...data } : r);
    await setLocalData(KEYS.MAINT_RECORDS, updated);
    return updated.find((r) => r.id === id);
  },

  async deleteRecord(id: string) {
    const records = await getLocalData<any[]>(KEYS.MAINT_RECORDS, []);
    await setLocalData(KEYS.MAINT_RECORDS, records.filter((r) => r.id !== id));
  },
};

// ── Insurance ─────────────────────────────────────────────────────────────────

export const localInsuranceService = {
  async getByVehicle(vehicleId: string) {
    const insurance = await getLocalData<any[]>(KEYS.INSURANCE, []);
    return insurance
      .filter((i) => i.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async create(vehicleId: string, data: any) {
    const insurance = await getLocalData<any[]>(KEYS.INSURANCE, []);
    const newItem = { id: generateId(), vehicleId, ...data, createdAt: new Date().toISOString() };
    await setLocalData(KEYS.INSURANCE, [...insurance, newItem]);
    return newItem;
  },

  async update(id: string, data: any) {
    const insurance = await getLocalData<any[]>(KEYS.INSURANCE, []);
    const updated = insurance.map((i) => i.id === id ? { ...i, ...data } : i);
    await setLocalData(KEYS.INSURANCE, updated);
    return updated.find((i) => i.id === id);
  },

  async delete(id: string) {
    const insurance = await getLocalData<any[]>(KEYS.INSURANCE, []);
    await setLocalData(KEYS.INSURANCE, insurance.filter((i) => i.id !== id));
  },
};

// ── Stats ─────────────────────────────────────────────────────────────────────

export const localStatsService = {
  async getGlobalStats() {
    const vehicles = await localVehiclesService.getAll();
    const allRefuels = await getLocalData<any[]>(KEYS.REFUELS, []);

    const totalSpent = allRefuels.reduce((s, r) => s + (r.totalPrice ?? 0), 0);
    const totalLiters = allRefuels.reduce((s, r) => s + (r.liters ?? 0), 0);
    const totalRefuels = allRefuels.length;
    const totalVehicles = vehicles.length;

    let totalDistance = 0;
    let totalConsumption = 0;
    let consumptionCount = 0;

    for (const v of vehicles) {
      const vRefuels = allRefuels
        .filter((r) => r.vehicleId === v.id)
        .sort((a, b) => a.mileage - b.mileage);
      if (vRefuels.length >= 2) {
        totalDistance += vRefuels[vRefuels.length - 1].mileage - vRefuels[0].mileage;
        for (let i = 1; i < vRefuels.length; i++) {
          const dist = vRefuels[i].mileage - vRefuels[i - 1].mileage;
          if (dist > 0 && vRefuels[i].liters > 0) {
            totalConsumption += (vRefuels[i].liters / dist) * 100;
            consumptionCount++;
          }
        }
      }
    }

    return {
      totalSpent,
      totalLiters,
      totalRefuels,
      totalDistance,
      totalVehicles,
      averageConsumption: consumptionCount > 0 ? totalConsumption / consumptionCount : 0,
      averageCostPerKm: totalDistance > 0 ? totalSpent / totalDistance : 0,
    };
  },

  async getVehicleStats(vehicleId: string) {
    const allRefuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    const vRefuels = allRefuels
      .filter((r) => r.vehicleId === vehicleId)
      .sort((a, b) => a.mileage - b.mileage);

    const totalSpent = vRefuels.reduce((s, r) => s + (r.totalPrice ?? 0), 0);
    const totalLiters = vRefuels.reduce((s, r) => s + (r.liters ?? 0), 0);
    const totalRefuels = vRefuels.length;

    let totalDistance = 0;
    let avgConsumption = 0;
    let consumptionCount = 0;

    if (vRefuels.length >= 2) {
      totalDistance = vRefuels[vRefuels.length - 1].mileage - vRefuels[0].mileage;
      for (let i = 1; i < vRefuels.length; i++) {
        const dist = vRefuels[i].mileage - vRefuels[i - 1].mileage;
        if (dist > 0 && vRefuels[i].liters > 0) {
          avgConsumption += (vRefuels[i].liters / dist) * 100;
          consumptionCount++;
        }
      }
    }

    return {
      totalSpent,
      totalLiters,
      totalRefuels,
      totalDistance,
      averageConsumption: consumptionCount > 0 ? avgConsumption / consumptionCount : 0,
      averageCostPerKm: totalDistance > 0 ? totalSpent / totalDistance : 0,
    };
  },

  async getTotalCosts() {
    const vehicles = await localVehiclesService.getAll();
    const allRefuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    const allRecords = await getLocalData<any[]>(KEYS.MAINT_RECORDS, []);
    const allInsurance = await getLocalData<any[]>(KEYS.INSURANCE, []);

    const fuelTotal = allRefuels.reduce((s, r) => s + (r.totalPrice ?? 0), 0);
    const maintenanceTotal = allRecords.reduce((s, r) => s + (r.price ?? 0), 0);
    const insuranceTotal = allInsurance.reduce((s, i) => s + (i.amount ?? 0), 0);
    const grandTotal = fuelTotal + maintenanceTotal + insuranceTotal;

    const monthMap: Record<string, { fuel: number; maintenance: number; insurance: number }> = {};
    const addMonth = (date: string, cat: 'fuel' | 'maintenance' | 'insurance', amt: number) => {
      if (!date) return;
      const month = date.slice(0, 7);
      if (!monthMap[month]) monthMap[month] = { fuel: 0, maintenance: 0, insurance: 0 };
      monthMap[month][cat] += amt;
    };
    allRefuels.forEach((r) => addMonth(r.date || r.createdAt, 'fuel', r.totalPrice ?? 0));
    allRecords.forEach((r) => addMonth(r.date, 'maintenance', r.price ?? 0));
    allInsurance.forEach((i) => addMonth(i.date, 'insurance', i.amount ?? 0));

    const costsByMonth = Object.entries(monthMap)
      .map(([month, v]) => ({ month, ...v, total: v.fuel + v.maintenance + v.insurance }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const costsByVehicle = vehicles.map((v) => {
      const fuel = allRefuels.filter((r) => r.vehicleId === v.id).reduce((s, r) => s + (r.totalPrice ?? 0), 0);
      const maintenance = allRecords.filter((r) => r.vehicleId === v.id).reduce((s, r) => s + (r.price ?? 0), 0);
      const insurance = allInsurance.filter((i) => i.vehicleId === v.id).reduce((s, i) => s + (i.amount ?? 0), 0);
      return { vehicleId: v.id, brand: v.brand, model: v.model, fuel, maintenance, insurance, total: fuel + maintenance + insurance };
    });

    return { grandTotal, fuelTotal, maintenanceTotal, insuranceTotal, costsByMonth, costsByVehicle };
  },

  async getCo2Stats() {
    const vehicles = await localVehiclesService.getAll();
    const allRefuels = await getLocalData<any[]>(KEYS.REFUELS, []);

    let totalCo2Grams = 0;
    const monthMap: Record<string, number> = {};
    const co2ByVehicle: any[] = [];

    for (const v of vehicles) {
      if (!v.co2PerKm) continue;
      const vRefuels = allRefuels
        .filter((r) => r.vehicleId === v.id)
        .sort((a, b) => a.mileage - b.mileage);

      let totalDistance = 0;
      for (let i = 1; i < vRefuels.length; i++) {
        const dist = vRefuels[i].mileage - vRefuels[i - 1].mileage;
        if (dist > 0) {
          totalDistance += dist;
          const co2 = dist * v.co2PerKm;
          totalCo2Grams += co2;
          const date = vRefuels[i].date || vRefuels[i].createdAt || '';
          const month = date.slice(0, 7);
          if (month) monthMap[month] = (monthMap[month] || 0) + co2;
        }
      }

      co2ByVehicle.push({
        vehicleId: v.id,
        brand: v.brand,
        model: v.model,
        co2PerKm: v.co2PerKm,
        totalCo2: totalDistance * v.co2PerKm,
        totalDistance,
      });
    }

    const co2ByMonth = Object.entries(monthMap)
      .map(([month, co2Grams]) => ({ month, co2Grams }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { totalCo2Grams, co2ByMonth, co2ByVehicle };
  },

  async getConsumptionHistory({ vehicleId }: { vehicleId?: string } = {}) {
    const allRefuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    const filtered = vehicleId ? allRefuels.filter((r) => r.vehicleId === vehicleId) : allRefuels;
    const sorted = filtered.sort((a, b) =>
      new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime()
    );
    const result: any[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const dist = sorted[i].mileage - sorted[i - 1].mileage;
      if (dist > 0 && sorted[i].liters > 0) {
        result.push({ date: sorted[i].date || sorted[i].createdAt, consumption: (sorted[i].liters / dist) * 100 });
      }
    }
    return result;
  },

  async getFuelPriceHistory({ vehicleId }: { vehicleId?: string } = {}) {
    const allRefuels = await getLocalData<any[]>(KEYS.REFUELS, []);
    const filtered = vehicleId ? allRefuels.filter((r) => r.vehicleId === vehicleId) : allRefuels;
    return filtered
      .filter((r) => r.pricePerLiter > 0)
      .sort((a, b) => new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime())
      .map((r) => ({ date: r.date || r.createdAt, pricePerLiter: r.pricePerLiter }));
  },
};

// ── Migration helper ──────────────────────────────────────────────────────────

export async function getAllLocalData() {
  const [vehicles, refuels, rules, records, insurance] = await Promise.all([
    getLocalData<any[]>(KEYS.VEHICLES, []),
    getLocalData<any[]>(KEYS.REFUELS, []),
    getLocalData<any[]>(KEYS.MAINT_RULES, []),
    getLocalData<any[]>(KEYS.MAINT_RECORDS, []),
    getLocalData<any[]>(KEYS.INSURANCE, []),
  ]);
  return { vehicles, refuels, rules, records, insurance };
}

export async function clearAllLocalData() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
