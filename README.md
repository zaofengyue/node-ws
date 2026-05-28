# mous

基于 v2ray 的 VMess/WebSocket 代理工具，支持直接上传源码部署或 Docker 镜像部署，启动时自动下载 v2ray，自动识别平台域名和节点名称。

## 部署方式

### 方式一：源码部署（适用于 Node.js 平台）

上传以下两个文件即可：

```
index.js
package.json
```

平台检测到 `package.json` 会自动运行 `npm start`，无需额外配置。

### 方式二：Docker 镜像部署

```bash
docker pull ghcr.io/你的用户名/mous-node:latest
```

```bash
docker run -d \
  -e DOMAIN=你的域名 \
  -e PORT=10086 \
  -e WS_PATH=/?ed=2048 \
  -p 10086:10086 \
  ghcr.io/你的用户名/mous-node:latest
```

## 支持平台

| 平台 | 部署方式 | 域名自动识别 |
|---|---|---|
| Railway | 源码 / Docker | ✅ |
| Render | 源码 / Docker | ✅ |
| Zeabur | 源码 / Docker | ✅ |
| Koyeb | 源码 / Docker | ✅ |
| CloudFoundry | 源码 / Docker | ✅ |
| 其他 VPS / 容器平台 | Docker | 自动获取公网 IP |
| 其他 Node.js 平台 | 源码 | 自动获取公网 IP |

## 环境变量

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `UUID` | 节点唯一ID | 自动生成 |
| `PORT` | 监听端口 | `10086` |
| `WS_PATH` | WebSocket 路径 | `/?ed=2048` |
| `VMESS_HOST` | 手动指定域名（最高优先级） | 自动识别 |
| `DOMAIN` | 手动指定域名 | 自动识别 |
| `PS_NAME` | 手动指定节点名称 | 自动识别国家+平台/ASN |

也可以直接在 `index.js` 顶部预留配置里填写，优先级高于环境变量：

```javascript
const PRESET_UUID    = '';
const PRESET_PORT    = '';
const PRESET_WS_PATH = '';
const PRESET_HOST    = '';
const PRESET_PS_NAME = '';
```

## 节点名称自动识别规则

```
手动指定 PS_NAME / PRESET_PS_NAME
        ↓
识别到平台 → 国家简称+平台名（例如 SG-Railway）
        ↓
识别不到平台 → 国家简称+ASN组织名（例如 US-Amazon.com）
        ↓
识别失败 → mous
```

## 内存需求

最低 128MB，建议 256MB。

## 注意事项

- 仅供学习研究使用，请遵守当地法律法规
- 部署在境外服务器使用效果更佳
- v2ray 启动时自动下载，首次启动需要联网
