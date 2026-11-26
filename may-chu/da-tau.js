// Dã Tẩu — chuỗi nhiệm vụ hằng ngày (anh 27/10: "làm dã tẩu … tham khảo client để làm chính xác"). Luật theo kịch bản máy chủ 8.1 Vinh
// (ổ ảo, chỉ đọc): script\global\seasonnpc.lua (hội thoại, giới hạn ngày, hủy, chọn thưởng), script\task\newtask\tasklink\tasklink_head.lua
// (giao nhiệm vụ, đếm chuỗi), tasklink_award.lua (công thức thưởng); bảng: assets/data/da-tau.json (cong-cu/dung-da-tau.js).
//   - Mỗi ngày (giờ Việt Nam) nhận tối đa gioiHan (40) nhiệm vụ; nhiệm vụ thứ 30 trong ngày (trừ số lần hủy) +kn30 kinh nghiệm, đủ 40 mà
//     không hủy lần nào +kn40 (cau-hinh.json daTau — số client 30 triệu / 100 triệu).
//   - Chuỗi: 20 nhiệm vụ = 1 "chuỗi", 20 chuỗi = 1 vòng (400 nhiệm vụ). "Link" 1–20 = độ khó: bắt đầu ở link theo cấp (levellink: cấp 1
//     -> 1, 20 -> 3, 50 -> 6, 80 -> 11, 100 -> 16), mỗi link chiếm floor(20 / số link của bậc) chuỗi. Loại nhiệm vụ + dòng nhiệm vụ chọn
//     theo trọng số của link.
//   - Xong nhiệm vụ: 3 phần thưởng (trọng số loại 20 tiền / 33 kinh nghiệm / 34 vật phẩm / 8 thử vận / 5 cơ hội hủy, không trùng loại),
//     giá trị = TaskValue1 + TaskValue2 × (1 + (số chuỗi đã xong trong bậc + số nhiệm vụ trong chuỗi) × 0,1) (+ vòng × 0,2).
//   - Hủy: còn cơ hội hủy thì trừ 1 (nhiệm vụ mới cùng chỗ); hết thì làm lại từ đầu chuỗi (hoặc nộp daTau.huyShxt mảnh Sơn Hà Xã Tắc — client 100,
//     anh 10/11: 50 — để có thêm 1 cơ hội; hoàn thành ngay: xongNhanh). Hủy 3 lần liền ở nhiệm vụ đầu chuỗi: Dã Tẩu không giao trong 10 phút.
//   - Tìm vật phẩm đòi món Kỳ Trân Các (dòng có k — Sát Thủ Giản cấp 90 từ link 16, Huyền tinh 1–6 từ link 11): nộp đúng món đó (anh 02/11 khuya:
//     "nộp sát thủ giản thì được" — giản không còn hệ, lấy 1 trong chồng); dòng tạm bỏ (daTau.tamBo — Huyền tinh "cho tới khi update") không giao,
//     ai đang làm thì nói chuyện với Dã Tẩu là đổi nhiệm vụ khác (không mất lượt / cơ hội hủy).
// Mốc thưởng (anh 28/10 — game thêm, client không có): đếm nhiệm vụ đã xong (chọn thưởng xong) trong ngày (xongNgay) và từ trước tới nay
// (tongXong — không mất khi hủy / làm lại chuỗi). Đúng mốc ngày (cau-hinh.json daTau.mocNgay — 30, 40) hoặc mốc tổng (daTau.mocTong — 500,
// 1000 … 10000) thì trao gói quà { kn, tien, xu, do: [[mã, số]] }; túi đầy thì Dã Tẩu giữ món (D.no), lần sau nói chuyện trao tiếp.
// "Mốc càng cao càng khó, thưởng càng nhiều": bậc = tongXong / moiBac (tối đa bacToiDa) -> mỗi khoBac bậc nhiệm vụ khó lên 1 link (vẫn
// trong bậc link của cấp — dòng nhiệm vụ đòi món hợp cấp), thưởng mỗi nhiệm vụ × (1 + bậc × thuongBac).
// h.daTau = { lan (nhiệm vụ thứ mấy trong chuỗi 0–19), link, vong, huy (cơ hội hủy), chuoi (chuỗi đã xong trong link), buoc (0 chưa
// nhận, 1 đang làm, 2 xong chờ thưởng, 3 đã thưởng), loai, dong (chỉ số trong nv[loai]), bai / chi / can / co (thu thập địa đồ), goc
// ([cấp, kinh nghiệm] lúc nhận — nâng cấp kinh nghiệm), thuong ([3 phần thưởng]), ngay, soNgay, huyNgay, phat, phatLuc, mo, lk (link độ khó của nhiệm vụ đang
// giao), xongNgay, tongXong, no ([[mã, số]] quà mốc còn giữ), ruongMoc (tổng nhiệm vụ lúc phát Bảo rương thần bí gần nhất — ruong10) }
"use strict";
const fs = require("fs");
const path = require("path");
const DO = require("./do.js");

const ROOT = path.join(__dirname, "..");
const DT = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "assets/data/da-tau.json"), "utf8")); } catch { return null; } })();
const GOC = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/data/do-goc.json"), "utf8")).items;
const N = DO.NOI, CFG = N.CFG.daTau || {};
const CAP_NHAN = CFG.capNhan ?? 20;
// bỏ khỏi bảng thưởng của client (anh 29/10 "bỏ thưởng bí kíp và võ lâm mật tịch hay tẩy tủy kinh khỏi dã tẩu"): món có loại dùng trong
// cau-hinh.json daTau.boThuong (loại của Kỳ Trân Các: sach = sách võ công 90, matTich, tayTuy…) — bảng thưởng vật phẩm (award_basic: 28 sách
// + Mật Tịch + Tẩy Tủy -> còn Tinh Hồng Bảo Thạch, Tiên Thảo Lộ, Thiên Sơn Bảo Lộ) và quà mốc (award_link)
if (DT) {
  const KTC = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/data/ky-tran-cac.json"), "utf8")).items;
  const bo = new Set(CFG.boThuong || ["sach", "sach120", "daiThanh", "matTich", "tayTuy"]), giu = (o) => !bo.has(((KTC[o.k] || {}).dung || {}).loai);
  DT.thuongVat = DT.thuongVat.filter(giu); DT.thuongMoc = DT.thuongMoc.filter(giu);
}
const GH = CFG.gioiHan || 40;
const MOC_NGAY = CFG.mocNgay || { 30: { kn: CFG.kn30 ?? 30000000 }, 40: { kn: CFG.kn40 ?? 100000000 } }, MOC_TONG = CFG.mocTong || {};
const MOI_BAC = CFG.moiBac || 500, BAC_TOI_DA = CFG.bacToiDa ?? 20, KHO_BAC = CFG.khoBac ?? 4, THUONG_BAC = CFG.thuongBac ?? 0.05;
// anh 31/10 khuya lần 2: ô Kinh nghiệm / ô Tiền mỗi nhiệm vụ (và kinh nghiệm / tiền của Thử vận) × hệ số ("x2 là được"); ô Vật phẩm: món tỉ lệ cố
// định (daTau.oVatCoDinh [[mã, %]] — "tinh hồng thiết la hán 0.5 %") bốc trước, trượt thì chọn theo giá trị như client trong các món còn lại;
// quà theo tổng nhiệm vụ (daTau.mocChuoi — thay bảng award_link của client; anh chốt "mỗi mốc 1 gói" như client: { moc } đúng N trước, không có
// thì { moi } khớp có N lớn nhất — 1000 chỉ nhận gói 1000, 2000 chỉ gói 2000, các số tròn trăm khác gói mỗi 100)
const HS_KN = CFG.heSoKn ?? 1, HS_TIEN = CFG.heSoTien ?? 1;
const CO_DINH = (CFG.oVatCoDinh || []).filter(([k, p]) => N.BY.get(k) && p > 0), VAT_CON = DT ? DT.thuongVat.filter((o) => !CO_DINH.some(([k]) => k === o.k)) : [];
const MOC_CHUOI = Array.isArray(CFG.mocChuoi) ? CFG.mocChuoi : null;
const goiChuoi = (tong) => {
  const ds = (MOC_CHUOI || []).filter((r) => (r.moi > 0 && tong > 0 && tong % r.moi === 0) || r.moc === tong), rieng = ds.filter((r) => r.moc === tong);
  return rieng.length ? rieng.slice(0, 1) : ds.sort((a, b) => b.moi - a.moi).slice(0, 1);
};
const mocChuoiSau = (tong) => { for (let n = (tong % 8000) + 1; MOC_CHUOI && n <= 8000; n++) if (goiChuoi(n).length) return n; return null; }; // tới 8000 đếm lại
const mocSau = (M, n) => Object.keys(M).map(Number).filter((m) => m > n).sort((a, b) => a - b)[0] || null;
const HE = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
const loi = N.loi, ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// anh 16/11 — Báo Đáp Ân Sư (may-chu/bao-dap-an-su.js, nạp lúc dùng): xong nhiệm vụ thứ 40 trong ngày -> món sự kiện (thuongNguon "daTau40") qua traoMon (túi đầy:
// Dã Tẩu giữ D.no như quà mốc). Module thiếu / ném lỗi -> [] (thưởng Dã Tẩu như cũ); món chưa có trong kho đồ thì bỏ
const BD = () => require("./bao-dap-an-su");
function bdMon(nguon, x) {
  try { return (BD().thuongNguon(nguon, x) || []).filter((r) => Array.isArray(r) && N.BY.has(String(r[0])) && (r[1] | 0) > 0).map(([k, n]) => ({ k: String(k), n: n | 0 })); }
  catch (e) { if (!e || e.code !== "MODULE_NOT_FOUND") console.error("Báo Đáp Ân Sư —", nguon, e && e.message); return []; }
}
const capDo = (k) => (GOC[k] || {}).cl || 1;
const xung = (h) => ((h.sex | 0) === 1 ? "Nữ hiệp" : "Công tử "); // GetPlayerSex của client
const Y = (t) => `<color=yellow>${t}<color>`;

// ---------- đếm chuỗi (tl_getlinksforlevel / tl_gettasklinknum / tl_counttasklinknum) ----------
const bacCua = (link) => DT.bac.find((b) => link >= b[1] && link <= b[2]) || DT.bac[0];
const linkDau = (lv) => DT.bac.reduce((s, b) => (lv >= b[0] ? b[1] : s), DT.bac[0][1]); // tl_getfirstlink
function chuoiCuaLink(link) { // số chuỗi của link này (link cuối bậc nhận phần dư)
  const b = bacCua(link), n = b[2] - b[1] + 1, moi = Math.floor(20 / n);
  return link === b[2] ? 20 - (n - 1) * moi : moi;
}
function chuoiXong(D) { // số chuỗi đã xong trong bậc (tl_counttasklinknum(2))
  const b = bacCua(D.link);
  let n = D.chuoi | 0;
  for (let l = b[1]; l < D.link; l++) n += chuoiCuaLink(l);
  return n;
}
const tongNv = (D) => chuoiXong(D) * 20 + (D.lan | 0) + (D.vong | 0) * 400 + (D.buoc === 2 || D.buoc === 3 ? 1 : 0); // tl_counttasklinknum(1)
// tổng nhiệm vụ đã xong từ trước tới nay (nhân vật làm trước 28/10: lấy số của chuỗi đang có)
const tongXong = (D) => D.tongXong ?? Math.max(0, (D.buoc ? tongNv(D) : 0) - (D.buoc === 2 ? 1 : 0));
const bacMoc = (D) => Math.min(BAC_TOI_DA, Math.floor(tongXong(D) / MOI_BAC));
const linkKho = (D) => (KHO_BAC > 0 ? Math.min(bacCua(D.link)[2], D.link + Math.floor(bacMoc(D) / KHO_BAC)) : D.link);
const heSoBac = (D) => 1 + bacMoc(D) * THUONG_BAC;

