import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { StartDeployDto } from '../modules/deploy/dto';
import { DeployService } from '../modules/deploy/deploy.service';

// Get allowed origins from environment
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private subscribedClients = new Set<string>();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(private deployService: DeployService) {}

  onModuleInit() {
    // Start periodic health check when module initializes
    this.startPeriodicHealthCheck();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('deploy:start')
  async handleDeployStart(client: Socket, payload: StartDeployDto) {
    this.logger.log(`Starting deployment for server: ${payload.serverIp}`);

    try {
      const deployment = await this.deployService.startDeploy(
        payload,
        (log) => {
          // Real-time log
          client.emit('deploy:log', {
            deploymentId: deployment.id,
            log,
            timestamp: new Date().toISOString(),
          });
        },
        (config) => {
          // Complete
          client.emit('deploy:complete', {
            deploymentId: deployment.id,
            config,
            timestamp: new Date().toISOString(),
          });
        },
        (error) => {
          // Error
          client.emit('deploy:error', {
            deploymentId: deployment.id,
            error,
            timestamp: new Date().toISOString(),
          });
        },
      );

      // Emit initial start event
      client.emit('deploy:start', {
        deploymentId: deployment.id,
        message: 'Deployment started',
      });
    } catch (error) {
      this.logger.error(`Deployment error: ${error.message}`);
      client.emit('deploy:error', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('monitor:subscribe')
  handleMonitorSubscribe(client: Socket) {
    this.subscribedClients.add(client.id);
    this.logger.log(`Client ${client.id} subscribed to monitoring`);
    client.emit('monitor:subscribed', {
      message: 'Subscribed to monitoring updates',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('monitor:unsubscribe')
  handleMonitorUnsubscribe(client: Socket) {
    this.subscribedClients.delete(client.id);
    this.logger.log(`Client ${client.id} unsubscribed from monitoring`);
    client.emit('monitor:unsubscribed', {
      message: 'Unsubscribed from monitoring updates',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('deployment:subscribe')
  handleDeploymentSubscribe(client: Socket, deploymentId: string) {
    client.join(`deployment:${deploymentId}`);
    this.logger.log(`Client ${client.id} subscribed to deployment ${deploymentId}`);
  }

  @SubscribeMessage('deployment:unsubscribe')
  handleDeploymentUnsubscribe(client: Socket, deploymentId: string) {
    client.leave(`deployment:${deploymentId}`);
    this.logger.log(`Client ${client.id} unsubscribed from deployment ${deploymentId}`);
  }

  /**
   * Broadcast deployment update to all subscribed clients
   */
  broadcastDeploymentUpdate(deploymentId: string, data: any) {
    this.server.to(`deployment:${deploymentId}`).emit('deployment:updated', {
      deploymentId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast health check result
   */
  broadcastHealthCheck(deploymentId: string, result: any) {
    this.server.to(`deployment:${deploymentId}`).emit('deployment:health', {
      deploymentId,
      result,
      timestamp: new Date().toISOString(),
    });

    // Also send to global monitoring subscribers
    this.subscribedClients.forEach((clientId) => {
      this.server.to(clientId).emit('monitor:health', {
        deploymentId,
        result,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Broadcast system metrics
   */
  broadcastMetrics(deploymentId: string, metrics: any) {
    this.server.to(`deployment:${deploymentId}`).emit('deployment:metrics', {
      deploymentId,
      metrics,
      timestamp: new Date().toISOString(),
    });

    // Also send to global monitoring subscribers
    this.subscribedClients.forEach((clientId) => {
      this.server.to(clientId).emit('monitor:metrics', {
        deploymentId,
        metrics,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Start periodic health check for all deployments
   * OPTIMIZED: Uses parallel processing with Promise.all()
   */
  private startPeriodicHealthCheck() {
    // Run health check every 60 seconds
    this.healthCheckInterval = setInterval(async () => {
      if (this.subscribedClients.size === 0) {
        return; // No clients subscribed, skip health check
      }

      try {
        const deployments = await this.deployService.getAllDeployments();

        // Filter deployments that need health check
        const activeDeployments = deployments.filter(
          (d) => d.status === 'running' || d.status === 'completed'
        );

        if (activeDeployments.length === 0) {
          return;
        }

        // Process health checks in parallel (fixes N+1 query issue)
        const healthCheckPromises = activeDeployments.map(async (deployment) => {
          try {
            const result = await this.deployService.healthCheck(deployment.id);
            this.broadcastHealthCheck(deployment.id, result);

            if (result.metrics) {
              this.broadcastMetrics(deployment.id, result.metrics);
            }
          } catch (error) {
            this.logger.error(`Health check failed for ${deployment.id}: ${error.message}`);
          }
        });

        // Execute all health checks in parallel
        await Promise.allSettled(healthCheckPromises);

        this.logger.debug(`Completed ${activeDeployments.length} parallel health checks`);
      } catch (error) {
        this.logger.error(`Periodic health check error: ${error.message}`);
      }
    }, 60000); // 60 seconds

    this.logger.log('Periodic health check started (interval: 60s, parallel mode)');
  }

  /**
   * Clean up on module destroy
   */
  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.logger.log('Periodic health check stopped');
    }
  }
}
