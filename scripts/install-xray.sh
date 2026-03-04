#!/bin/bash

###############################################################
# Xray 一键安装脚本
# 支持: Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, Alpine, openSUSE
# 协议: VLESS
###############################################################

# 转换 Windows 换行符
sed -i 's/\r$//' "$0" 2>/dev/null || true

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 检测操作系统和包管理器
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        OS_like=$ID_LIKE
    else
        log_error "无法检测操作系统"
        exit 1
    fi

    log_info "检测到操作系统: $OS $OS_VERSION"

    # 检测包管理器
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
    elif command -v pacman &> /dev/null; then
        PKG_MANAGER="pacman"
    elif command -v apk &> /dev/null; then
        PKG_MANAGER="apk"
    elif command -v zypper &> /dev/null; then
        PKG_MANAGER="zypper"
    elif command -v opkg &> /dev/null; then
        PKG_MANAGER="opkg"
    else
        log_error "无法检测包管理器"
        exit 1
    fi

    log_info "检测到包管理器: $PKG_MANAGER"
}

# 安装依赖（通用）
install_dependencies() {
    log_info "正在安装依赖..."

    case $PKG_MANAGER in
        apt)
            # Debian/Ubuntu
            export DEBIAN_FRONTEND=noninteractive
            apt-get update -qq
            apt-get install -y curl wget unzip ca-certificates > /dev/null 2>&1
            ;;
        yum|dnf)
            # RHEL/CentOS/Fedora
            if [ "$PKG_MANAGER" = "dnf" ]; then
                dnf install -y curl wget unzip > /dev/null 2>&1
            else
                yum install -y curl wget unzip > /dev/null 2>&1
            fi
            ;;
        pacman)
            # Arch Linux/Manjaro
            pacman -Sy --noconfirm curl wget unzip ca-certificates > /dev/null 2>&1
            ;;
        apk)
            # Alpine Linux
            apk update > /dev/null 2>&1
            apk add curl wget unzip ca-certificates > /dev/null 2>&1
            ;;
        zypper)
            # openSUSE
            zypper refresh > /dev/null 2>&1
            zypper install -y curl wget unzip ca-certificates > /dev/null 2>&1
            ;;
        opkg)
            # OpenWrt
            opkg update > /dev/null 2>&1
            opkg install curl wget unzip ca-certificates > /dev/null 2>&1
            ;;
        *)
            log_error "不支持的包管理器: $PKG_MANAGER"
            log_info "尝试手动安装依赖..."
            if command -v curl &> /dev/null && command -v wget &> /dev/null && command -v unzip &> /dev/null; then
                log_info "依赖已存在，跳过安装"
            else
                exit 1
            fi
            ;;
    esac

    log_info "依赖安装完成"
}

# 生成随机 UUID
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen
    elif [ -f /proc/sys/kernel/random/uuid ]; then
        cat /proc/sys/kernel/random/uuid
    else
        # 生成一个随机的 UUID
        printf '%04x%04x-%04x-%04x-%04x-%04x%04x%04x\n' \
            $RANDOM $RANDOM $RANDOM $((RANDOM % 8192 + 4096)) $((RANDOM % 16384 + 32768)) \
            $((RANDOM % 65536)) $RANDOM $RANDOM $RANDOM
    fi
}

# 生成随机端口
generate_port() {
    # 如果已经指定了PORT环境变量，直接使用
    if [ -n "$PORT" ] && [ "$PORT" -gt 0 ] 2>/dev/null; then
        echo "$PORT"
        return
    fi
    # 使用更通用的方法生成随机端口
    echo $((1024 + ($RANDOM % 64511)))
}