// ---------- ngày ----------
function ngayMoi(D) { // checkTask_Limit: sang ngày mới thì đếm lại
  const d = N.ngayVN(Date.now());
  if (D.ngay !== d) { D.ngay = d; D.soNgay = 0; D.huyNgay = 0; D.xongNgay = 0; }
}
const conNgay = (D) => (ngayMoi(D), (D.soNgay | 0) < GH);
const HET_NGAY = "Đủ rồi! Mỗi ngày 30 lần là hết. Mai quay lại!"; // câu client (giới hạn thật 40)

// ---------- chọn theo trọng số ----------
function chonW(ws) { const t = ws.reduce((a, b) => a + b, 0); if (t <= 0) return -1; let r = ri(1, t); for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return i; } return ws.length - 1; }

// ---------- giao nhiệm vụ (tl_dealtask) ----------
function bai4(h, nv) { // bãi thu thập địa đồ: bản đồ của client là bãi luyện công của game thì giữ, không thì chọn bãi hợp cấp
  const lv = h.lvl || 1, Z0 = N.ZONES.get(nv.map);
  if (Z0 && N.FARM.has(Z0.kind) && N.capVao(Z0) <= lv && Z0.hi >= lv - 15) return Z0;
  const ds = [...N.ZONES.values()].filter((z) => N.FARM.has(z.kind) && !z.chiThuyen && z.m && z.m.length && N.capVao(z) <= lv); // không giao bờ Bắc Phong Lăng Độ (chỉ tới bằng thuyền)
  const hop = ds.filter((z) => z.hi >= lv - 10);
  const L = hop.length ? hop : ds.sort((a, b) => b.lo - a.lo).slice(0, 1);
  return L[ri(0, L.length - 1)];
}
// dòng tạm bỏ (cau-hinh.json daTau.tamBo — khóa món đầu như vậy; anh 02/11 khuya: "bỏ luôn nv giao huyền tinh cho tới khi update"): không giao
const TAM_BO = CFG.tamBo || [];
const tamBo = (nv) => !!(nv && nv.k) && TAM_BO.some((d) => nv.k.startsWith(d));
// ep = loại ép (công cụ thử): có dòng ở link này thì dùng, không thì bốc như thường
function giao(h, D, ep) {
  const lk = (D.lk = linkKho(D)); // link độ khó: link của chuỗi + bậc mốc
  const w = DT.tiLe[lk - 1] || DT.tiLe[0], coDong = (l) => DT.nv[l] && DT.nv[l].some((x) => x.r[lk - 1] > 0 && !tamBo(x));
  let loai = ep && coDong(ep) ? ep : chonW(w) + 1;
  if (!DT.nv[loai] || !DT.nv[loai].some((x) => x.r[lk - 1] != null)) loai = 2;
  const ds = DT.nv[loai], cand = ds.map((x, i) => [i, x.r[lk - 1]]).filter(([i, r]) => r != null && r > 0 && !tamBo(ds[i]));
  const i = cand.length ? cand[chonW(cand.map((c) => c[1]))][0] : 0;
  Object.assign(D, { loai, dong: i, buoc: 1, mo: 1 });
  delete D.thuong; delete D.bai; delete D.chi; delete D.can; delete D.co; delete D.goc;
  const nv = ds[i];
  if (loai === 4) { const Z = bai4(h, nv); Object.assign(D, { bai: Z ? Z.id : null, chi: nv.loai, can: nv.n, co: 0 }); }
  if (loai === 5) D.goc = [h.lvl || 1, h.exp || 0];
  D.soNgay = (D.soNgay | 0) + 1; // storm_goon_start: mỗi nhiệm vụ mới giao tính 1 lần trong ngày
}
// tl_taskprocess: sang nhiệm vụ kế
function tiep(h, D) {
  D.lan = (D.lan | 0) + 1;
  if ((D.vong | 0) >= 20) D.vong = 0;
  if (D.lan >= 20) {
    D.lan = 0; D.chuoi = (D.chuoi | 0) + 1;
    if (chuoiXong(D) >= 20) { D.link = linkDau(h.lvl || 1); D.chuoi = 0; D.vong = ((D.vong | 0) + 1) % 20; } // hết vòng
    if (D.chuoi === chuoiCuaLink(D.link)) { D.link++; D.chuoi = 0; }
  }
}

// ---------- lời nhiệm vụ (tl_gettaskinfo) ----------
// tên món + cấp khi có món khác cùng tên (anh 10/11 — người chơi phản hồi: nhiệm vụ "Đại Uyển Bạch Mã (Thủy)" mà Mã phu bán 2 con cùng tên cấp 7 / cấp 8,
// mua con cấp 7 thì Dã Tẩu không nhận — client tl_checktask so cả cấp, lời client tasklink_buygoods.txt TaskInfo1 ghi "Bạch Mã cấp 3 (Thủy)") + hệ.
// Cấp như dòng "[cấp N]" khi rê chuột lên món (do-goc.json cl)
let TRUNG = null;
const trungTen = (n) => {
  if (!TRUNG) { TRUNG = new Map(); for (const x of N.BY.values()) { const t = String(x.n || "").trim(); TRUNG.set(t, (TRUNG.get(t) || 0) + 1); } }
  return (TRUNG.get(String(n || "").trim()) || 0) > 1;
};
function tenDo(k, s) {
  const x = N.BY.get(k), ten = x ? String(x.n).trim() : k;
  // chỉ món có cấp thật (do-goc.json): Sát thủ giản trùng tên với mã cũ ms:400:N:0..4 mà không có cấp -> giữ tên (rà soát lượt 58: "cấp 90 cấp 1")
  return ten + (x && GOC[k] && trungTen(ten) ? ` cấp ${capDo(k)}` : "") + (s != null && s >= 0 ? ` (${HE[s]})` : "");
}
function loiNv(h, D) {
  const nv = DT.nv[D.loai][D.dong];
  switch (D.loai) {
    case 1: return `Đi ${Y(nv.cho)} mua ${Y(tenDo(nv.k, nv.s))} về đây cho ta!`;
    case 2: return nv.a ? `Tìm cho ta món này: ${Y(nv.ten)}, ${Y(nv.an)}, nhỏ nhất ${Y(nv.min)}, lớn nhất ${Y(nv.max)}.`
      : `Tìm cho ta: ${Y("1 cái " + nv.ten)}.`;
    case 3: return `Tìm cho ta món này: ${Y(nv.an)}, nhỏ nhất ${Y(nv.min)}, lớn nhất ${Y(nv.max)}! Xem xong ta trả lại. Món mua ở sạp Hệ thống thì ta giữ luôn.`;
    case 4: { const Z = N.ZONES.get(D.bai); return `Tới ${Y(Z ? Z.n : "?")} tìm cho ta ${Y(D.can)} quyển ${Y(D.chi === 2 ? "Mật chí" : "Địa Đồ chí")}.${D.co ? ` (đã có ${D.co})` : ""}`; }
    case 5: return `Kiếm thêm ${Y("Trị kinh nghiệm " + nv.kn)} rồi quay lại.`;
    case 6: return `Tìm cho ta ${Y(nv.n)} mảnh bản đồ Sơn Hà Xã Tắc.`;
  }
  return "";
}
// tóm tắt 1 dòng (khung Nhiệm vụ / tin hệ thống)
const tomTat = (h, D) => (D && D.buoc === 1 && DT ? loiNv(h, D).replace(/<color=?\w*>/g, "") : null);
// bảng nhiệm vụ góc trái (anh 28/10): bước, nhiệm vụ thứ mấy, lời, tiến độ, đếm ngày / tổng, mốc kế, bậc mốc
function chiTiet(h) {
  if (!DT) return null;
  const D = h.daTau || {}, homNay = D.ngay === N.ngayVN(Date.now()), nv = D.buoc === 1 && D.loai ? DT.nv[D.loai][D.dong] : null;
  const xn = homNay ? D.xongNgay | 0 : 0, tg = tongXong(D);
  let tienDo = null;
  if (nv && D.loai === 4) tienDo = [D.co | 0, D.can | 0];
  else if (nv && D.loai === 5) tienDo = [Math.max(0, knThem(h, D)), nv.kn];
  else if (nv && D.loai === 6) tienDo = [h.shxt | 0, nv.n];
  // den: nơi làm nhiệm vụ đang nhận (noiLam — dòng "Đưa ta đến" / "Mua ở" của bảng nhiệm vụ, Xa phu; anh 11/11)
  return { buoc: D.buoc | 0, thu: D.buoc ? tongNv(D) + (D.buoc === 1 ? 1 : 0) : 0, nv: tomTat(h, D), tienDo, bai: D.loai === 4 && D.buoc === 1 ? D.bai : null,
    xongNgay: xn, nhanNgay: homNay ? D.soNgay | 0 : 0, gioiHan: GH, tong: tg, mocNgay: mocSau(MOC_NGAY, xn), mocTong: mocSau(MOC_TONG, tg),
    bac: bacMoc(D), heSo: heSoBac(D), no: (D.no || []).length, den: noiLam(h, D) };
}

// ---------- kiểm tra (tl_checktask) ----------
const dongCo = (it, a, min, max) => (it.d || []).some(([k, v]) => k === a && v >= min && v <= max);
// món it có đạt dòng nhiệm vụ nv (loại 1–3) không — dùng cả cho sạp Hệ thống (choHt). Dòng đòi món Kỳ Trân Các (nv.k — Sát Thủ Giản, Huyền tinh;
// anh 02/11 khuya: "nộp sát thủ giản thì được"): đúng khóa món (khóa cũ còn trong túi — giản có hệ — tính theo khóa mới)
function khop(loai, nv, it) {
  const x = N.BY.get(it.k);
  if (!x || x.thuoc) return false;
  if (loai === 2 && nv.k) return (x.doi || it.k) === nv.k;
  if (x.ktc) return false;
  if (loai === 1) return it.k === nv.k && (nv.s == null || nv.s < 0 || it.s === nv.s);
  if (loai === 2) {
    if (x.t !== nv.t || x.p !== nv.p) return false;
    if (nv.a) return dongCo(it, nv.a, nv.min, nv.max); // client: có dòng thì chỉ xét loại / kiểu + dòng
    return (nv.cl == null || capDo(it.k) === nv.cl) && (nv.s == null || it.s === nv.s);
  }
  if (loai === 3) return dongCo(it, nv.a, nv.min, nv.max);
  return false;
}
const hopMon = (D, it) => khop(D.loai, DT.nv[D.loai][D.dong], it);
function knThem(h, D) { // tl_countuplevelexp: kinh nghiệm có thêm từ lúc nhận
  const [lv0, e0] = D.goc || [h.lvl, h.exp];
  if ((h.lvl || 1) <= lv0) return (h.exp || 0) - e0;
  let t = 0; for (let l = lv0; l < h.lvl; l++) t += N.need(l);
  return t - e0 + (h.exp || 0);
}
const oTrong = (h) => 60 - h.bag.reduce((a, it) => { const [w, hh] = N.coMon(it); return a + w * hh; }, 0); // CalcFreeItemCellCount

