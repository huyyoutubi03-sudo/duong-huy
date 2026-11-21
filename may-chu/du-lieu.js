// Kho du lieu may chu: tai khoan + nhan vat luu JSON duoi du-lieu/ (ban dung lai).
// Mat khau: scrypt + muoi ngau nhien, so bang timingSafeEqual (giong ban goc).
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const GOC = path.join(__dirname, "..", "du-lieu");
const TK_DIR = path.join(GOC, "tai-khoan");
const NV_DIR = path.join(GOC, "nhan-vat");
const SL_DIR = path.join(GOC, "sao-luu");
for (const d of [GOC, TK_DIR, NV_DIR, SL_DIR]) fs.mkdirSync(d, { recursive: true });
const TEN_OK = (t) => typeof t === "string" && /^[a-z0-9_]{3,20}$/.test(t);
const docJSON = (f) => JSON.parse(fs.readFileSync(f, "utf-8"));
const ghiJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2), "utf-8");
function bamMk(mk) {
  const muoi = crypto.randomBytes(16);
  return "scrypt$" + muoi.toString("hex") + "$" + crypto.scryptSync(String(mk), muoi, 64).toString("hex");
}
function kiemMk(mk, luu) {
  if (typeof luu !== "string") return false;
  const p = luu.split("$");
  if (p[0] !== "scrypt" || !p[1] || !p[2]) return false;
  const a = crypto.scryptSync(String(mk), Buffer.from(p[1], "hex"), 64);
  const b = Buffer.from(p[2], "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function duongTk(ten) { return path.join(TK_DIR, ten + ".json"); }
function docTk(ten) {
  if (!TEN_OK(ten)) return null;
  try { return docJSON(duongTk(ten)); } catch { return null; }
}
function ghiTk(tk) { ghiJSON(duongTk(tk.ten), tk); }
function demTk() { return fs.readdirSync(TK_DIR).filter((f) => f.endsWith(".json")).length; }
function danhSachTk() { return fs.readdirSync(TK_DIR).filter((f) => f.endsWith(".json")).map((f) => docJSON(path.join(TK_DIR, f))).sort((a, b) => (a.taoLuc || 0) - (b.taoLuc || 0)); }
function taoTk(ten, mk, admin) {
  if (!TEN_OK(ten)) throw new Error("Ten tai khoan: 3-20 ky tu, chu thuong khong dau, so, dau gach duoi.");
  if (typeof mk !== "string" || mk.length < 4) throw new Error("Mat khau: it nhat 4 ky tu.");
  if (docTk(ten)) throw new Error("Tai khoan da ton tai.");
  const tk = { ten, mk: bamMk(mk), admin: !!admin, mk2: null, batDoiMk: 0, taoLuc: Date.now(), dangNhapCuoi: 0, phien: null };
  ghiTk(tk);
  return tk;
}
function doiMk(tk, mkMoi) {
  if (typeof mkMoi !== "string" || mkMoi.length < 4) throw new Error("Mat khau: it nhat 4 ky tu.");
  tk.mk = bamMk(mkMoi);
}
function taoPhien(tk) {
  const id = crypto.randomBytes(24).toString("hex");
  tk.phien = { id, tao: Date.now() };
  ghiTk(tk);
  return id;
}
function docPhien(req) {
  const ck = String((req.headers && req.headers.cookie) || "");
  const m = ck.split(";").map((s) => s.trim()).find((s) => s.startsWith("vl_phien="));
  if (!m) return null;
  const id = m.slice("vl_phien=".length);
  for (const tk of danhSachTk()) {
    if (tk.phien && tk.phien.id === id && Date.now() - tk.phien.tao < 7 * 24 * 3600 * 1000) return { tk, phien: tk.phien };
  }
  return null;
}
function cookiePhien(res, id) {
  res.setHeader("Set-Cookie", "vl_phien=" + id + "; HttpOnly; Path=/; SameSite=Lax; Max-Age=" + 7 * 24 * 3600);
}
function xoaPhien(res) {
  res.setHeader("Set-Cookie", "vl_phien=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
}
function duongNv(ten, o) { return path.join(NV_DIR, ten + "_" + o + ".json"); }
function docNv(ten, o) {
  try { return docJSON(duongNv(ten, o)); } catch { return null; }
}
function luuNv(ten, o, nv) { ghiJSON(duongNv(ten, o), nv); }
function xoaNv(ten, o) { try { fs.unlinkSync(duongNv(ten, o)); } catch {} }
function danhSachNv(ten) {
  const ra = [];
  for (let o = 0; o < 3; o++) { const nv = docNv(ten, o); if (nv) ra.push(nv); }
  return ra;
}
function saoLuu() {
  const d = new Date();
  const ten = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + "-" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
  const dir = path.join(SL_DIR, ten);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(TK_DIR)) fs.copyFileSync(path.join(TK_DIR, f), path.join(dir, "tk-" + f));
  for (const f of fs.readdirSync(NV_DIR)) fs.copyFileSync(path.join(NV_DIR, f), path.join(dir, "nv-" + f));
}
function saoLuuDinhKy() {
  try { saoLuu(); } catch {}
  setInterval(() => { try { saoLuu(); } catch {} }, 24 * 3600 * 1000).unref();
}
module.exports = { docTk, ghiTk, demTk, danhSachTk, taoTk, doiMk, bamMk, kiemMk, taoPhien, docPhien, cookiePhien, xoaPhien, docNv, luuNv, xoaNv, danhSachNv, saoLuu, saoLuuDinhKy, TEN_OK };