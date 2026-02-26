import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateRefuelDto, UpdateRefuelDto } from './dto';

@Injectable()
export class RefuelsService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
  ) {}

  async findAllByVehicle(vehicleId: string, userId: string) {
    // Verify vehicle ownership
    await this.vehiclesService.findOne(vehicleId, userId);

    const refuels = await this.prisma.refuel.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
    });

    return this.addConsumptionToRefuels(refuels);
  }

  async findOne(id: string, userId: string) {
    const refuel = await this.prisma.refuel.findUnique({
      where: { id },
      include: {
        vehicle: {
          select: {
            id: true,
            brand: true,
            model: true,
            userId: true,
          },
        },
      },
    });

    if (!refuel) {
      throw new NotFoundException('Refuel not found');
    }

    if (refuel.vehicle.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Get previous refuel for consumption calculation
    const previousRefuel = await this.prisma.refuel.findFirst({
      where: {
        vehicleId: refuel.vehicleId,
        mileage: { lt: refuel.mileage },
      },
      orderBy: { mileage: 'desc' },
    });

    let consumption = null;
    let distanceSinceLast = null;

    if (previousRefuel) {
      distanceSinceLast = refuel.mileage - previousRefuel.mileage;
      if (distanceSinceLast > 0) {
        consumption = (refuel.liters / distanceSinceLast) * 100;
      }
    }

    return {
      ...refuel,
      consumption,
      distanceSinceLast,
    };
  }

  async create(vehicleId: string, userId: string, dto: CreateRefuelDto) {
    // Verify vehicle ownership
    await this.vehiclesService.findOne(vehicleId, userId);

    return this.prisma.refuel.create({
      data: {
        ...dto,
        vehicleId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateRefuelDto) {
    const refuel = await this.prisma.refuel.findUnique({
      where: { id },
      include: {
        vehicle: {
          select: { userId: true },
        },
      },
    });

    if (!refuel) {
      throw new NotFoundException('Refuel not found');
    }

    if (refuel.vehicle.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.refuel.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const refuel = await this.prisma.refuel.findUnique({
      where: { id },
      include: {
        vehicle: {
          select: { userId: true },
        },
      },
    });

    if (!refuel) {
      throw new NotFoundException('Refuel not found');
    }

    if (refuel.vehicle.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.refuel.delete({
      where: { id },
    });

    return { message: 'Refuel deleted successfully' };
  }

  private async addConsumptionToRefuels(
    refuels: {
      id: string;
      date: Date;
      mileage: number;
      pricePerLiter: number;
      liters: number;
      totalPrice: number;
      sourceType: string;
      vehicleId: string;
      createdAt: Date;
    }[],
  ) {
    // Sort by mileage to calculate consumption
    const sortedByMileage = [...refuels].sort((a, b) => a.mileage - b.mileage);

    const consumptionMap = new Map<string, { consumption: number | null; distanceSinceLast: number | null }>();

    for (let i = 0; i < sortedByMileage.length; i++) {
      const current = sortedByMileage[i];
      const previous = sortedByMileage[i - 1];

      if (previous) {
        const distance = current.mileage - previous.mileage;
        if (distance > 0) {
          consumptionMap.set(current.id, {
            consumption: (current.liters / distance) * 100,
            distanceSinceLast: distance,
          });
        } else {
          consumptionMap.set(current.id, { consumption: null, distanceSinceLast: null });
        }
      } else {
        consumptionMap.set(current.id, { consumption: null, distanceSinceLast: null });
      }
    }

    return refuels.map((refuel) => ({
      ...refuel,
      ...consumptionMap.get(refuel.id),
    }));
  }
}
