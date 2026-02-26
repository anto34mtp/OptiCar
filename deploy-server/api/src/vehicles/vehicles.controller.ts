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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.vehiclesService.findAll(userId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehiclesService.findOne(id, userId);
  }

  @Get(':id/stats')
  async getVehicleWithStats(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehiclesService.getVehicleWithStats(id, userId);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(userId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, userId, dto);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehiclesService.delete(id, userId);
  }
}
