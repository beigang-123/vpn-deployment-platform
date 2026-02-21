import { Module } from '@nestjs/common';
import { DeployModule } from '../modules/deploy/deploy.module';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [DeployModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class GatewayModule {}
