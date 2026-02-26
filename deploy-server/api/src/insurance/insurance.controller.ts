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
import { InsuranceService } from './insurance.service';
import { CreateInsuranceDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class InsuranceController {
  constructor(private insuranceService: InsuranceService) {}

  @Get('vehicles/:vehicleId/insurance')
  async findAll(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.insuranceService.findAll(vehicleId, userId);
  }

  @Post('vehicles/:vehicleId/insurance')
  async create(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInsuranceDto,
  ) {
    return this.insuranceService.create(vehicleId, userId, dto);
  }

  @Patch('insurance/:id')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateInsuranceDto>,
  ) {
    return this.insuranceService.update(id, userId, dto);
  }

  @Delete('insurance/:id')
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.insuranceService.delete(id, userId);
  }
}
