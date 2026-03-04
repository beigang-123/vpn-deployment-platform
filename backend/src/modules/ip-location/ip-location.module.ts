import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IpLocationService } from './ip-location.service';

@Module({
  imports: [ConfigModule],
  providers: [IpLocationService],
  exports: [IpLocationService],
})
export class IpLocationModule {}
