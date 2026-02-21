#!/bin/bash

###############################################################
# V2Ray 一键安装脚本
# 支持: Ubuntu, Debian, CentOS
# 协议: VMess
###############################################################

# 转换 Windows 换行符
sed -i 's/\r$//' "$0" 2>/dev/null || true

# 不在错误时立即退出，手动处理错误
# set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[信息]${NC} $1"
}

log_error() {
    echo -e "${RED}[错误]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi

    log_info "检测到操作系统: $OS $OS_VERSION"
}

# 安装依赖
install_dependencies() {
    log_info "正在安装依赖..."

    if [[ "$OS" =~ ^(ubuntu|debian)$ ]]; then
        apt-get update -qq
        apt-get install -y curl wget unzip > /dev/null 2>&1
    elif [[ "$OS" =~ ^(centos|rhel|fedora)$ ]]; then
        yum install -y curl wget unzip > /dev/null 2>&1
    else
        log_error "不支持的操作系统: $OS"
        exit 1
    fi

    log_info "依赖安装完成"
}

# 生成随机 UUID
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen
    else
        cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "$(date +%s%N)-$(shuf -i 1000-9999 -n 1)"
    fi
}

# 生成随机端口
generate_port() {
    # 使用更通用的方法生成随机端口
    echo $((10000 + ($RANDOM % 50000)))
}

# 安装 V2Ray
install_v2ray() {
    log_info "正在安装 V2Ray..."

    # 获取最新版本
    LATEST_VERSION=$(curl -s https://api.github.com/repos/v2fly/v2ray-core/releases/latest | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/' | sed 's/v//')

    if [ -z "$LATEST_VERSION" ]; then
        log_warn "无法获取最新版本，使用默认版本"
        LATEST_VERSION="v5.13.0"
    fi

    log_info "准备安装 V2Ray 版本: $LATEST_VERSION"

    # 下载并安装
    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            ARCH="64"
            ;;
        aarch64)
            ARCH="arm64-v8a"
            ;;
        armv7l)
            ARCH="arm32-v7a"
            ;;
        *)
            log_error "不支持的架构: $ARCH"
            exit 1
            ;;
    esac

    DOWNLOAD_URL="https://github.com/v2fly/v2ray-core/releases/download/v${LATEST_VERSION}/v2ray-linux-${ARCH}.zip"

    log_info "正在下载 V2Ray..."
    cd /tmp
    wget -q --show-progress "$DOWNLOAD_URL" -O v2ray.zip || {
        log_error "下载失败，尝试使用备用安装方式"
        # 使用官方安装脚本
        bash <(curl -L https://raw.githubusercontent.com/v2fly/fhs-install-v2ray/master/install-release.sh)
        return 0
    }

    log_info "正在解压并安装..."
    unzip -o v2ray.zip -d /usr/local/bin/ > /dev/null 2>&1
    chmod +x /usr/local/bin/v2ray /usr/local/bin/v2ctl

    # 创建系统服务文件
    cat > /etc/systemd/system/v2ray.service <<'EOF'
[Unit]
Description=V2Ray Service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/v2ray -config /etc/v2ray/config.json
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload

    log_info "V2Ray 安装完成"
}

# 配置 V2Ray
configure_v2ray() {
    log_info "正在配置 V2Ray..."

    # 生成 UUID 和端口
    UUID=$(generate_uuid)
    PORT=$(generate_port)

    log_info "生成的 UUID: $UUID"
    log_info "生成的端口: $PORT"

    # 创建配置目录
    mkdir -p /etc/v2ray

    # 创建 VMess 配置
    cat > /etc/v2ray/config.json <<EOF
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": $PORT,
      "protocol": "vmess",
      "settings": {
        "clients": [
          {
            "id": "$UUID",
            "alterId": 0
          }
        ]
      },
      "streamSettings": {
        "network": "tcp"
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {}
    }
  ]
}
EOF

    log_info "V2Ray 配置已创建"
}

# 配置防火墙
configure_firewall() {
    log_info "正在配置防火墙..."

    if command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=$PORT/tcp > /dev/null 2>&1 || true
        firewall-cmd --reload > /dev/null 2>&1 || true
    elif command -v ufw &> /dev/null; then
        ufw allow $PORT/tcp > /dev/null 2>&1 || true
    else
        log_warn "未检测到防火墙，跳过配置"
    fi
}

# 启动 V2Ray
start_v2ray() {
    log_info "正在启动 V2Ray 服务..."

    # 检查 systemctl 是否可用
    if command -v systemctl &> /dev/null; then
        systemctl daemon-reload > /dev/null 2>&1 || true
        systemctl enable v2ray > /dev/null 2>&1 || true
        systemctl restart v2ray || true

        sleep 2

        if systemctl is-active --quiet v2ray; then
            log_info "V2Ray 服务启动成功"
        else
            log_warn "systemctl 启动失败，尝试直接启动..."
            nohup /usr/local/bin/v2ray -config /etc/v2ray/config.json > /dev/null 2>&1 &
            sleep 1
            log_info "V2Ray 已启动（后台模式）"
        fi
    else
        log_warn "systemctl 不可用，使用后台启动"
        nohup /usr/local/bin/v2ray -config /etc/v2ray/config.json > /dev/null 2>&1 &
        sleep 1
        log_info "V2Ray 已启动（后台模式）"
    fi
}

# 获取服务器 IP
get_server_ip() {
    SERVER_IP=$(curl -s4 ip.sb 2>/dev/null || curl -s4 ifconfig.me 2>/dev/null || curl -s4 icanhazip.com 2>/dev/null)
    log_info "服务器 IP: $SERVER_IP"
}

# 生成客户端配置
generate_client_config() {
    log_info "正在生成客户端配置..."

    # VMess 链接格式
    CONFIG=$(cat <<EOF
{
  "v": "2",
  "ps": "$SERVER_IP",
  "add": "$SERVER_IP",
  "port": "$PORT",
  "id": "$UUID",
  "aid": "0",
  "net": "tcp",
  "type": "none",
  "host": "",
  "path": "",
  "tls": "none"
}
EOF
)

    # Base64 编码
    VMess_LINK=$(echo -n "$CONFIG" | base64 -w 0 2>/dev/null || echo -n "$CONFIG" | base64)

    echo ""
    echo "=========================================="
    echo "        V2Ray 安装完成！"
    echo "=========================================="
    echo ""
    echo "服务器地址: $SERVER_IP"
    echo "服务器端口: $PORT"
    echo "用户ID (UUID): $UUID"
    echo "协议: VMess"
    echo ""
    echo "VMess 分享链接:"
    echo "vmess://$VMess_LINK"
    echo ""
    echo "=========================================="
}

# 主安装流程
main() {
    log_info "开始安装 V2Ray..."

    # 检查必要的命令
    for cmd in curl wget unzip; do
        if ! command -v $cmd &> /dev/null; then
            log_error "缺少必要命令: $cmd，请先安装"
            exit 1
        fi
    done

    detect_os
    install_dependencies
    install_v2ray
    configure_v2ray
    configure_firewall
    get_server_ip
    start_v2ray
    generate_client_config

    log_info "安装完成！"

    # 明确返回成功状态
    exit 0
}

main
exit 0