// ---------- phần thưởng (tl_giveplayeraward / tl_getawardagin) ----------
const giaTri = (D) => { const nv = DT.nv[D.loai][D.dong], k = heSoBac(D); return { tv1: nv.tv1 * k, tv2: nv.tv2 * k, cl: chuoiXong(D), t: D.lan | 0, vg: D.vong | 0 }; };
function chonVat(bang, V) { // AssignValue_AwardRate + tl_getaward: món giá trị ≤ V cùng trọng số, đắt hơn thì hiếm theo tỉ lệ V / giá
  const n = bang.length, w = bang.map((o) => V / (n * Math.max(V, o.v)));
  const t = w.reduce((a, b) => a + b, 0), j = (ri(1, 100) / 100) * t;
  let k = 0; for (let i = 0; i < n; i++) { k += w[i]; if (j < k) return bang[i]; }
  return bang[n - 1];
}
function taoThuong(h, D) {
  const { tv1, tv2, cl, t, vg } = giaTri(D), luck = N.mayMan(h) || 1, rate = [20, 33, 34, 8, 5], ds = [];
  const vTien = tv2 * (1 + (cl + t) * 0.1) + vg * 0.2, vKn = tv1 + (tv2 * (1 + (cl + t) * 0.1) + vg * 0.2);
  for (let i = 0; i < 3; i++) {
    const loai = chonW(rate) + 1; rate[loai - 1] = 0;
    if (loai === 1) { const n = Math.floor((Math.floor(vTien * 0.05 * 1.15 * (ri(60, 100) / 100)) + tv1) * HS_TIEN); ds.push({ loai, tien: n, ten: N.tien(n) }); }
    else if (loai === 2) { const n = Math.floor(vKn * 0.36 * (ri(80, 120) / 100) * HS_KN); ds.push({ loai, kn: n, ten: `${n} điểm kinh nghiệm` }); }
    else if (loai === 3) {
      const V = (tv1 + tv2 * (1 + (cl + t) * 0.1 + vg * 0.2)) * (luck * 0.001 + 1), cd = CO_DINH.find(([, p]) => Math.random() * 100 < p), k = cd ? cd[0] : chonVat(VAT_CON, V).k;
      ds.push({ loai, k, ten: N.BY.get(k).n });
    } else if (loai === 4) { // thử vận: món / kinh nghiệm / tiền — chưa lộ tới lúc chọn
      const V = vKn * (luck * 0.03 + 1), kn = Math.floor((V / 2) * (ri(80, 120) / 100)), tien = Math.floor((kn / 2) * (ri(80, 120) / 100));
      const o = chonVat([...DT.thuongVat, { k: "kn", v: kn }, { k: "tien", v: tien }], V * 1.2);
      ds.push({ loai, an: o.k === "kn" ? { kn: Math.floor((vKn / 2) * (ri(80, 120) / 100) * HS_KN) } : o.k === "tien" ? { tien: Math.floor((vKn / 2) * (ri(80, 120) / 100) * HS_TIEN) } : { k: o.k }, ten: "Thử vận — mở ra mới biết là gì." });
    } else ds.push({ loai, ten: "1 cơ hội hủy bỏ nhiệm vụ" });
  }
  return ds;
}
// ---------- quà mốc (anh 28/10): gói { kn, knCap, tien, xu, do: [[mã, số]] } — món không vừa túi thì Dã Tẩu giữ (D.no). knCap (anh 31/10 khuya:
// mốc 30 / 40 "cộng thêm 20 % / 50 % kinh nghiệm của cấp đang có, để từ cấp 120 trở lên không bị tụt"): + knCap × kinh nghiệm lên cấp của cấp
// lúc nhận ----------
const knGoi = (h, g) => (g.kn || 0) + (g.knCap > 0 && isFinite(N.need(h.lvl || 1)) ? Math.floor(N.need(h.lvl || 1) * g.knCap) : 0);
function traoGoi(h, D, g, tin) {
  const kn = knGoi(h, g);
  if (kn > 0) { h.exp = (h.exp || 0) + kn; N.lenCap(h); tin.push(`Nhận được <color=green>${kn}<color> điểm kinh nghiệm`); }
  if (g.tien > 0) { h.gold = (h.gold || 0) + g.tien; tin.push(`Nhận được <color=green>${N.tien(g.tien)}<color>`); }
  if (g.xu > 0) { h.xu = (h.xu | 0) + g.xu; tin.push(`Nhận được <color=green>${g.xu} xu<color>`); }
  for (const [k, n] of g.do || []) traoMon(h, D, k, n | 0 || 1, tin);
}
function traoMon(h, D, k, n, tin) {
  const x = N.BY.get(k); if (!x) return;
  try { N.themChong(h, x, n); tin.push(`Nhận được <color=green>${x.n}${n > 1 ? " × " + n : ""}<color>`); }
  catch { D.no = [...(D.no || []), [k, n]]; tin.push(`Hành trang đầy. Dã Tẩu giữ giúp ${x.n}${n > 1 ? " × " + n : ""} — dọn túi rồi gặp Dã Tẩu mà nhận.`); }
}
function traNo(h, D, tin) { // quà mốc còn giữ: trao lại khi gặp Dã Tẩu
  if (!D.no || !D.no.length) return;
  const ds = D.no; delete D.no;
  for (const [k, n] of ds) traoMon(h, D, k, n, tin);
}
const tenGoi = (g) => [g.kn > 0 ? `${g.kn.toLocaleString("vi-VN")} kinh nghiệm` : "", g.tien > 0 ? N.tien(g.tien) : "", g.xu > 0 ? `${g.xu} xu` : "",
  ...(g.do || []).map(([k, n]) => { const x = N.BY.get(k); return x ? x.n + ((n | 0) > 1 ? " × " + n : "") : ""; })].filter(Boolean).join(", ");

// khung chọn thưởng (Prise): lời + 3 ô; h = số hình như script seasonnpc Task_GiveAward gửi ("/3".."/7" — \Ui\PictureList.ini:
// 3 tiền, 4 kinh nghiệm, 5 vật phẩm, 6 thử vận, 7 hủy nhiệm vụ)
const khungThuong = (h, D) => ({ text: `Xong việc rồi. Chọn một món đi, thích món nào lấy món đó!`,
  ds: D.thuong.map((o) => ({ ten: o.loai === 4 ? o.ten : "Nhận được " + o.ten, h: o.loai + 2 })) });

// ---------- hội thoại ----------
const say = (text, opts) => ({ say: { text, opts } }); // opts: [[nhãn, việc, tham số?]]
function moDau(h, D) { // tasklink_entence
  if (D.buoc === 2) return { thuong: khungThuong(h, D) };
  if (D.phat === 10) {
    if (Date.now() - (D.phatLuc || 0) < 605000) return say(`Hủy liền 3 lần rồi. 10 phút nữa ta mới giao nhiệm vụ lại. Đi đi!`, []);
    D.phat = 0; return nhan(h, D);
  }
  if (!D.buoc) return say(`Ngươi bôn ba giang hồ cũng lâu rồi. Muốn thử chuỗi nhiệm vụ của ta không?`,
    [["Được. Nhiệm vụ nào ta cũng làm được.", "nhan"], ["Khảo nghiệm của ngươi là cái gì?", "info"], ["Ta bận. Để lúc khác.", null]]);
  if (D.buoc === 3) {
    if (!conNgay(D)) return say(HET_NGAY, []);
    return say(`:<enter>Ngươi đã xong ${Y(tongNv(D))} nhiệm vụ. Hôm nay còn làm lại được ${Y(GH - (D.soNgay | 0))} lần. Làm nữa không?`,
      [["Làm nữa. Nhiệm vụ tiếp theo là gì?", "tiep"], ["Để ta nghỉ một lát.", null]]);
  }
  return bangNv(h, D);
}
function bangNv(h, D) { // Task_MainDialog
  D.mo = 1;
  const lenh = demLenh(h);
  return say(`Dã Tẩu:<enter><enter>Nhiệm vụ thứ <color=green>${tongNv(D) + 1}<color>: ${loiNv(h, D)}`,
    [["Biết rồi. Xong việc ta quay lại.", null], ["Ta xong nhiệm vụ rồi. Kiểm tra đi!", "xong"],
      // ngắn cho vừa 1 dòng khung Say; nhiệm vụ Sơn Hà Xã Tắc (loại 6) tự nó là nộp mảnh (tới 5000) -> không có lựa chọn này
      ...(D.loai === 6 ? [] : [[`Nộp ${XN_SHXT} mảnh Sơn Hà Xã Tắc để xong ngay (đang có ${h.shxt | 0})`, "xongShxt"]]),
      ...(lenh ? [[`Dùng Lệnh bài làm NV Dã Tẩu để xong ngay (đang có ${lenh})`, "xongLenh"]] : []),
      ["Nhiệm vụ này khó quá. Ta muốn hủy.", "hoiHuy"], ["Khảo nghiệm của ngươi là cái gì?", "info"]]);
}
// hoàn thành nhanh (anh 10/11: "cho tính năng hoàn thành nhiệm vụ dã tẩu = bản đồ sơn hà xã tắc và vé hoàn thành nhanh"): nộp daTau.xongNhanh.shxt
// mảnh Sơn Hà Xã Tắc, hoặc 1 Lệnh bài làm NV Dã Tẩu (magicscript 5126 — script\global\gm\dataulenhbai.lua: "Hoàn thành nhiệm vụ được giao ngay lập
// tức"; chuột phải trong túi ở đâu cũng dùng được) -> nhiệm vụ đang làm xong ngay, mở khung chọn thưởng như xong()
const XN = CFG.xongNhanh || {}, XN_SHXT = XN.shxt ?? 100, LENH = XN.lenh || "ms:5126";
const HUY_SHXT = CFG.huyShxt ?? 100; // mảnh Sơn Hà Xã Tắc mua 1 cơ hội hủy khi hết cơ hội (client 100 — anh 10/11: 50; hoàn thành nhanh 100 vì không mất chuỗi)
const demLenh = (h) => (h.bag || []).reduce((t, o) => t + (o.k === LENH ? o.n || 1 : 0), 0);
// u = món đã bấm (chuột phải trong túi); không có thì lấy chồng khóa bảo hiểm trước (như phan-than.js / tay-tuy.js)
// D.lenhChon (anh 13/11 — chặn gọi Dã Tẩu từ xa, may-chu/npc-gan.js): dùng Lệnh bài ở bất kỳ đâu -> khung chọn thưởng hiện tại chỗ, "chon" ngay sau đó được gọi
// từ xa; xóa khi đã chọn (chon) / xong theo đường khác (xong, nộp mảnh)
function xongNhanh(h, D, cach, u) {
  if (D.buoc !== 1) {
    if (D.buoc === 2 && cach === "lenh" && demLenh(h)) D.lenhChon = 1; // xong rồi chưa chọn thưởng: bấm Lệnh bài mở lại khung chọn thưởng tại chỗ
    return D.buoc === 2 ? moDau(h, D) : say("Không có nhiệm vụ Dã Tẩu đang làm. Gặp Dã Tẩu nhận nhiệm vụ trước đã.", []);
  }
  if (oTrong(h) < 5) return say("Hành trang đầy rồi. Dọn túi cho ngăn nắp rồi hãy quay lại.", []);
  const ten = tomTat(h, D), tin = [];
  if (cach === "shxt") {
    // soát lỗi 10/11: nhiệm vụ loại 6 đòi tới 5000 mảnh — 50 mảnh không được thay (nộp đủ bằng "ta đã hoàn thành…" hoặc dùng Lệnh bài)
    if (D.loai === 6) return say("Nhiệm vụ lần này là nộp mảnh Sơn Hà Xã Tắc. Gom đủ rồi nộp cho ta, hoặc dùng Lệnh bài làm NV Dã Tẩu.", []);
    if ((h.shxt | 0) < XN_SHXT) return say(`Ngươi mang đủ ${Y(XN_SHXT)} mảnh Sơn Hà Xã Tắc chưa? Nhìn lại túi đi!`, []);
    h.shxt -= XN_SHXT;
    tin.push(`Đã dùng ${XN_SHXT} mảnh Sơn Hà Xã Tắc để xong nhiệm vụ này! Còn dư ${h.shxt} mảnh.`);
  } else {
    const ds = (h.bag || []).filter((o) => o.k === LENH);
    const it = (u && ds.find((o) => o.u === (u | 0))) || ds.find((o) => (o.kbh | 0) > 0) || ds[0];
    if (!it) return say("Ngươi không mang Lệnh bài làm NV Dã Tẩu. Mua ở Kỳ Trân Các.", []);
    if ((it.n || 1) > 1) it.n--; else h.bag.splice(h.bag.indexOf(it), 1);
    tin.push(`Nhiệm vụ ${ten} đã xong.`); // câu client DaTau_HT
  }
  if (D.loai === 4) D.co = 0;
  D.buoc = 2; // như xong(): chờ chọn thưởng
  if (cach === "lenh") D.lenhChon = 1; else delete D.lenhChon; // Lệnh bài: chọn thưởng tại chỗ (npc-gan.js cho "chon" từ xa)
  D.thuong = taoThuong(h, D);
  return { thuong: khungThuong(h, D), tin: [...tin, ...ruong10(h, D)] };
}
function nhan(h, D) { // Task_Confirm: bắt đầu chuỗi
  // cấp tối thiểu (anh 29/10: cấp 20 — script client có sẵn chỗ chặn này, bản VNG đặt cấp 1; câu của client)
  if ((h.lvl || 1) < CAP_NHAN) return say(`Luyện tới cấp ${CAP_NHAN} rồi hãy tới gặp ta!`, []);
  if (!conNgay(D)) return say(HET_NGAY, []);
  Object.assign(D, { lan: 0, link: linkDau(h.lvl || 1), vong: 0, huy: 0, chuoi: 0 });
  giao(h, D);
  return bangNv(h, D);
}
const INFO = ["Lần này ta bày ra đủ loại nhiệm vụ nhỏ để thử võ công và tính kiên nhẫn của ngươi.",
  "Xong một nhiệm vụ thì có <color=red>thưởng<color>. Làm liên tục thì có <color=red>lễ vật tốt hơn<color>. Làm tới <color=red>8000<color> nhiệm vụ thì có <color=red>thưởng bất ngờ<color>!",
  "Bỏ dở một nhiệm vụ thì tính lại từ đầu. Ta có lúc cho cơ hội hủy — biết nắm thì nắm!",
  "Sao? Ngươi có dám nhận khảo nghiệm của ta không?"];

