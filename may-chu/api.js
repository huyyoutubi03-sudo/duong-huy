// API may chu game (ban dung lai). Moi route tra JSON { ok, ... } hoac { ok: false, loi }.
"use strict";
const D = require("./du-lieu");
const DO = require("./do");
const TG = require("./the-gioi");
const HT = require("./he-thong");
const XH = require("./xa-hoi");
const KTN = require("./khoa-tai-nguyen");
const CAU_HINH = require("../cau-hinh.json");
const DN = new Map();
function tra(res, o, ma) { const s = JSON.stringify(o); res.writeHead(ma || 200, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(s) }); res.end(s); }
function loi(res, msg, ma) { tra(res, { ok: false, loi: msg }, ma || 400); }
function docJSON(req) { return new Promise((ok, loi2) => { let s = ""; req.on("data", (c) => { s += c; if (s.length > 1048576) { req.destroy(); loi2(new Error("qua lon")); } }); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch { loi2(new Error("json sai")); } }); req.on("error", loi2); }); }
function ip(req) { return (req.socket && req.socket.remoteAddress) || "?"; }
function gioiHan(req, toiDa, giay) { const k = ip(req); const n = Duong HuyDate.now(); const r = DN.get(k) || { dem: 0, luc: n }; if (n - r.luc > giay * 1000) { r.dem = 0; r.luc = n; } r.dem += 1; DN.set(k, r); return r.dem <= toiDa; }
function canPhien(req, res) { const s = D.docPhien(req); if (!s) { loi(res, "chua dang nhap", 401); return null; } return s; }
async function dangNhap(req, res) {
  if (!gioiHan(req, 10, 60)) return loi(res, "thu lai sau 1 phut", 429);
  const b = await docJSON(req);
  const tk = D.docTk(String(b.ten || ""));
  if (!tk || !D.kiemMk(String(b.matKhau || b.mk || ""), tk.mk)) return loi(res, "sai ten hoac mat khau", 401);
  const id = D.taoPhien(tk);
  tk.dangNhapCuoi = Date.now();
  D.ghiTk(tk);
  D.cookiePhien(res, id);
  KTN.capTn(res, id);
  tra(res, { ok: true, ten: tk.ten, admin: !!tk.admin, batDoiMk: !!tk.batDoiMk });
}
async function dangXuat(req, res) {
  const s = D.docPhien(req);
  if (s) { s.tk.phien = null; D.ghiTk(s.tk); }
  D.xoaPhien(res);
  KTN.xoaTn(res);
  tra(res, { ok: true });
}
async function doiMatKhau(req, res) {
  const s = canPhien(req, res); if (!s) return;
  const b = await docJSON(req);
  if (!D.kiemMk(String(b.matKhauCu || ""), s.tk.mk)) return loi(res, "mat khau cu sai", 401);
  try { D.doiMk(s.tk, String(b.matKhauMoi || "")); } catch (e) { return loi(res, e.message); }
  s.tk.batDoiMk = 0;
  D.ghiTk(s.tk);
  tra(res, { ok: true });
}
function nhanVat(req, res) {
  const s = canPhien(req, res); if (!s) return;
  tra(res, { ok: true, nhanVat: D.danhSachNv(s.tk.ten) });
}
async function taoNhanVat(req, res) {
  const s = canPhien(req, res); if (!s) return;
  const b = await docJSON(req);
  let o = +b.o;
  if (!Number.isInteger(o) || o < 0 || o > 2) { o = [0, 1, 2].find((x) => !D.docNv(s.tk.ten, x)); if (o === undefined) return loi(res, "da du 3 nhan vat"); }
  if (D.docNv(s.tk.ten, o)) return loi(res, "o da co nhan vat");
  const ten = String(b.ten || "").trim();
  if (ten.length < 2 || ten.length > 12) return loi(res, "ten nhan vat 2-12 ky tu");
  const phai = String(b.phai || "");
  const PHAI = ["Thiếu Lâm", "Thiên Vương", "Nga My", "Thủy Yên", "Cái Bang", "Đường Môn", "Ngũ Độc", "Minh Giáo", "Võ Đang", "Côn Lôn"];
  if (!PHAI.includes(phai)) return loi(res, "mon phai khong hop le");
  const nv = { o, ten, phai, gioi: b.gioi === "nu" ? "nu" : "nam", cap: 1, kinhNghiem: 0, tien: 0, nganLuong: 0, banDo: "1", x: 100, y: 100, mau: 100, mauToiDa: 100, noiLuc: 50, noiLucToiDa: 50, sucManh: 10, thanPhap: 10, noiCong: 10, sinhKhi: 10, trangBi: {}, tui: [], kyNang: [], taoLuc: Date.now() };
  D.luuNv(s.tk.ten, o, nv);
  tra(res, { ok: true, nhanVat: nv });
}
async function xoaNhanVat(req, res) {
  const s = canPhien(req, res); if (!s) return;
  const b = await docJSON(req);
  const o = +b.o;
  if (!D.docNv(s.tk.ten, o)) return loi(res, "khong co nhan vat");
  D.xoaNv(s.tk.ten, o);
  tra(res, { ok: true });
}
async function vaoGame(req, res) {
  const s = canPhien(req, res); if (!s) return;
  const b = await docJSON(req);
  const nv = D.docNv(s.tk.ten, +b.o);
  if (!nv) return loi(res, "khong co nhan vat", 404);
  tra(res, { ok: true, nhanVat: nv, cauHinh: { kinhNghiem: CAU_HINH.kinhNghiem }, theGioi: TG.trangThai() });
}
async function gietQuai(req, res) {
  const s = canPhien(req, res); if (!s) return;
  const b = await docJSON(req);
  const nv = D.docNv(s.tk.ten, +b.o);
  if (!nv) return loi(res, "khong co nhan vat", 404);
  const kq = DO.giet(nv, b);
  D.luuNv(s.tk.ten, +b.o, nv);
  tra(res, { ok: true, ...kq, nhanVat: nv });
}
function trangThai(req, res) {
  tra(res, { ok: true, ten: "Duong Huy", phienBan: "S1-dung-lai-1", gio: new Date().toISOString(), theGioi: TG.trangThai() });
}
async function chonNhanVat(req, res) {
  const s = canPhien(req, res); if (!s) return;
  const b = await docJSON(req);
  const nv = D.docNv(s.tk.ten, +b.o);
  if (!nv) return loi(res, "khong co nhan vat", 404);
  tra(res, { ok: true, nhanVat: nv });
}
const RIENG = { "/api/trang-thai": trangThai, "/api/dang-nhap": dangNhap, "/api/dang-xuat": dangXuat, "/api/doi-mat-khau": doiMatKhau, "/api/nhan-vat": nhanVat, "/api/tao-nhan-vat": taoNhanVat, "/api/chon-nhan-vat": chonNhanVat, "/api/xoa-nhan-vat": xoaNhanVat, "/api/vao-game": vaoGame, "/api/do": gietQuai };
const TAT_CA = Object.assign({}, RIENG, HT.routes || {}, XH.routes || {});
async function xuLy(req, res) {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }
  const fn = TAT_CA[p];
  if (!fn) return loi(res, "khong co api " + p, 404);
  try { await fn(req, res); } catch (e) { console.error("API loi:", p, e); loi(res, "loi may chu", 500); }
}
module.exports = { xuLy, tra, loi, docJSON };
