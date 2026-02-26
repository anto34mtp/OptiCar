import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateMaintenanceRuleDto, UpdateMaintenanceRuleDto, CreateMaintenanceRecordDto } from './dto';

const DEFAULT_RULES: { category: string; partType: string; intervalKm: number | null; intervalMonths: number | null }[] = [
  { category: 'MOTEUR', partType: 'VIDANGE', intervalKm: 15000, intervalMonths: 12 },
  { category: 'MOTEUR', partType: 'FILTRE_AIR', intervalKm: 30000, intervalMonths: 24 },
  { category: 'MOTEUR', partType: 'FILTRE_CARBURANT', intervalKm: 60000, intervalMonths: 48 },
  { category: 'MOTEUR', partType: 'BOUGIES', intervalKm: 60000, intervalMonths: 48 },
  { category: 'CLIMATISATION', partType: 'FILTRE_HABITACLE', intervalKm: 15000, intervalMonths: 12 },
  { category: 'DISTRIBUTION', partType: 'KIT_DISTRIBUTION', intervalKm: 120000, intervalMonths: 60 },
  { category: 'DISTRIBUTION', partType: 'POMPE_EAU', intervalKm: 120000, intervalMonths: 60 },
  { category: 'DISTRIBUTION', partType: 'COURROIE_ACCESSOIRES', intervalKm: 60000, intervalMonths: 48 },
  { category: 'MOTEUR', partType: 'LIQUIDE_REFROIDISSEMENT', intervalKm: 60000, intervalMonths: 48 },
  { category: 'FREINAGE', partType: 'PLAQUETTES_AV', intervalKm: 30000, intervalMonths: 24 },
  { category: 'FREINAGE', partType: 'PLAQUETTES_AR', intervalKm: 50000, intervalMonths: 36 },
  { category: 'FREINAGE', partType: 'DISQUES_AV', intervalKm: 60000, intervalMonths: 48 },
  { category: 'FREINAGE', partType: 'DISQUES_AR', intervalKm: 80000, intervalMonths: 60 },
  { category: 'FREINAGE', partType: 'LIQUIDE_FREIN', intervalKm: 60000, intervalMonths: 24 },
  { category: 'LIAISON_SOL', partType: 'PNEUS_AV', intervalKm: 30000, intervalMonths: 36 },
  { category: 'LIAISON_SOL', partType: 'PNEUS_AR', intervalKm: 40000, intervalMonths: 48 },
  { category: 'LIAISON_SOL', partType: 'BATTERIE', intervalKm: null, intervalMonths: 48 },
  { category: 'ADMINISTRATIF', partType: 'CONTROLE_TECHNIQUE', intervalKm: null, intervalMonths: 24 },
];

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
  ) {}

  // ─── Rules ───

  async findAllRules(vehicleId: string, userId: string) {
    await this.vehiclesService.findOne(vehicleId, userId);
    return this.prisma.maintenanceRule.findMany({
      where: { vehicleId },
      orderBy: { category: 'asc' },
    });
  }

  async createRule(vehicleId: string, userId: string, dto: CreateMaintenanceRuleDto) {
    await this.vehiclesService.findOne(vehicleId, userId);
    return this.prisma.maintenanceRule.create({
      data: { ...dto, vehicleId },
    });
  }

  async createRules(vehicleId: string, userId: string, dtos: CreateMaintenanceRuleDto[]) {
    await this.vehiclesService.findOne(vehicleId, userId);
    return this.prisma.maintenanceRule.createMany({
      data: dtos.map((dto) => ({ ...dto, vehicleId })),
    });
  }

  async updateRule(id: string, userId: string, dto: UpdateMaintenanceRuleDto) {
    const rule = await this.prisma.maintenanceRule.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    if (rule.vehicle.userId !== userId) throw new ForbiddenException('Access denied');
    return this.prisma.maintenanceRule.update({ where: { id }, data: dto });
  }

  async deleteRule(id: string, userId: string) {
    const rule = await this.prisma.maintenanceRule.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    if (rule.vehicle.userId !== userId) throw new ForbiddenException('Access denied');
    await this.prisma.maintenanceRule.delete({ where: { id } });
    return { message: 'Rule deleted successfully' };
  }

  async initDefaults(vehicleId: string, userId: string) {
    await this.vehiclesService.findOne(vehicleId, userId);
    const existing = await this.prisma.maintenanceRule.findMany({ where: { vehicleId } });
    const existingTypes = new Set(existing.map((r) => r.partType));
    const toCreate = DEFAULT_RULES.filter((r) => !existingTypes.has(r.partType));
    if (toCreate.length > 0) {
      await this.prisma.maintenanceRule.createMany({
        data: toCreate.map((r) => ({ ...r, vehicleId })),
      });
    }
    return this.prisma.maintenanceRule.findMany({
      where: { vehicleId },
      orderBy: { category: 'asc' },
    });
  }

  // ─── Records ───

  async findAllRecords(vehicleId: string, userId: string) {
    await this.vehiclesService.findOne(vehicleId, userId);
    return this.prisma.maintenanceRecord.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
    });
  }

  async createRecord(vehicleId: string, userId: string, dto: CreateMaintenanceRecordDto) {
    await this.vehiclesService.findOne(vehicleId, userId);
    return this.prisma.maintenanceRecord.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        vehicleId,
      },
    });
  }

  async updateRecord(id: string, userId: string, dto: Partial<CreateMaintenanceRecordDto>) {
    const record = await this.prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    });
    if (!record) throw new NotFoundException('Record not found');
    if (record.vehicle.userId !== userId) throw new ForbiddenException('Access denied');
    const data: any = { ...dto };
    if (dto.date) data.date = new Date(dto.date);
    return this.prisma.maintenanceRecord.update({ where: { id }, data });
  }

  async deleteRecord(id: string, userId: string) {
    const record = await this.prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    });
    if (!record) throw new NotFoundException('Record not found');
    if (record.vehicle.userId !== userId) throw new ForbiddenException('Access denied');
    await this.prisma.maintenanceRecord.delete({ where: { id } });
    return { message: 'Record deleted successfully' };
  }

  // ─── Status & Predictions ───

  async getStatus(vehicleId: string, userId: string) {
    await this.vehiclesService.findOne(vehicleId, userId);

    const [rules, records, refuels] = await Promise.all([
      this.prisma.maintenanceRule.findMany({ where: { vehicleId } }),
      this.prisma.maintenanceRecord.findMany({ where: { vehicleId }, orderBy: { date: 'desc' } }),
      this.prisma.refuel.findMany({ where: { vehicleId }, orderBy: { date: 'asc' } }),
    ]);

    const avgKmPerYear = this.calculateAvgKmPerYear(refuels, records);
    const currentMileage = this.getCurrentMileage(refuels, records);

    return rules.map((rule) => {
      const lastRecord = records.find((r) => r.partType === rule.partType);

      // If no history, treat as if never done: use full current mileage as km since last
      const kmSinceLast = lastRecord ? currentMileage - lastRecord.mileage : currentMileage;
      const monthsSinceLast = lastRecord
        ? this.monthsBetween(lastRecord.date, new Date())
        : null;

      let wearPercent: number | null = null;
      if (rule.intervalKm) {
        wearPercent = Math.min(100, Math.round((kmSinceLast / rule.intervalKm) * 100));
      } else if (rule.intervalMonths && monthsSinceLast !== null) {
        wearPercent = Math.min(100, Math.round((monthsSinceLast / rule.intervalMonths) * 100));
      }

      // Combine both km and months wear, take the worst
      if (rule.intervalKm && rule.intervalMonths && monthsSinceLast !== null) {
        const kmWear = Math.round((kmSinceLast / rule.intervalKm) * 100);
        const monthWear = Math.round((monthsSinceLast / rule.intervalMonths) * 100);
        wearPercent = Math.min(100, Math.max(kmWear, monthWear));
      }

      // If no history and no mileage data, show 100% (never done)
      if (!lastRecord && currentMileage === 0 && rule.intervalKm) {
        wearPercent = 100;
      }

      const nextEstimated = this.estimateNextMaintenance(
        rule, lastRecord, avgKmPerYear, currentMileage,
      );

      return {
        ruleId: rule.id,
        category: rule.category,
        partType: rule.partType,
        intervalKm: rule.intervalKm,
        intervalMonths: rule.intervalMonths,
        lastDate: lastRecord?.date || null,
        lastMileage: lastRecord?.mileage || null,
        kmSinceLast,
        monthsSinceLast,
        wearPercent,
        nextEstimatedDate: nextEstimated,
        status: wearPercent === null ? 'unknown' : wearPercent >= 90 ? 'critical' : wearPercent >= 70 ? 'warning' : 'ok',
      };
    });
  }

  async getPredictions(vehicleId: string, userId: string) {
    const status = await this.getStatus(vehicleId, userId);
    const records = await this.prisma.maintenanceRecord.findMany({ where: { vehicleId } });

    const timeline = status
      .filter((s) => s.nextEstimatedDate)
      .map((s) => {
        const avgPrice = this.getAvgPrice(records, s.partType);
        return {
          partType: s.partType,
          category: s.category,
          estimatedDate: s.nextEstimatedDate,
          estimatedPrice: avgPrice,
          wearPercent: s.wearPercent,
          status: s.status,
        };
      })
      .sort((a, b) => new Date(a.estimatedDate!).getTime() - new Date(b.estimatedDate!).getTime());

    // 6-month financial estimate
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const upcoming = timeline.filter(
      (t) => t.estimatedDate && new Date(t.estimatedDate) <= sixMonthsFromNow,
    );
    const estimatedTotal = upcoming.reduce((sum, t) => sum + (t.estimatedPrice || 0), 0);

    return {
      timeline,
      sixMonthEstimate: {
        items: upcoming,
        total: Math.round(estimatedTotal * 100) / 100,
      },
    };
  }

  async getCosts(vehicleId: string, userId: string) {
    await this.vehiclesService.findOne(vehicleId, userId);
    const records = await this.prisma.maintenanceRecord.findMany({
      where: { vehicleId },
      orderBy: { date: 'asc' },
    });

    const costsByYear: Record<number, number> = {};
    for (const record of records) {
      const year = new Date(record.date).getFullYear();
      costsByYear[year] = (costsByYear[year] || 0) + (record.price || 0);
    }

    return Object.entries(costsByYear)
      .map(([year, total]) => ({ year: parseInt(year), total: Math.round(total * 100) / 100 }))
      .sort((a, b) => a.year - b.year);
  }

  // ─── Helpers ───

  private calculateAvgKmPerYear(
    refuels: { date: Date; mileage: number }[],
    records: { date: Date; mileage: number }[],
  ): number {
    const allEntries = [
      ...refuels.map((r) => ({ date: r.date, mileage: r.mileage })),
      ...records.map((r) => ({ date: r.date, mileage: r.mileage })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (allEntries.length < 2) return 15000; // default

    const first = allEntries[0];
    const last = allEntries[allEntries.length - 1];
    const daysDiff = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) return 15000;

    const kmDiff = last.mileage - first.mileage;
    return Math.round((kmDiff / daysDiff) * 365);
  }

  private getCurrentMileage(
    refuels: { mileage: number }[],
    records: { mileage: number }[],
  ): number {
    const allMileages = [
      ...refuels.map((r) => r.mileage),
      ...records.map((r) => r.mileage),
    ];
    return allMileages.length > 0 ? Math.max(...allMileages) : 0;
  }

  private monthsBetween(d1: Date, d2: Date): number {
    const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    return Math.abs(months);
  }

  private estimateNextMaintenance(
    rule: { intervalKm: number | null; intervalMonths: number | null },
    lastRecord: { date: Date; mileage: number } | undefined | null,
    avgKmPerYear: number,
    currentMileage: number,
  ): string | null {
    if (!lastRecord) return null;

    const candidates: Date[] = [];

    if (rule.intervalMonths) {
      const dateBasedNext = new Date(lastRecord.date);
      dateBasedNext.setMonth(dateBasedNext.getMonth() + rule.intervalMonths);
      candidates.push(dateBasedNext);
    }

    if (rule.intervalKm && avgKmPerYear > 0) {
      const kmRemaining = rule.intervalKm - (currentMileage - lastRecord.mileage);
      const daysUntil = (kmRemaining / avgKmPerYear) * 365;
      const kmBasedNext = new Date();
      kmBasedNext.setDate(kmBasedNext.getDate() + Math.max(0, daysUntil));
      candidates.push(kmBasedNext);
    }

    if (candidates.length === 0) return null;

    // Take the earliest (most conservative)
    const earliest = candidates.reduce((a, b) => (a < b ? a : b));
    return earliest.toISOString();
  }

  private getAvgPrice(records: { partType: string; price: number | null }[], partType: string): number | null {
    const relevant = records.filter((r) => r.partType === partType && r.price);
    if (relevant.length === 0) return null;
    return Math.round((relevant.reduce((sum, r) => sum + r.price!, 0) / relevant.length) * 100) / 100;
  }
}
