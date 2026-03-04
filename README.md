<div align="center">

# 🚀 VPN One-Click Deployment Platform

# 🚀 VPN 一键部署平台

**一键部署 V2Ray/Xray VPN 服务的全栈 Web 平台**

**A Full-Stack Web Platform for One-Click Deployment of V2Ray/Xray VPN Services**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com)

[English](#english) | [简体中文](#简体中文)

</div>

---

<a name="english"></a>

## 📖 Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## ✨ Features

- 🚀 **One-Click Deployment** - Deploy V2Ray or Xray on your server instantly with just a few clicks
- 📊 **Real-Time Logs** - Monitor deployment progress with live log streaming via WebSocket
- 🔐 **SSH Authentication** - Secure SSH connection with password or private key support
- 📱 **QR Code Support** - Scan QR code with mobile apps for quick configuration import
- 📥 **Config Download** - Download JSON configuration files or copy share links
- 🎨 **Modern UI** - Beautiful, responsive interface built with Vue 3 and Element Plus
- 🌐 **WebSocket** - Real-time communication for deployment status updates
- 💾 **Database Storage** - Persistent storage of deployment history and configurations
- 🔄 **Multi-Protocol Support** - Support for both V2Ray (VMess) and Xray (VLESS)
- 🔧 **Management Dashboard** - Manage and monitor your VPN deployments

## 📸 Screenshots

<!-- Add your screenshots here
### Deployment Wizard
![Deployment Wizard](docs/images/deployment-wizard.png)

### Real-time Logs
![Real-time Logs](docs/images/realtime-logs.png)

### Configuration Download
![Configuration Download](docs/images/config-download.png)
-->

## 🛠 Tech Stack

### Backend
- **[NestJS](https://nestjs.com/)** - A progressive Node.js framework for building efficient and scalable server-side applications
- **[TypeORM](https://typeorm.io/)** - ORM for database operations with TypeScript
- **[MySQL](https://www.mysql.com/)** - Relational database for data persistence
- **[SSH2](https://github.com/mscdex/ssh2)** - SSH2 client for secure server connections
- **[Socket.io](https://socket.io/)** - Real-time bidirectional event-based communication
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Frontend
- **[Vue 3](https://vuejs.org/)** - Progressive JavaScript framework for building UI
- **[Element Plus](https://element-plus.org/)** - Vue 3 UI component library
- **[Pinia](https://pinia.vuejs.org/)** - State management for Vue
- **[Vite](https://vitejs.dev/)** - Next generation frontend tooling
- **[Axios](https://axios-http.com/)** - HTTP client for API requests
- **[Socket.io-client](https://socket.io/)** - WebSocket client for real-time updates
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **MySQL** 8.0 or higher
- **A server** with SSH access (Ubuntu 20.04+, CentOS 7+, or Debian 10+ recommended)

### Option 1: Docker Deployment (Recommended)

#### 1. Clone the repository

```bash
git clone https://github.com/beigang-123/vpn-deployment-platform.git
cd vpn-deployment-platform
```

#### 2. Configure environment

```bash
cp .env.docker.example .env
# Edit .env and set secure passwords
```

**Generate secure keys**:

```bash
# Generate JWT Secret (64 bytes hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Encryption Key (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. Start with Docker Compose

```bash
docker-compose up -d
```

That's it! The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

#### 4. View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

#### 5. Stop services

```bash
docker-compose down
```

### Option 2: Manual Installation

#### 1. Clone the repository

```bash
git clone https://github.com/beigang-123/vpn-deployment-platform.git
cd vpn-deployment-platform
```

#### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

#### 3. Configure Backend Environment

```bash
cp .env.example .env
```

Edit `.env` with your database configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_secure_password_here
DB_DATABASE=vpn_deploy

# CORS Configuration
# Comma-separated list of allowed origins
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# JWT Authentication Configuration
# IMPORTANT: Generate a secure random key for production
# Use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-jwt-secret-key-change-in-production-min-64-chars
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Encryption Configuration
# IMPORTANT: Generate a secure 32-byte hex key for production
# Use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Cache Configuration
CACHE_TTL=3600

# SSH Connection Pool Configuration
SSH_POOL_MIN=2
SSH_POOL_MAX=10

# Security Configuration
# Rate limiting: requests per minute
THROTTLER_TTL=60000
THROTTLER_LIMIT=100

# Logging Configuration
LOG_LEVEL=info
```

#### 4. Initialize Database

**Quick Setup (Recommended)**:

```bash
# Import database schema
mysql -u root -p < backend/database/init.sql
```

Or see [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions including:
- Manual database setup
- Production database user creation
- Backup and restore procedures
- Troubleshooting common issues

The database will be automatically created with:
- ✅ `deployments` table with all required fields
- ✅ Indexes for optimal performance
- ✅ Views for common queries
- ✅ Stored procedures for maintenance

#### 5. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

#### 6. Configure Frontend Environment

```bash
cp .env.example .env
```

The default `frontend/.env` should look like:

```env
# API Base URL
VITE_API_URL=http://localhost:3001/api

# Socket.io Server URL
VITE_SOCKET_URL=http://localhost:3001

# Application Title
VITE_APP_TITLE=VPN 一键部署平台

# Enable Debug Mode (true/false)
VITE_DEBUG=false
```

#### 7. Start Development Servers

**Backend** (in terminal 1):
```bash
cd backend
npm run start:dev
```

**Frontend** (in terminal 2):
```bash
cd frontend
npm run dev
```

#### 8. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 📂 Project Structure

```
vpn-deployment-platform/
├── backend/                      # NestJS Backend Application
│   ├── src/
│   │   ├── modules/
│   │   │   ├── deploy/          # Deployment module
│   │   │   │   ├── deploy.controller.ts
│   │   │   │   ├── deploy.service.ts
│   │   │   │   ├── ssh.service.ts
│   │   │   │   └── dto.ts
│   │   │   └── config/          # Configuration module
│   │   ├── gateway/             # WebSocket gateway
│   │   │   └── socket.gateway.ts
│   │   ├── entities/            # Database entities
│   │   │   └── deployment.entity.ts
│   │   └── main.ts              # Application entry point
│   ├── .env.example             # Environment variables template
│   └── package.json
│
├── frontend/                     # Vue 3 Frontend Application
│   ├── src/
│   │   ├── views/               # Page components
│   │   │   ├── DeployWizard.vue
│   │   │   └── ConfigDownload.vue
│   │   ├── components/          # Reusable components
│   │   │   ├── ServerForm.vue
│   │   │   ├── VpnTypeSelector.vue
│   │   │   └── LogConsole.vue
│   │   ├── services/            # API & WebSocket services
│   │   │   ├── api.ts
│   │   │   ├── socket.ts
│   │   │   └── websocket.ts
│   │   ├── stores/              # Pinia state management
│   │   │   └── deploy.ts
│   │   ├── App.vue
│   │   └── main.ts
│   ├── .env.example             # Environment variables template
│   ├── vite.config.ts
│   └── package.json
│
├── scripts/                      # Shell scripts for VPN installation
│   ├── install-v2ray.sh         # V2Ray installation script
│   └── install-xray.sh          # Xray installation script
│
├── README.md                     # This file
├── LICENSE                       # MIT License
├── CONTRIBUTING.md               # Contributing guidelines
└── SECURITY.md                   # Security policy
```

## 📚 Usage

### Deploy a VPN Server

1. **Enter Server Information**
   - Input your server IP address
   - Provide SSH port (default: 22)
   - Enter username (default: root)
   - Enter password or upload private key

2. **Select VPN Type**
   - **V2Ray (VMess)** - Stable and widely supported
   - **Xray (VLESS)** - Better performance and newer protocol

3. **Start Deployment**
   - Click "Start Deployment" button
   - Monitor real-time installation logs
   - Wait for completion confirmation

4. **Get Configuration**
   - Scan QR code with mobile VPN apps (v2rayN, Shadowrocket, etc.)
   - Download JSON configuration file
   - Copy share link for manual import

## 🔌 API Documentation

### Deployment Endpoints

#### Start Deployment
```http
POST /api/deploy/start
Content-Type: application/json

{
  "host": "123.123.123.123",
  "sshPort": 22,
  "username": "root",
  "password": "your_ssh_password",
  "vpnType": "xray"
}
```

#### Get Deployment Status
```http
GET /api/deploy/status/:id
```

#### Get Deployment List
```http
GET /api/deploy/list
```

#### Delete Deployment
```http
DELETE /api/deploy/:id
```

### Configuration Endpoints

#### Download Configuration
```http
GET /api/config/download/:id
```

### WebSocket Events

#### Client → Server
- `deploy:start` - Start deployment process
- `ping` - Heartbeat for connection monitoring

#### Server → Client
- `deploy:start` - Deployment started
- `deploy:log` - Real-time log message
- `deploy:complete` - Deployment completed successfully
- `deploy:error` - Deployment error occurred
- `pong` - Heartbeat response

## 🔒 Security Considerations

- ✅ **JWT Authentication** - Secure token-based authentication with refresh token support
- ✅ **AES-256-GCM Encryption** - SSH credentials encrypted before database storage
- ✅ **Rate Limiting** - Configurable request throttling (default: 100 req/min)
- ✅ **CORS Protection** - Configurable origin whitelist
- ✅ **Security Headers** - Helmet middleware for secure HTTP headers
- ✅ **Input Validation** - Strong password requirements, IP/port validation
- ✅ **SSH Credentials** - Passwords and private keys encrypted, never logged
- ✅ **In-Memory Only** - Private keys handled in memory, never written to disk
- ⚠️ **Use HTTPS** in production environments
- ⚠️ **Generate Strong Keys** - Use secure JWT_SECRET and ENCRYPTION_KEY in production
- ✅ Regular **security audits** for dependencies

## 🐛 Troubleshooting

### SSH Connection Failed
- ✅ Verify server IP address and SSH port
- ✅ Check firewall rules (allow port 22)
- ✅ Ensure SSH service is running on the server
- ✅ Try using private key authentication instead of password
- ✅ Check if the server allows password authentication

### Deployment Failed
- ✅ Check server has sufficient disk space (> 1GB recommended)
- ✅ Ensure server has internet access
- ✅ Verify system compatibility (Ubuntu 20.04+, CentOS 7+, Debian 10+)
- ✅ Check if ports are available (default: 443)
- ✅ Review real-time logs for specific error messages

### WebSocket Not Connecting
- ✅ Check if backend server is running
- ✅ Verify `VITE_SOCKET_URL` in frontend `.env`
- ✅ Check browser console for error messages
- ✅ Ensure WebSocket is not blocked by firewall/proxy

### VPN Connection Issues
- ✅ Verify the deployed service is running: `systemctl status v2ray` or `systemctl status xray`
- ✅ Check if the VPN port is open in firewall
- ✅ Validate the configuration format
- ✅ Test with different VPN clients

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 🔐 Security

For security policies and vulnerability reporting, please see [SECURITY.md](SECURITY.md).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and authorized testing purposes only. Users are responsible for ensuring they have proper authorization before deploying VPN services on any servers. The authors are not responsible for any misuse of this software.

## 🙏 Acknowledgments

- [V2Ray Project](https://www.v2fly.org/)
- [Xray Project](https://xtls.github.io/)
- [NestJS](https://nestjs.com/)
- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)

## 📮 Contact & Support

- 📧 Email: tk@beigang.xyz
- 🐛 Issues: [GitHub Issues](https://github.com/beigang-123/vpn-deployment-platform/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/beigang-123/vpn-deployment-platform/discussions)

---

<a name="简体中文"></a>

## 📖 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [API 文档](#api-文档)
- [开发指南](#开发指南)
- [贡献指南](#贡献指南)
- [安全政策](#安全政策)
- [许可证](#许可证)

## ✨ 功能特性

- 🚀 **一键部署** - 轻松点击即可在服务器上部署 V2Ray 或 Xray
- 📊 **实时日志** - 通过 WebSocket 实时监控部署进度和日志
- 🔐 **SSH 认证** - 支持密码或私钥的安全 SSH 连接
- 📱 **二维码支持** - 使用移动应用扫描二维码快速导入配置
- 📥 **配置下载** - 下载 JSON 配置文件或复制分享链接
- 🎨 **现代化界面** - 基于 Vue 3 和 Element Plus 构建的精美响应式界面
- 🌐 **WebSocket 通信** - 实时双向事件通信
- 💾 **数据库存储** - 持久化存储部署历史和配置
- 🔄 **多协议支持** - 支持 V2Ray (VMess) 和 Xray (VLESS) 协议
- 🔧 **管理面板** - 管理和监控您的 VPN 部署

## 🛠 技术栈

### 后端技术
- **[NestJS](https://nestjs.com/)** - 用于构建高效可扩展的服务器端应用的渐进式 Node.js 框架
- **[TypeORM](https://typeorm.io/)** - 支持 TypeScript 的 ORM 数据库操作工具
- **[MySQL](https://www.mysql.com/)** - 关系型数据库，用于数据持久化
- **[SSH2](https://github.com/mscdex/ssh2)** - 安全服务器连接的 SSH2 客户端
- **[Socket.io](https://socket.io/)** - 实时双向事件通信
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript

### 前端技术
- **[Vue 3](https://vuejs.org/)** - 渐进式 JavaScript 框架，用于构建用户界面
- **[Element Plus](https://element-plus.org/)** - Vue 3 UI 组件库
- **[Pinia](https://pinia.vuejs.org/)** - Vue 状态管理
- **[Vite](https://vitejs.dev/)** - 下一代前端构建工具
- **[Axios](https://axios-http.com/)** - HTTP 客户端，用于 API 请求
- **[Socket.io-client](https://socket.io/)** - WebSocket 客户端，用于实时更新
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript

## 🚀 快速开始

### 前置要求

- **Node.js** 18 或更高版本
- **MySQL** 8.0 或更高版本
- **具有 SSH 访问权限的服务器**（推荐 Ubuntu 20.04+、CentOS 7+ 或 Debian 10+）

### 方式 1：Docker 部署（推荐）

#### 1. 克隆仓库

```bash
git clone https://github.com/beigang-123/vpn-deployment-platform.git
cd vpn-deployment-platform
```

#### 2. 配置环境

```bash
cp .env.docker.example .env
# 编辑 .env 并设置安全密码
```

**生成安全密钥**：

```bash
# 生成 JWT Secret（64 字节十六进制）
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 生成加密密钥（32 字节十六进制）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. 使用 Docker Compose 启动

```bash
docker-compose up -d
```

完成！应用将在以下地址可用：
- **前端界面**: http://localhost:3000
- **后端 API**: http://localhost:3001

#### 4. 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f frontend
```

#### 5. 停止服务

```bash
docker-compose down
```

### 方式 2：手动安装

#### 1. 克隆仓库

```bash
git clone https://github.com/beigang-123/vpn-deployment-platform.git
cd vpn-deployment-platform
```

#### 2. 安装后端依赖

```bash
cd backend
npm install
```

#### 3. 配置后端环境

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库信息：

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_secure_password_here
DB_DATABASE=vpn_deploy

# CORS 配置
CORS_ORIGIN=*
```

#### 4. 初始化数据库

**快速设置（推荐）**：

```bash
# 导入数据库结构
mysql -u root -p < backend/database/init.sql
```

或查看 [DATABASE_SETUP.md](DATABASE_SETUP.md) 获取详细说明，包括：
- 手动数据库设置
- 生产环境数据库用户创建
- 备份和恢复流程
- 常见问题故障排除

数据库将自动创建：
- ✅ `deployments` 表及所有必需字段
- ✅ 性能优化的索引
- ✅ 常用查询的视图
- ✅ 维护用的存储过程

#### 5. 安装前端依赖

```bash
cd ../frontend
npm install
```

#### 6. 配置前端环境

```bash
cp .env.example .env
```

默认的 `frontend/.env` 配置如下：

```env
VITE_SOCKET_URL=http://localhost:3001
```

#### 7. 启动开发服务器

**后端服务**（在终端 1）：
```bash
cd backend
npm run start:dev
```

**前端服务**（在终端 2）：
```bash
cd frontend
npm run dev
```

#### 8. 访问应用

- **前端界面**: http://localhost:3000
- **后端 API**: http://localhost:3001

## 📂 项目结构

```
vpn-deployment-platform/
├── backend/                      # NestJS 后端应用
│   ├── src/
│   │   ├── modules/
│   │   │   ├── deploy/          # 部署模块
│   │   │   │   ├── deploy.controller.ts
│   │   │   │   ├── deploy.service.ts
│   │   │   │   ├── ssh.service.ts
│   │   │   │   └── dto.ts
│   │   │   └── config/          # 配置模块
│   │   ├── gateway/             # WebSocket 网关
│   │   │   └── socket.gateway.ts
│   │   ├── entities/            # 数据库实体
│   │   │   └── deployment.entity.ts
│   │   └── main.ts              # 应用入口文件
│   ├── .env.example             # 环境变量模板
│   └── package.json
│
├── frontend/                     # Vue 3 前端应用
│   ├── src/
│   │   ├── views/               # 页面组件
│   │   │   ├── DeployWizard.vue
│   │   │   └── ConfigDownload.vue
│   │   ├── components/          # 可复用组件
│   │   │   ├── ServerForm.vue
│   │   │   ├── VpnTypeSelector.vue
│   │   │   └── LogConsole.vue
│   │   ├── services/            # API 和 WebSocket 服务
│   │   │   ├── api.ts
│   │   │   ├── socket.ts
│   │   │   └── websocket.ts
│   │   ├── stores/              # Pinia 状态管理
│   │   │   └── deploy.ts
│   │   ├── App.vue
│   │   └── main.ts
│   ├── .env.example             # 环境变量模板
│   ├── vite.config.ts
│   └── package.json
│
├── scripts/                      # VPN 安装脚本
│   ├── install-v2ray.sh         # V2Ray 安装脚本
│   └── install-xray.sh          # Xray 安装脚本
│
├── README.md                     # 本文件
├── LICENSE                       # MIT 许可证
├── CONTRIBUTING.md               # 贡献指南
└── SECURITY.md                   # 安全政策
```

## 📚 使用指南

### 部署 VPN 服务器

1. **输入服务器信息**
   - 输入服务器 IP 地址
   - 提供 SSH 端口（默认：22）
   - 输入用户名（默认：root）
   - 输入密码或上传私钥

2. **选择 VPN 类型**
   - **V2Ray (VMess)** - 稳定且广泛支持
   - **Xray (VLESS)** - 性能更好且协议更新

3. **开始部署**
   - 点击"开始部署"按钮
   - 监控实时安装日志
   - 等待完成确认

4. **获取配置**
   - 使用移动端 VPN 应用扫描二维码（v2rayN、Shadowrocket 等）
   - 下载 JSON 配置文件
   - 复制分享链接进行手动导入

## 🔌 API 文档

### 部署端点

#### 开始部署
```http
POST /api/deploy/start
Content-Type: application/json

{
  "host": "123.123.123.123",
  "sshPort": 22,
  "username": "root",
  "password": "your_ssh_password",
  "vpnType": "xray"
}
```

#### 获取部署状态
```http
GET /api/deploy/status/:id
```

#### 获取部署列表
```http
GET /api/deploy/list
```

#### 删除部署
```http
DELETE /api/deploy/:id
```

### 配置端点

#### 下载配置
```http
GET /api/config/download/:id
```

### WebSocket 事件

#### 客户端 → 服务器
- `deploy:start` - 开始部署流程
- `ping` - 心跳检测

#### 服务器 → 客户端
- `deploy:start` - 部署已开始
- `deploy:log` - 实时日志消息
- `deploy:complete` - 部署成功完成
- `deploy:error` - 部署发生错误
- `pong` - 心跳响应

## 🔒 安全考虑

- ✅ **JWT 身份验证** - 基于令牌的安全认证，支持刷新令牌
- ✅ **AES-256-GCM 加密** - SSH 凭证在存储前加密
- ✅ **速率限制** - 可配置的请求节流（默认：100 请求/分钟）
- ✅ **CORS 保护** - 可配置的来源白名单
- ✅ **安全头** - Helmet 中间件提供安全的 HTTP 头
- ✅ **输入验证** - 强密码要求、IP/端口验证
- ✅ **SSH 凭证安全** - 密码和私钥加密，永不记录日志
- ✅ **仅内存处理** - 私钥仅在内存中处理，从不写入磁盘
- ⚠️ **生产环境使用 HTTPS**
- ⚠️ **生成强密钥** - 生产环境使用安全的 JWT_SECRET 和 ENCRYPTION_KEY
- ✅ 定期对依赖项进行**安全审计**

## 🐛 故障排查

### SSH 连接失败
- ✅ 验证服务器 IP 地址和 SSH 端口
- ✅ 检查防火墙规则（允许端口 22）
- ✅ 确保服务器上 SSH 服务正在运行
- ✅ 尝试使用私钥认证代替密码
- ✅ 检查服务器是否允许密码认证

### 部署失败
- ✅ 检查服务器是否有足够的磁盘空间（建议 > 1GB）
- ✅ 确保服务器可以访问互联网
- ✅ 验证系统兼容性（Ubuntu 20.04+、CentOS 7+、Debian 10+）
- ✅ 检查端口是否可用（默认：443）
- ✅ 查看实时日志以获取具体错误消息

### WebSocket 无法连接
- ✅ 检查后端服务器是否正在运行
- ✅ 验证前端 `.env` 中的 `VITE_SOCKET_URL`
- ✅ 检查浏览器控制台中的错误消息
- ✅ 确保 WebSocket 未被防火墙/代理阻止

### VPN 连接问题
- ✅ 验证已部署的服务正在运行：`systemctl status v2ray` 或 `systemctl status xray`
- ✅ 检查防火墙中的 VPN 端口是否开放
- ✅ 验证配置格式
- ✅ 使用不同的 VPN 客户端进行测试

## 🤝 贡献指南

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

详细指南请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 🔐 安全政策

有关安全政策和漏洞报告，请参阅 [SECURITY.md](SECURITY.md)。

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## ⚠️ 免责声明

本工具仅供教育和授权测试用途。用户在使用前需确保在服务器上部署 VPN 服务已获得适当授权。作者不对本软件的任何滥用承担责任。

## 🙏 致谢

- [V2Ray 项目](https://www.v2fly.org/)
- [Xray 项目](https://xtls.github.io/)
- [NestJS](https://nestjs.com/)
- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)

## 📮 联系与支持

- 📧 邮箱: tk@beigang.xyz
- 🐛 问题反馈: [GitHub Issues](https://github.com/beigang-123/vpn-deployment-platform/issues)
- 💬 讨论区: [GitHub Discussions](https://github.com/beigang-123/vpn-deployment-platform/discussions)

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**

**⭐ If this project helps you, please give us a star!**

Made with ❤️ by the VPN Deployment Platform Team

</div>
