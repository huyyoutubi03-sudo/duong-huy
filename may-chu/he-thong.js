// He thong hoat dong: Tong Kim, Vuot Ai, Phong Hoa, Phong Lang Do, Sat Thu, San Nhim, Tu Lam, Viem De... (ban dung lai).
"use strict";
const fs = require("fs");
const path = require("path");
const D = require("./du-lieu");
const FILE = path.join(__dirname, "..", "du-lieu", "he-thong.json");
function macDinh() { return { tongKim: { mo: true, tong: 0, kim: 0, nguoi: [] }, vuotAi: { tang: 0 }, satThu: [{ id: 1, ten: "Thu linh Sa Mac", thuong: 500 }, { id: 2, ten: "Thu linh Truong Bach", thuong: 1500 }], sanNhim: { con: 5 }, tuLam: {}, viemDe: { tang: 1 }, minhChu: null, loiDai: [], maQua: { TANTHU: { tien: 1000, ghiChu: "Ma tan thu" } }, daNhanMa: {} }; }
function docState() { try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch { const s = macDinh(); fs.writeFileSync(FILE, JSON.stringify(s, null, 2)); return s; } }
function luuState(s) { fs.writeFileSync(FILE, JSON.stringify(s, null, 2)); }
function tra(res, o, ma) { const s = JSON.stringify(o); res.writeHead(ma || 200, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(s) }); res.end(s); }
function loi(res, msg, ma) { tra(res, { ok: false, loi: msg }, ma || 400); }
function docJSON(req) { return new Promise((ok, loi2) => { let s = ""; req.on("data", (c) => { s += c; if (s.length > 1048576) { req.destroy(); loi2(new Error("qua lon")); } }); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch { loi2(new Error("json sai")); } }); req.on("error", loi2); }); }
function canPhien(req, res) { const s = D.docPhien(req); if (!s) { loi(res, "chua dang nhap", 401); return null; } return s; }
function nvCua(req, res, b) { const s = canPhien(req, res); if (!s) return null; const nv = D.docNv(s.tk.ten, +b.o); if (!nv) { loi(res, "khong co nhan vat", 404); return null; } return { s, nv }; }
async function tongKim(req, res) {
  const s = canPhien(req, res); if (!s) return;
  const st = docState();
  if (req.method === "GET") return tra(res, { ok: true, ...st.tongKim });
  const b = await docJSON(req);
  if (b.hanh === "vao" && (b.phe === "tong" || b.phe === "kim")) {
    st.tongKim.nguoi = st.tongKim.nguoi.filter((x) => x !== s.tk.ten);
    st.tongKim.nguoi.push(s.tk.ten);
    if (b.phe === "tong") st.tongKim.tong += 1; else st.tongKim.kim += 1;
    luuState(st);
    return tra(res, { ok: true, phe: b.phe });
  }
  if (b.hanh === "ra") { st.tongKim.nguoi = st.tongKim.nguoi.filter((x) => x !== s.tk.ten); luuState(st); return tra(res, { ok: true }); }
  return loi(res, "hanh khong hop le");
}
async function vuotAi(req, res) {
  if (req.method === "GET") { const st = docState(); return tra(res, { ok: true, tang: st.vuotAi.tang }); }
  const b = await docJSON(req);
  const x = nvCua(req, res, b); if (!x) return;
  const st = docState();
  if (b.hanh === "danh" && +b.tang === st.vuotAi.tang + 1) {
    st.vuotAi.tang += 1;
    x.nv.tien += 100 * st.vuotAi.tang;
    D.luuNv(x.s.tk.ten, +b.o, x.nv);
    luuState(st);
    return tra(res, { ok: true, tang: st.vuotAi.tang, tien: x.nv.tien });
  }
  return loi(res, "tang khong hop le");
}
function phongHoa(req, res) { tra(res, { ok: true, mo: true, lua: 100, ghiChu: "Phong Hoa Lien Thanh - su kien theo gio" }); }
function phongLangDo(req, res) { tra(res, { ok: true, chuyen: ["08:00", "12:00", "20:00"], gia: 100 }); }
async function satThu(req, res) {
  const st = docState();
  if (req.method === "GET") return tra(res, { ok: true, bang: st.satThu });
  const b = await docJSON(req);
  const x = nvCua(req, res, b); if (!x) return;
  const m = st.satThu.find((t) => t.id === +b.id);
  if (!m || m.nguoiNhan) return loi(res, "muc tieu khong hop le");
  m.nguoiNhan = x.s.tk.ten;
  luuState(st);
  tra(res, { ok: true, mucTieu: m });
}
async function sanNhim(req, res) {
  const st = docState();
  if (req.method === "GET") return tra(res, { ok: true, con: st.sanNhim.con });
  const b = await docJSON(req);
  const x = nvCua(req, res, b); if (!x) return;
  if (st.sanNhim.con <= 0) return loi(res, "het nhim");
  st.sanNhim.con -= 1;
  x.nv.tien += 50;
  D.luuNv(x.s.tk.ten, +b.o, x.nv);
  luuState(st);
  tra(res, { ok: true, con: st.sanNhim.con, tien: x.nv.tien });
}
async function tuLam(req, res) {
  const s = canPhien(req, res); if (!s) return;
  const st = docState();
  if (req.method === "GET") { const ds = Object.keys(st.tuLam).filter((k) => k.startsWith(s.tk.ten + ":")); return tra(res, { ok: true, dangTu: ds.length > 0, danhSach: ds }); }
  const b = await docJSON(req);
  const nv = D.docNv(s.tk.ten, +b.o);
  if (!nv) return loi(res, "khong co nhan vat", 404);
  const k = s.tk.ten + ":" + b.o;
  if (b.hanh === "bat-dau") { st.tuLam[k] = Date.now(); luuState(st); return tra(res, { ok: true }); }
  if (b.hanh === "ket-thuc" && st.tuLam[k]) {
    const phut = Math.floor((Date.now() - st.tuLam[k]) / 60000);
    delete st.tuLam[k];
    const kn = phut * 10;
    nv.kinhNghiem += kn;
    D.luuNv(s.tk.ten, +b.o, nv);
    luuState(st);
    return tra(res, { ok: true, phut, kinhNghiem: kn });
  }
  return loi(res, "hanh khong hop le");
}
function viemDe(req, res) { const st = docState(); tra(res, { ok: true, tang: st.viemDe.tang }); }
function daTau(req, res) { tra(res, { ok: true, lich: [{ tu: "Thanh pho", den: "Dao", gio: "09:00" }, { tu: "Dao", den: "Thanh pho", gio: "17:00" }] }); }
function minhChu(req, res) { const st = docState(); tra(res, { ok: true, minhChu: st.minhChu }); }
function loiDai(req, res) { const st = docState(); tra(res, { ok: true, bang: st.loiDai }); }
async function maQua(req, res) {
  const b = await docJSON(req);
  const x = nvCua(req, res, b); if (!x) return;
  const st = docState();
  const ma = st.maQua[String(b.ma || "").toUpperCase()];
  if (!ma) return loi(res, "ma khong hop le", 404);
  const k = x.s.tk.ten + ":" + b.ma;
  if (st.daNhanMa[k]) return loi(res, "ma da duoc dung");
  st.daNhanMa[k] = 1;
  x.nv.tien += ma.tien || 0;
  D.luuNv(x.s.tk.ten, +b.o, x.nv);
  luuState(st);
  tra(res, { ok: true, tien: x.nv.tien });
}
const routes = { "/api/tong-kim": tongKim, "/api/vuot-ai": vuotAi, "/api/phong-hoa": phongHoa, "/api/phong-lang-do": phongLangDo, "/api/sat-thu": satThu, "/api/san-nhim": sanNhim, "/api/tu-lam": tuLam, "/api/viem-de": viemDe, "/api/da-tau": daTau, "/api/minh-chu": minhChu, "/api/loi-dai": loiDai, "/api/ma-qua": maQua };
module.exports = { routes };