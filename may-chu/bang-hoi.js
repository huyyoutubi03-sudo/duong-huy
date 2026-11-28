// Bang hội đợt 1 — khôi phục tối thiểu (27/11/2026).
//   Bản chia sẻ Chien - Vo Lam Xua không có tính năng này; tệp cũ chỉ còn vỏ.
//   Bản này làm lại phần tối thiểu đủ để: lập bang, xin / mời / duyệt vào bang,
//   rời / đuổi / bổ nhiệm / chuyển vị / giải tán, danh hiệu + công cáo + tin chiêu mộ,
//   nhãn bang trên đầu (the-gioi.js), kênh bang (CH_TONG), xếp hạng bang, bền dữ liệu.
//   Đợt 2 (cống hiến / quỹ / cấp bang / tác phường / Lễ Vật / Tế Đàn...) CHƯA có:
//   các hàm cong / quai / nhanCho / teDanNay giữ no-op an toàn để các tệp khác gọi không lỗi,
//   các việc đợt 2 ở lam() trả lỗi "Đợt sau mới mở".
//   Dữ liệu: du-lieu/bang-hoi.json (ghi đồng bộ mỗi lần đổi — thao tác bang hiếm).
//   Nguồn duy nhất của thành viên / chức vụ / khảo nghiệm (du-lieu.js sao-luu chép kèm).
//   Cấu hình: cau-hinh.json mục bangHoi (thêm 27/11/2026 — không có thì dùng mặc định dưới đây,
//   khớp bhLuat() ở client src/game/main.js).
"use strict";
const fs = require("fs");
const path = require("path");
const D = require("./du-lieu");

const TEP = path.join(D.ROOT, "bang-hoi.json");
const KIEM = "qk:195"; // Nhạc Vương Kiếm — tín vật lập bang (do.js dungVat: nộp ở Người hướng dẫn bang hội)
const TEN_CV = { chu: "Bang chủ", lao: "Trưởng Lão", doi: "Đội trưởng", de: "Đệ tử", an: "ẩn sỹ" };
const TEN_PHE = { 1: "Chánh", 2: "Tà", 3: "Trung lập" };
const CV_THU = { chu: 0, lao: 1, doi: 2, de: 3, an: 4 };
const VAN = 10000;
const MOI_HET_MS = 60 * 1000; // lời mời vào bang hết sau 60 giây

let kiemTen = null; // api.js ganKiemTen(tenCam): tên bang + danh hiệu lọc cùng danh sách tên cấm
const ganKiemTen = (fn) => { kiemTen = fn; };

// cấu hình sống (do.js NOI.CFG đã qua apDung — F10 sửa thì lần đọc sau thấy ngay)
const cfgGoc = () => { try { return require("./do").NOI.CFG.bangHoi || {}; } catch { return {}; } };
const CF = {};
for (const [k, mac] of [["bat", true], ["capLap", 80], ["tsLap", null], ["khaoNgay", 3], ["khaoNguoi", 5], ["khaoIp", 1], ["phiLap", 1000000], ["roiCho", 24]])
  Object.defineProperty(CF, k, { enumerable: true, get: () => { const v = cfgGoc()[k]; return v === undefined ? mac : v; } });
const coKhao = () => (CF.khaoNgay | 0) > 0;
const coTien = () => cfgGoc().phiLap != null;