// nộp: loại 1–3 qua khung Giao vật phẩm (b.u = [mã món]), loại 4–6 kiểm tra luôn (Task_Accept)
function xong(h, D, b) {
  if (D.buoc !== 1) return moDau(h, D);
  if (oTrong(h) < 5) return say("Hành trang đầy rồi. Dọn túi cho ngăn nắp rồi hãy quay lại.", []);
  const nv = DT.nv[D.loai][D.dong];
  let tinMon = null; // Xem vật phẩm: câu báo Dã Tẩu giữ / trả món
  if (D.loai <= 3) {
    // tiêu đề khung: script client ghi ngược (loại 1 Mua -> "tìm", loại 2 Tìm -> "mua") — bản mình ghi đúng loại
    if (!Array.isArray(b.u)) return { giao: { tieuDe: ["Nhiệm vụ mua vật phẩm", "Nhiệm vụ tìm vật phẩm", "Nhiệm vụ hiển thị vật phẩm"][D.loai - 1], loi: "Đồ ta cần đâu? Ngươi tìm được chưa?" } };
    const ds = b.u.map((u) => h.bag.find((o) => o.u === (u | 0))).filter(Boolean);
    if (ds.length > 1) return say(`Bỏ nhiều đồ vô một lúc, ta hoa cả mắt. Đưa từng món một!`, []);
    if (!ds.length) return say(`Ngươi có bỏ đúng thứ ta cần vào không? Nhìn lại đi!`, []);
    if (!hopMon(D, ds[0])) return say("Đồ ngươi giao chưa đúng yêu cầu. Tìm lại đi!", []);
    // món xếp chồng (Sát Thủ Giản): lấy 1 trong chồng. Xem vật phẩm: đồ của người chơi xem xong trả lại (như client), món mua ở sạp Hệ thống (dt) Dã
    // Tẩu giữ luôn (anh 04/11: "đồ dã tẩu thu rồi k trả lại")
    const o = ds[0];
    if (D.loai !== 3 || o.dt) { if (N.xepChong(o) && (o.n | 0) > 1) o.n--; else h.bag.splice(h.bag.indexOf(o), 1); }
    if (D.loai === 3) tinMon = o.dt ? `Dã Tẩu giữ luôn ${DO.tenMon(o).trim()} (món sạp Hệ thống)` : `Dã Tẩu xem xong trả lại ${DO.tenMon(o).trim()}`;
  } else if (D.loai === 4) {
    if ((D.co | 0) < D.can) return say("Đồ ngươi giao chưa đúng yêu cầu. Tìm lại đi!", []);
    D.co = 0;
  } else if (D.loai === 5) {
    if (knThem(h, D) < nv.kn) return say("Đồ ngươi giao chưa đúng yêu cầu. Tìm lại đi!", []);
  } else if (D.loai === 6) {
    if ((h.shxt | 0) < nv.n) return say("Đồ ngươi giao chưa đúng yêu cầu. Tìm lại đi!", []);
    h.shxt -= nv.n;
  }
  D.buoc = 2; // Task_AwardRecord: xong, chờ chọn thưởng
  delete D.lenhChon; // nộp ở Dã Tẩu: chọn thưởng phải đứng gần (npc-gan.js)
  D.thuong = taoThuong(h, D);
  const tin = [...(tinMon ? [tinMon] : []), ...ruong10(h, D)];
  return { thuong: khungThuong(h, D), ...(tin.length ? { tin } : {}) };
}
// Bảo rương thần bí của Dã Tẩu (seasonnpc.lua Task_GiveAward: tổng nhiệm vụ — tl_counttasklinknum(1) — chia hết cho 10 và chưa phát ở số này ->
// 1 rương 6,1,2374; anh 31/10 khuya đồng ý thêm). Mở rương: do.js dungVat "ruongDaTau" (Huyền Thiên Chùy — cau-hinh.json daTau.ruong)
const RUONG = "ms:2374";
function ruong10(h, D) {
  const R = CFG.ruong || {}, moi = R.moi ?? 10, tong = tongNv(D), tin = [];
  if (!(moi > 0) || !tong || tong % moi || D.ruongMoc === tong || !N.BY.get(RUONG)) return tin;
  D.ruongMoc = tong;
  tin.push(`Ngươi làm liên tiếp ${moi} nhiệm vụ Dã Tẩu rồi. Nhận Bảo rương thần bí của Dã Tẩu!`);
  try { N.themChong(h, N.BY.get(RUONG), 1); }
  catch { D.no = [...(D.no || []), [RUONG, 1]]; tin.push("Hành trang đầy. Dã Tẩu giữ giúp Bảo rương thần bí — dọn túi rồi gặp Dã Tẩu mà nhận."); }
  return tin;
}

// chọn phần thưởng b.i (mySG / SelectAward_*) + quà mốc (PayPlayerLinkAward) + thưởng ngày (Task_NewVersionAward)
function chon(h, D, b) {
  if (D.buoc === 3) return say("Ngươi lãnh thưởng rồi! Định gạt ta à?", []);
  if (D.buoc !== 2 || !D.thuong) loi("Chưa có phần thưởng. Làm nhiệm vụ trước đã.");
  const o = D.thuong[b.i | 0]; if (!o) loi("Không có phần thưởng này. Chọn lại.");
  const tin = [];
  const kn = (n) => { h.exp = (h.exp || 0) + n; N.lenCap(h); tin.push(`Nhận được <color=green>${n}<color> điểm kinh nghiệm`); };
  const tien = (n) => { h.gold = (h.gold || 0) + n; tin.push(`Nhận được <color=green>${n}<color> lượng bạc`); };
  const mon = (k) => { if (oTrong(h) < 5) loi("Hành trang đầy rồi. Dọn túi cho ngăn nắp rồi hãy quay lại."); N.themChong(h, N.BY.get(k), 1); tin.push("Nhận được một phần thưởng nhiệm vụ!"); };
  if (o.loai === 1) tien(o.tien);
  else if (o.loai === 2) kn(o.kn);
  else if (o.loai === 3) mon(o.k);
  else if (o.loai === 4) { const a = o.an; if (a.k) mon(a.k); else if (a.kn) kn(a.kn); else tien(a.tien); }
  else { D.huy = Math.min(254, (D.huy | 0) + 1); tin.push("Nhận được <color=green>1 cơ hội hủy bỏ nhiệm vụ<color>!"); }
  D.buoc = 3; delete D.thuong; delete D.lenhChon;
  // quà mốc theo tổng nhiệm vụ (PayPlayerLinkAward: tl_counttasklinknum(1) — 100, 200 … 8000). Có daTau.mocChuoi (anh 31/10 khuya lần 2) thì trao
  // gói của số này (goiChuoi — mỗi mốc 1 gói); không có thì bảng award_link của client: bốc 1 món theo trọng số
  const tong = tongNv(D), moc = MOC_CHUOI ? [] : DT.thuongMoc.filter((x) => x.moc === tong), goiC = goiChuoi(tong);
  let say2 = null;
  if (goiC.length) {
    const ten = goiC.map(tenGoi).join(", ");
    tin.push(`Nhiệm vụ thứ ${tong} xong rồi. Ngươi nhận được ${ten}!`);
    for (const g of goiC) traoGoi(h, D, g, tin);
    say2 = `Làm tốt lắm. Tặng ngươi ${Y(ten)} — cố gắng thêm nữa!`;
  }
  if (moc.length) {
    const m = moc[chonW(moc.map((x) => Math.max(1, x.v)))];
    try { N.themChong(h, N.BY.get(m.k), 1); tin.push(`Nhiệm vụ thứ ${tong} xong rồi. Ngươi nhận được ${N.BY.get(m.k).n}!`); say2 = `Làm tốt lắm. Tặng ngươi ${Y(N.BY.get(m.k).n)} — cố gắng thêm nữa!`; } catch { tin.push("Hành trang đầy. Không nhận được quà mốc. Dọn túi rồi quay lại."); }
  }
  // mốc ngày (Task_NewVersionAward của client: thứ 30 / 40 trong ngày — anh 28/10: gói quà theo cau-hinh.json daTau.mocNgay) + mốc tổng
  D.xongNgay = (D.xongNgay | 0) + 1; D.tongXong = (D.tongXong ?? Math.max(0, tongNv(D) - 1)) + 1; // buoc đã là 3: tongNv tính cả nhiệm vụ này
  const gN = MOC_NGAY[D.xongNgay], gT = MOC_TONG[D.tongXong];
  if (gN) {
    const chiKn = !gN.tien && !gN.xu && !(gN.do || []).length;
    tin.push(`Hôm nay xong${D.xongNgay === GH ? " liên tục" : ""} nhiệm vụ Dã Tẩu lần thứ ${D.xongNgay}. Nhận thêm ${chiKn ? "kinh nghiệm" : "phần thưởng"}!`);
    traoGoi(h, D, gN, tin);
  }
  // anh 16/11 — Báo Đáp Ân Sư: mốc 40 nhiệm vụ trong ngày (đúng lần xong thứ 40 — mỗi ngày 1 lần) -> món sự kiện
  // anh 18/11 khuya: mốc 20 / 30 / 40 trong ngày thêm 1 / 2 / 3 Trung Dược — nguồn sự kiện chung (nguon-su-kien.js daTau — cau-hinh.json nguonSuKien.daTau)
  {
    let td = []; try { td = require("./nguon-su-kien.js").daTau(D.xongNgay).filter(([k]) => N.BY.has(k)).map(([k, n]) => ({ k, n })); } catch (e) { console.error("Nguồn sự kiện — Dã Tẩu:", e && e.message); }
    const ev = [...(D.xongNgay === 40 ? bdMon("daTau40") : []), ...td];
    if (ev.length) { tin.push(`Báo đáp ân sư: hôm nay xong ${D.xongNgay} nhiệm vụ Dã Tẩu, nhận thêm phần thưởng!`); for (const x of ev) traoMon(h, D, x.k, x.n, tin); }
  }
  if (gT) {
    tin.push(`Ngươi đã xong tổng cộng ${D.tongXong} nhiệm vụ Dã Tẩu. Nhận quà mốc!`);
    traoGoi(h, D, gT, tin);
    say2 = (say2 ? say2 + "<enter>" : "") + `Ngươi xong ${Y(D.tongXong)} nhiệm vụ của ta rồi — kiên nhẫn hiếm có! Quà mốc của ngươi: ${Y(tenGoi(gT))}.`;
  }
  return { tin, ...(say2 ? say(say2, []) : {}) };
}

