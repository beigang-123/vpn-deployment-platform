import { Controller, Post, Get, Delete, Put, Body, Param, Query, HttpException, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { DeployService } from './deploy.service';
import { StartDeployDto } from './dto';
import { Deployment, DeploymentStatus, VpnType } from '../../entities/deployment.entity';

@Controller('api/deploy')
export class DeployController {
  constructor(private deployService: DeployService) {}

  @Post('start')
  async startDeploy(@Body() dto: StartDeployDto): Promise<Deployment> {
    return this.deployService.startDeploy(
      dto,
      () => {},
      () => {},
      () => {},
    );
  }

  @Get('status/:id')
  async getStatus(@Param('id') id: string): Promise<Deployment> {
    const deployment = await this.deployService.getStatus(id);
    if (!deployment) {
      throw new HttpException('Deployment not found', HttpStatus.NOT_FOUND);
    }
    return deployment;
  }

  @Get('list')
  async getList(): Promise<Deployment[]> {
    return this.deployService.getAllDeployments();
  }

  @Get('search')
  async searchDeployments(
    @Query('status') status?: DeploymentStatus,
    @Query('vpnType') vpnType?: VpnType,
    @Query('region') region?: string,
    @Query('search') search?: string,
  ): Promise<Deployment[]> {
    return this.deployService.searchDeployments({ status, vpnType, region, search });
  }

  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<Deployment> {
    const deployment = await this.deployService.getStatus(id);
    if (!deployment) {
      throw new HttpException('Deployment not found', HttpStatus.NOT_FOUND);
    }
    return deployment;
  }

  @Post('test/:id')
  async testConnection(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.deployService.testServerConnection(id);
  }

  @Post('health/:id')
  async healthCheck(@Param('id') id: string): Promise<any> {
    return this.deployService.healthCheck(id);
  }

  @Post('start/:id')
  async startService(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.deployService.startService(id);
  }

  @Post('stop/:id')
  async stopService(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.deployService.stopService(id);
  }

  @Post('restart/:id')
  async restartService(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.deployService.restartService(id);
  }

  @Get('logs/:id')
  async getLogs(@Param('id') id: string, @Query('lines') lines?: number): Promise<string> {
    return this.deployService.getServiceLogs(id, lines || 100);
  }

  @Post('command/:id')
  async executeCommand(@Param('id') id: string, @Body('command') command: string): Promise<any> {
    return this.deployService.executeCommand(id, command);
  }

  @Post('open-port/:id')
  async openPort(@Param('id') id: string): Promise<{ success: boolean; message: string; output?: string }> {
    return this.deployService.openFirewallPort(id);
  }

  @Put(':id')
  async updateDeployment(
    @Param('id') id: string,
    @Body()
    updates: {
      region?: string;
      nodeName?: string;
      expiryDate?: Date;
      autoRestart?: boolean;
      tags?: string;
    },
  ): Promise<Deployment> {
    return this.deployService.updateDeployment(id, updates);
  }

  @Delete(':id')
  async deleteDeployment(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.deployService.deleteDeployment(id);
  }

  @Post('batch/restart')
  async batchRestart(@Body('ids') ids: string[]): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    return this.deployService.batchRestart(ids);
  }

  @Delete('batch')
  async batchDelete(@Body('ids') ids: string[]): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    return this.deployService.batchDelete(ids);
  }

  @Post('batch/health')
  async batchHealthCheck(@Body('ids') ids: string[]): Promise<Map<string, any>> {
    return this.deployService.batchHealthCheck(ids);
  }

  @Get('clash/:id')
  async getClashConfig(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const clashConfig = await this.deployService.convertToClash(id);
      res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="clash-${id}.yaml"`);
      res.send(clashConfig);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
