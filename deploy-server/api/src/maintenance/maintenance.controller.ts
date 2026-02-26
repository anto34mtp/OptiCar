import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { OcrService } from '../ocr/ocr.service';
import { CreateMaintenanceRuleDto, UpdateMaintenanceRuleDto, CreateMaintenanceRecordDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(
    private maintenanceService: MaintenanceService,
    private ocrService: OcrService,
  ) {}

  // ─── Rules ───

  @Get('vehicles/:vehicleId/maintenance/rules')
  async findAllRules(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.findAllRules(vehicleId, userId);
  }

  @Post('vehicles/:vehicleId/maintenance/rules')
  async createRules(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMaintenanceRuleDto | CreateMaintenanceRuleDto[],
  ) {
    if (Array.isArray(dto)) {
      return this.maintenanceService.createRules(vehicleId, userId, dto);
    }
    return this.maintenanceService.createRule(vehicleId, userId, dto);
  }

  @Post('vehicles/:vehicleId/maintenance/rules/defaults')
  async initDefaults(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.initDefaults(vehicleId, userId);
  }

  @Patch('maintenance/rules/:id')
  async updateRule(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMaintenanceRuleDto,
  ) {
    return this.maintenanceService.updateRule(id, userId, dto);
  }

  @Delete('maintenance/rules/:id')
  async deleteRule(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.deleteRule(id, userId);
  }

  // ─── Records ───

  @Get('vehicles/:vehicleId/maintenance/records')
  async findAllRecords(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.findAllRecords(vehicleId, userId);
  }

  @Post('vehicles/:vehicleId/maintenance/records')
  async createRecord(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMaintenanceRecordDto,
  ) {
    return this.maintenanceService.createRecord(vehicleId, userId, dto);
  }

  @Patch('maintenance/records/:id')
  async updateRecord(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateMaintenanceRecordDto>,
  ) {
    return this.maintenanceService.updateRecord(id, userId, dto);
  }

  @Delete('maintenance/records/:id')
  async deleteRecord(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.deleteRecord(id, userId);
  }

  // ─── Status / Predictions / Costs ───

  @Get('vehicles/:vehicleId/maintenance/status')
  async getStatus(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.getStatus(vehicleId, userId);
  }

  @Get('vehicles/:vehicleId/maintenance/predictions')
  async getPredictions(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.getPredictions(vehicleId, userId);
  }

  @Get('vehicles/:vehicleId/maintenance/costs')
  async getCosts(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.getCosts(vehicleId, userId);
  }

  // ─── OCR Scan ───

  @Post('vehicles/:vehicleId/maintenance/scan')
  async scanInvoice(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { image: string },
  ) {
    // Verify vehicle ownership
    await this.maintenanceService.findAllRules(vehicleId, userId);
    return this.ocrService.analyzeMaintenanceInvoice(body.image);
  }
}