// hủy (Task_CancelConfirm / Task_Cancel)
function hoiHuy(h, D) {
  if (!(D.huy | 0)) return say("Ngươi không còn cơ hội hủy nào. Chỉ còn cách làm lại từ đầu — thưởng tích lũy trước đó tính lại từ đầu.",
    [["Đúng. Ta không làm nhiệm vụ này nữa.", "hoiHuy2"], [`Ta dùng ${HUY_SHXT} mảnh Sơn Hà Xã Tắc để hủy nhiệm vụ lần này`, "huy", 2], ["Để ta nghĩ lại đã.", null]]);
  return say(`Ngươi còn ${D.huy} cơ hội hủy. Chắc chắn hủy nhiệm vụ lần này?`, [["Đúng. Ta không làm nhiệm vụ này nữa.", "huy", 1], ["Để ta nghĩ lại đã.", null]]);
}
function huy(h, D, cach) {
  if (D.buoc !== 1 || D.mo !== 1) return moDau(h, D);
  if (!conNgay(D)) return say(HET_NGAY, []);
  const tin = [];
  if (cach === 2) {
    if ((h.shxt | 0) < HUY_SHXT) return say(`Ngươi mang đủ ${Y(HUY_SHXT)} mảnh Sơn Hà Xã Tắc chưa? Nhìn lại túi đi!`, []);
    h.shxt -= HUY_SHXT; D.huy = (D.huy | 0) + 1;
    tin.push(`Đã dùng ${HUY_SHXT} mảnh Sơn Hà Xã Tắc để hủy nhiệm vụ này!`, `Mảnh Sơn Hà Xã Tắc còn dư ${h.shxt} mảnh.`);
  }
  if (!(D.lan | 0) && D.link === linkDau(h.lvl || 1)) { // nhiệm vụ đầu chuỗi: đổi nhiệm vụ khác (không tốn cơ hội hủy); không còn cơ hội mà hủy liền 3 lần thì phạt 10 phút
    if (!(D.huy | 0)) {
      D.phat = (D.phat | 0) + 1;
      if (D.phat > 2) { D.phat = 10; D.phatLuc = Date.now(); D.buoc = 0; return { tin, ...say(`Hủy liền 3 lần rồi. 10 phút nữa ta mới giao nhiệm vụ lại. Đi đi!`, []) }; }
    }
  } else if ((D.huy | 0) >= 1) D.huy--;
  else {
    // ruongMoc: 0 (anh 05/11 — soát Tra cứu): chuỗi mới đếm lại từ 0, quên số của rương cuối chuỗi cũ (trước đây tới đúng số đó thì mất 1 rương)
    Object.assign(D, { lan: 0, link: linkDau(h.lvl || 1), vong: 0, huy: 0, chuoi: 0, phat: 0, ruongMoc: 0 });
    tin.push("<color=yellow>Chuỗi nhiệm vụ Dã Tẩu xóa hết rồi. Làm lại từ nhiệm vụ đầu tiên!<color>");
  }
  D.huyNgay = (D.huyNgay | 0) + 1;
  giao(h, D);
  return { tin, ...bangNv(h, D) };
}

// ---------- "Đưa ta đến nơi làm nhiệm vụ Dã Tẩu" (anh 11/11 — chọn kiểu B: dòng dưới nhiệm vụ ở bảng nhiệm vụ góc trái / khung Nhiệm vụ điện thoại, + kiểu A:
// lựa chọn đầu danh sách của Xa phu) — game thêm, client không có (Dã Tẩu gốc không dịch chuyển). Nơi đến do MÁY CHỦ tính từ nhiệm vụ đang nhận
// (trình duyệt không gửi nơi đến):
//   - loại 4 Thu thập địa đồ: bãi của nhiệm vụ (D.bai);
//   - loại 1 Mua vật phẩm: thành có cửa hàng bày món đó (assets/data/vat-pham.json shops — cua = Sale của NPC bán): Thợ rèn 37 / Tiệm tạp hóa 38 ở Ba Lăng
//     huyện + Biện Kinh (ưu tiên thành đang đứng), Mã phu 46 chỉ Biện Kinh (Ba Lăng đã bỏ Mã phu) — trình duyệt tới thành rồi tự chạy tới NPC bán;
//   - loại 2 Tìm / 3 Xem: không đi đâu — món mua ở sạp Hệ thống của Chợ Trời (choHt; trình duyệt mở Chợ Trời thẻ Dã Tẩu); sạp không bán (Sát Thủ Giản…) thì không có;
//   - loại 5 / 6 (nâng cấp kinh nghiệm, Sơn Hà Xã Tắc — đánh ở bãi nào cũng được): không có.
// Đã đủ tiến độ (đủ Địa Đồ chí; trong túi đã có món nhiệm vụ đòi) thì không chỉ nữa — về gặp Dã Tẩu.
const CUA_HANG = { 37: { ten: "Thợ rèn", z: [53, 37] }, 38: { ten: "Tiệm tạp hóa", z: [53, 37] }, 46: { ten: "Mã phu", z: [37] } }; // mã cửa hàng -> tên NPC, thành có (53 Ba Lăng huyện, 37 Biện Kinh)
const BAN_HT = new Map(); // loại × 10000 + dòng -> sạp Hệ thống có bán món của dòng đó không (monNv cố định theo dòng — tính 1 lần)
const banHt = (loai, dong) => { const u = loai * 10000 + dong; if (!BAN_HT.has(u)) BAN_HT.set(u, !!hangCua(loai, dong)); return BAN_HT.get(u); };
// -> { z (bãi / thành mặc định), ten, zs? (các thành có cửa hàng), ban? (mã cửa hàng) } | { cho: 1, ten } (sạp Hệ thống) | null
function noiLam(h, D) {
  if (!DT || !D || D.buoc !== 1 || !D.loai) return null;
  const nv = DT.nv[D.loai] && DT.nv[D.loai][D.dong];
  if (!nv) return null;
  if (D.loai === 4) { const Z = N.ZONES.get(D.bai); return Z && !Z.chiThuyen && (D.co | 0) < (D.can | 0) ? { z: Z.id, ten: Z.n } : null; }
  if (D.loai > 3 || (h.bag || []).some((it) => !it.het && hopMon(D, it))) return null;
  if (D.loai === 1) { const g = HANG_NPC.get(nv.k), c = g && CUA_HANG[g.cua], zs = c ? c.z.filter((z) => N.ZONES.has(z)) : []; return zs.length ? { z: zs[0], zs, ban: g.cua, ten: c.ten } : null; }
  return banHt(D.loai, D.dong | 0) ? { cho: 1, ten: "sạp Hệ thống (Chợ Trời)" } : null;
}
// Đi (b.phu: người chơi đã đồng ý dùng Thổ Địa Phù). Luật anh chốt 11/11:
//   - đang ở thôn / thành (Ba Lăng huyện, Biện Kinh): miễn phí như Xa phu;
//   - đang ở bãi luyện công: hỏi "Dùng 1 Thổ Địa Phù để đi tới …?" (trả hoiPhu) -> đồng ý thì trừ 1 tấm bằng đúng đường dùng phù trong túi (do.js act "phu") rồi
//     đi thẳng; không có phù thì báo, không đi. Chồng khóa bảo hiểm dùng trước (như Lệnh bài — xongNhanh);
//   - thuyền, bờ Bắc Phong Lăng Độ, ải, chiến trường Tống Kim, Phong Hỏa, Viêm Đế, đảo…: không cho, báo lý do (Điểm báo danh Tống Kim 325 tính như thành);
//   - đủ cấp vào bãi như cau-hinh.json vaoBai (capVao).
// Chỗ đang đứng = bãi nhịp báo (do.js BAI_NAY — như Kỳ Trân Các chỉ mua ở thành). Đổi bản đồ vẫn do trình duyệt làm, đi bằng đường của Xa phu (main.js diDaTau).
// -> { di: { z, ban?, phu? } } | { hoiPhu: { ten, co } } | { canh } (không đi được — lý do) | { tin } (đang ở đó rồi)
const KHONG_DI = { "thuyền": "đang trên thuyền Phong Lăng Độ", "ải": "đang trong ải Vượt Ải", "đảo": "đang ở Đảo Tẩy Tủy", "chiến": "đang trong trận Phong Hỏa Liên Thành", "tongkim": "đang trong chiến trường Tống Kim", "viêm đế": "đang trong Bảo tàng Viêm Đế", "đua ngựa": "đang trên đường đua Truy Phong Đại Loạn Đấu" };
const laPhuDt = (o) => !!(N.BY.get(o.k) || {}).phu && (o.n || 1) > 0; // Thổ Địa Phù (vat-pham.json phu)
function den(h, D, key, b) {
  const o = noiLam(h, D);
  if (!o) { // trình duyệt còn bản nhiệm vụ cũ (vừa xong / vừa đổi): câu báo theo nhiệm vụ đang có
    const coMon = D.buoc === 1 && D.loai <= 3 && (h.bag || []).some((it) => !it.het && hopMon(D, it));
    return { canh: D.buoc !== 1 ? (D.buoc === 2 ? "Nhiệm vụ Dã Tẩu xong rồi. Về gặp Dã Tẩu chọn thưởng." : "Chưa nhận nhiệm vụ Dã Tẩu. Nhận rồi hãy bấm.") : D.loai === 4 && (D.co | 0) >= (D.can | 0) ? "Đủ Địa Đồ chí rồi. Về gặp Dã Tẩu."
      : coMon ? "Món Dã Tẩu cần đã có trong hành trang. Về gặp Dã Tẩu." : D.loai <= 3 ? "Món này không bán ở cửa hàng hay sạp Hệ thống. Tự tìm rồi nộp cho Dã Tẩu."
      : "Nhiệm vụ lần này không có nơi làm cố định. Đánh quái ở bãi nào cũng được." };
  }
  if (o.cho) return { canh: "Món này mua ở sạp Hệ thống của Chợ Trời (thẻ Dã Tẩu). Không cần đi đâu." };
  const zNay = N.BAI_NAY.get(key), Zn = N.ZONES.get(zNay);
  if (!Zn) return { canh: "Chưa rõ ngươi đang đứng ở đâu. Chờ giây lát rồi bấm lại." };
  const z = o.zs && o.zs.includes(zNay) ? zNay : o.z, Z = N.ZONES.get(z), ten = o.ban ? `${o.ten} ${Z.n}` : Z.n;
  // Điểm báo danh Tống Kim (325, kind "thành" + tkBd) tính như thành: Xa phu ở đó vốn đưa ra bãi luyện công miễn phí (soát 11/11)
  const thanh = N.THANH.has(Zn.kind), bai = N.FARM.has(Zn.kind) && !Zn.chiThuyen;
  if (!thanh && !bai) return { canh: `Không đi tới nơi làm nhiệm vụ Dã Tẩu được: ${Zn.chiThuyen ? "đang ở bờ Bắc Phong Lăng Độ (về bờ Nam bằng Thuyền phu)" : KHONG_DI[Zn.kind] || `đang ở ${Zn.n}`}` };
  if (N.capVao(Z) > (h.lvl || 1)) return { canh: `Đạt cấp ${N.capVao(Z)} mới vào được ${Z.n}. Luyện thêm đi!` };
  if (z === zNay) return o.ban ? { di: { z, ban: o.ban } } : { tin: [`Đang ở ${Z.n} rồi`] }; // cửa hàng ngay thành này: chạy tới NPC
  if (thanh) return { di: { z, ...(o.ban ? { ban: o.ban } : {}) } };
  // tấm phù của chuyến trước chưa đi được (bị hủy / tải bản đồ hỏng / hoàn không được vì túi đầy — hoanPhu) còn hạn: đi bằng tấm đó, không hỏi, không trừ thêm
  const cu = PHU_HOAN.get(key);
  if (cu && !cu.toi && Date.now() - cu.t <= HOAN_MS) { cu.z = z; return { di: { z, ...(o.ban ? { ban: o.ban } : {}), phu: 1 }, tin: [`Dùng lại Thổ Địa Phù của chuyến trước (chưa đi được) — đi tới ${ten}`] }; }
  const ds = (h.bag || []).filter(laPhuDt), p = ds.find((x) => (x.kbh | 0) > 0) || ds[0];
  if (!p) return { canh: `Đang ở bãi luyện công. Cần 1 Thổ Địa Phù để đi tới ${ten} (Tạp hóa bán), hoặc về thành rồi bấm lại.` };
  if (!b.phu) return { hoiPhu: { ten, co: ds.reduce((t, x) => t + (x.n || 1), 0) } };
  const r = DO.lam(h, { act: "phu", u: p.u }, key); // trừ 1 tấm như dùng Thổ Địa Phù trong túi (trên thuyền / bờ Bắc: do.js báo không dùng được)
  PHU_HOAN.set(key, { t: Date.now(), z, k: p.k, kbh: p.kbh | 0 });
  return { di: { z, ...(o.ban ? { ban: o.ban } : {}), phu: 1 }, tin: [`${r.msg} — đi tới ${ten}`] };
}
// Hoàn Thổ Địa Phù (soát 11/11): đã trừ phù mà trình duyệt phải thôi đi (diDaTau — trong lúc chờ trả lời bị kéo sang ải / đảo…; trình duyệt chưa có bản đồ
// nơi đến; tải bản đồ hỏng) -> viec "hoanPhu" trả lại đúng 1 tấm, cùng trạng thái khóa bảo hiểm. Quyền hoàn: trong HOAN_MS sau lần trừ, chưa tới nơi (nhịp báo
// tới đúng nơi -> daToi đánh dấu hết quyền), mỗi lần trừ chỉ 1 lần — hoàn xong mới bỏ (túi hết chỗ: giữ quyền, bấm lại "Đưa ta đến" thì đi bằng tấm đó — den).
// Đổi bản đồ do trình duyệt làm — trình duyệt sửa bậy thì vốn đã đi đâu cũng được, hoàn không cho thêm gì
const PHU_HOAN = new Map(), HOAN_MS = 120 * 1000; // "tài khoản|ô" -> { t (lúc trừ), z (nơi đến), k, kbh, toi? }
function hoanPhu(h, key) {
  const r = PHU_HOAN.get(key);
  if (!r || r.toi || Date.now() - r.t > HOAN_MS || N.BAI_NAY.get(key) === r.z) { PHU_HOAN.delete(key); return {}; }
  try { N.themChong(h, { k: r.k }, 1, r.kbh); } catch { return { tin: ["Hành trang đầy, chưa trả lại được Thổ Địa Phù. Bấm lại \"Đưa ta đến\" trong 2 phút thì đi bằng tấm đó, không trừ thêm."] }; } // quyền hoàn còn
  PHU_HOAN.delete(key);
  return { tin: ["Chưa đi tới nơi làm nhiệm vụ. Trả lại 1 Thổ Địa Phù."] };
}
// nhịp báo bãi đang đứng (api.js): tới đúng nơi của chuyến đã trừ phù -> hết quyền hoàn / dùng lại
function daToi(key, z) { const r = PHU_HOAN.get(key); if (r && r.z === (z | 0)) r.toi = 1; }

