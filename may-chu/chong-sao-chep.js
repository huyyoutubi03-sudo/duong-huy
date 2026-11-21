// Chong sao chep: trang ten mien khac khong dung duoc tai nguyen / API cua may chu nay (ban dung lai).
"use strict";
const DEM = new Map();
function tenMien(u) { try { return new URL(u).hostname; } catch { return ""; } }
function chu(req) { return String((req.headers && req.headers.host) || "").split(":")[0]; }
function cam(req, p) {
  if (!p.startsWith("/assets/") && !p.startsWith("/api/")) return false;
  const goc = req.headers.origin || req.headers.referer || "";
  if (!goc) return false;
  const h = tenMien(goc);
  const c = chu(req);
  if (!h || h === c || h === "localhost" || h === "127.0.0.1" || h === "[::1]") return false;
  return true;
}
function demTai(req, p) {
  const k = (req.socket && req.socket.remoteAddress) + "|" + p;
  DEM.set(k, (DEM.get(k) || 0) + 1);
}
module.exports = { cam, demTai, dem: () => DEM };