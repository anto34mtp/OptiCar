import { Module } from '@nestjs/common';
import { RefuelsService } from './refuels.service';
import { RefuelsController } from './refuels.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [VehiclesModule],
  providers: [RefuelsService],
  controllers: [RefuelsController],
  exports: [RefuelsService],
})
export class RefuelsModule {}