const loi = (t, ma) => { throw Object.assign(new Error(t), { code: ma || 400 }); };
const khoa = (s) => String(s || "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
const khoaTv = (tk, o) => tk + "\u0001" + (o | 0);
const TEN_BAD = /[\u0000-\u001f\u007f<>&"'`\\\u00ad\u061c\u115f\u1160\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufeff\uffa0]/;

let DL = null, KHOA = null;
function tai() {
  try { const j = JSON.parse(fs.readFileSync(TEP, "utf8")); DL = j && Array.isArray(j.bang) ? j : { v: 1, seq: 1, bang: [], cho: {} }; }
  catch (e) { if (e.code === "ENOENT") DL = { v: 1, seq: 1, bang: [], cho: {} }; else { DL = { v: 1, seq: 1, bang: [], cho: {} }; KHOA = "đọc lỗi"; } }
  if (!DL.cho || typeof DL.cho !== "object") DL.cho = {};
  if (!(DL.seq >= 1)) DL.seq = 1;
  xepChiSo();
}
function ghi() {
  if (KHOA) return; // kho đang khóa (tệp hỏng): không ghi đè
  const tmp = TEP + "." + process.pid + ".tmp";
  fs.mkdirSync(path.dirname(TEP), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(DL));
  fs.renameSync(tmp, TEP);
}
// chỉ số O(1): khóa "tài khoản ô" -> { B, m }
let CHI = new Map();
function xepChiSo() {
  CHI = new Map();
  for (const B of DL.bang) for (const m of B.tv) CHI.set(khoaTv(m.tk, m.o), { B, m });
}
const cua = (tk, o) => CHI.get(khoaTv(tk, o)) || null;
const bangCua = (tk, o) => { const c = cua(tk, o); return c ? c.B : null; };
const idCua = (tk, o) => { const B = bangCua(tk, o); return B ? B.id : null; };
const bangTheoId = (id) => DL.bang.find((B) => String(B.id) === String(id)) || null;

// Bot NPC vào bang như người chơi thật (Huy lệnh 16:08–16:09 28/11/2026: chia 170 bot vào 2 bang,
// đối xử như người chơi thật — chỉ bang chủ là người thật). Thêm thẳng thành viên, không qua
// mời/duyệt/xin (đường đó cần người bấm); không lộ qua HTTP (lam() không đổi). Idempotent: đã ở
// bang nào thì giữ nguyên bang đó, không nhảy bang; chưa có bang tên đó thì thôi để kỳ sau thử lại;
// đang trong thời gian chờ sau khi rời bang thì thôi. Không gửi tin hệ thống từng bot (170 tin
// 1 lúc sẽ spam kênh bang); ai cần biết thì đọc danh sách thành viên.
function vaoBangBot(tkTen, o, tenNv, tenBang) {
  const c = cua(tkTen, o);
  if (c) return { daCo: true, id: c.B.id, ten: c.B.ten };
  const B = DL.bang.find((x) => khoa(x.ten) === khoa(tenBang));
  if (!B) return { chuaCo: true };
  if ((DL.cho[khoaTv(tkTen, o)] || 0) > Date.now()) return { cho: true };
  B.tv.push({ tk: tkTen, o: o | 0, ten: tenNv, cv: "de", dh: "", vao: Date.now() });
  B.v++; xepChiSo(); ghi();
  return { vao: true, id: B.id, ten: B.ten };
}

function tenBangOk(t) {
  t = String(t || "").normalize("NFC").trim().replace(/\s+/g, " ");
  if (t.length < 2 || t.length > 14 || TEN_BAD.test(t)) loi("Tên bang hội 2–14 chữ, không dùng ký tự lạ.");
  if (kiemTen && kiemTen(t)) loi("Tên bang hội dùng chữ không được phép. Đặt tên khác đi.");
  if (DL.bang.some((B) => khoa(B.ten) === khoa(t))) loi(`Bang hội ${t} đã có rồi. Đặt tên khác đi.`);
  return t;
}
function dhOk(s) {
  s = String(s || "").normalize("NFC").trim().replace(/\s+/g, " ");
  if (s.length > 12) loi("Danh hiệu tối đa 12 chữ.");
  if (s && kiemTen && kiemTen(s)) loi("Danh hiệu dùng chữ không được phép. Đặt cái khác đi.");
  return s;
}
const nhanTv = (B, m) => (m.an ? B.ten : `${B.ten}(${m.dh || TEN_CV[m.cv] || ""})`);
const cvNgoai = (m) => (m.an ? "an" : m.cv);

// hết khảo nghiệm? kiểm lười ở mọi đường vào + quét mỗi phút
function quetKhao() {
  const t = Date.now(); let doi = false;
  for (const B of [...DL.bang]) {
    if (!B.khao || B.khao.het > t) continue;
    const du = new Set(B.tv.filter((m) => m.cv !== "chu").map((m) => m.tk)).size;
    if (du >= (B.khao.can | 0)) { B.khao = null; B.v++; doi = true; }
    else { DL.bang.splice(DL.bang.indexOf(B), 1); traKiem(B); doi = true; }
  }
  if (doi) { xepChiSo(); ghi(); }
}
setInterval(() => { try { quetKhao(); } catch (e) { console.error("Bang hội — quét khảo nghiệm:", e.message); } }, 60 * 1000).unref();
// trả Nhạc Vương Kiếm cho bang chủ khi bang giải tán lúc hết khảo nghiệm (qua hàng chờ quà — nhịp giao khi vừa túi)
function traKiem(B) {
  try {
    const tk = D.docTk(B.chu.tk); if (!tk) return;
    const h = tk.nv[B.chu.o | 0]; if (!h || h.name !== B.chu.ten) return;
    h.quaCho = [...(Array.isArray(h.quaCho) ? h.quaCho : []), { mon: [{ k: KIEM, n: 1 }], luc: Date.now(), he: 1, loi: `Bang hội ${B.ten} hết thời kỳ khảo nghiệm mà chưa đủ người — Nhạc Vương Kiếm trả lại cho ngươi` }];
    D.ghiTk(tk);
  } catch {}
}
function thongBao(B, text) { try { require("./the-gioi").thongBaoBang(text, B.id); } catch {} }

// BangXem: bản gửi trình duyệt (khung Bang phái + xem người khác) — không lộ khóa tài khoản
function xemCua(B, tk, o) {
  if (!B) return null;
  const toi = tk != null ? B.tv.find((m) => m.tk === tk && (m.o | 0) === (o | 0)) : null;
  let tv = [];
  try {
    const TG = require("./the-gioi");
    tv = B.tv.map((m) => {
      let cap = 0, fac = null;
      try { const t2 = D.docTk(m.tk), h2 = t2 && t2.nv[m.o | 0]; if (h2 && h2.name === m.ten) { cap = h2.lvl | 0; fac = h2.fac ?? null; } } catch {}
      return { ten: m.ten, cv: m.cv, dh: m.dh || "", an: !!m.an, cap, fac, vao: m.vao, on: !!(TG.dangChoi && TG.dangChoi(m.tk) && TG.dangChoi(m.tk).name === m.ten) };
    });
  } catch { tv = B.tv.map((m) => ({ ten: m.ten, cv: m.cv, dh: m.dh || "", an: !!m.an, cap: 0, fac: null, vao: m.vao, on: false })); }
  tv.sort((a, b) => (CV_THU[a.cv] ?? 9) - (CV_THU[b.cv] ?? 9) || String(a.ten).localeCompare(String(b.ten)));
  return { id: B.id, ten: B.ten, phe: B.phe, chu: B.chu.ten, lap: B.lap, v: B.v, cap: 1,
    khao: B.khao ? { het: B.khao.het, can: B.khao.can, du: new Set(B.tv.filter((m) => m.cv !== "chu").map((m) => m.tk)).size } : null,
    congCao: B.congCao || "", chieuMo: { ...(B.chieuMo || {}) }, dhChung: { ...(B.dhChung || {}) },
    tv, xin: B.xin.map((x) => ({ ten: x.ten, luc: x.luc })),
    toi: toi ? { cv: toi.cv, dh: toi.dh || "", an: !!toi.an, cong: 0 } : null };
}
function dsList() {
  return DL.bang.map((B) => ({ id: B.id, ten: B.ten, phe: B.phe, chu: B.chu.ten, n: B.tv.length, khao: !!B.khao, chieuMo: (B.chieuMo && B.chieuMo.tin) || "" }));
}
function nhanCua(B, m) {
  return { bh: nhanTv(B, m), bhp: B.phe, id: B.id, cv: cvNgoai(m) };
}

// nhịp: bhMinh / bhMoi / bhCc (tra O(1); lỗi không làm hỏng nhịp — api.js đã try/catch)
function nhip(tkTen, o, h, b, tk) {
  quetKhao();
  const r = {};
  const c = h ? cua(tkTen, o) : null;
  if (h) {
    if (c) {
      const { B, m } = c;
      r.bhMinh = { id: B.id, ten: B.ten, cv: cvNgoai(m), v: B.v, nhan: nhanTv(B, m), dh: m.dh || "" };
    } else r.bhMinh = null;
    const B0 = c ? c.B : null;
    // lời mời đang chờ của ô này
    let moi = null;
    for (const B of DL.bang) { const x = (B.moi || []).find((y) => y.tk === tkTen && (y.o | 0) === (o | 0) && y.het > Date.now()); if (x) { moi = { id: B.id, ten: B.ten, nguoi: x.nguoi, het: x.het }; break; } }
    r.bhMoi = moi;
    // công cáo ghim: chỉ gửi khi mã trình duyệt đang có khác mã hiện tại
    const ccId = (B0 && B0.congCao) ? (B0.id * 1000003 + hashCc(B0.congCao)) >>> 0 || 1 : 0;
    if ((b && b.bhcc != null ? +b.bhcc : -1) !== ccId) r.bhCc = ccId === 0 ? { id: 0 } : { id: ccId, t: B0.congCao };
  }
  return r;
}
function hashCc(s) { let x = 0; for (let i = 0; i < s.length; i++) x = (Math.imul(x, 31) + s.charCodeAt(i)) | 0; return x >>> 0; }

// nhãn bang trên đầu người khác (the-gioi.js nhip): { bh, bhp, id, cv } | null
function nhan(tkTen, o, h) {
  quetKhao();
  const c = cua(tkTen, o);
  if (!c || !h || h.name !== c.m.ten) return null;
  return nhanCua(c.B, c.m);
}
// xem trang bị người khác (api.js xemDo): { B, m } — B có dhChung, m có cv/dh
function cuaNv(tkTen, o, tenNv) {
  const c = cua(tkTen, o);
  if (!c || c.m.ten !== tenNv) return null;
  return { B: c.B, m: c.m };
}
function datKhu() { return null; }
function xa() { return null; }

// ---- việc POST /api/bang-hoi ----
function lam(tk, h, o, b, qtMo) {
  if (KHOA) loi(`Kho bang hội đang khóa (${KHOA}). Xử lý ở F10 → Bang hội rồi hãy làm.`);
  if (!h) loi("Chưa vào game. Vào game rồi hãy làm.");
  quetKhao();
  const viec = String(b.viec || "");
  const c = cua(tk.ten, o), B = c ? c.B : null, m = c ? c.m : null;
  const quyen = (loai) => { // chu: mọi quyền; lao: duyệt / mời / bổ nhiệm / danh hiệu / công cáo; doi: mời
    if (!m) return false;
    if (m.cv === "chu") return true;
    if (m.cv === "lao") return ["duyet", "moi", "boNhiem", "danhHieu", "congCao"].includes(loai);
    if (m.cv === "doi") return loai === "moi";
    return false;
  };
  const choCon = () => { const den = DL.cho[khoaTv(tk.ten, o)] || 0; return den > Date.now() ? Math.ceil((den - Date.now()) / 3600000) : 0; };
  const doi = () => { B.v++; xepChiSo(); ghi(); };

  switch (viec) {
    case "xem": return { bh: B ? xemCua(B, tk.ten, o) : null };
    case "ds": { const r = { ds: dsList() }; const g = choCon(); if (g) r.cho = g; return r; }
    case "lap": {
      if (B) loi("Đã ở bang hội rồi thì đừng hòng lập thêm bang khác! Muốn lập bang mới thì rời bang trước.");
      const g = choCon(); if (g) loi(`Vừa rời bang — chờ ${g} giờ nữa rồi hãy lập / vào bang khác.`);
      const ten = tenBangOk(b.ten);
      const phe = +b.phe === 1 || +b.phe === 2 || +b.phe === 3 ? +b.phe : 0;
      if (!phe) loi("Chọn phe cho bang hội: Chánh, Tà hay Trung lập.");
      if (!qtMo) {
        if ((h.lvl | 0) < (CF.capLap | 0)) loi(`Lập bang hội cần đẳng cấp ${CF.capLap} trở lên.`);
        if (CF.tsLap && ((h.leadLv | 0) < CF.tsLap)) loi(`Lập bang hội cần lực thống soái thấp nhất ${CF.tsLap} điểm.`);
        const i = (h.bag || []).findIndex((x) => x && x.k === KIEM);
        if (i < 0) loi("Lập bang hội cần Nhạc Vương Kiếm làm tín vật bang chủ.");
        if (coTien() && (h.gold | 0) < (CF.phiLap | 0)) loi(`Lập bang phái cần ${Math.round(CF.phiLap / VAN)} vạn lượng. Không đủ tiền thì đừng tới.`);
        const it = h.bag[i]; if ((it.n | 0) > 1) it.n--; else h.bag.splice(i, 1);
        if (coTien()) h.gold = (h.gold | 0) - (CF.phiLap | 0);
      }
      const NB = { id: DL.seq++, ten, phe, chu: { tk: tk.ten, o: o | 0, ten: h.name }, lap: Date.now(), v: 1,
        congCao: "", chieuMo: { mo: 1, tin: "" }, dhChung: { nam: "", nu: "" },
        tv: [{ tk: tk.ten, o: o | 0, ten: h.name, cv: "chu", dh: "", vao: Date.now() }], xin: [], moi: [],
        khao: coKhao() ? { het: Date.now() + (CF.khaoNgay | 0) * 86400000, can: CF.khaoNguoi | 0 } : null };
      DL.bang.push(NB); xepChiSo(); ghi();
      return { doi: 1, bh: xemCua(NB, tk.ten, o), msg: "Sáng lập bang hội thành công!", tin: [`Sáng lập bang hội ${ten} thành công!`] };
    }
    case "xin": {
      if (B) loi("Đã ở bang hội rồi thì đừng xin vào bang khác.");
      const g = choCon(); if (g) loi(`Vừa rời bang — chờ ${g} giờ nữa rồi hãy xin vào bang khác.`);
      const B2 = bangTheoId(b.id); if (!B2) loi("Không có bang hội này.");
      if (!((B2.chieuMo || {}).mo)) loi("Bang hội này hiện không chiêu mộ.");
      if (B2.xin.some((x) => x.tk === tk.ten && (x.o | 0) === (o | 0))) loi("Đã gửi đơn rồi. Chờ bang chủ duyệt đi.");
      if ((B2.chieuMo || {}).tuNhan) {
        B2.tv.push({ tk: tk.ten, o: o | 0, ten: h.name, cv: "de", dh: "", vao: Date.now() }); B2.v++; xepChiSo(); ghi();
        thongBao(B2, `${h.name} đã gia nhập bang hội.`);
        return { bh: xemCua(B2, tk.ten, o), msg: `Đã gia nhập bang hội ${B2.ten}!` };
      }
      B2.xin.push({ tk: tk.ten, o: o | 0, ten: h.name, luc: Date.now() }); B2.v++; xepChiSo(); ghi();
      return { msg: `Đã gửi đơn xin gia nhập bang hội ${B2.ten}. Chờ duyệt đi.`, ds: dsList() };
    }
    case "huyXin": {
      const B2 = bangTheoId(b.id); if (!B2) loi("Không có bang hội này.");
      const i = B2.xin.findIndex((x) => x.tk === tk.ten && (x.o | 0) === (o | 0));
      if (i < 0) loi("Chưa gửi đơn xin vào bang này.");
      B2.xin.splice(i, 1); B2.v++; xepChiSo(); ghi();
      return { msg: "Đã rút đơn xin gia nhập.", ds: dsList() };
    }
    case "duyet": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (!quyen("duyet")) loi("Không có quyền hạn để thực hiện thao tác này!");
      const x = B.xin.find((y) => khoa(y.ten) === khoa(b.ten));
      if (!x) loi(`Không có đơn xin gia nhập của ${b.ten}.`);
      B.xin.splice(B.xin.indexOf(x), 1);
      if (+b.dong) {
        if (cua(x.tk, x.o)) { B.v++; xepChiSo(); ghi(); return { bh: xemCua(B, tk.ten, o), msg: `${x.ten} đã ở bang khác rồi.` }; }
        B.tv.push({ tk: x.tk, o: x.o | 0, ten: x.ten, cv: "de", dh: "", vao: Date.now() });
        thongBao(B, `${x.ten} đã gia nhập bang hội.`);
        B.v++; xepChiSo(); ghi();
        return { bh: xemCua(B, tk.ten, o), msg: `${x.ten} đã vào bang hội.` };
      }
      B.v++; xepChiSo(); ghi();
      return { bh: xemCua(B, tk.ten, o), msg: `Đã từ chối đơn của ${x.ten}.` };
    }
    case "moi": {
      if (b.bot) return { msg: `${b.ten} đã từ chối lời mời vào bang.` }; // bot Tống Kim: trả lời như người thật cự tuyệt
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (!quyen("moi")) loi("Không có quyền hạn để thực hiện thao tác này!");
      const ten = String(b.ten || "").trim();
      if (!ten || khoa(ten) === khoa(h.name)) loi("Mời ai? Gõ tên người đó đi.");
      // tìm nhân vật đang chơi (the-gioi.js dangChoi — phải ở gần, như menu người chơi)
      let tk2 = null, o2 = -1;
      try { const TG = require("./the-gioi"); const tkTen = TG.timTen(ten); if (tkTen) { const t2 = D.docTk(tkTen); o2 = (t2 && t2.nv || []).findIndex((y) => y && y.name === ten); if (o2 >= 0) tk2 = tkTen; } } catch {}
      if (!tk2) loi(`${ten} đang không ở đây. Lại gần rồi hãy mời.`);
      if (cua(tk2, o2)) loi(`${ten} đã có bang hội rồi.`);
      if ((B.moi || []).some((y) => y.tk === tk2 && y.het > Date.now())) loi(`Đã mời ${ten} rồi. Chờ trả lời đi.`);
      B.moi = (B.moi || []).filter((y) => y.het > Date.now());
      B.moi.push({ tk: tk2, o: o2, ten, nguoi: h.name, het: Date.now() + MOI_HET_MS });
      B.v++; xepChiSo(); ghi();
      return { msg: `Đã mời ${ten} gia nhập bang hội ${B.ten}.` };
    }
    case "nhanMoi": {
      if (B) loi("Đã ở bang hội rồi thì đừng hòng vào thêm bang khác!");
      const g = choCon(); if (g) loi(`Vừa rời bang — chờ ${g} giờ nữa rồi hãy vào bang khác.`);
      const B2 = bangTheoId(b.id); if (!B2) loi("Lời mời hết hạn rồi. Mời lại đi.");
      const i = (B2.moi || []).findIndex((y) => y.tk === tk.ten && (y.o | 0) === (o | 0) && y.het > Date.now());
      if (i < 0) loi("Lời mời hết hạn rồi. Mời lại đi.");
      B2.moi.splice(i, 1);
      if (+b.dong) {
        B2.tv.push({ tk: tk.ten, o: o | 0, ten: h.name, cv: "de", dh: "", vao: Date.now() });
        thongBao(B2, `${h.name} đã gia nhập bang hội.`);
        B2.v++; xepChiSo(); ghi();
        return { bh: xemCua(B2, tk.ten, o), msg: `Đã gia nhập bang hội ${B2.ten}!` };
      }
      B2.v++; xepChiSo(); ghi();
      return { msg: "Đã từ chối lời mời vào bang." };
    }
    case "roi": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (m.cv === "chu") loi("Bang chủ phải chuyển vị trước rồi mới rời bang được.");
      B.tv.splice(B.tv.indexOf(m), 1);
      DL.cho[khoaTv(tk.ten, o)] = Date.now() + (CF.roiCho | 0) * 3600000;
      thongBao(B, `${h.name} đã rời khỏi bang hội.`);
      B.v++; xepChiSo(); ghi();
      return { bh: null, cho: CF.roiCho | 0, msg: `Đã rời khỏi bang hội ${B.ten}.` };
    }
    case "duoi": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (!quyen("duoi") && !quyen("boNhiem")) loi("Không có quyền hạn để thực hiện thao tác này!");
      const m2 = B.tv.find((y) => khoa(y.ten) === khoa(b.ten));
      if (!m2) loi(`Không có ${b.ten} trong bang.`);
      if (m2.cv === "chu") loi("Không đuổi được bang chủ.");
      if (m.cv === "lao" && m2.cv === "lao") loi("Trưởng lão không đuổi được trưởng lão.");
      B.tv.splice(B.tv.indexOf(m2), 1);
      thongBao(B, `${m2.ten} đã bị trục xuất khỏi bang hội.`);
      B.v++; xepChiSo(); ghi();
      return { bh: xemCua(B, tk.ten, o), msg: `Đã trục xuất ${m2.ten} khỏi bang hội.` };
    }
    case "boNhiem": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (m.cv !== "chu") loi("Chỉ bang chủ mới bổ nhiệm được.");
      const m2 = B.tv.find((y) => khoa(y.ten) === khoa(b.ten));
      if (!m2) loi(`Không có ${b.ten} trong bang.`);
      if (m2.cv === "chu") loi("Bang chủ thì bổ nhiệm gì nữa.");
      const cv = String(b.cv || "");
      if (!["lao", "doi", "de"].includes(cv)) loi("Chức vụ không có.");
      m2.cv = cv; doi();
      thongBao(B, `${m2.ten} được bổ nhiệm làm ${TEN_CV[cv]}.`);
      return { bh: xemCua(B, tk.ten, o), msg: `${m2.ten} giờ là ${TEN_CV[cv]}.` };
    }
    case "chuyenVi": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (m.cv !== "chu") loi("Chỉ bang chủ mới chuyển vị được.");
      const m2 = B.tv.find((y) => khoa(y.ten) === khoa(b.ten));
      if (!m2 || m2 === m) loi("Chọn người khác trong bang để chuyển vị.");
      m.cv = "lao"; m2.cv = "chu"; B.chu = { tk: m2.tk, o: m2.o | 0, ten: m2.ten }; doi();
      thongBao(B, `${m2.ten} giờ là bang chủ.`);
      return { bh: xemCua(B, tk.ten, o), msg: `Đã chuyển vị bang chủ cho ${m2.ten}.` };
    }
    case "thoaiAn": if (!B) loi("Chưa vào bang hội nào cả."); m.an = true; doi(); return { bh: xemCua(B, tk.ten, o), msg: "Đã ẩn thân phận trong bang." };
    case "huyAn": if (!B) loi("Chưa vào bang hội nào cả."); m.an = false; doi(); return { bh: xemCua(B, tk.ten, o), msg: "Đã hiện thân phận trong bang." };
    case "epAn": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (m.cv !== "chu") loi("Chỉ bang chủ mới bắt ẩn sỹ được.");
      const m2 = B.tv.find((y) => khoa(y.ten) === khoa(b.ten));
      if (!m2 || m2.cv === "chu") loi("Không bắt được người này ẩn sỹ.");
      m2.an = true; doi();
      return { bh: xemCua(B, tk.ten, o), msg: `${m2.ten} đã bị bắt ẩn sỹ.` };
    }
    case "danhHieu": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (!quyen("danhHieu")) loi("Không có quyền hạn để thực hiện thao tác này!");
      const m2 = B.tv.find((y) => khoa(y.ten) === khoa(b.ten));
      if (!m2) loi(`Không có ${b.ten} trong bang.`);
      m2.dh = dhOk(b.dh); doi();
      return { bh: xemCua(B, tk.ten, o), msg: m2.dh ? `Danh hiệu của ${m2.ten} là ${m2.dh}.` : `Đã xóa danh hiệu của ${m2.ten}.` };
    }
    case "dhChung": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (m.cv !== "chu") loi("Chỉ bang chủ mới đặt danh hiệu chung được.");
      B.dhChung = { nam: dhOk(b.nam), nu: dhOk(b.nu) }; doi();
      return { bh: xemCua(B, tk.ten, o), msg: "Đã đặt danh hiệu chung của bang." };
    }
    case "congCao": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (!quyen("congCao")) loi("Không có quyền hạn để thực hiện thao tác này!");
      B.congCao = String(b.m || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 500); doi();
      return { bh: xemCua(B, tk.ten, o), msg: "Đã ghim công cáo của bang." };
    }
    case "chieuMo": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (m.cv !== "chu") loi("Chỉ bang chủ mới đặt tin chiêu mộ được.");
      B.chieuMo = { mo: b.mo == null ? 1 : +b.mo ? 1 : 0, hd: String(b.hd || "").slice(0, 200), tin: String(b.tin || "").slice(0, 500),
        tuNhan: !!b.tuNhan, tuChoi: !!b.tuChoi }; doi();
      return { bh: xemCua(B, tk.ten, o), msg: "Đã đặt tin chiêu mộ của bang." };
    }
    case "quyen": { // đợt 2: chỉ ghi nhận, chưa thi hành
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (m.cv !== "chu") loi("Chỉ bang chủ mới đặt quyền hạn được.");
      B.quyen = b.q && typeof b.q === "object" ? b.q : {}; doi();
      return { bh: xemCua(B, tk.ten, o), msg: "Đã đặt quyền hạn của bang." };
    }
    case "giaiTan": {
      if (!B) loi("Chưa vào bang hội nào cả.");
      if (m.cv !== "chu") loi("Chỉ bang chủ mới giải tán bang được.");
      DL.bang.splice(DL.bang.indexOf(B), 1);
      xepChiSo(); ghi();
      try { h.quaCho = [...(Array.isArray(h.quaCho) ? h.quaCho : []), { mon: [{ k: KIEM, n: 1 }], luc: Date.now(), he: 1, loi: `Tự giải tán bang hội ${B.ten} — Nhạc Vương Kiếm trả lại cho ngươi` }]; } catch {}
      return { doi: 1, bh: null, msg: `Bang hội ${B.ten} đã giải tán. Nhạc Vương Kiếm trả lại cho ngươi.` };
    }
    default:
      loi("Chức năng này đợt sau mới mở.");
  }
}

