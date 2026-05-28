const { execSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');

function httpGet(url, timeout = 5000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.trim()));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

async function downloadV2ray() {
  const V2RAY_DIR = '/tmp/v2ray';
  const V2RAY_BIN = `${V2RAY_DIR}/v2ray`;

  if (fs.existsSync(V2RAY_BIN)) return V2RAY_BIN;

  const arch = os.arch();
  const archMap = {
    'x64': 'linux-64',
    'arm64': 'linux-arm64-v8a',
    'arm': 'linux-arm32-v7a'
  };
  const platform = archMap[arch] || 'linux-64';

  console.log(`正在下载 v2ray (${platform})...`);

  const release = await httpGet('https://api.github.com/repos/v2fly/v2ray-core/releases/latest');
  let version = 'v5.16.1';
  try {
    version = JSON.parse(release).tag_name || version;
  } catch {}

  const url = `https://github.com/v2fly/v2ray-core/releases/download/${version}/v2ray-${platform}.zip`;

  fs.mkdirSync(V2RAY_DIR, { recursive: true });
  execSync(`curl -sL "${url}" -o /tmp/v2ray.zip && unzip -qo /tmp/v2ray.zip -d ${V2RAY_DIR} && chmod +x ${V2RAY_BIN}`);

  console.log('v2ray 下载完成');
  return V2RAY_BIN;
}

async function main() {
  const UUID_FILE = '/etc/uuid.txt';
  let UUID = process.env.UUID || '';
  if (UUID) {
    fs.writeFileSync(UUID_FILE, UUID);
  } else if (fs.existsSync(UUID_FILE)) {
    UUID = fs.readFileSync(UUID_FILE, 'utf8').trim();
  } else {
    UUID = require('crypto').randomUUID();
    fs.writeFileSync(UUID_FILE, UUID);
  }

  const INBOUND_PORT = process.env.PORT || '10086';
  const WS_PATH = process.env.WS_PATH || '/?ed=2048';

  let HOST = '';
  let PLATFORM = '';

  if (process.env.VMESS_HOST) {
    HOST = process.env.VMESS_HOST;
  } else if (process.env.DOMAIN) {
    HOST = process.env.DOMAIN;
  } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    HOST = process.env.RAILWAY_PUBLIC_DOMAIN;
    PLATFORM = 'Railway';
  } else if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    HOST = process.env.RENDER_EXTERNAL_HOSTNAME;
    PLATFORM = 'Render';
  } else if (process.env.ZEABUR_DOMAIN) {
    HOST = process.env.ZEABUR_DOMAIN;
    PLATFORM = 'Zeabur';
  } else if (process.env.KOYEB_PUBLIC_DOMAIN) {
    HOST = process.env.KOYEB_PUBLIC_DOMAIN;
    PLATFORM = 'Koyeb';
  } else if (process.env.VCAP_APPLICATION) {
    try {
      const vcap = JSON.parse(process.env.VCAP_APPLICATION);
      HOST = vcap.application_uris?.[0] || '';
      PLATFORM = 'CloudFoundry';
    } catch {}
  }

  if (!HOST) {
    HOST = await httpGet('https://api.ipify.org') ||
           await httpGet('https://ip.sb') ||
           'your-domain.com';
  }

  const COUNTRY = await httpGet('https://ipapi.co/country');

  let PS_NAME = process.env.PS_NAME || '';
  if (!PS_NAME) {
    if (PLATFORM) {
      PS_NAME = COUNTRY ? `${COUNTRY}-${PLATFORM}` : PLATFORM;
    } else {
      let ASN_ORG = await httpGet('https://ipapi.co/org');
      ASN_ORG = ASN_ORG
        .replace(/^AS\d+\s+/, '')
        .replace(/,?\s*Inc\.?$/, '')
        .replace(/,?\s*LLC\.?/g, '')
        .replace(/,?\s*Ltd\.?/g, '')
        .replace(/,?\s*Corp\.?/g, '')
        .trim()
        .substring(0, 20);
      PS_NAME = COUNTRY && ASN_ORG ? `${COUNTRY}-${ASN_ORG}` :
                COUNTRY ? `${COUNTRY}-mous` : 'mous';
    }
  }

  const config = {
    log: { loglevel: 'warning' },
    inbounds: [{
      port: parseInt(INBOUND_PORT),
      listen: '0.0.0.0',
      protocol: 'vmess',
      settings: {
        clients: [{ id: UUID, alterId: 0 }]
      },
      streamSettings: {
        network: 'ws',
        wsSettings: { path: WS_PATH }
      }
    }],
    outbounds: [{ protocol: 'freedom', settings: {} }]
  };

  fs.writeFileSync('/etc/v2ray-config.json', JSON.stringify(config, null, 2));

  const vmessObj = {
    v: '2',
    ps: PS_NAME,
    add: HOST,
    port: '443',
    id: UUID,
    aid: '0',
    scy: 'auto',
    net: 'ws',
    type: 'none',
    host: HOST,
    path: WS_PATH,
    tls: 'tls'
  };

  const VMESS_LINK = 'vmess://' + Buffer.from(JSON.stringify(vmessObj)).toString('base64');

  console.log('================= VMESS =================');
  console.log(VMESS_LINK);
  console.log('=========================================');

  let v2rayBin = '';
  const v2rayPaths = [
    'v2ray',
    '/usr/local/bin/v2ray',
    '/usr/bin/v2ray',
    '/usr/local/v2ray/v2ray'
  ];

  for (const p of v2rayPaths) {
    try {
      execSync(`which ${p} 2>/dev/null || test -x ${p}`);
      v2rayBin = p;
      break;
    } catch {}
  }

  if (!v2rayBin) {
    v2rayBin = await downloadV2ray();
  }

  const v2ray = spawn(v2rayBin, ['run', '-config', '/etc/v2ray-config.json'], {
    stdio: 'inherit'
  });

  v2ray.on('exit', (code) => process.exit(code));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
