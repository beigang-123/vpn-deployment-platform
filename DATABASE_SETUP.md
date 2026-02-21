# 🗄️ Database Setup Guide

## Quick Setup (5 minutes)

### Option 1: Automatic Setup (Recommended)

**Prerequisites**: MySQL installed and running

```bash
# 1. Create database using SQL script
mysql -u root -p < backend/database/init.sql

# 2. Configure environment
cd backend
cp .env.example .env

# 3. Edit .env with your database credentials
# DB_PASSWORD=your_mysql_password

# 4. Start application
npm run start:dev
```

That's it! The database will be automatically initialized.

---

### Option 2: Manual Setup

#### Step 1: Create Database

```sql
-- Login to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE vpn_deploy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional, for better security)
CREATE USER 'vpn_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON vpn_deploy.* TO 'vpn_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

#### Step 2: Import Schema

```bash
mysql -u root -p vpn_deploy < backend/database/init.sql
```

#### Step 3: Verify

```bash
mysql -u root -p -e "USE vpn_deploy; SHOW TABLES;"
```

You should see:
```
+-------------------------+
| Tables_in_vpn_deploy    |
+-------------------------+
| deployments             |
+-------------------------+
```

---

## Environment Configuration

Update `backend/.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password_here
DB_DATABASE=vpn_deploy
```

**⚠️ Important**: For production, create a dedicated database user with limited permissions.

---

## Verification

### Test Connection

```bash
# From backend directory
cd backend
npm run start:dev
```

You should see:
```
[Nest] xxxxx  - Application is running on: http://localhost:3001
[Typeorm] CONNECTED TO DATABASE: mysql
```

### Check Tables

```bash
mysql -u root -p vpn_deploy -e "DESC deployments;"
```

---

## Production Database User (Optional but Recommended)

For better security in production:

```sql
-- Create dedicated user
CREATE USER 'vpn_prod'@'localhost' IDENTIFIED BY 'strong_secure_password';

-- Grant limited permissions
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX
ON vpn_deploy.*
TO 'vpn_prod'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
```

Then update `.env`:
```env
DB_USERNAME=vpn_prod
DB_PASSWORD=strong_secure_password
```

---

## Backup & Restore

### Backup

```bash
# Quick backup
mysqldump -u root -p vpn_deploy > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
mysqldump -u root -p vpn_deploy | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore

```bash
# From SQL file
mysql -u root -p vpn_deploy < backup_20250221_150000.sql

# From compressed backup
gunzip < backup_20250221_150000.sql.gz | mysql -u root -p vpn_deploy
```

---

## Troubleshooting

### Problem: Can't connect to database

**Checklist**:
1. ✅ MySQL service is running
   ```bash
   # Windows
   sc query MySQL

   # Linux/Mac
   systemctl status mysql
   ```

2. ✅ Credentials are correct in `.env`

3. ✅ Database exists
   ```bash
   mysql -u root -p -e "SHOW DATABASES;"
   ```

4. ✅ Port is correct (default: 3306)
   ```bash
   netstat -an | grep 3306
   ```

### Problem: Tables not created

**Solution**: TypeORM has `synchronize: true` in development mode, which auto-creates tables. Make sure:
- `.env` has `NODE_ENV=development`
- Or manually run `init.sql`

### Problem: Character encoding issues

**Solution**: Ensure database uses utf8mb4:
```sql
ALTER DATABASE vpn_deploy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Next Steps

1. ✅ Database initialized
2. ✅ Backend configured
3. ✅ Start the application

See main [README.md](README.md) for full setup instructions.

---

## 📚 Advanced Topics

### Using TypeORM Migrations

For production environments, use migrations instead of auto-sync:

```bash
# 1. Disable auto-sync in .env
NODE_ENV=production

# 2. Generate migration
npm run typeorm migration:generate -- -n InitialSchema

# 3. Run migration
npm run typeorm migration:run

# 4. Revert if needed
npm run typeorm migration:revert
```

### Database Performance Tuning

Add to `my.cnf` (MySQL config):

```ini
[mysqld]
# InnoDB Settings
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2

# Connection Settings
max_connections = 200
connect_timeout = 10
wait_timeout = 600
```

---

**Need help?** See [backend/database/README.md](backend/database/README.md) for detailed documentation.
