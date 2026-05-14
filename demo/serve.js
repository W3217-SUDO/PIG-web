/**
 * 私人订猪原型页 · 本地 HTTP 服务器
 * 用途：把 demo/ 目录挂到 http://localhost:8080，
 *       避免 file:// 打开 prototype.html 时浏览器阻断 iframe 加载 localhost:5173
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/prototype.html';

  const filePath = path.join(ROOT, urlPath);

  // 安全：只允许访问 ROOT 内部文件
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found: ' + urlPath); return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ✓ 原型页已就绪：http://localhost:' + PORT);
  console.log('  按 Ctrl+C 停止此服务');
  console.log('');
});