// b.viec: "mo" (bấm NPC) | "nhan" | "info" | "tiep" | "xong" (+ b.u) | "chon" (+ b.i) | "hoiHuy" | "hoiHuy2" | "huy" (+ b.cach) | "den" (+ b.phu — Đưa ta đến nơi
// làm nhiệm vụ, anh 11/11; key = "tài khoản|ô": bãi đang đứng — do.js BAI_NAY) | "hoanPhu" (thôi đi sau khi đã trừ phù — hoanPhu)
function lam(h, b, key) {
  if (!DT) loi("Thiếu dữ liệu Dã Tẩu (assets/data/da-tau.json). Báo quản trị đi.");
  const D = (h.daTau = h.daTau || {});
  ngayMoi(D);
  switch (b.viec) {
    case "mo": {
      const tin = []; traNo(h, D, tin);
      // nhiệm vụ đang làm thuộc dòng tạm bỏ (Huyền tinh — nhận trước khi bỏ): giao nhiệm vụ khác cùng chỗ, không tính lượt, không tốn cơ hội hủy
      if (D.buoc === 1 && D.loai && tamBo(DT.nv[D.loai][D.dong])) { D.soNgay = Math.max(0, (D.soNgay | 0) - 1); giao(h, D); tin.push("Dã Tẩu đổi nhiệm vụ khác: món ngươi đang tìm tạm chưa có trong game. Không mất lượt, không tốn cơ hội hủy."); }
      const r = moDau(h, D); return tin.length ? { ...r, tin: [...tin, ...(r.tin || [])] } : r;
    }
    case "nhan": return D.buoc ? moDau(h, D) : nhan(h, D);
    case "info": return { talk: INFO };
    case "tiep": {
      if (D.buoc !== 3) return moDau(h, D);
      if (!conNgay(D)) return say(HET_NGAY, []);
      tiep(h, D); giao(h, D);
      return bangNv(h, D);
    }
    case "xong": return xong(h, D, b);
    case "xongShxt": return xongNhanh(h, D, "shxt");
    case "xongLenh": return xongNhanh(h, D, "lenh", b.u);
    case "chon": return chon(h, D, b);
    case "hoiHuy": return D.buoc === 1 ? hoiHuy(h, D) : moDau(h, D);
    case "hoiHuy2": return say("Ngươi nghĩ kỹ chưa? Chắc chắn hủy nhiệm vụ lần này?", [["Đừng lôi thôi nữa! Ta không làm nhiệm vụ này đâu!", "huy", 1], ["Thôi, để ta nghĩ lại đã!", null]]);
    case "huy": return huy(h, D, (b.cach | 0) === 2 ? 2 : 1);
    case "den": return den(h, D, key, b);
    case "hoanPhu": return hoanPhu(h, key);
  }
  loi("Không có việc này. Đừng bấm nữa.");
}

