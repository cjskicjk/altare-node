# Altare 免费容器上的 sing-box VLESS 节点

Altare 面板（console.altare.gg）Generic Node.js 容器，启动命令 `node index.js`。

- `index.js`：下载 sing-box，在分配的端口（`SERVER_PORT`，默认 25831）上跑 VLESS（明文 TCP），把订阅链接写进 `sub.txt`。
- `package.json`：仅声明入口，启动命令里 `npm install` 会跑它（无依赖）。

用法：把这两个文件放进服务器根目录，启动服务器，等日志出现“节点链接已写入 sub.txt”，到文件页取 `sub.txt` 里的 `vless://` 链接导入客户端。

UUID 与端口在 `index.js` 顶部改。