// phiếu đợt 2 (api.js nhip nhanCho): chưa có -> null ngay, O(1)
function nhanCho() { return null; }
// cống hiến đợt 2 (do.js / boss / hoạt động gọi): chưa có -> no-op
function cong() { return null; }
function quai() { return null; }
// Tế Đàn đợt 2 (lich-hd.js): chưa có -> null
function teDanNay() { return null; }
// Rương Thần Bí (ruong-tb.js): không chặn
function chanRtb() { return null; }
// kho có đang khóa không (quan-tri.js xóa tài khoản chặn trước)
function khoaKho() { return KHOA; }

// xóa nhân vật (api.js xoaNv): bang chủ phải chuyển vị trước; người khác rời bang
function xoaNv(tkTen, o, tenNv) {
  const c = cua(tkTen, o);
  if (!c) return null;
  if (c.m.ten !== tenNv) return null;
  if (c.m.cv === "chu") return "Bang chủ phải chuyển vị trước rồi mới xóa nhân vật được.";
  const { B, m } = c;
  B.tv.splice(B.tv.indexOf(m), 1);
  B.xin = B.xin.filter((x) => !(x.tk === tkTen && (x.o | 0) === (o | 0)));
  B.moi = (B.moi || []).filter((y) => !(y.tk === tkTen && (y.o | 0) === (o | 0)));
  delete DL.cho[khoaTv(tkTen, o)];
  B.v++; xepChiSo(); ghi();
  return null;
}
// xóa tài khoản (quan-tri.js): nhân vật rời bang; bang chủ chuyển cho người ở lâu nhất (ưu tiên lao > doi > de),
// bang hết người thì giải tán. Trả [câu ghi nhật ký...]
function xoaTk(tkTen) {
  const ra = [];
  for (const tk2 of [tkTen]) {
    let t2 = null; try { t2 = D.docTk(tk2); } catch {}
    if (!t2) continue;
    (t2.nv || []).forEach((hv, o) => {
      if (!hv) return;
      const c = cua(tk2, o); if (!c) return;
      const { B, m } = c;
      if (m.cv === "chu") {
        const con = B.tv.filter((y) => y !== m).sort((a, b) => (CV_THU[a.cv] ?? 9) - (CV_THU[b.cv] ?? 9) || (a.vao - b.vao));
        if (con.length) {
          const n = con[0]; n.cv = "chu"; B.chu = { tk: n.tk, o: n.o | 0, ten: n.ten };
          B.tv.splice(B.tv.indexOf(m), 1); B.v++; ra.push(`bang ${B.ten}: chuyển bang chủ cho ${n.ten}`);
        } else {
          DL.bang.splice(DL.bang.indexOf(B), 1); ra.push(`bang ${B.ten}: giải tán (hết người)`);
        }
      } else {
        B.tv.splice(B.tv.indexOf(m), 1); B.v++; ra.push(`rời bang ${B.ten}`);
      }
      delete DL.cho[khoaTv(tk2, o)];
    });
  }
  xepChiSo(); ghi();
  return ra;
}