// ---------- Trợ Thủ tự làm Dã Tẩu (anh 03/11 — mở khóa trong ngày bằng Xu: may-chu/tu-lam.js; trình duyệt src/game/tulam.js) ----------
// Mỗi lần gọi làm 1 bước như người chơi đứng trước Dã Tẩu bấm hội thoại (cùng hàm của hội thoại — luật, giới hạn ngày, thưởng như tay):
//   - chưa nhận / đã thưởng -> nhận nhiệm vụ kế; xong chờ thưởng -> chọn ô thưởng (chonO); đang làm:
//   - Mua / Tìm / Xem vật phẩm: món trong túi khớp — món mua ở sạp Hệ thống (dt) trước: Dã Tẩu lấy luôn (cả Xem — anh 04/11 "đồ dã tẩu thu rồi k trả
//     lại"); Xem không có món dt thì đưa đồ người chơi khớp (xem xong trả lại); Mua / Tìm không đụng đồ người chơi; Sát Thủ Giản khi opt.gian. Không
//     có thì mua món đó ở sạp Hệ thống của Chợ Trời (như bấm mua — giá, túi như sạp)
//     rồi nộp; thiếu ngân lượng thì lấy phần thiếu trong rương (như Trợ Thủ mua thuốc ở thành)
//   - Thu thập địa đồ / Nâng cấp kinh nghiệm / Sơn Hà Xã Tắc: đủ thì nộp, chưa đủ -> "danh" (đi đánh quái: bai = bãi thu thập địa đồ)
//   - không làm được (món Kỳ Trân Các, sạp không bán): khongLam — đầu chuỗi đổi nhiệm vụ, còn cơ hội hủy thì dùng, đủ mảnh Sơn Hà Xã Tắc thì nộp mảnh
//     xong ngay (anh 10/11); hết cả thì dừng ("dung") chờ người chơi — không hủy bằng mảnh, không hủy làm lại từ đầu chuỗi
// opt = { thuong: "kn" | "vat" | "tien" (ô thưởng ưu tiên), giuHuy (chọn ô cơ hội hủy khi còn < số này), gian (0 | 1) } — huy ("lai") cũ bỏ qua
// -> { tiep: "lai" (gọi tiếp) | "danh" (+ bai) | "tui" (túi < 5 ô trống — Dã Tẩu không nhận) | "het" (đủ trong ngày) | "cho" (+ giay) | "dung" (+ ly),
//      tin: [câu], mua?: { ten, gia, yc } }
function buocTu(h, opt = {}) {
  if (!DT) loi("Thiếu dữ liệu Dã Tẩu (assets/data/da-tau.json). Báo quản trị đi.");
  const D = (h.daTau = h.daTau || {}), tin = [], ra = (tiep, them) => ({ tiep, tin, ...them });
  const gom = (r) => { for (const t of (r && r.tin) || []) tin.push(t); };
  ngayMoi(D);
  traNo(h, D, tin);
  // hủy liền 3 lần ở nhiệm vụ đầu chuỗi: Dã Tẩu không giao trong 10 phút
  if (D.phat === 10) {
    const con = 605000 - (Date.now() - (D.phatLuc || 0));
    if (con > 0) return ra("cho", { giay: Math.ceil(con / 1000), ly: "Dã Tẩu không giao nhiệm vụ trong 10 phút. Hủy liền 3 lần ở nhiệm vụ đầu chuỗi rồi." });
    D.phat = 0;
  }
  const nhanMoi = () => tin.push(`Dã Tẩu giao nhiệm vụ thứ ${tongNv(D) + 1}: ${tomTat(h, D)}`);
  if (D.buoc === 1 && D.loai && tamBo(DT.nv[D.loai][D.dong])) { D.soNgay = Math.max(0, (D.soNgay | 0) - 1); giao(h, D); nhanMoi(); return ra("lai"); }
  if (!D.buoc) {
    if ((h.lvl || 1) < CAP_NHAN) return ra("dung", { ly: `Cấp ${CAP_NHAN} mới nhận được nhiệm vụ Dã Tẩu. Luyện thêm đi!` });
    if (!conNgay(D)) return ra("het");
    nhan(h, D); nhanMoi(); return ra("lai");
  }
  if (D.buoc === 3) {
    if (!conNgay(D)) return ra("het");
    tiep(h, D); giao(h, D); nhanMoi(); return ra("lai");
  }
  if (D.buoc === 2) {
    const i = chonO(h, D, opt);
    if (i < 0) return ra("tui");
    const o = D.thuong[i];
    gom(chon(h, D, { i }));
    tin.unshift(`Trợ Thủ chọn thưởng: ${o.loai === 4 ? "thử vận" : o.ten}`);
    return ra("lai");
  }
  if (oTrong(h) < 5) return ra("tui");
  const nv = DT.nv[D.loai][D.dong];
  if (D.loai <= 3) {
    const ktc = D.loai === 2 && !!nv.k, duoc = (it) => !it.het && hopMon(D, it) && (D.loai === 3 || !!it.dt || (ktc && !!opt.gian));
    let it = h.bag.find((x) => !!x.dt && duoc(x)) || h.bag.find(duoc), mua = null; // món sạp Hệ thống (dt) trước — Dã Tẩu giữ luôn; Xem không có thì đồ người chơi (trả lại)
    const o = !it && !ktc ? (D.loai === 1 ? hangNpc(nv) : hangCua(D.loai, D.dong | 0)) : null;
    if (o) {
      const thieu = o.gia - (h.gold || 0);
      if (thieu > 0 && (h.khoa || (h.tienRuong || 0) < thieu)) return ra("dung", { ly: `Thiếu ${N.tien(thieu)} để mua món Dã Tẩu đòi (${N.tien(o.gia)} — ${o.noi})${h.khoa ? " — rương đang khóa" : ""}` });
      const m = { ...o.it, u: (h.uN = (h.uN | 0) + 1) };
      if (N.laTB(m)) { delete m.g; delete m.ng; delete m.di; require("./nguon-mon").gan(m, "he", "Dã Tẩu · mua hộ món nhiệm vụ", h.name); } // nguồn gốc món (anh 18/11 tối)
      if (!N.vaoTui(h, m)) return ra("tui");
      if (thieu > 0) { h.tienRuong -= thieu; h.gold = (h.gold || 0) + thieu; tin.push(`Lấy ${N.tien(thieu)} trong rương`); }
      h.gold -= o.gia; it = m;
      mua = { ten: DO.tenMon(m).trim(), gia: o.gia, yc: o.yc, noi: o.noi };
      tin.push(`Mua ${mua.ten} (${o.noi}) — ${N.tien(o.gia)}`);
    }
    if (!it) return khongLam(h, D, opt, tin, ktc ? `Dã Tẩu đòi ${tenDo(nv.k)}` : "Sạp Hệ thống không bán món Dã Tẩu đòi. Tự tìm đi.");
    gom(xong(h, D, { u: [it.u] }));
    return D.buoc === 2 ? ra("lai", mua ? { mua } : {}) : ra("dung", { ly: "Dã Tẩu không nhận món này.", ...(mua ? { mua } : {}) });
  }
  const du = D.loai === 4 ? (D.co | 0) >= D.can : D.loai === 5 ? knThem(h, D) >= nv.kn : (h.shxt | 0) >= nv.n;
  if (!du) return ra("danh", { bai: D.loai === 4 ? D.bai : null });
  gom(xong(h, D, {}));
  return D.buoc === 2 ? ra("lai") : ra("dung", { ly: "Dã Tẩu chưa nhận nhiệm vụ. Nhận rồi hãy làm." });
}
// Mua vật phẩm (loại 1 — món bày ở cửa hàng NPC: Thợ rèn / Tạp hóa Ba Lăng, Mã phu Biện Kinh): Trợ Thủ mua đúng giá cửa hàng (assets/data/vat-pham.json
// shops — 30 lượng … 10 vạn), như người chơi tới NPC mua; sạp Hệ thống không bày loại này (anh 03/11: người chơi tới Tạp hóa / Thợ rèn mua). Món mang dt
// (Trợ Thủ không tự bán / cất) -> { it, gia, yc, noi }. HANG_NPC: khóa món -> hàng bày { k, gia, s, cua (mã cửa hàng = Sale của NPC bán — noiLam) }
const HANG_NPC = (() => { try { return new Map(Object.entries(JSON.parse(fs.readFileSync(path.join(ROOT, "assets/data/vat-pham.json"), "utf8")).shops || {}).flatMap(([cua, L]) => L.map((o) => [o.k, { ...o, cua: +cua }]))); } catch { return new Map(); } })();
function hangNpc(nv) {
  const g = HANG_NPC.get(nv.k); if (!g || !N.BY.get(nv.k)) return null;
  return { it: { k: nv.k, s: nv.s != null && nv.s >= 0 ? nv.s : g.s ?? 0, d: [], m: 1, dt: 1 }, gia: g.gia, yc: tenDo(nv.k, nv.s), noi: nv.cho || "cửa hàng" };
}
// ô thưởng Trợ Thủ chọn: ô cơ hội hủy khi còn ít hơn opt.giuHuy (mặc định 2), rồi loại ưu tiên, rồi kinh nghiệm > vật phẩm > tiền > thử vận > cơ hội
// hủy; túi còn < 5 ô thì bỏ ô vật phẩm / thử vận (chon báo túi đầy) -> chỉ số ô | -1
function chonO(h, D, opt) {
  const L = D.thuong || [], uu = { kn: 2, vat: 3, tien: 1 }[opt.thuong] || 2, day = oTrong(h) < 5;
  const tim = (loai) => L.findIndex((o) => o.loai === loai && !(day && (o.loai === 3 || o.loai === 4)));
  if ((D.huy | 0) < (opt.giuHuy ?? 2)) { const i = tim(5); if (i >= 0) return i; }
  for (const l of [uu, 2, 3, 1, 4, 5]) { const i = tim(l); if (i >= 0) return i; }
  return -1;
}
// nhiệm vụ không làm được (anh 10/11: "trợ lý khi bị kẹt không được dùng mảnh để hủy, có thể dùng mảnh để hoàn thành, cấm hủy mất chuỗi"): đầu chuỗi
// đổi nhiệm vụ, còn cơ hội hủy thì dùng (2 cách này không mất chuỗi — cần còn lượt trong ngày vì hủy là nhận nhiệm vụ mới), đủ mảnh Sơn Hà Xã Tắc thì
// nộp mảnh xong ngay (xongNhanh — không cần lượt); hết cả thì dừng chờ người chơi. Không hủy bằng mảnh, không hủy làm lại chuỗi (opt.huy "lai" bỏ)
function khongLam(h, D, opt, tin, ly) {
  const con = conNgay(D), dauChuoi = !(D.lan | 0) && D.link === linkDau(h.lvl || 1), coHuy = (D.huy | 0) > 0;
  const lam = (cach, cau) => { const r = huy(h, D, cach); for (const t of r.tin || []) tin.push(t); tin.unshift(`Trợ Thủ: ${ly} — ${cau}`); return { tiep: "lai", tin }; };
  if (con && dauChuoi) return lam(1, "đổi nhiệm vụ khác (nhiệm vụ đầu chuỗi)");
  if (con && coHuy) return lam(1, "dùng 1 cơ hội hủy");
  if ((h.shxt | 0) >= XN_SHXT && D.loai !== 6) {
    if (oTrong(h) < 5) return { tiep: "tui", tin };
    const r = xongNhanh(h, D, "shxt");
    for (const t of r.tin || []) tin.push(t);
    tin.unshift(`Trợ Thủ: ${ly} — nộp ${XN_SHXT} mảnh Sơn Hà Xã Tắc để xong ngay`);
    return { tiep: "lai", tin };
  }
  if (!con) return { tiep: "het", tin, ly: `${ly} — hôm nay nhận đủ ${GH} nhiệm vụ rồi, không hủy được` };
  return { tiep: "dung", tin, ly: `${ly} — hết cơ hội hủy, chưa đủ ${XN_SHXT} mảnh Sơn Hà Xã Tắc để xong ngay: Trợ Thủ dừng Dã Tẩu. Không hủy mất chuỗi — tự xử lý rồi bật lại.` };
}

