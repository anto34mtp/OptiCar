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
import { RefuelsService } from './refuels.service';
import { CreateRefuelDto, UpdateRefuelDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class RefuelsController {
  constructor(private refuelsService: RefuelsService) {}

  @Get('vehicles/:vehicleId/refuels')
  async findAllByVehicle(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.refuelsService.findAllByVehicle(vehicleId, userId);
  }

  @Post('vehicles/:vehicleId/refuels')
  async create(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRefuelDto,
  ) {
    return this.refuelsService.create(vehicleId, userId, dto);
  }

  @Get('refuels/:id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.refuelsService.findOne(id, userId);
  }

  @Patch('refuels/:id')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRefuelDto,
  ) {
    return this.refuelsService.update(id, userId, dto);
  }

  @Delete('refuels/:id')
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.refuelsService.delete(id, userId);
  }
}
