# VPN Deployment Platform - Troubleshooting Guide

## Table of Contents

1. [Security Verification](#security-verification)
2. [Common Issues](#common-issues)
3. [Testing Instructions](#testing-instructions)
4. [Performance Tuning](#performance-tuning)
5. [Network Connection Issues](#network-connection-issues)

---

## Security Verification

### How to verify security fixes are working

#### 1. Test Authentication (Unauthorized Access)

**Expected**: API should return `401 Unauthorized` without JWT token.

```bash
# Try accessing protected endpoint without token
curl http://localhost:3001/api/deploy/list

# Expected response:
# {"statusCode":401,"message":"Unauthorized"}
```

#### 2. Test Registration and Login

```bash
# Register a new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123"}'

# Expected response with accessToken and refreshToken

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123"}'

# Use the accessToken to access protected endpoints
curl http://localhost:3001/api/deploy/list \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 3. Verify Encryption is Working

Check that SSH credentials are encrypted in the database:

```sql
-- In MySQL
SELECT id, server_ip, password, private_key FROM deployments LIMIT 1;

-- Expected: password and private_key should be in format: iv:authTag:encryptedData
-- Each part should be 64 hex characters (32 bytes)
```

**Example encrypted format:**
```
password: "1a2b3c4d5e6f7890abcdef1234567890:1a2b3c4d5e6f7890abcdef1234567890:abc123..."
```

#### 4. Verify CORS Configuration

Test that CORS blocks requests from unauthorized origins:

```javascript
// In browser console on http://evil-site.com
fetch('http://localhost:3001/api/deploy/list')
  .then(r => r.json())
  .then(data => console.log(data));

// Expected: Should fail with CORS error
```

---

## Common Issues

### Issue 1: "User does not exist" after registration

**Cause**: Database synchronization issue or User table not created.

**Solution**:
```bash
# Drop and recreate database
mysql -u root -p -e "DROP DATABASE IF EXISTS vpn_deploy; CREATE DATABASE vpn_deploy;"

# Restart the backend (TypeORM will sync entities)
cd backend
npm run start:dev
```

### Issue 2: JWT token expires immediately

**Cause**: `JWT_SECRET` not set or too short.

**Solution**:
```bash
# Generate a secure 64-character key
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env file
JWT_SECRET=<generated-key>
```

### Issue 3: Decryption fails for existing deployments

**Cause**: Old data was not encrypted.

**Solution**: The encryption service handles this automatically by returning the original text if decryption fails.

### Issue 4: "CORS policy blocked" error

**Cause**: Frontend URL not in `CORS_ALLOWED_ORIGINS`.

**Solution**:
```bash
# In .env file
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend-domain.com
```

### Issue 5: Rate limiting triggered during development

**Cause**: Too many requests in 1 minute.

**Solution** (temporarily increase limit in development):
```bash
# In .env file
THROTTLER_LIMIT=1000
THROTTLER_TTL=60000
```

---

## Testing Instructions

### Run Unit Tests

```bash
cd backend

# Run all tests
npm run test

# Run with coverage
npm run test:cov

# Run specific test file
npm run test deploy.service.spec.ts
```

### Run E2E Tests

```bash
cd backend

# Run E2E tests
npm run test:e2e
```

### Manual Testing Checklist

- [ ] Register new user via `/auth/register`
- [ ] Login via `/auth/login` and receive JWT token
- [ ] Access protected endpoint with valid token
- [ ] Access protected endpoint without token → 401 error
- [ ] Create deployment and verify credentials are encrypted in DB
- [ ] Verify CORS blocks requests from unauthorized origins
- [ ] Test rate limiting by making 101+ requests in 1 minute
- [ ] Deploy VPN to test server
- [ ] Verify health check works
- [ ] Test config download (VMess/VLESS/Clash)

---

## Performance Tuning

### Database Performance

1. **Enable query logging** to identify slow queries:
   ```typescript
   // backend/src/main.ts
   TypeOrmModule.forRoot({
     // ...
     logging: true,
   })
   ```

2. **Check indexes are being used**:
   ```sql
   EXPLAIN SELECT * FROM deployments WHERE status = 'running' AND region = 'US';
   ```

### Caching Performance

1. **Enable Redis caching** (optional but recommended):
   ```bash
   # Install Redis
   # Windows: Download from https://redis.io/download
   # Linux: sudo apt-get install redis-server

   # Add to .env
   REDIS_URL=redis://localhost:6379
   ```

2. **Monitor cache hit rate**:
   ```typescript
   // Backend logs will show cache hits/misses
   ```

### SSH Connection Pool

The connection pool is configured with:
- Min connections: 2
- Max connections: 10

Adjust in `ssh.service.ts` if needed.

---

## Development Tips

### Enable Debug Logging

```bash
# In .env file
LOG_LEVEL=debug
```

### View Database Schema

```bash
# Enable TypeORM synchronization to see schema changes
NODE_ENV=development
```

### Reset Database

```bash
# Backend
mysql -u root -p -e "DROP DATABASE vpn_deploy; CREATE DATABASE vpn_deploy;"
```

---

## Production Deployment Checklist

- [ ] Set strong `JWT_SECRET` (64+ chars)
- [ ] Set strong `ENCRYPTION_KEY` (32 bytes hex)
- [ ] Configure `CORS_ALLOWED_ORIGINS` to production frontend domain only
- [ ] Set `NODE_ENV=production`
- [ ] Disable TypeORM sync (use migrations instead)
- [ ] Use HTTPS with SSL certificate
- [ ] Configure firewall to only allow necessary ports
- [ ] Set up database backups
- [ ] Configure process manager (PM2/systemd)
- [ ] Set up monitoring and alerts

---

## Useful Commands

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Test database connection
mysql -h localhost -u root -p vpn_deploy

# View TypeORM generated SQL
LOG_LEVEL=debug npm run start:dev

# Check MySQL process list
mysql -e "SHOW PROCESSLIST;"
```

---

## Network Connection Issues

### Issue: ECONNRESET Errors

`Error: read ECONNRESET` indicates the remote server unexpectedly closed the connection.

#### Solutions Implemented:

1. **IP Location API Fallback** - Multiple APIs with automatic retry
2. **SSH Connection Optimization** - Increased timeouts and keepalive
3. **Axios Retry Mechanism** - Automatic retry for failed requests

#### Additional Solutions:

1. **Proxy Configuration for China**:
   ```bash
   # In .env file
   HTTP_PROXY=http://127.0.0.1:7890
   HTTPS_PROXY=http://127.0.0.1:7890
   ```

2. **SSH Server Configuration**:
   ```bash
   # Add to server's /etc/ssh/sshd_config
   ClientAliveInterval 60
   ClientAliveCountMax 3
   ```

3. **Subconverter Service**:
   ```bash
   # Use online service if local subconverter unavailable
   SUBCONVERTER_URL=https://api.dler.io/sub
   ```

---

## Getting Help

If issues persist:

1. Check backend logs: `npm run start:dev` output
2. Check browser console for frontend errors
3. Review this troubleshooting guide
4. Open GitHub issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