// ---------- sạp Hệ thống của Chợ Trời (anh 02/11 khuya: "tạo các item dã tẩu hay yêu cầu, treo lên shop dưới danh nghĩa của hệ thống game, để
// người chơi có thể thuận tiện mua, mỗi món 5 - 8v tùy em thiết kế") — may-chu/cho-troi.js bày ở thẻ Dã Tẩu của bảng Chợ Trời, chủ sạp "Hệ thống":
//   - hàng bày sẵn: mọi dòng Xem vật phẩm (loại 3 — dòng món Dã Tẩu đòi nhiều nhất; nộp món sạp thì Dã Tẩu giữ luôn — anh 04/11 — mua trước để dành được);
//   - món của nhiệm vụ đang làm (loại 2 Tìm / 3 Xem): đứng đầu, đánh dấu "đang cần"; loại 2 chỉ mua được khi nhiệm vụ đó còn đang làm. Loại 1 Mua (món của
//     Tạp hóa / Thợ rèn Ba Lăng, Mã phu Biện Kinh) không bày — anh 03/11: "người chơi chạy qua tạp hóa hay thợ rèn mua là dc".
// Món = món yếu nhất qua được khop(): món nền cấp thấp nhất ra được dòng đó (cấp dòng ≤ cấp đồ + capDong.cong như gieoDong của do.js), 1 dòng ở số
// nhỏ nhất của khoảng (dòng hậu tố: đúng ngũ hành của dòng, thêm 1 dòng tiền tố nhẹ đứng trước như món thật — hậu tố luôn là dòng 2, 4, 6); loại 3
// dùng món nhỏ nhất có dòng đó (nhẫn; không có thì bao tay, hương nang …); m = 1 (bán lại NPC như đồ rơi quái cấp 1); dt = 1 (Trợ Thủ không tự bán /
// cất — do.js theoTuBan; chú thích món ghi "Món Dã Tẩu"; nộp loại nào Dã Tẩu cũng giữ, cả Xem — anh 04/11). Giá theo giá trị nhiệm vụ của
// client (TaskValue2 — dòng càng hiếm càng cao): cau-hinh.json daTau.choHt — ≤ 5 vạn -> 5 vạn, ≤ 30 vạn -> 6 vạn, ≤ 100 vạn -> 7 vạn, còn lại 8 vạn;
// hàng hệ thống không thu thuế. Món Kỳ Trân Các Dã Tẩu đòi (Sát Thủ Giản, Huyền tinh) không bán. u của hàng = loại × 10000 + chỉ số dòng.
const HT = { bac: [50000, 300000, 1000000], gia: [50000, 60000, 70000, 80000], ...(CFG.choHt || {}) };
const giaHt = (nv) => HT.gia[Math.min(HT.gia.length - 1, HT.bac.filter((b) => nv.tv2 > b).length)];
const CONG = (N.CFG.capDong || {}).cong ?? 3;
const NEN = new Map(); // "loại|kiểu|cấp đồ" -> món nền
for (const x of N.BY.values()) if (GOC[x.k] && !x.thuoc && !x.ktc) { const key = `${x.t}|${x.p}|${capDo(x.k)}`; if (!NEN.has(key)) NEN.set(key, x); }
const nenCua = (t, p, cl) => { for (let c = cl; c <= 10; c++) { const x = NEN.get(`${t}|${p}|${c}`); if (x) return x; } return null; };
const LOAI_NHO = [3, 8, 9, 4, 6, 5, 7, 2, 1, 0]; // nhẫn 1 ô; bao tay, hương nang, dây chuyền, đai 2 ô; giày, mũ 4; áo 6; vũ khí
// dòng client cấp thấp nhất của thuộc tính a trong bảng L mà khoảng số chạm [min, max]
function dongThap(L, a, min, max) {
  let r0 = null;
  for (const r of L) if (r.k === a && r.p[0][0] <= max && r.p[0][1] >= min && (!r0 || r.lv < r0.lv)) r0 = r;
  return r0;
}
const MOI_DONG = N.ROWS.flat(); // loại 2 đòi dòng bảng client không cho ra trên loại món đó (Hương Nang / Ngọc Bội hồi thể lực): vẫn dựng như nhiệm vụ đòi
// dòng tiền tố nhẹ nhất của loại t (đứng trước dòng hậu tố) — cùng cấp thì dòng hay ra nhất
function lotTruoc(t) {
  let r0 = null;
  for (const r of N.ROWS[t] || []) if (r.pre && (!r0 || r.lv < r0.lv || (r.lv === r0.lv && r.w[t] > r0.w[t]))) r0 = r;
  return r0;
}
function monNv(loai, nv, dong) {
  // loại 1 Mua: không bày (mua ở cửa hàng NPC — anh 03/11); món Kỳ Trân Các Dã Tẩu đòi (Sát Thủ Giản, Huyền tinh): không bán
  if (loai === 1 || nv.k) return null;
  let it = null;
  if (loai === 2 && !nv.a) { const x = nenCua(nv.t, nv.p, nv.cl ?? 1); it = x ? { k: x.k, s: nv.s ?? dong % 5, d: [] } : null; }
  else for (const t of loai === 2 ? [nv.t] : LOAI_NHO) {
    const r = dongThap(N.ROWS[t] || [], nv.a, nv.min, nv.max) || (loai === 2 ? dongThap(MOI_DONG, nv.a, nv.min, nv.max) : null);
    const x = r && nenCua(t, loai === 2 ? nv.p : 0, Math.max(1, r.lv - CONG)), lot = r && !r.pre ? lotTruoc(t) : null;
    if (!x || (!r.pre && !lot)) continue;
    const v = Math.max(nv.min, r.p[0][0]);
    it = { k: x.k, s: r.pre ? dong % 5 : r.se, d: lot ? [[lot.k, lot.p[0][0]], [r.k, v]] : [[r.k, v]] };
    break;
  }
  return it && khop(loai, nv, it) ? { ...it, m: 1, dt: 1 } : null;
}
// chữ yêu cầu như lời Dã Tẩu (dòng tên ô hàng)
const khoangSo = (nv) => (nv.min === nv.max ? `${nv.min}` : `${nv.min}–${nv.max}`);
function yeuCau(loai, nv) {
  const t = loai === 1 ? tenDo(nv.k, nv.s) : loai === 3 ? nv.an.charAt(0).toUpperCase() + nv.an.slice(1) + " " + khoangSo(nv) : nv.a ? `${nv.ten} ${nv.an} ${khoangSo(nv)}` : nv.ten;
  return t.replace(/\s+/g, " ").trim();
}
function hangCua(loai, dong) {
  const nv = loai >= 1 && loai <= 3 && DT && DT.nv[loai][dong], it = nv && monNv(loai, nv, dong);
  return it ? { u: loai * 10000 + dong, loai, it, gia: giaHt(nv), yc: yeuCau(loai, nv), noi: "sạp Hệ thống của Chợ Trời" } : null;
}
const HANG = DT ? DT.nv[3].map((_, i) => hangCua(3, i)).filter(Boolean) : [];
// hàng cho người xem h: món nhiệm vụ đang làm (can) đứng đầu, rồi hàng bày sẵn
function choHt(h) {
  const D = h.daTau || {}, u = D.buoc === 1 && D.loai >= 1 && D.loai <= 3 ? D.loai * 10000 + (D.dong | 0) : 0;
  const can = u ? HANG.find((o) => o.u === u) || hangCua(D.loai, D.dong | 0) : null;
  return [...(can ? [{ ...can, can: 1 }] : []), ...HANG.filter((o) => o.u !== u)];
}
// mua món u: hàng bày sẵn, hoặc món của nhiệm vụ đang làm -> hàng | null
function muaHt(h, u) {
  if (!Number.isInteger(u) || u <= 0) return null;
  const loai = Math.floor(u / 10000), dong = u % 10000, D = h.daTau || {};
  if (HANG.some((o) => o.u === u)) return hangCua(loai, dong);
  return D.buoc === 1 && D.loai === loai && (D.dong | 0) === dong ? hangCua(loai, dong) : null;
}

// ---------- công cụ thử (anh 27/10 "thêm cài đặt dã tẩu cho dev tool" — tài khoản quản trị, api.js /api/quan-tri/hoat-dong) ----------
// b.viec: "xem" | "xong" (nhiệm vụ đang làm xong ngay -> khung chọn thưởng) | "loai" (b.n 1–6: giao lại nhiệm vụ loại đó, không tính thêm lượt
// trong ngày; chưa nhận thì bắt đầu chuỗi) | "soNgay" (b.n: số nhiệm vụ đã nhận hôm nay — thử thưởng thứ 30 / 40) | "huy" (+1 cơ hội hủy) |
// "xongNgay" (b.n: số nhiệm vụ đã xong hôm nay — thử mốc ngày) | "tong" (b.n: tổng đã xong — thử mốc tổng, bậc mốc) | "boPhat" (bỏ phạt hủy liền 3 lần) | "lan" (b.n: nhiệm vụ thứ mấy trong chuỗi 0–19 — thử quà mốc) | "datLai" (xóa Dã Tẩu của nhân vật)
const LOAI = ["", "Mua vật phẩm", "Tìm vật phẩm", "Xem vật phẩm", "Thu thập địa đồ", "Nâng cấp kinh nghiệm", "Sơn Hà Xã Tắc"];
const devXem = (h, D) => ({ tongXong: tongXong(D), xongNgay: D.xongNgay | 0, bac: bacMoc(D), lk: D.lk | 0, mocTong: mocSau(MOC_TONG, tongXong(D)), mocChuoi: DT ? mocChuoiSau(tongNv(D)) : null, buoc: D.buoc | 0, loai: D.loai ? LOAI[D.loai] : "", nv: tomTat(h, D), tong: DT ? tongNv(D) : 0, soNgay: D.soNgay | 0, gioiHan: GH, lan: D.lan | 0, link: D.link | 0,
  chuoi: D.chuoi | 0, vong: D.vong | 0, huy: D.huy | 0, phat: D.phat | 0, shxt: h.shxt | 0 });
function dev(h, b) {
  if (!DT) loi("Thiếu dữ liệu Dã Tẩu (assets/data/da-tau.json). Báo quản trị đi.");
  const D = (h.daTau = h.daTau || {}), n = b.n | 0;
  ngayMoi(D);
  let r = {};
  switch (b.viec) {
    case "xem": break;
    case "xong":
      if (D.buoc !== 1) { r = { tin: ["Dã Tẩu (thử): chưa có nhiệm vụ đang làm"] }; break; }
      D.buoc = 2; D.thuong = taoThuong(h, D); D.lenhChon = 1; /* khung chọn thưởng hiện tại chỗ như Lệnh bài (npc-gan.js cho "chon" từ xa) */ r = { thuong: khungThuong(h, D), tin: ruong10(h, D) }; break;
    case "loai": {
      const l = Math.min(6, Math.max(1, n));
      if (!D.buoc) Object.assign(D, { lan: 0, link: linkDau(h.lvl || 1), vong: 0, huy: 0, chuoi: 0 });
      else if (D.buoc === 3) tiep(h, D);
      else if (D.buoc === 1) D.soNgay = Math.max(0, (D.soNgay | 0) - 1); // giao lại nhiệm vụ đang làm: không tính thêm lượt
      giao(h, D, l);
      r = { tin: [D.loai === l ? `Dã Tẩu (thử): nhiệm vụ loại ${LOAI[l]}` : `Dã Tẩu (thử): link ${D.lk} không có loại ${LOAI[l]} — ra ${LOAI[D.loai]}`], ...bangNv(h, D) }; break;
    }
    case "soNgay": D.soNgay = Math.min(GH, Math.max(0, n)); D.xongNgay = Math.min(D.soNgay, D.xongNgay | 0); break;
    case "xongNgay": D.xongNgay = Math.min(GH, Math.max(0, n)); D.soNgay = Math.max(D.soNgay | 0, D.xongNgay); break; // thử mốc ngày
    case "tong": D.tongXong = Math.max(0, n); break; // thử mốc tổng / bậc mốc
    case "lan": D.lan = Math.min(19, Math.max(0, n)); break;
    case "huy": D.huy = (D.huy | 0) + 1; break;
    case "boPhat": D.phat = 0; delete D.phatLuc; break;
    case "toiMoc": { // b.n = số thứ tự nhiệm vụ (tổng của client) sẽ xong kế tiếp — thử quà mốc 100 … 8000: đặt vòng / link / chuỗi / lần rồi giao nhiệm vụ
      const so = Math.min(8000, Math.max(1, n)), truoc = so - 1, rem = truoc % 400;
      if (!D.buoc) Object.assign(D, { link: linkDau(h.lvl || 1), huy: 0 });
      const b0 = bacCua(D.link); let l = b0[1], con = Math.floor(rem / 20);
      while (l < b0[2] && con >= chuoiCuaLink(l)) { con -= chuoiCuaLink(l); l++; }
      Object.assign(D, { vong: Math.floor(truoc / 400), link: l, chuoi: con, lan: rem % 20 });
      const sn = D.soNgay | 0; giao(h, D, 4); D.soNgay = sn; // giao lại: không tính thêm lượt trong ngày
      r = { tin: [`Dã Tẩu (thử): nhiệm vụ đang làm là thứ ${tongNv(D) + 1} — Xong ngay rồi chọn thưởng để nhận quà mốc`] }; break;
    }
    case "ruong": case "chuy": { const tin = []; traoMon(h, D, b.viec === "ruong" ? RUONG : "ms:2348", 1, tin); r = { tin }; break; } // +1 Bảo rương thần bí / Huyền Thiên Chùy
    case "lenh": { const tin = []; traoMon(h, D, LENH, 1, tin); r = { tin }; break; } // +1 Lệnh bài làm NV Dã Tẩu (hoàn thành nhanh — anh 10/11)
    case "shxtThem": h.shxt = (h.shxt | 0) + 100; r = { tin: [`Dã Tẩu (thử): +100 mảnh Sơn Hà Xã Tắc (có ${h.shxt})`] }; break;
    case "datLai": delete h.daTau; return { dev: devXem(h, {}), tin: ["Dã Tẩu (thử): đã xóa, nói chuyện với Dã Tẩu để bắt đầu lại"] };
    default: loi("Không có việc này. Đừng bấm nữa.");
  }
  return { ...r, dev: devXem(h, D) };
}

// hệ món nhiệm vụ mua (loại 1) đang đòi nếu đúng món k (may-chu/do.js act mua: câu báo "đúng món Dã Tẩu cần"; hàng không ghi hệ, không hệ cố định -> hệ này) | null
function heCanMua(h, k) {
  const D = h && h.daTau; if (!DT || !D || D.buoc !== 1 || D.loai !== 1) return null;
  const nv = DT.nv[1] && DT.nv[1][D.dong];
  return nv && nv.k === k && nv.s != null && nv.s >= 0 ? nv.s : null;
}
// mua món cùng tên mà khác món nhiệm vụ đang đòi (ngựa cấp 7 thay cấp 8…) -> tên món đúng ("Đại Uyển Bạch Mã cấp 8 (Thủy)") để nhắc | null
function canMuaKhac(h, k) {
  const D = h && h.daTau; if (!DT || !D || D.buoc !== 1 || D.loai !== 1) return null;
  const nv = DT.nv[1] && DT.nv[1][D.dong], a = N.BY.get(k), b = nv && N.BY.get(nv.k);
  return nv && nv.k !== k && a && b && String(a.n).trim() === String(b.n).trim() ? tenDo(nv.k, nv.s) : null;
}

module.exports = { lam, tomTat, chiTiet, dev, choHt, muaHt, buocTu, heCanMua, canMuaKhac, tenDo, daToi };
