import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface StatsFilters {
  vehicleId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getGlobalStats(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      select: { id: true },
    });

    const vehicleIds = vehicles.map((v) => v.id);

    if (vehicleIds.length === 0) {
      return {
        totalVehicles: 0,
        totalRefuels: 0,
        totalSpent: 0,
        totalLiters: 0,
        totalDistance: 0,
        averageConsumption: null,
        averageCostPerKm: null,
      };
    }

    const aggregate = await this.prisma.refuel.aggregate({
      where: { vehicleId: { in: vehicleIds } },
      _sum: {
        totalPrice: true,
        liters: true,
      },
      _count: true,
    });

    // Calculate total distance and consumption
    let totalDistance = 0;
    let totalLitersForConsumption = 0;

    for (const vehicleId of vehicleIds) {
      const refuels = await this.prisma.refuel.findMany({
        where: { vehicleId },
        orderBy: { mileage: 'asc' },
        select: { mileage: true, liters: true },
      });

      for (let i = 1; i < refuels.length; i++) {
        const distance = refuels[i].mileage - refuels[i - 1].mileage;
        if (distance > 0) {
          totalDistance += distance;
          totalLitersForConsumption += refuels[i].liters;
        }
      }
    }

    const averageConsumption =
      totalDistance > 0 ? (totalLitersForConsumption / totalDistance) * 100 : null;

    const averageCostPerKm =
      totalDistance > 0 ? (aggregate._sum.totalPrice || 0) / totalDistance : null;

    return {
      totalVehicles: vehicleIds.length,
      totalRefuels: aggregate._count,
      totalSpent: aggregate._sum.totalPrice || 0,
      totalLiters: aggregate._sum.liters || 0,
      totalDistance,
      averageConsumption,
      averageCostPerKm,
    };
  }

  async getVehicleStats(userId: string, vehicleId: string) {
    // Verify ownership
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });

    if (!vehicle) {
      return null;
    }

    const aggregate = await this.prisma.refuel.aggregate({
      where: { vehicleId },
      _sum: {
        totalPrice: true,
        liters: true,
      },
      _avg: {
        pricePerLiter: true,
      },
      _count: true,
    });

    const refuels = await this.prisma.refuel.findMany({
      where: { vehicleId },
      orderBy: { mileage: 'asc' },
      select: { mileage: true, liters: true },
    });

    let totalDistance = 0;
    let totalLitersForConsumption = 0;

    for (let i = 1; i < refuels.length; i++) {
      const distance = refuels[i].mileage - refuels[i - 1].mileage;
      if (distance > 0) {
        totalDistance += distance;
        totalLitersForConsumption += refuels[i].liters;
      }
    }

    const averageConsumption =
      totalDistance > 0 ? (totalLitersForConsumption / totalDistance) * 100 : null;

    const averageCostPerKm =
      totalDistance > 0 ? (aggregate._sum.totalPrice || 0) / totalDistance : null;

    const lastRefuel = await this.prisma.refuel.findFirst({
      where: { vehicleId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    return {
      vehicleId,
      totalRefuels: aggregate._count,
      totalSpent: aggregate._sum.totalPrice || 0,
      totalLiters: aggregate._sum.liters || 0,
      totalDistance,
      averageConsumption,
      averageCostPerKm,
      averagePricePerLiter: aggregate._avg.pricePerLiter,
      lastRefuelDate: lastRefuel?.date || null,
    };
  }

  async getConsumptionHistory(userId: string, filters?: StatsFilters) {
    const where: { vehicleId?: string | { in: string[] }; date?: { gte?: Date; lte?: Date } } = {};

    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    } else {
      const vehicles = await this.prisma.vehicle.findMany({
        where: { userId },
        select: { id: true },
      });
      where.vehicleId = { in: vehicles.map((v) => v.id) };
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    const refuels = await this.prisma.refuel.findMany({
      where,
      orderBy: [{ vehicleId: 'asc' }, { mileage: 'asc' }],
      select: {
        id: true,
        date: true,
        mileage: true,
        liters: true,
        vehicleId: true,
      },
    });

    // Group by vehicle and calculate consumption
    const byVehicle = new Map<string, typeof refuels>();
    refuels.forEach((r) => {
      if (!byVehicle.has(r.vehicleId)) {
        byVehicle.set(r.vehicleId, []);
      }
      byVehicle.get(r.vehicleId)!.push(r);
    });

    const result: { date: Date; consumption: number; vehicleId: string }[] = [];

    byVehicle.forEach((vehicleRefuels, vehicleId) => {
      for (let i = 1; i < vehicleRefuels.length; i++) {
        const current = vehicleRefuels[i];
        const previous = vehicleRefuels[i - 1];
        const distance = current.mileage - previous.mileage;

        if (distance > 0) {
          result.push({
            date: current.date,
            consumption: (current.liters / distance) * 100,
            vehicleId,
          });
        }
      }
    });

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getExpensesByPeriod(userId: string, filters?: StatsFilters) {
    const where: { vehicleId?: string | { in: string[] }; date?: { gte?: Date; lte?: Date } } = {};

    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    } else {
      const vehicles = await this.prisma.vehicle.findMany({
        where: { userId },
        select: { id: true },
      });
      where.vehicleId = { in: vehicles.map((v) => v.id) };
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    const refuels = await this.prisma.refuel.findMany({
      where,
      orderBy: { date: 'asc' },
      select: {
        date: true,
        totalPrice: true,
        vehicleId: true,
      },
    });

    // Group by month
    const byMonth = new Map<string, number>();

    refuels.forEach((r) => {
      const monthKey = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + r.totalPrice);
    });

    return Array.from(byMonth.entries())
      .map(([period, amount]) => ({ period, amount }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  async getFuelPriceHistory(userId: string, filters?: StatsFilters) {
    const where: { vehicleId?: string | { in: string[] }; date?: { gte?: Date; lte?: Date } } = {};

    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    } else {
      const vehicles = await this.prisma.vehicle.findMany({
        where: { userId },
        select: { id: true },
      });
      where.vehicleId = { in: vehicles.map((v) => v.id) };
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    const refuels = await this.prisma.refuel.findMany({
      where,
      orderBy: { date: 'asc' },
      select: {
        date: true,
        pricePerLiter: true,
        vehicleId: true,
      },
    });

    return refuels.map((r) => ({
      date: r.date,
      pricePerLiter: r.pricePerLiter,
      vehicleId: r.vehicleId,
    }));
  }

  async getTotalCosts(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      select: { id: true, brand: true, model: true },
    });
    const vehicleIds = vehicles.map((v) => v.id);

    if (vehicleIds.length === 0) {
      return {
        fuelTotal: 0,
        maintenanceTotal: 0,
        insuranceTotal: 0,
        grandTotal: 0,
        costsByMonth: [],
        costsByVehicle: [],
      };
    }

    // Totals
    const fuelAgg = await this.prisma.refuel.aggregate({
      where: { vehicleId: { in: vehicleIds } },
      _sum: { totalPrice: true },
    });
    const maintenanceRecords = await this.prisma.maintenanceRecord.findMany({
      where: { vehicleId: { in: vehicleIds } },
      select: { date: true, price: true, vehicleId: true },
    });
    const insuranceRecords = await this.prisma.insuranceRecord.findMany({
      where: { vehicleId: { in: vehicleIds } },
      select: { date: true, amount: true, vehicleId: true },
    });

    const fuelTotal = fuelAgg._sum.totalPrice || 0;
    const maintenanceTotal = maintenanceRecords.reduce((s, r) => s + (r.price || 0), 0);
    const insuranceTotal = insuranceRecords.reduce((s, r) => s + r.amount, 0);

    // Costs by month
    const refuels = await this.prisma.refuel.findMany({
      where: { vehicleId: { in: vehicleIds } },
      select: { date: true, totalPrice: true, vehicleId: true },
    });

    const monthMap = new Map<string, { fuel: number; maintenance: number; insurance: number }>();
    const getMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    for (const r of refuels) {
      const m = getMonth(r.date);
      if (!monthMap.has(m)) monthMap.set(m, { fuel: 0, maintenance: 0, insurance: 0 });
      monthMap.get(m)!.fuel += r.totalPrice;
    }
    for (const r of maintenanceRecords) {
      const m = getMonth(r.date);
      if (!monthMap.has(m)) monthMap.set(m, { fuel: 0, maintenance: 0, insurance: 0 });
      monthMap.get(m)!.maintenance += r.price || 0;
    }
    for (const r of insuranceRecords) {
      const m = getMonth(r.date);
      if (!monthMap.has(m)) monthMap.set(m, { fuel: 0, maintenance: 0, insurance: 0 });
      monthMap.get(m)!.insurance += r.amount;
    }

    const costsByMonth = Array.from(monthMap.entries())
      .map(([month, costs]) => ({
        month,
        fuel: Math.round(costs.fuel * 100) / 100,
        maintenance: Math.round(costs.maintenance * 100) / 100,
        insurance: Math.round(costs.insurance * 100) / 100,
        total: Math.round((costs.fuel + costs.maintenance + costs.insurance) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Costs by vehicle
    const costsByVehicle = vehicles.map((v) => {
      const vFuel = refuels.filter((r) => r.vehicleId === v.id).reduce((s, r) => s + r.totalPrice, 0);
      const vMaint = maintenanceRecords.filter((r) => r.vehicleId === v.id).reduce((s, r) => s + (r.price || 0), 0);
      const vIns = insuranceRecords.filter((r) => r.vehicleId === v.id).reduce((s, r) => s + r.amount, 0);
      return {
        vehicleId: v.id,
        brand: v.brand,
        model: v.model,
        fuel: Math.round(vFuel * 100) / 100,
        maintenance: Math.round(vMaint * 100) / 100,
        insurance: Math.round(vIns * 100) / 100,
        total: Math.round((vFuel + vMaint + vIns) * 100) / 100,
      };
    });

    return {
      fuelTotal: Math.round(fuelTotal * 100) / 100,
      maintenanceTotal: Math.round(maintenanceTotal * 100) / 100,
      insuranceTotal: Math.round(insuranceTotal * 100) / 100,
      grandTotal: Math.round((fuelTotal + maintenanceTotal + insuranceTotal) * 100) / 100,
      costsByMonth,
      costsByVehicle,
    };
  }

  async getCo2Stats(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      select: { id: true, brand: true, model: true, co2PerKm: true },
    });

    if (vehicles.length === 0) {
      return {
        totalCo2Grams: 0,
        totalCo2Kg: 0,
        co2ByMonth: [],
        co2ByYear: [],
        co2ByVehicle: [],
      };
    }

    const co2ByVehicle: { vehicleId: string; brand: string; model: string; totalCo2: number; co2PerKm: number | null; totalDistance: number }[] = [];
    const monthlyData = new Map<string, number>();
    const yearlyData = new Map<number, number>();
    let totalCo2 = 0;

    for (const vehicle of vehicles) {
      if (!vehicle.co2PerKm) {
        co2ByVehicle.push({
          vehicleId: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          totalCo2: 0,
          co2PerKm: null,
          totalDistance: 0,
        });
        continue;
      }

      const refuels = await this.prisma.refuel.findMany({
        where: { vehicleId: vehicle.id },
        orderBy: { mileage: 'asc' },
        select: { date: true, mileage: true },
      });

      let vehicleTotalCo2 = 0;
      let vehicleTotalDistance = 0;

      for (let i = 1; i < refuels.length; i++) {
        const distance = refuels[i].mileage - refuels[i - 1].mileage;
        if (distance > 0) {
          const co2 = distance * vehicle.co2PerKm;
          vehicleTotalCo2 += co2;
          vehicleTotalDistance += distance;

          const date = refuels[i].date;
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + co2);
          yearlyData.set(date.getFullYear(), (yearlyData.get(date.getFullYear()) || 0) + co2);
        }
      }

      totalCo2 += vehicleTotalCo2;
      co2ByVehicle.push({
        vehicleId: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        totalCo2: Math.round(vehicleTotalCo2),
        co2PerKm: vehicle.co2PerKm,
        totalDistance: vehicleTotalDistance,
      });
    }

    const co2ByMonth = Array.from(monthlyData.entries())
      .map(([month, co2]) => ({ month, co2Grams: Math.round(co2), co2Kg: Math.round(co2 / 10) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const co2ByYear = Array.from(yearlyData.entries())
      .map(([year, co2]) => ({ year, co2Grams: Math.round(co2), co2Kg: Math.round(co2 / 10) / 100 }))
      .sort((a, b) => a.year - b.year);

    return {
      totalCo2Grams: Math.round(totalCo2),
      totalCo2Kg: Math.round(totalCo2 / 10) / 100,
      co2ByMonth,
      co2ByYear,
      co2ByVehicle,
    };
  }

  async getVehicleComparison(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      select: {
        id: true,
        brand: true,
        model: true,
        fuelType: true,
      },
    });

    const comparison = await Promise.all(
      vehicles.map(async (vehicle) => {
        const stats = await this.getVehicleStats(userId, vehicle.id);
        return {
          vehicle,
          stats,
        };
      }),
    );

    return comparison;
  }
}
