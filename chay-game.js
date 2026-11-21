// Vo Lam Idle - BAN DUNG LAI (code goc, viet lai tu kien truc da phan tich).
// May chu Node.js thuan (khong dung thu vien ngoai). Cong mac dinh 8101, --lan de mo LAN.
"use strict";
const http = require("http");
const path = require("path");
const fs = require("fs");
const WS = require("./may-chu/ws");
const TN = require("./may-chu/tai-nguyen");
const D = require("./may-chu/du-lieu");
const CSC = require("./may-chu/chong-sao-chep");
const KTN = require("./may-chu/khoa-tai-nguyen");
const API = require("./may-chu/api");
const PORT = +process.argv.slice(2).find((a) => /^[0-9]+$/.test(a)) || 8101;
const LAN = process.argv.includes("--lan");
const HOST = LAN ? "0.0.0.0" : "127.0.0.1";
const ROOT = __dirname;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ttf": "font/ttf", ".woff2": "font/woff2", ".ico": "image/x-icon" };
const tra500 = (res) => { try { if (!res.headersSent && !res.destroyed) { res.writeHead(500); res.end(); } } catch {} };
function phatTep(req, res, p) {
  const file = path.join(ROOT, p);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Content-Length": st.size, "X-Frame-Options": "SAMEORIGIN", "Cache-Control": "no-cache" });
    fs.createReadStream(file).on("error", () => tra500(res)).pipe(res);
  });
}
function xuLy(req, res) {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }
  if (p.includes(String.fromCharCode(0)) || p.includes(String.fromCharCode(92)) || p !== path.posix.normalize(p)) { res.writeHead(400); return res.end(); }
  if (CSC.cam(req, p)) { res.writeHead(403); return res.end("403"); }
  try {
    if (p === "/api/tai-nguyen") return TN.xuLy(req, res);
    if (p.startsWith("/api/")) return API.xuLy(req, res);
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    if (p === "/") p = "/game.html";
    const tk = KTN.doc(req);
    if (p.startsWith("/assets/") && !KTN.choPhep(p, tk)) { res.writeHead(401); return res.end("401"); }
    CSC.demTai(req, p);
    phatTep(req, res, p);
  } catch { tra500(res); }
}
const server = http.createServer(xuLy);
server.keepAliveTimeout = 100 * 1000;
server.headersTimeout = 105 * 1000;
WS.gan(server, (req) => D.docPhien(req));
TN.batDau();
D.saoLuuDinhKy();
server.on("error", (e) => {
  if (e.code === "EADDRINUSE") { console.error("Cong " + PORT + " dang bi dung - chay cong khac: node chay-game.js 8111"); process.exit(1); }
  throw e;
});
server.listen(PORT, HOST, () => {
console.log("Duong Huy");
  console.log("Mo trinh duyet: http://" + (LAN ? "IP-may-nay" : "127.0.0.1") + ":" + PORT);
  console.log("Giu cua so nay trong luc choi. Dong cua so = tat may chu.");
});
