// Khoa tai nguyen: assets/ chi cho nguoi da dang nhap - phieu vl_tn (ban dung lai).
"use strict";
const crypto = require("crypto");
const BI_MAT = crypto.randomBytes(32);
const MO = ["/game.html", "/src/", "/assets/web/ui/", "/assets/web/icon/logo"];
function ham(phienId) { return crypto.createHmac("sha256", BI_MAT).update(String(phienId)).digest("hex"); }
function docCookie(req) {
  const ck = String((req.headers && req.headers.cookie) || "");
  const ra = {};
  for (const s of ck.split(";")) { const i = s.indexOf("="); if (i > 0) ra[s.slice(0, i).trim()] = s.slice(i + 1).trim(); }
  return ra;
}
function themCookie(res, gt) { const cu = res.getHeader("Set-Cookie"); if (!cu) res.setHeader("Set-Cookie", gt); else if (Array.isArray(cu)) res.setHeader("Set-Cookie", [...cu, gt]); else res.setHeader("Set-Cookie", [cu, gt]); }
function capTn(res, phienId) { themCookie(res, "vl_tn=" + ham(phienId) + "; HttpOnly; Path=/assets/; SameSite=Lax; Max-Age=" + 7 * 24 * 3600); }
function xoaTn(res) { themCookie(res, "vl_tn=; HttpOnly; Path=/assets/; SameSite=Lax; Max-Age=0"); }
function doc(req) { const c = docCookie(req); return { phien: c.vl_phien || null, tn: c.vl_tn || null }; }
function choPhep(p, tk) {
  if (MO.some((m) => p === m || p.startsWith(m))) return true;
  if (!tk || !tk.phien || !tk.tn) return false;
  const a = Buffer.from(tk.tn);
  const b = Buffer.from(ham(tk.phien));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
module.exports = { capTn, xoaTn, doc, choPhep };