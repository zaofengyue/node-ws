#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${GREEN}========== mous 一键安装 ==========${NC}"

# 检测下载工具
if command -v curl >/dev/null 2>&1; then
  DL="curl -sL"
  DL_O="-o"
elif command -v wget >/dev/null 2>&1; then
  DL="wget -q"
  DL_O="-O"
else
  echo -e "${RED}缺少 curl 或 wget${NC}"
  exit 1
fi

# 检测依赖
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}缺少 node，请先安装 Node.js${NC}"
  exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo -e "${RED}缺少 unzip，请先安装${NC}"
  exit 1
fi

BASE_URL="https://raw.githubusercontent.com/zaofengyue/mous-node/main"
APP_DIR="$HOME/mous"
mkdir -p "$APP_DIR" && cd "$APP_DIR"

echo -e "${GREEN}正在拉取文件...${NC}"
$DL "$BASE_URL/index.js" $DL_O index.js
$DL "$BASE_URL/package.json" $DL_O package.json

# 有预设值就直接用，否则交互询问
INPUT_PORT="${PORT:-}"
INPUT_HOST="${DOMAIN:-}"

if [ -z "$INPUT_PORT" ] && [ -z "$INPUT_HOST" ]; then
  echo ""
  echo -e "${YELLOW}========== 环境变量配置（留空使用默认值）==========${NC}"
  read -p "PORT（留空默认 10086）: " INPUT_PORT
  read -p "DOMAIN/公网IP（留空自动识别）: " INPUT_HOST
fi

echo ""
echo -e "${GREEN}正在启动...${NC}"

export PORT="$INPUT_PORT"
export DOMAIN="$INPUT_HOST"

node index.js
