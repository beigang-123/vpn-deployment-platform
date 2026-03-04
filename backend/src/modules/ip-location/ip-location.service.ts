import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { API_ENDPOINTS, DEPLOYMENT_TIMEOUTS, CACHE_TTL } from '../../constants/deployment.constants';
import { RegionInfo, IpApiResponse, IpapiCoResponse, IpApiIoResponse } from '../../interfaces/parsed-config.interface';
import { CacheService } from '../cache/cache.service';

/**
 * IP Location Service
 * Retrieves geographical location information for IP addresses
 * with multiple API fallback support and caching
 */
@Injectable()
export class IpLocationService {
  private readonly logger = new Logger(IpLocationService.name);

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {}

  /**
   * Get server region (location) by IP address
   * Uses multiple APIs with fallback for reliability
   * Results are cached for 24 hours
   */
  async getServerRegion(ip: string): Promise<string | null> {
    try {
      // Check cache first (使用新的缓存服务)
      const cacheKey = `ip:location:${ip}`;
      const cached = await this.cacheService.get<string>(cacheKey);

      if (cached) {
        this.logger.log(`使用缓存 region for ${ip}: ${cached}`);
        return cached;
      }

      // Try multiple IP geolocation APIs
      const apis = [
        // API 1: ip-api.com (may be restricted in China)
        {
          url: `${API_ENDPOINTS.IP_API}${ip}?lang=zh-CN`,
          parser: this.parseIpApiResponse.bind(this),
        },
        // API 2: ipapi.co (backup)
        {
          url: `${API_ENDPOINTS.IPAPI_CO}${ip}/json/`,
          parser: this.parseIpapiCoResponse.bind(this),
        },
        // API 3: ip-api.io (backup)
        {
          url: `${API_ENDPOINTS.IP_API_IO}?ip=${ip}`,
          parser: this.parseIpApiIoResponse.bind(this),
        },
      ];

      let lastError: Error = null;
      let region: string | null = null;

      for (const api of apis) {
        try {
          this.logger.log(`尝试使用 API 获取地区: ${api.url.split('/')[2]}`);

          const response = await axios.get<any>(api.url, {
            timeout: DEPLOYMENT_TIMEOUTS.REGION_API,
            validateStatus: (status) => status < 500, // Accept 4xx errors
          } as any);

          const result = api.parser(response.data);
          if (result) {
            region = result;
            break; // Success, stop trying other APIs
          }
        } catch (apiError) {
          this.logger.warn(`API ${api.url.split('/')[2]} 失败: ${apiError.message}`);
          lastError = apiError;
          continue; // Try next API
        }
      }

      if (region) {
        // Cache the result for 24 hours
        await this.cacheService.set(cacheKey, region, CACHE_TTL.IP_LOCATION);
        this.logger.log(`成功获取地区信息: ${region}`);
        return region;
      }

      // All APIs failed
      if (lastError) {
        this.logger.warn(`所有 IP 地理位置 API 都失败: ${lastError.message}`);
      }
      return null;
    } catch (error) {
      this.logger.warn(`获取服务器地区时发生严重错误: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse ip-api.com response
   */
  private parseIpApiResponse(data: IpApiResponse): string | null {
    if (data.status !== 'success') {
      return null;
    }

    const { country, city, isp } = data;

    // Combine region information
    if (city && country) {
      return `${country} ${city}`;
    } else if (country) {
      return country;
    } else if (isp) {
      return isp;
    }

    return null;
  }

  /**
   * Parse ipapi.co response
   */
  private parseIpapiCoResponse(data: IpapiCoResponse): string | null {
    const { country_name, city, org } = data;

    // Combine region information
    if (city && country_name) {
      return `${country_name} ${city}`;
    } else if (country_name) {
      return country_name;
    } else if (org) {
      return org;
    }

    return null;
  }

  /**
   * Parse ip-api.io response
   */
  private parseIpApiIoResponse(data: IpApiIoResponse): string | null {
    const { country_name, city, organization } = data;

    // Combine region information
    if (city && country_name) {
      return `${country_name} ${city}`;
    } else if (country_name) {
      return country_name;
    } else if (organization) {
      return organization;
    }

    return null;
  }

  /**
   * Clear all IP location cache
   */
  async clearCache(): Promise<void> {
    await this.cacheService.delPattern('ip:location:*');
    this.logger.log('IP location cache cleared');
  }
}
