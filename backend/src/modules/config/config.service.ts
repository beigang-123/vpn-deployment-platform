import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment } from '../../entities/deployment.entity';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(Deployment)
    private deploymentRepository: Repository<Deployment>,
  ) {}

  async getDeploymentConfig(id: string): Promise<any> {
    const deployment = await this.deploymentRepository.findOne({ where: { id } });
    if (!deployment || deployment.status !== 'completed') {
      return null;
    }
    return deployment.configJson;
  }
}
