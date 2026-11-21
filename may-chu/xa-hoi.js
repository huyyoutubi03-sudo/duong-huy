// He thong xa hoi: cho troi, giao dich, to doi, bang hoi, xep hang, lich, ung ho, bao mat (ban dung lai).
"use strict";
const fs = require("fs");
const path = require("path");
const D = require("./du-lieu");
const FILE = path.join(__dirname, "..", "du-lieu", "xa-hoi.json");
function macDinh() { return { cho: [], giaoDich: [], toDoi: [], bangHoi: [], ungHo: [], lich: [{ ten: "Tong Kim", gio: "20:00", ngay: "hang ngay" }, { ten: "Boss Hoang Kim", gio: "12:00", ngay: "hang ngay" }, { ten: "Phong Hoa Lien Thanh", gio: "19:00", ngay: "thu 7" }] }; }
function docState() { try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch { const s = macDinh(); fs.writeFileSync(FILE, JSON.stringify(s, null, 2)); return s; } }
function luuState(s) { fs.writeFileSync(FILE, JSON.stringify(s, null, 2)); }
function tra(res, o, ma) { const s = JSON.stringify(o); res.writeHead(ma || 200, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(s) }); res.end(s); }
function loi(res, msg, ma) { tra(res, { ok: false, loi: msg }, ma || 400); }
function docJSON(req) { return new Promise((ok, loi2) => { let s = ""; req.on("data", (c) => { s += c; if (s.length > 1048576) { req.destroy(); loi2(new Error("qua lon")); } }); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch { loi2(new Error("json sai")); } }); req.on("error", loi2); }); }
function canPhien(req, res) { const s = D.docPhien(req); if (!s) { loi(res, "chua dang nhap", 401); return null; } return s; }
function nvCua(req, res, b) { const s = canPhien(req, res); if (!s) return null; const nv = D.docNv(s.tk.ten, +b.o); if (!nv) { loi(res, "khong co nhan vat", 404); return null; } return { s, nv }; }
async function choTroi(req, res) {
  const st = docState();
  if (req.method === "GET") return tra(res, { ok: true, cho: st.cho });
  const b = await docJSON(req);
  const x = nvCua(req, res, b); if (!x) return;
  if (b.hanh === "ban") {
    const vat = (x.nv.tui || []).find((v) => v.id === b.vat);
    if (!vat) return loi(res, "khong co vat");
    x.nv.tui = x.nv.tui.filter((v) => v.id !== b.vat);
    st.cho.push({ id: "cho-" + Date.now(), vat, gia: Math.max(1, +b.gia || 1), ban: x.s.tk.ten, luc: Date.now() });
    D.luuNv(x.s.tk.ten, +b.o, x.nv);
    luuState(st);
    return tra(res, { ok: true });
  }
  if (b.hanh === "mua") {
    const i = st.cho.findIndex((c) => c.id === b.id);
    if (i < 0) return loi(res, "khong co mon do", 404);
    const c = st.cho[i];
    if (x.nv.tien < c.gia) return loi(res, "khong du tien");
    x.nv.tien -= c.gia;
    x.nv.tui.push(c.vat);
    st.cho.splice(i, 1);
    D.luuNv(x.s.tk.ten, +b.o, x.nv);
    luuState(st);
    return tra(res, { ok: true });
  }
  if (b.hanh === "huy") {
    const i = st.cho.findIndex((c) => c.id === b.id && c.ban === x.s.tk.ten);
    if (i < 0) return loi(res, "khong co mon do", 404);
    x.nv.tui.push(st.cho[i].vat);
    st.cho.splice(i, 1);
    D.luuNv(x.s.tk.ten, +b.o, x.nv);
    luuState(st);
    return tra(res, { ok: true });
  }
  return loi(res, "hanh khong hop le");
}
async function giaoDich(req, res) {
  const b = await docJSON(req);
  const x = nvCua(req, res, b); if (!x) return;
  const st = docState();
  if (b.hanh === "moi") {
    const vat = (x.nv.tui || []).find((v) => v.id === b.vat);
    if (!vat) return loi(res, "khong co vat");
    const gd = { id: "gd-" + Date.now(), tu: x.s.tk.ten, den: String(b.den || ""), vat, luc: Date.now() };
    st.giaoDich.push(gd);
    luuState(st);
    return tra(res, { ok: true, giaoDich: gd });
  }
  if (b.hanh === "chap-nhan") {
    const i = st.giaoDich.findIndex((g) => g.id === b.id && g.den === x.s.tk.ten);
    if (i < 0) return loi(res, "khong co giao dich", 404);
    const g = st.giaoDich[i];
    x.nv.tui.push(g.vat);
    st.giaoDich.splice(i, 1);
    D.luuNv(x.s.tk.ten, +b.o, x.nv);
    luuState(st);
    return tra(res, { ok: true });
  }
  return loi(res, "hanh khong hop le");
}
async function toDoi(req, res) {
  const st = docState();
  if (req.method === "GET") return tra(res, { ok: true, toDoi: st.toDoi });
  const b = await docJSON(req);
  const s = canPhien(req, res); if (!s) return;
  if (b.hanh === "tao") {
    const doi = { id: "doi-" + Date.now(), ten: String(b.ten || "Doi").slice(0, 20), truong: s.tk.ten, thanhVien: [s.tk.ten] };
    st.toDoi.push(doi);
    luuState(st);
    return tra(res, { ok: true, toDoi: doi });
  }
  if (b.hanh === "vao" || b.hanh === "ra") {
    const doi = st.toDoi.find((d) => d.id === b.id);
    if (!doi) return loi(res, "khong co doi", 404);
    if (b.hanh === "vao" && !doi.thanhVien.includes(s.tk.ten)) doi.thanhVien.push(s.tk.ten);
    if (b.hanh === "ra") doi.thanhVien = doi.thanhVien.filter((t) => t !== s.tk.ten);
    luuState(st);
    return tra(res, { ok: true, toDoi: doi });
  }
  return loi(res, "hanh khong hop le");
}
async function bangHoi(req, res) {
  const st = docState();
  if (req.method === "GET") return tra(res, { ok: true, bangHoi: st.bangHoi });
  const b = await docJSON(req);
  const s = canPhien(req, res); if (!s) return;
  if (b.hanh === "tao") {
    const bh = { id: "bh-" + Date.now(), ten: String(b.ten || "Bang").slice(0, 20), chu: s.tk.ten, thanhVien: [s.tk.ten] };
    st.bangHoi.push(bh);
    luuState(st);
    return tra(res, { ok: true, bangHoi: bh });
  }
  if (b.hanh === "vao") {
    const bh = st.bangHoi.find((d) => d.id === b.id);
    if (!bh) return loi(res, "khong co bang", 404);
    if (!bh.thanhVien.includes(s.tk.ten)) bh.thanhVien.push(s.tk.ten);
    luuState(st);
    return tra(res, { ok: true, bangHoi: bh });
  }
  return loi(res, "hanh khong hop le");
}
function xepHang(req, res) {
  const dir = path.join(__dirname, "..", "du-lieu", "nhan-vat");
  const ra = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      try { const nv = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")); ra.push({ ten: nv.ten, phai: nv.phai, cap: nv.cap || 1 }); } catch {}
    }
  } catch {}
  ra.sort((a, b) => b.cap - a.cap);
  tra(res, { ok: true, xepHang: ra.slice(0, 20) });
}
function lichHd(req, res) { const st = docState(); tra(res, { ok: true, lich: st.lich }); }
async function ungHo(req, res) {
  const st = docState();
  if (req.method === "GET") return tra(res, { ok: true, ungHo: st.ungHo });
  const b = await docJSON(req);
  const s = canPhien(req, res); if (!s) return;
  st.ungHo.push({ ten: s.tk.ten, soTien: Math.max(0, +b.soTien || 0), loiNhan: String(b.loiNhan || "").slice(0, 200), luc: Date.now() });
  luuState(st);
  tra(res, { ok: true });
}
async function baoMat(req, res) {
  const b = await docJSON(req);
  const s = canPhien(req, res); if (!s) return;
  if (b.hanh === "dat-mk2") {
    if (typeof b.mk2 !== "string" || b.mk2.length < 4) return loi(res, "mat khau cap 2: it nhat 4 ky tu");
    s.tk.mk2 = D.bamMk(b.mk2);
    D.ghiTk(s.tk);
    return tra(res, { ok: true });
  }
  if (b.hanh === "kiem-tra") {
    if (!s.tk.mk2) return tra(res, { ok: true, coMk2: false });
    return tra(res, { ok: true, coMk2: true, dung: D.kiemMk(String(b.mk2 || ""), s.tk.mk2) });
  }
  return loi(res, "hanh khong hop le");
}
function tiThi(req, res) { tra(res, { ok: true, cauHoi: "Mon phai nao dung kiem?", dapAn: ["Thieu Lam", "Vo Dang", "Nga My", "Duong Mon"], dung: 1 }); }
const routes = { "/api/cho-troi": choTroi, "/api/giao-dich": giaoDich, "/api/to-doi": toDoi, "/api/bang-hoi": bangHoi, "/api/xep-hang": xepHang, "/api/lich-hd": lichHd, "/api/ung-ho": ungHo, "/api/bao-mat": baoMat, "/api/ti-thi": tiThi };
module.exports = { routes };