# Database Initialization Guide

## 📁 Database Files

```
backend/database/
├── init.sql              # Database initialization script
├── migrations/           # TypeORM migration files (optional)
└── README.md            # This file
```

## 🚀 Quick Start

### Method 1: Using SQL Script (Recommended for Production)

#### Step 1: Create Database

```bash
# Login to MySQL
mysql -u root -p

# Or from command line
mysql -u root -p < backend/database/init.sql
```

#### Step 2: Verify

```sql
-- Check database
SHOW DATABASES;

-- Use database
USE vpn_deploy;

-- Check tables
SHOW TABLES;

-- View table structure
DESC deployments;

-- Check data
SELECT COUNT(*) FROM deployments;
```

### Method 2: Using TypeORM Auto-Sync (Development Only)

The application has `synchronize: true` in development mode, which will automatically create tables based on entities.

**⚠️ Warning**: Do NOT use auto-sync in production!

```env
# backend/.env
NODE_ENV=development
DB_SYNCHRONIZE=true  # Only for development!
```

### Method 3: Using TypeORM Migrations (Recommended for Production)

#### Step 1: Install TypeORM CLI globally

```bash
npm install -g typeorm
```

#### Step 2: Generate Migration

```bash
cd backend
npm run migration:generate -- -n MigrationName
```

#### Step 3: Run Migration

```bash
npm run migration:run
```

#### Step 4: Revert Migration (if needed)

```bash
npm run migration:revert
```

---

## 📊 Database Schema

### Table: `deployments`

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar(36) | Primary Key (UUID) |
| `serverIp` | varchar(255) | Server IP address |
| `sshPort` | int | SSH port (default: 22) |
| `username` | varchar(100) | SSH username |
| `password` | text | Encrypted SSH password |
| `privateKey` | text | Encrypted SSH private key |
| `vpnType` | enum | VPN type (v2ray, xray, etc.) |
| `status` | enum | Deployment status |
| `configJson` | json | VPN configuration |
| `region` | varchar(100) | Server region |
| `nodeName` | varchar(100) | Custom node name |
| `systemMetrics` | json | System monitoring data |
| `bandwidthMetrics` | json | Bandwidth usage data |
| `onlineUsers` | int | Online user count |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update time |

### Status Values

- `pending` - Waiting to deploy
- `deploying` - Deployment in progress
- `running` - Service is running
- `stopped` - Service is stopped
- `starting` - Service is starting
- `restarting` - Service is restarting
- `error` - Error occurred
- `completed` - Deployment completed (legacy)
- `failed` - Deployment failed (legacy)

---

## 🔧 Configuration

### Environment Variables

```env
# backend/.env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=vpn_deploy
```

### TypeORM Configuration

```typescript
// backend/src/app.module.ts
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'mysql',
    host: configService.get('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: [Deployment],
    synchronize: configService.get('NODE_ENV') !== 'production', // ⚠️ Only for dev
    dropSchema: false, // Set to true to drop all tables on start
    logging: true, // Log SQL queries
  }),
}),
```

---

## 🛠 Maintenance

### Backup Database

```bash
# Backup
mysqldump -u root -p vpn_deploy > backup_$(date +%Y%m%d).sql

# Restore
mysql -u root -p vpn_deploy < backup_20250221.sql
```

### Clean Old Error Deployments

```sql
-- Delete error records older than 30 days
CALL sp_clean_old_errors(30);
```

### Update Health Check

```sql
-- Update deployment health status
CALL sp_update_health_check(
  'uuid-here',
  'running',
  50
);
```

---

## 🔒 Security Best Practices

1. **Never commit sensitive data**
   - Use `.env.example` for templates
   - Add real `.env` to `.gitignore`

2. **Use strong passwords**
   - Minimum 12 characters
   - Mix of letters, numbers, symbols

3. **Encrypt sensitive fields**
   - SSH passwords should be encrypted
   - Private keys should be encrypted

4. **Regular backups**
   - Schedule daily backups
   - Store backups securely

5. **Limit database access**
   - Create dedicated database user
   - Grant minimum required permissions

---

## 📝 Example Queries

### Get Active Deployments

```sql
SELECT * FROM v_active_deployments;
```

### Get Deployment Statistics

```sql
SELECT * FROM v_deployment_stats;
```

### Find Deployments by Region

```sql
SELECT * FROM deployments
WHERE region = 'CN'
ORDER BY createdAt DESC;
```

### Count Deployments by Status

```sql
SELECT status, COUNT(*) as count
FROM deployments
GROUP BY status;
```

### Search by IP or Node Name

```sql
SELECT * FROM deployments
WHERE serverIp LIKE '%192.168.%'
   OR nodeName LIKE '%test%';
```

---

## 🐛 Troubleshooting

### Error: Database connection failed

**Solution**:
1. Check MySQL service is running
2. Verify credentials in `.env`
3. Check database exists: `SHOW DATABASES;`

### Error: Table doesn't exist

**Solution**:
1. Run init.sql script
2. Or enable auto-sync temporarily
3. Check database name in `.env`

### Error: Access denied for user

**Solution**:
1. Verify username and password
2. Grant permissions:
   ```sql
   GRANT ALL PRIVILEGES ON vpn_deploy.* TO 'your_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

---

## 📚 Additional Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [TypeORM Documentation](https://typeorm.io/)
- [NestJS TypeORM Integration](https://docs.nestjs.com/techniques/database)

---

## 📮 Support

For issues or questions:
- GitHub Issues: https://github.com/beigang-123/vpn-deployment-platform/issues
- Documentation: See main README.md
