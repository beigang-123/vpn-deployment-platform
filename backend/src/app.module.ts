import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DeployModule } from './modules/deploy/deploy.module';
import { ConfigModule as AppConfig } from './modules/config/config.module';
import { GatewayModule } from './gateway/gateway.module';
import { Deployment } from './entities/deployment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get('DB_USERNAME', 'root'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_DATABASE', 'vpn_deploy'),
        entities: [Deployment],
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
    }),
    DeployModule,
    AppConfig,
    GatewayModule,
  ],
})
export class AppModule {}
