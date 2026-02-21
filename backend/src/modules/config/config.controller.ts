import { Controller, Get, Param, HttpException, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from './config.service';

@Controller('api/config')
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get('download/:id')
  async downloadConfig(@Param('id') id: string): Promise<any> {
    const config = await this.configService.getDeploymentConfig(id);
    if (!config) {
      throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
    }
    return config;
  }

  @Get('clash/:id')
  async downloadClashConfig(@Param('id') id: string, @Res() res: Response) {
    const config = await this.configService.getDeploymentConfig(id);
    if (!config) {
      throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
    }

    // 生成 Clash YAML 配置
    const clashConfig = `mixed-port: 7890
allow-lan: true
mode: Rule
log-level: info

proxies:
  - name: "Xray-VLESS"
    type: vless
    server: ${config.address}
    port: ${config.port}
    uuid: ${config.uuid}
    udp: true
    network: tcp
    tls: false

proxy-groups:
  - name: "PROXY"
    type: select
    proxies:
      - Xray-VLESS

rules:
  - GEOIP,CN,DIRECT
  - MATCH,PROXY
`;

    res.set('Content-Type', 'text/yaml; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="clash-${config.address}.yaml"`);
    res.send(clashConfig);
  }

  @Get('url/:id')
  getConfigUrl(@Param('id') id: string) {
    // 返回配置 URL 信息
    return {
      clashUrl: `http://localhost:3001/api/config/clash/${id}`,
      jsonUrl: `http://localhost:3001/api/config/download/${id}`,
    };
  }
}
