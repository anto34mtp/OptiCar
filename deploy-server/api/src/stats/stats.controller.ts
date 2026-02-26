import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('summary')
  async getGlobalStats(@CurrentUser('id') userId: string) {
    return this.statsService.getGlobalStats(userId);
  }

  @Get('vehicle/:vehicleId')
  async getVehicleStats(
    @CurrentUser('id') userId: string,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.statsService.getVehicleStats(userId, vehicleId);
  }

  @Get('consumption')
  async getConsumptionHistory(
    @CurrentUser('id') userId: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getConsumptionHistory(userId, {
      vehicleId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('expenses')
  async getExpensesByPeriod(
    @CurrentUser('id') userId: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getExpensesByPeriod(userId, {
      vehicleId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('fuel-prices')
  async getFuelPriceHistory(
    @CurrentUser('id') userId: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getFuelPriceHistory(userId, {
      vehicleId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('comparison')
  async getVehicleComparison(@CurrentUser('id') userId: string) {
    return this.statsService.getVehicleComparison(userId);
  }

  @Get('total-costs')
  async getTotalCosts(@CurrentUser('id') userId: string) {
    return this.statsService.getTotalCosts(userId);
  }

  @Get('co2')
  async getCo2Stats(@CurrentUser('id') userId: string) {
    return this.statsService.getCo2Stats(userId);
  }
}
