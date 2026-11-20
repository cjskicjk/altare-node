// Altare 免费容器上的 sing-box VLESS 节点
// 启动命令: node index.js
// 做法: 下载 sing-box, 在分配的端口上跑 VLESS(明文 TCP), 把订阅链接写进 sub.txt
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const SB_VERSION = '1.12.1';
const SB_URL = `https://github.com/SagerNet/sing-box/releases/download/v${SB_VERSION}/sing-box-${SB_VERSION}-linux-amd64.tar.gz`;
const UUID = '0fbed04d-0204-442a-b47c-1a8fef7b7a2c';
const PORT = parseInt(process.env.SERVER_PORT || '25831', 10);
const HOST = process.env.SERVER_HOST || 'id-jkt01.altare.global';
const DIR = __dirname;

function log(...a) { console.log('[node]', ...a); }
function sh(cmd) { log('$', cmd); return execSync(cmd, { stdio: 'pipe', timeout: 120000 }).toString(); }

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const f = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      res.pipe(f); f.on('finish', () => { f.close(); resolve(); });
    }).on('error', reject);
  });
}

async function ensureSingBox() {
  const bin = path.join(DIR, 'sing-box');
  if (fs.existsSync(bin)) { log('sing-box 已存在'); return bin; }
  const tgz = path.join(DIR, 'sing-box.tar.gz');
  log('下载 sing-box', SB_VERSION);
  try { sh(`curl -fsSL --max-time 120 -o "${tgz}" "${SB_URL}"`); }
  catch (e) {
    log('curl 下载失败, 改用 node https 下载:', e.message);
    await download(SB_URL, tgz);
  }
  log('解压');
  sh(`tar -xzf "${tgz}" -C "${DIR}"`);
  const extracted = path.join(DIR, `sing-box-${SB_VERSION}-linux-amd64`, 'sing-box');
  fs.copyFileSync(extracted, bin);
  fs.chmodSync(bin, 0o755);
  log('sing-box 就绪:', sh(`"${bin}" version`).trim().split('\n')[0]);
  return bin;
}

function writeConfig() {
  const cfg = {
    log: { level: 'info' },
    inbounds: [{
      type: 'vless', tag: 'vless-in', listen: '0.0.0.0', listen_port: PORT,
      users: [{ uuid: UUID, flow: '' }],
    }],
    outbounds: [{ type: 'direct', tag: 'direct' }],
  };
  fs.writeFileSync(path.join(DIR, 'sb-config.json'), JSON.stringify(cfg, null, 2));
  const link = `vless://${UUID}@${HOST}:${PORT}?encryption=none&security=none&type=tcp#Altare`;
  fs.writeFileSync(path.join(DIR, 'sub.txt'), link + '\n');
  log('节点链接已写入 sub.txt:');
  log(link);
}

async function main() {
  log('启动, node', process.version, '平台', process.platform, '端口', PORT);
  log('环境 SERVER_PORT=', process.env.SERVER_PORT || '(未设置, 用 25831)');
  try { log('curl:', sh('which curl || echo 无 curl').trim()); } catch (e) { log('curl 检查失败'); }
  try { log('tar:', sh('which tar || echo 无 tar').trim()); } catch (e) { log('tar 检查失败'); }
  const bin = await ensureSingBox();
  writeConfig();
  log('启动 sing-box, 监听端口', PORT);
  const sb = spawn(bin, ['run', '-c', path.join(DIR, 'sb-config.json')], { stdio: 'inherit' });
  sb.on('exit', (code, sig) => { log('sing-box 退出, code=', code, 'signal=', sig, '3 秒后重启'); setTimeout(main, 3000); });
  sb.on('error', (e) => { log('sing-box 启动失败:', e.message, '3 秒后重试'); setTimeout(main, 3000); });
}

main().catch((e) => { log('致命错误:', e); setTimeout(main, 5000); });
