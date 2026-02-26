import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        _count: {
          select: { refuels: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        refuels: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        _count: {
          select: { refuels: true },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return vehicle;
  }

  async create(userId: string, dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.vehicle.delete({
      where: { id },
    });

    return { message: 'Vehicle deleted successfully' };
  }

  async getVehicleWithStats(id: string, userId: string) {
    const vehicle = await this.findOne(id, userId);

    const stats = await this.prisma.refuel.aggregate({
      where: { vehicleId: id },
      _sum: {
        totalPrice: true,
        liters: true,
      },
      _count: true,
    });

    const refuels = await this.prisma.refuel.findMany({
      where: { vehicleId: id },
      orderBy: { mileage: 'asc' },
      select: {
        mileage: true,
        liters: true,
        date: true,
      },
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

    const lastRefuel = await this.prisma.refuel.findFirst({
      where: { vehicleId: id },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    // Current mileage = max between refuels and maintenance records
    const maintenanceRecords = await this.prisma.maintenanceRecord.findMany({
      where: { vehicleId: id },
      select: { mileage: true },
    });

    const allMileages = [
      ...refuels.map((r) => r.mileage),
      ...maintenanceRecords.map((r) => r.mileage),
    ];
    const currentMileage = allMileages.length > 0 ? Math.max(...allMileages) : 0;

    return {
      ...vehicle,
      stats: {
        totalRefuels: stats._count,
        totalSpent: stats._sum.totalPrice || 0,
        totalLiters: stats._sum.liters || 0,
        totalDistance,
        averageConsumption,
        lastRefuelDate: lastRefuel?.date || null,
        currentMileage,
      },
    };
  }
}