# 安装 Xray
install_xray() {
    log_info "正在安装 Xray..."

    # 获取最新版本
    LATEST_VERSION=$(curl -s https://api.github.com/repos/XTLS/Xray-core/releases/latest 2>/dev/null | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/' | sed 's/v//')

    if [ -z "$LATEST_VERSION" ]; then
        log_warn "无法获取最新版本，使用默认版本"
        LATEST_VERSION="v1.8.24"
    fi

    log_info "准备安装 Xray 版本: $LATEST_VERSION"

    # 下载并安装
    ARCH=$(uname -m)
    case $ARCH in
        x86_64|amd64)
            ARCH="64"
            ;;
        aarch64|arm64)
            ARCH="arm64-v8a"
            ;;
        armv7l|armv7a)
            ARCH="arm32-v7a"
            ;;
        armv6l)
            ARCH="arm32-v6"
            ;;
        mips64*)
            ARCH="mips64le"
            ;;
        mips*)
            ARCH="mipsle"
            ;;
        *)
            log_error "不支持的架构: $ARCH"
            log_warn "尝试使用通用安装脚本..."
            bash <(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh) 2>/dev/null || {
                log_error "通用安装脚本也失败了"
                exit 1
            }
            return 0
            ;;
    esac

    DOWNLOAD_URL="https://github.com/XTLS/Xray-core/releases/download/v${LATEST_VERSION}/Xray-linux-${ARCH}.zip"

    log_info "正在下载 Xray (架构: $ARCH)..."
    cd /tmp

    # 尝试多种下载方式
    if command -v wget &> /dev/null; then
        wget -q --show-progress "$DOWNLOAD_URL" -O xray.zip || curl -L -o xray.zip "$DOWNLOAD_URL"
    else
        curl -L -o xray.zip "$DOWNLOAD_URL"
    fi

    if [ ! -f xray.zip ]; then
        log_error "下载失败，尝试使用官方安装脚本"
        bash <(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh) 2>/dev/null || {
            log_error "所有安装方式都失败了"
            exit 1
        }
        return 0
    fi

    log_info "正在解压并安装..."

    # 创建安装目录
    mkdir -p /usr/local/bin /usr/local/etc/xray /var/log/xray

    # 解压
    unzip -o xray.zip -d /usr/local/bin/ > /dev/null 2>&1 || {
        log_error "解压失败"
        rm -f xray.zip
        exit 1
    }

    rm -f xray.zip

    # 设置权限
    chmod +x /usr/local/bin/xray 2>/dev/null || true

    # 创建配置目录
    mkdir -p /usr/local/etc/xray

    log_info "Xray 安装完成"
}

# 配置 Xray
configure_xray() {
    log_info "正在配置 Xray..."

    # 生成 UUID 和端口
    UUID=$(generate_uuid)
    PORT=$(generate_port)

    log_info "UUID: $UUID"
    log_info "端口: $PORT"

    # 创建 VLESS 配置
    cat > /usr/local/etc/xray/config.json <<EOF
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": $PORT,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "$UUID",
            "flow": ""
          }
        ],
        "decryption": "none"
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

    log_info "Xray 配置已创建"
}

# 系统优化
optimize_system() {
    log_info "正在优化系统设置..."

    # 增加文件描述符限制
    if [ -f /etc/security/limits.conf ] && ! grep -q "* soft nofile 51200" /etc/security/limits.conf 2>/dev/null; then
        cat >> /etc/security/limits.conf <<EOF
* soft nofile 51200
* hard nofile 51200
EOF
    fi

    # 优化 TCP 设置
    if command -v sysctl &> /dev/null; then
        sysctl -w net.core.default_qdisc=fq > /dev/null 2>&1 || true
        sysctl -w net.ipv4.tcp_congestion_control=bbr > /dev/null 2>&1 || true
        sysctl -w net.ipv4.tcp_fastopen=3 > /dev/null 2>&1 || true
    fi

    # 保存 sysctl 设置
    if [ -f /etc/sysctl.conf ] && ! grep -q "net.core.default_qdisc=fq" /etc/sysctl.conf 2>/dev/null; then
        cat >> /etc/sysctl.conf <<EOF
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
net.ipv4.tcp_fastopen=3
EOF
    fi

    log_info "系统优化完成"
}

# 配置防火墙
configure_firewall() {
    log_info "正在配置防火墙..."

    # firewalld (RHEL/CentOS/Fedora)
    if command -v firewall-cmd &> /dev/null && systemctl is-active firewalld &> /dev/null; then
        firewall-cmd --permanent --add-port=$PORT/tcp 2>/dev/null || true
        firewall-cmd --reload 2>/dev/null || true
        log_info "firewalld 防火墙已配置"
    # ufw (Ubuntu/Debian)
    elif command -v ufw &> /dev/null && systemctl is-active ufw &> /dev/null; then
        ufw allow $PORT/tcp 2>/dev/null || true
        log_info "ufw 防火墙已配置"
    # iptables 直接配置
    elif command -v iptables &> /dev/null; then
        iptables -I INPUT -p tcp --dport $PORT -j ACCEPT 2>/dev/null || true
        # 尝试保存 iptables 规则
        if command -v iptables-save &> /dev/null; then
            iptables-save > /etc/iptables.rules 2>/dev/null || true
        fi
        log_info "iptables 规则已添加"
    else
        log_warn "未检测到防火墙，请手动开放端口 $PORT"
    fi
}

