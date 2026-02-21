#!/bin/bash

# 简单测试脚本 - 诊断系统兼容性

echo "========== 系统诊断 =========="
echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME)"
echo "内核版本: $(uname -r)"
echo "架构: $(uname -m)"
echo ""
echo "========== 可用命令 =========="
commands=("bash" "curl" "wget" "unzip" "systemctl" "firewall-cmd" "uuidgen")
for cmd in "${commands[@]}"; do
    if command -v $cmd &> /dev/null; then
        echo "✓ $cmd - $(command -v $cmd)"
    else
        echo "✗ $cmd - 未找到"
    fi
done
echo ""
echo "========== 测试完成 =========="
echo "所有必要的命令都已检查"
exit 0
