# 生产环境部署指南

本指南提供在生产环境中部署 VPN 一键部署平台的详细说明。

## 📋 目录

- [使用 PM2 部署后端](#使用-pm2-部署后端)
- [使用 Nginx 部署前端](#使用-nginx-部署前端)
- [配置 HTTPS](#配置-https)
- [安全加固](#安全加固)
- [监控和日志](#监控和日志)
- [备份策略](#备份策略)

---

## 使用 PM2 部署后端

### 1. 安装 PM2

```bash
npm install -g pm2
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
nano .env
```

设置以下关键配置：

```env
NODE_ENV=production
PORT=3001

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=vpn_user
DB_PASSWORD=your_secure_db_password
DB_DATABASE=vpn_deploy

# JWT 密钥（生成安全密钥）
JWT_SECRET=your-generated-jwt-secret-min-64-chars
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# 加密密钥（生成安全密钥）
ENCRYPTION_KEY=your-generated-32-byte-hex-key

# CORS 白名单
CORS_ALLOWED_ORIGINS=https://your-domain.com

# 日志级别
LOG_LEVEL=warn
```

### 3. 构建应用

```bash
cd backend
npm run build
```

### 4. 启动 PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 5. 验证运行状态

```bash
pm2 status
pm2 logs vpn-backend
```

---

## 使用 Nginx 部署前端

### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. 构建前端

```bash
cd frontend
npm run build
```

### 3. 部署静态文件

```bash
sudo mkdir -p /var/www/vpn-platform
sudo cp -r dist/* /var/www/vpn-platform/
sudo chown -R www-data:www-data /var/www/vpn-platform
```

### 4. 配置 Nginx

复制项目根目录的 `nginx.conf` 到 Nginx 配置目录：

```bash
sudo cp nginx.conf /etc/nginx/sites-available/vpn-platform
sudo ln -s /etc/nginx/sites-available/vpn-platform /etc/nginx/sites-enabled/
```

编辑配置文件，替换 `your-domain.com` 为你的实际域名：

```bash
sudo nano /etc/nginx/sites-available/vpn-platform
```

### 5. 测试并重启 Nginx

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 配置 HTTPS

### 使用 Let's Encrypt (免费)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

Certbot 会自动更新 Nginx 配置以使用 HTTPS。

---

## 安全加固

### 1. 配置防火墙

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

### 2. 生成安全密钥

```bash
# 生成 JWT Secret (64 字节)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 生成加密密钥 (32 字节)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 数据库安全

```bash
# 创建专用数据库用户
mysql -u root -p
```

```sql
CREATE USER 'vpn_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON vpn_deploy.* TO 'vpn_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. 禁用 root SSH 登录

```bash
sudo nano /etc/ssh/sshd_config
```

设置：
```
PermitRootLogin no
PasswordAuthentication no
```

---

## 监控和日志

### 1. PM2 监控

```bash
# 实时监控
pm2 monit

# 查看日志
pm2 logs vpn-backend

# 查看详细信息
pm2 show vpn-backend
```

### 2. Nginx 日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/access.log

# 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 3. 应用日志

```bash
# 后端日志
tail -f backend/logs/*.log

# 使用 journalctl (如果使用 systemd)
sudo journalctl -u vpn-backend -f
```

### 4. 设置 Logrotate

创建 `/etc/logrotate.d/vpn-platform`：

```
/var/www/vpn-platform/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reload vpn-backend
    endscript
}
```

---

## 备份策略

### 1. 数据库备份

创建备份脚本 `/backup/backup-db.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -u vpn_user -p'password' vpn_deploy | gzip > $BACKUP_DIR/vpn_deploy_$DATE.sql.gz

# 保留最近 7 天的备份
find $BACKUP_DIR -name "vpn_deploy_*.sql.gz" -mtime +7 -delete
```

添加到 crontab：

```bash
crontab -e
```

每天凌晨 2 点备份：

```
0 2 * * * /backup/backup-db.sh
```

### 2. 文件备份

```bash
# 备份配置文件
tar -czf /backup/config_$(date +%Y%m%d).tar.gz backend/.env frontend/.env

# 备份前端构建
tar -czf /backup/frontend_$(date +%Y%m%d).tar.gz /var/www/vpn-platform
```

---

## 性能优化

### 1. 启用 PM2 集群模式

`ecosystem.config.js` 已配置为在生产环境使用集群模式，自动利用所有 CPU 核心。

### 2. Nginx 缓存

在 `nginx.conf` 中已配置：
- 静态资源缓存（1 年）
- Gzip 压缩
- HTTP/2 支持

### 3. 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_status ON deployments(status);
CREATE INDEX idx_region ON deployments(region);
CREATE INDEX idx_created_at ON deployments(created_at);
```

---

## 故障排查

### 后端无法启动

```bash
# 检查日志
pm2 logs vpn-backend --lines 100

# 检查端口占用
sudo netstat -tlnp | grep 3001

# 检查数据库连接
mysql -u vpn_user -p -h localhost vpn_deploy
```

### 前端 404 错误

```bash
# 检查 Nginx 配置
sudo nginx -t

# 检查文件权限
ls -la /var/www/vpn-platform

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### WebSocket 连接失败

检查 Nginx 配置中的 `/socket.io/` location 块是否正确配置。

---

## 更新部署

### 后端更新

```bash
cd backend
git pull
npm install
npm run build
pm2 restart vpn-backend
```

### 前端更新

```bash
cd frontend
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/vpn-platform/
```

---

## 支持

如有问题，请：
- 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 提交 [GitHub Issues](https://github.com/beigang-123/vpn-deployment-platform/issues)