// quản trị F10 (quan-tri.js "bang-hoi"): ds | xem | doiTen | chuyenChu | quaKhao | giaiTan | congCao
function quanTri(qt, b) {
  const lamViec = String(b.lam || b.viec || "ds");
  if (lamViec === "ds") return { ds: DL.bang.map((B) => ({ id: B.id, ten: B.ten, phe: B.phe, chu: B.chu.ten, n: B.tv.length, khao: !!B.khao, lap: B.lap })) };
  const B = bangTheoId(b.id);
  if (!B) loi("Không có bang hội này.", 404);
  if (lamViec === "xem") return { bh: xemCua(B, null, 0) };
  if (lamViec === "doiTen") { B.ten = tenBangOk(b.ten); B.v++; xepChiSo(); ghi(); return { msg: `Đã đổi tên bang thành ${B.ten}.` }; }
  if (lamViec === "chuyenChu") {
    const m2 = B.tv.find((y) => khoa(y.ten) === khoa(b.ten)); if (!m2) loi(`Không có ${b.ten} trong bang.`);
    const cu = B.tv.find((y) => y.cv === "chu"); if (cu) cu.cv = "lao";
    m2.cv = "chu"; B.chu = { tk: m2.tk, o: m2.o | 0, ten: m2.ten }; B.v++; xepChiSo(); ghi();
    return { msg: `Bang ${B.ten} giờ do ${m2.ten} làm bang chủ.` };
  }
  if (lamViec === "quaKhao") { B.khao = null; B.v++; xepChiSo(); ghi(); return { msg: `Bang ${B.ten} đã qua thời kỳ khảo nghiệm.` }; }
  if (lamViec === "giaiTan") { DL.bang.splice(DL.bang.indexOf(B), 1); xepChiSo(); ghi(); return { msg: `Đã giải tán bang ${B.ten}.` }; }
      B.congCao = String(b.m || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 500); doi();
  loi("Không có việc quản trị này.", 404);
}
// xếp hạng bang (xep-hang.js): cấp bang giảm dần, rồi tổng cấp, nhân số, tên
function dsXepHang(tong) {
  return DL.bang.map((B) => ({ id: B.id, ten: B.ten, chu: B.chu.ten, cap: 1, n: B.tv.length, tongCap: (tong && tong.get(B.id)) || 0 }))
    .sort((a, b) => b.cap - a.cap || b.tongCap - a.tongCap || b.n - a.n || String(a.ten).localeCompare(String(b.ten)));
}

tai();

module.exports = { lam, nhip, nhan, idCua, cuaNv, datKhu, bangTheoId, vaoBangBot, xoaNv, xoaTk,
  khoaKho, quanTri, dsXepHang, ganKiemTen, xa, CF, TEN_CV, TEN_PHE, cong, quai, nhanCho,
  chanRtb, teDanNay, VAN };
