import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateInsuranceDto } from './dto';

@Injectable()
export class InsuranceService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
  ) {}

  async findAll(vehicleId: string, userId: string) {
    await this.vehiclesService.findOne(vehicleId, userId);
    return this.prisma.insuranceRecord.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
    });
  }

  async create(vehicleId: string, userId: string, dto: CreateInsuranceDto) {
    await this.vehiclesService.findOne(vehicleId, userId);
    return this.prisma.insuranceRecord.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        vehicleId,
      },
    });
  }

  async update(id: string, userId: string, dto: Partial<CreateInsuranceDto>) {
    const record = await this.prisma.insuranceRecord.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    });
    if (!record) throw new NotFoundException('Insurance record not found');
    if (record.vehicle.userId !== userId) throw new ForbiddenException('Access denied');
    const data: any = { ...dto };
    if (dto.date) data.date = new Date(dto.date);
    return this.prisma.insuranceRecord.update({ where: { id }, data });
  }

  async delete(id: string, userId: string) {
    const record = await this.prisma.insuranceRecord.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    });
    if (!record) throw new NotFoundException('Insurance record not found');
    if (record.vehicle.userId !== userId) throw new ForbiddenException('Access denied');
    await this.prisma.insuranceRecord.delete({ where: { id } });
    return { message: 'Insurance record deleted successfully' };
  }
}