# 创建系统服务（支持 systemd 和 openrc）
create_service() {
    log_info "正在创建系统服务..."

    # systemd (大多数现代 Linux)
    if command -v systemctl &> /dev/null; then
        cat > /etc/systemd/system/xray.service <<'EOF'
[Unit]
Description=Xray Service
Documentation=https://xtls.github.io/
After=network.target nss-lookup.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/xray -config /usr/local/etc/xray/config.json
Restart=on-failure
RestartSec=5
LimitNOFILE=infinity

[Install]
WantedBy=multi-user.target
EOF

        systemctl daemon-reload 2>/dev/null || true
        systemctl enable xray 2>/dev/null || true

        log_info "systemd 服务已创建"
    # openrc (Gentoo/Alpine)
    elif command -v rc-update &> /dev/null; then
        cat > /etc/init.d/xray <<'EOF'
#!/sbin/openrc-run
# Xray service for OpenRC

command="/usr/local/bin/xray -config /usr/local/etc/xray/config.json"
command_args=""
command_background=true
pidfile="/var/run/xray.pid"

depend() {
    need net
    after firewall
}

start_pre() {
    ebegin "Starting Xray"
}
EOF
        chmod +x /etc/init.d/xray
        rc-update add xray default 2>/dev/null || true
        log_info "OpenRC 服务已创建"
    else
        log_warn "不支持的 init 系统，将使用手动启动"
    fi
}

# 启动 Xray
start_xray() {
    log_info "正在启动 Xray 服务..."

    if command -v systemctl &> /dev/null; then
        systemctl daemon-reload 2>/dev/null || true
        systemctl restart xray 2>/dev/null || true

        sleep 2

        if systemctl is-active --quiet xray 2>/dev/null; then
            log_info "Xray 服务启动成功"
        else
            # 尝试直接启动
            log_warn "systemctl 启动失败，尝试后台启动..."
            nohup /usr/local/bin/xray -config /usr/local/etc/xray/config.json > /dev/null 2>&1 &
            sleep 1
            log_info "Xray 已启动（后台模式）"
        fi
    elif command -v rc-service &> /dev/null; then
        rc-service xray start 2>/dev/null || true
        log_info "Xray 已启动"
    else
        # 直接后台启动
        nohup /usr/local/bin/xray -config /usr/local/etc/xray/config.json > /dev/null 2>&1 &
        sleep 1
        log_info "Xray 已启动（后台模式）"
    fi
}

# 获取服务器 IP
get_server_ip() {
    # 尝试多个服务获取 IP
    SERVER_IP=$(curl -s4 ip.sb 2>/dev/null || curl -s4 ifconfig.me 2>/dev/null || curl -s4 icanhazip.com 2>/dev/null || curl -s4 ipinfo.io/ip 2>/dev/null || hostname -I 2>/dev/null | awk '{print $2}')

    if [ -z "$SERVER_IP" ]; then
        log_error "无法获取服务器 IP"
        SERVER_IP="your-server-ip"
    fi

    log_info "服务器 IP: $SERVER_IP"
}

# 生成客户端配置
generate_client_config() {
    log_info "正在生成客户端配置..."

    # VLESS 链接格式
    VLESS_LINK="vless://${UUID}@${SERVER_IP}:${PORT}?encryption=none&security=none&type=tcp#${SERVER_IP}"

    echo ""
    echo "=========================================="
    echo "        Xray 安装完成！"
    echo "=========================================="
    echo ""
    echo "${GREEN}服务器地址:${NC} $SERVER_IP"
    echo "${GREEN}服务器端口:${NC} $PORT"
    echo "${GREEN}用户ID (UUID):${NC} $UUID"
    echo "${GREEN}协议:${NC} VLESS"
    echo "${GREEN}加密:${NC} none"
    echo "${GREEN}传输:${NC} TCP"
    echo ""
    echo "${BLUE}VLESS 分享链接:${NC}"
    echo "$VLESS_LINK"
    echo ""
    echo "${YELLOW}常用命令:${NC}"
    echo "  查看状态: systemctl status xray"
    echo "  启动服务: systemctl start xray"
    echo "  停止服务: systemctl stop xray"
    echo "  重启服务: systemctl restart xray"
    echo "  查看日志: journalctl -u xray -f"
    echo "  查看配置: cat /usr/local/etc/xray/config.json"
    echo ""
    echo "=========================================="
}

# 主安装流程
main() {
    log_info "${BLUE}========================================${NC}"
    log_info "${BLUE}   Xray 一键安装脚本${NC}"
    log_info "${BLUE}========================================${NC}"
    echo ""

    # 检测系统和安装依赖
    detect_os
    install_dependencies

    # 检查必要的命令
    for cmd in curl wget unzip; do
        if ! command -v $cmd &> /dev/null; then
            log_error "依赖安装失败，缺少命令: $cmd"
            log_error "请手动安装后重试"
            exit 1
        fi
    done

    # 安装流程
    install_xray
    configure_xray
    create_service
    optimize_system
    configure_firewall
    get_server_ip
    start_xray
    generate_client_config

    log_info "${GREEN}========================================${NC}"
    log_info "${GREEN}   安装完成！${NC}"
    log_info "${GREEN}========================================${NC}"

    # 明确返回成功状态
    exit 0
}

main
exit 0
