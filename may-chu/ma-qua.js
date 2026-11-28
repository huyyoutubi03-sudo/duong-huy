// Mã kích hoạt (anh 29/10: "thêm vào Lễ Quan chức năng đổi mã kích hoạt, dùng để kích hoạt các mã code mà game cho, nhận quà tương ứng").
// Quản trị tạo mã ở bảng quản trị (F10 — thẻ Mã quà, src/game/quantri.js): quà như Gửi quà (ngân lượng, Xu, vật phẩm — do.js taoQua) + kinh nghiệm
// (chủ server 22/11/2026: nhập mã nhận exp, lên cấp theo đúng luật chung lenCap, trần 200), số lần
// dùng tối đa của cả máy chủ (0 = không giới hạn), hạn dùng, lời nhắn. Mỗi nhân vật dùng 1 mã 1 lần (chủ server 23/11/2026: đổi từ mỗi tài khoản —
// nhân vật khác cùng tài khoản vẫn dùng được; lượt đã dùng ghi cả tài khoản lẫn tên nhân vật nên nhân vật đã dùng vẫn bị chặn như cũ). NGOẠI LỆ (chủ server
// 25/11/2026): mã chung (tuDong, vd MAXPING) dùng lại KHÔNG GIỚI HẠN; nhập lại thì ngân lượng/Xu KHÔNG cộng dồn, chỉ nhận lại đồ (chỉ số gieo ngẫu nhiên
// mới qua taoQua) + kinh nghiệm. Mã chung MAXPING (chủ server 28/11/2026): thêm chuyển sinh 10 lần + bộ đồ Hoàng Kim đúng mapping đổi ở NPC — chỉ nâng, nhập lại an toàn. Mã cố định
// XU1000 (chủ server 28/11/2026, lệnh 12:07): 1.000 Xu, mã thường 1 lần/nhân vật, tự gieo khi chưa có (MA_CO_DINH trong doc()). Người chơi
// nhập ở Lễ quan Ba Lăng (main.js — khung nhập chữ của client 输入字串界面2.ini) -> POST /api/ma-qua { o, ma } (api.js).
// du-lieu/ma-qua.json = { ma: { MÃ: { qua: { tien, xu, exp, mon: [{ k, n, dong?, he? }] }, loi, toiDa, het (ms, 0 = không hạn), tat, tao: { boi, luc },
//   dung: [{ tk, nv, luc }] } } } — sao lưu hằng ngày cùng tài khoản (du-lieu.js saoLuu).
//   nhap(tk, h, ma)  -> { ds: [quà đã nhận], loi }   ghi vào nhân vật h (nơi gọi lưu tài khoản); mã không có / tắt / hết hạn / hết lượt /
//                       nhân vật đã dùng -> lỗi. Sai SAI_MAX lần trong SAI_MS thì chờ (chống dò mã)
//   quanTri(qt, b)   b.viec: "ds" -> { ds } | "tao" { ma?, tien?, xu?, mon?, loi?, toiDa?, ngay? } -> { msg, ma } | "tat" / "mo" / "xoa" { ma } -> { msg }
//                    | "lay" { ma } -> dữ liệu đưa vào khung sửa | "sua" { ma, tien?, xu?, mon?, loi?, toiDa?, ngay: "giu" | 0 bỏ hạn | n ngày } -> { msg } (anh 09/11: gia hạn, sửa mã đã tạo —
//                      còn hạn thì n ngày cộng vào hạn đang có, hết hạn thì tính từ bây giờ; người đã dùng mã giữ nguyên, vẫn không dùng lại được)
// Mã khóa (anh 11/11 "anh muốn tạo code nhận ra cũng đồ khóa"): tao / sua có khoa: 1 -> qua.kbh = KBH_VV — món nhận từ mã khóa bảo hiểm vĩnh viễn
//   như Gửi thẳng có ô Khóa vĩnh viễn (quan-tri.js quaTat; do.js taoQua — Mật đồ thần bí luôn không khóa; Ngân lượng, Xu không phải món). Sửa bỏ / thêm
//   khóa chỉ áp cho người nhập mã sau đó
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const D = require("./du-lieu");
const DO = require("./do");
const NK = require("./nhat-ky");
const NG = require("./nguon-mon"); // gắn nguồn gốc món (như do.js)
const CS = () => require("./chuyen-sinh"); // hằng số chuyển sinh (TOI_DA/TIEM_NANG — nạp lúc dùng, như npc-choi.js)
// Bảng đồ Hoàng Kim (cùng file do.js đọc: assets/data/do-hoang-kim.json) — chỉ lấy dòng cố định + hệ + cấp của món HK;
// việc cấp món vẫn qua đúng đường nhận của do.js (hình dạng monHK + NG.gan + vaoTui), vì taoQua chặn đồ HK.
const HK_CS = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "data", "do-hoang-kim.json"), "utf8")).items || {}; } catch { return {}; } })();

const FILE = path.join(D.ROOT, "ma-qua.json");
// Mã quà cố định của hệ thống (chủ server 28/11/2026, lệnh 12:07: "code cho 1000 xu đi"):
// XU1000 — 1.000 Xu, 1 lần/nhân vật, để mua lễ bao Nhạc Vương Kiếm (500 Xu) lập bang.
// Tự gieo vào ma-qua.json khi chưa có (file dữ liệu trên volume, không có trong repo) — đúng
// hình dạng mã thường sẵn có, luật 1 lần/nhân vật của nhap() áp dụng như mọi mã thường (không
// tuDong nên nhập lại không cộng dồn, không nhận lại gì). Quản trị vẫn tắt/mở/sửa được ở F10;
// xóa rồi thì lần nạp sau gieo lại (mã cố định của hệ thống). Không hardcode tên acc/nhân vật.
const MA_CO_DINH = { XU1000: { qua: { tien: 0, xu: 1000, exp: 0, mon: [] }, loi: "Nhận 1.000 Xu — mua lễ bao Nhạc Vương Kiếm mà lập bang.", toiDa: 0, het: 0 } };
const SAI_MAX = 10, SAI_MS = 10 * 60e3, LOI_MAX = 100, DUNG_GUI = 50;
const CHU = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // mã tự sinh: bỏ chữ dễ nhầm (O 0, I 1)
const loi = (msg, code = 400) => { throw Object.assign(new Error(msg), { code }); };
// ---------- Mã chung theo phái (chủ server 23/11/2026): 1 mã duy nhất, quà tính theo phái + giới tính của nhân vật nhập mã; phái có nhiều hệ vũ khí thì cho chọn hệ ----------
// Hệ = loại vũ khí của hướng chiêu (eqt trong skills.json): -1 tay không, 0 kiếm, 1 đao, 2 côn, 3 thương, 4 chùy, 5 song đao, 100 phi tiêu, 101 phi đao, 102 tụ tiễn.
const SKILL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "web", "skill", "skills.json"), "utf8"));
const VU_KHI = { 0: "meleeweapon:10", 1: "meleeweapon:20", 2: "meleeweapon:30", 3: "meleeweapon:40", 4: "meleeweapon:50", 5: "meleeweapon:60", 100: "rangeweapon:10", 101: "rangeweapon:20", 102: "rangeweapon:30" };
const TEN_HE = { "-1": "Tay không", 0: "Kiếm", 1: "Đao", 2: "Côn", 3: "Thương", 4: "Chùy", 5: "Song đao", 100: "Phi tiêu", 101: "Phi đao", 102: "Tụ tiễn" };
const nhanhPhai = (fac) => { // các hệ vũ khí của phái: eqt khác -2 trong mọi chiêu của phái (phái 1 hệ -> 1 mục, không cần chọn)
  const f = (SKILL.factions || []).find((x) => x.id === +fac);
  if (!f) return [];
  const s = new Set();
  for (const id of (f.skills || [])) { const k = SKILL.skills[String(id)]; if (k && k.eqt !== -2 && k.eqt != null) s.add(k.eqt | 0); }
  return [...s].sort((a, b) => a - b);
};
const doTheoPhai = (h, eqt) => { // bộ đồ cấp 10 như mã MAXPING từng phái (tao-ma-maxping.py): vũ khí theo hệ đã chọn, còn lại theo giới; HỆ + DÒNG GIEO NGẪU NHIÊN THEO TỪNG MÓN MỖI LẦN NHẬN (chủ server 28/11/2026) — taoQua gieoDong theo he của từng món, nhẫn tách 2 chiếc để mỗi chiếc gieo hệ riêng
  const series = h.series | 0, nu = h.sex === "f", fac = +h.fac, mon = [], wk = VU_KHI[eqt], heN = () => Math.floor(Math.random() * 5); // hệ ngẫu nhiên 0–4
  if (wk) mon.push({ k: wk, n: 1, dong: 6, he: heN() });
  const ao = nu ? (series === 4 ? "armor:90" : fac === 6 ? "armor:130" : "armor:120") : (series === 4 ? "armor:20" : fac === 6 ? "armor:60" : "armor:50");
  const mu = nu ? (series === 4 ? "helm:90" : "helm:130") : (series === 4 ? "helm:20" : "helm:50");
  mon.push({ k: ao, n: 1, dong: 6, he: heN() }, { k: "ring:10", n: 1, dong: 6, he: heN() }, { k: "ring:10", n: 1, dong: 6, he: heN() },
    { k: nu ? "amulet:10" : "amulet:20", n: 1, dong: 6, he: heN() }, { k: nu ? "boot:40" : "boot:20", n: 1, dong: 6, he: heN() },
    { k: "belt:20", n: 1, dong: 6, he: heN() }, { k: mu, n: 1, dong: 6, he: heN() },
    { k: nu ? "cuff:10" : "cuff:20", n: 1, dong: 6, he: heN() }, { k: nu ? "pendant:10" : "pendant:20", n: 1, dong: 6, he: heN() },
    { k: "horse:10", n: 1, dong: 6, he: heN() }, { k: "horse:55", n: 1, dong: 6, he: heN() }, { k: "ms:26", n: 15 }, { k: "ms:22", n: 15 }); // ngựa nhanh nhất (25/11/2026): Chiếu Dạ Ngọc Sư Tử, tốc độ 100, cấp 80, không giới hạn hệ/giới/trùng sinh — thêm 1 con, giữ nguyên horse:10
  return mon;
};
const sach = (s, n) => String(s || "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
// MAXPING (chủ server 26/11/2026): nhập mã chung -> max hết chiêu của phái (chiêu tier + sách 90/120/150), đúng trần từng chiêu
// (trường max trong skills.json), theo đúng mẫu học sách của do.js (case "sach"/"daiThanh"): ghi h.books như đã học, skMin = trần để
// điểm đã cộng không tính phần cho không, chiêu luyện (exp=1) độ luyện về 0. Chỉ nâng, không hạ (nhập lại an toàn); chiêu phái khác không đụng.
const maxKyNangPhai = (h) => {
  const f = (SKILL.factions || []).find((x) => x.id === +h.fac);
  if (!f) return { tong: 0, moi: 0 };
  const sachPhai = new Set(Object.values(f.books || {}).flat().map(Number));
  const ids = new Set([...(f.skills || []).map(Number), ...sachPhai]);
  h.skills = h.skills || {}; h.skMin = h.skMin || {};
  const B = new Set(h.books || []);
  let moi = 0;
  for (const id of ids) {
    const s = SKILL.skills[String(id)];
    if (!s) continue;
    const cap = Math.max(1, s.max | 0 || 20), cu = h.skills[id] | 0;
    if (cu < cap) { h.skills[id] = cap; h.kyNangThem = (h.kyNangThem | 0) + cap - cu; moi++; }
    if ((h.skMin[id] | 0) < cap) h.skMin[id] = cap;
    if (sachPhai.has(id)) B.add(id);
    if (DO.laLuyen(id)) { h.luyen = h.luyen || {}; h.luyen[id] = 0; }
  }
  h.books = [...B];
  return { tong: ids.size, moi };
};
// MAXPING + chuyển sinh 9 sẵn sàng vòng 10 (chủ server 28/11/2026, lệnh 11:36): mã chung cho thêm
// chuyển sinh 9 lần + đủ điều kiện vòng 10 (tự nộp phí + chọn kiểu vòng ở Lễ quan) + bộ đồ Hoàng Kim.
// Bộ đồ đúng mapping đổi ở NPC (do.js hkTheoViTri): vũ khí theo nhánh đã chọn (cận chiến t=0, p=eqt;
// Đường Môn tầm xa t=1, p=eqt-100), còn lại t=2..9 (áo, nhẫn, dây chuyền, giày, đai, mũ, hộ uyển, ngọc bội);
// cả 10 phái đều không phân giới tính (f=-1). HỆ + DÒNG CỦA BỘ HK GIEO NGẪU NHIÊN MỖI LẦN NHẬN
// (lệnh 11:37) bằng đúng hàm gieoDong của do.js. Chỉ nâng, không hạ; nhập lại an toàn.
const boDoHK = (h, eqt) => {
  const fac = +h.fac, tVK = fac === 2 ? 1 : 0, pVK = fac === 2 ? eqt - 100 : eqt, ks = [];
  for (const [k, g] of Object.entries(HK_CS)) {
    if (!g || g.fac !== fac || !g.pack) continue;
    const { t, p } = g.pack;
    if ((t === tVK && p === pVK) || (t >= 2 && t <= 9)) ks.push(k);
  }
  ks.sort((a, b) => (HK_CS[a].pack.t - HK_CS[b].pack.t) || (HK_CS[a].pack.p - HK_CS[b].pack.p));
  return ks;
};
// Cấp bộ đồ HK vào túi — HỆ + DÒNG GIEO NGẪU NHIÊN THEO TỪNG MÓN MỖI LẦN NHẬN (chủ server 28/11/2026):
// mỗi món gieo hệ 0–4 rồi gieo dòng bằng đúng hàm gieoDong của do.js (qua DO.NOI), số dòng = số dòng
// cố định của bảng HK (gieoDong có thể trả ít hơn nếu hết dòng phân biệt — như đồ rơi).
// LƯU Ý ĐÃ XÁC MINH: chuan() (do.js) ghi đè hệ món HK về hệ cố định của bảng do-hoang-kim.json lúc
// nạp/lưu (GOC series) — hệ gieo chỉ thấy lúc nhận, hệ bền là hệ bảng; dòng đã gieo thì giữ nguyên
// (chuan chỉ gieo lại khi gặp khóa dòng lạ). Mặc đồ không kiểm hệ (yeuCau bỏ yêu cầu ngũ hành 04/11) —
// chỉ dòng ẩn (2/4/6) kích theo quy tắc ngũ hành tương sinh (soKich).
// Hình dạng món như monHK (khóa bảo hiểm vĩnh viễn, gắn nguồn "qua"). taoQua chặn đồ HK nên không đi
// qua quà chung; túi không đủ chỗ thì lỗi trước khi động vào trạng thái nào.
const tangDoHK = (h, eqt) => {
  const ks = boDoHK(h, eqt);
  if (!ks.length) return [];
  h.uN = h.uN | 0;
  if (DO.NOI.oTrong(h) < ks.length) loi("Hành trang không đủ chỗ cho bộ đồ Hoàng Kim. Dọn bớt đi rồi hãy nhập lại.");
  const da = [];
  try {
    for (const k of ks) {
      const g = HK_CS[k];
      const sRoll = Math.floor(Math.random() * 5); // hệ gieo ngẫu nhiên 0–4 theo từng món, mỗi lần nhận
      const d = DO.NOI.gieoDong(g.pack.t, g.cl | 0 || 10, sRoll, (g.d || []).length);
      const it = NG.gan({ k, s: sRoll, d, m: Math.max(1, g.lv | 0), kbh: DO.NOI.KBH_VV, u: ++h.uN }, "qua", "Mã MAXPING — đồ Hoàng Kim chuyển sinh 9", h.name);
      if (!DO.NOI.vaoTui(h, it)) throw new Error("het-cho");
      da.push(it);
    }
  } catch (e) {
    for (const it of da) { const i = h.bag.indexOf(it); if (i >= 0) h.bag.splice(i, 1); }
    loi("Hành trang không đủ chỗ cho bộ đồ Hoàng Kim. Dọn bớt đi rồi hãy nhập lại.");
  }
  return da.map((it) => DO.tenMon(it).trim());
};
// Đặt trạng thái sẵn sàng chuyển sinh vòng 10 (chủ server 28/11/2026, lệnh 11:36): KHÔNG đặt thẳng
// reborn=10 nữa — nhân vật lên tối đa 9 lần + đủ điều kiện vòng 10, rồi TỰ nộp phí + chọn kiểu vòng
// ở Lễ quan như đường thường (chuyen-sinh.js xacNhan). Trạng thái đúng hình dạng bước 4 (buoc 4,
// vong 10, quai/hon/dau đủ mục tiêu muc(10), đếm ngày ở trần); bước 4 chỉ kiểm đếm + phí, KHÔNG đòi
// hồn trong túi nên không cần tặng hồn qk:1001. Chỉ nâng, không hạ; đã 10 thì giữ nguyên, không động
// vào cs. Không đặt vongKieu mặc định (người chơi chọn lúc xác nhận; client vẽ mặc định Long khi
// chưa có — world.js _veVongSen). Bù phí: chỉ lần đầu dùng mã này của nhân vật này (lanDau) mà chưa
// đủ 200M thì bù đúng phần thiếu (không cộng dồn khi nhập lại — luật phí trong chuyen-sinh.js giữ
// nguyên). Giữ cấp 200 (không về 90 như lột xác thường). Tiềm năng chỉ nâng tới mốc 9 vòng.
const datChuyenSinh9 = (h, lanDau) => {
  const cu = h.reborn | 0, { TOI_DA, TIEM_NANG, VONG } = CS();
  if (cu >= TOI_DA) return { msg: `Giữ chuyển sinh ${TOI_DA} lần`, bu: 0 };
  const M = VONG[TOI_DA - 1]; // muc(10): quái 19.600, hồn 196, dấu 14, phí 200M (trần)
  h.reborn = Math.max(cu, TOI_DA - 1);
  h.cs = { buoc: 4, vong: TOI_DA, quai: M.quai, quaiNgay: M.tranQuai, hon: M.hon, honNgay: M.tranHon, dau: M.dau, dauNgay: M.tranDau, ngay: DO.NOI.ngayVN(Date.now()) };
  h.tiemNangThem = Math.max(h.tiemNangThem | 0, (TOI_DA - 1) * TIEM_NANG);
  let bu = 0;
  if (lanDau && (h.gold | 0) < M.phi) { bu = M.phi - (h.gold | 0); h.gold = (h.gold | 0) + bu; }
  return { msg: cu < TOI_DA - 1 ? `Chuyển sinh lên ${TOI_DA - 1} lần, sẵn sàng vòng ${TOI_DA} — về Lễ quan nộp phí, chọn kiểu vòng` : `Sẵn sàng chuyển sinh vòng ${TOI_DA} — về Lễ quan nộp phí, chọn kiểu vòng`, bu };
};
// mã không phân biệt hoa / thường, bỏ khoảng trắng; chữ không dấu, số, - _ (4–32 ký tự)
const chuanMa = (s) => { const k = String(s || "").replace(/\s+/g, "").toUpperCase(); return /^[A-Z0-9_-]{4,32}$/.test(k) ? k : null; };
const sinhMa = () => Array.from({ length: 10 }, () => CHU[crypto.randomInt(CHU.length)]).join("");
const sai = new Map(); // tài khoản -> { n, den }

function doc() {
  let j = null;
  try { const d = JSON.parse(fs.readFileSync(FILE, "utf8")); if (d && d.ma && typeof d.ma === "object") j = d; } catch {}
  if (!j) j = { ma: {} };
  let moi = false; // gieo mã cố định còn thiếu (XU1000...) — chỉ thêm khi chưa có, không đè sửa của quản trị
  for (const [k, v] of Object.entries(MA_CO_DINH)) {
    if (!j.ma[k]) { j.ma[k] = { qua: v.qua, loi: v.loi, toiDa: v.toiDa, het: v.het, tao: { boi: "he-thong", luc: Date.now() }, dung: [] }; moi = true; }
  }
  if (moi) { try { ghi(j); } catch {} }
  return j;
}
function ghi(all) {
  const tmp = FILE + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(all));
  fs.renameSync(tmp, FILE);
}
const tinhTrang = (m, t = Date.now()) => (m.tat ? "tat" : m.het && t > m.het ? "het" : m.toiDa && m.dung.length >= m.toiDa ? "day" : "mo");

function nhap(tk, h, ma0, he0) {
  const t = Date.now(), s = sai.get(tk.ten);
  if (s && s.n >= SAI_MAX && t < s.den) loi(`Nhập sai lắm rồi. Chờ ${Math.ceil((s.den - t) / 60000)} phút nữa rồi hãy gõ lại.`, 429);
  const k = chuanMa(ma0), all = doc(), m = k && all.ma[k];
  if (!m) { sai.set(tk.ten, { n: s && t < s.den ? s.n + 1 : 1, den: t + SAI_MS }); loi("Mã sai rồi. Gõ lại cho cẩn thận."); }
  const tt = tinhTrang(m, t);
  if (tt === "tat") loi("Mã này bị tắt rồi. Đừng gõ nữa.");
  if (tt === "het") loi("Mã này hết hạn rồi.");
  if (tt === "day") loi("Mã này hết lượt rồi.");
  const daDung = m.dung.some((d) => d.tk === tk.ten && d.nv === h.name);
  if (daDung && !(m.qua && m.qua.tuDong)) loi("Nhân vật này dùng mã này rồi. Đừng nhập nữa."); // mã chung dùng lại không giới hạn (25/11/2026)
  let qua = m.qua, chon = null; // chon: nhánh vũ khí đã chọn của mã chung (dùng lại ở khối cấp chuyển sinh 10 bên dưới)
  if (qua && qua.tuDong) { // mã chung: quà theo phái + giới tính; chưa chọn hệ thì chỉ trả lựa chọn, chưa tính là đã dùng
    if (h.fac == null) loi("Mã này chỉ dành cho người đã vào phái. Chưa bái nhập thì đi bái nhập trước đi, rồi hãy quay lại.");
    const nhanh = nhanhPhai(h.fac);
    if (!nhanh.length) loi("Phái này chưa có quà mã chung. Đừng nhập nữa.");
    const he = he0 == null || he0 === "" ? null : +he0;
    if (nhanh.length > 1 && he == null) return { chonHe: nhanh.map((e) => ({ eqt: e, ten: TEN_HE[e] || `Hệ ${e}` })), ma: k };
    chon = he == null ? nhanh[0] : he;
    if (!nhanh.includes(chon)) loi("Chọn sai rồi. Hệ đó không phải của phái ngươi.");
    qua = { tien: daDung ? 0 : qua.tien || 0, xu: daDung ? 0 : qua.xu || 0, exp: qua.exp || 0, mon: doTheoPhai(h, chon) }; // nhập lại: ngân lượng/Xu không cộng dồn; đồ gieo lại chỉ số ngẫu nhiên qua taoQua
  }
  const ds = DO.taoQua(h, qua); // túi không đủ chỗ -> lỗi, túi giữ nguyên
  const e = Math.max(0, Math.floor(qua.exp || 0));
  let len = 0;
  if (e > 0) { // kinh nghiệm (chủ server 22/11/2026): cộng sau khi quà vào túi xong — túi đầy thì không nhận gì, kể cả exp
    h.exp = (h.exp || 0) + e;
    len = DO.NOI.lenCap(h); // lên cấp theo đúng luật chung (trần 200)
    ds.push(`${nhom(e)} điểm kinh nghiệm`);
    if (len > 0) ds.push(`Lên ${len} cấp (cấp ${h.lvl})`);
  }
  if (m.qua && m.qua.tuDong) { // mã chung: max hết kỹ năng của phái (26/11/2026) — sau khi lên cấp xong, chỉ nâng không hạ
    const r = maxKyNangPhai(h);
    if (r.tong > 0) ds.push(`Kỹ năng của phái lên tối đa (${r.tong} chiêu)`);
    // mã chung MAXPING (28/11/2026, lệnh 11:36 + 11:37): thêm chuyển sinh 9 + sẵn sàng vòng 10 + bộ đồ Hoàng Kim (hệ/dòng gieo ngẫu nhiên) — chỉ nâng, nhập lại an toàn, không giới hạn
    const tenHK = tangDoHK(h, chon);
    const r9 = datChuyenSinh9(h, !daDung);
    ds.push(r9.msg);
    if (r9.bu > 0) ds.push(`Bù ${nhom(r9.bu)} lượng để đủ phí chuyển sinh vòng ${CS().TOI_DA}`);
    if (tenHK.length) ds.push(`Bộ đồ Hoàng Kim (${tenHK.length} món, hệ và dòng ngẫu nhiên)`);
  }
  m.dung.push({ tk: tk.ten, nv: h.name, luc: t });
  ghi(all);
  sai.delete(tk.ten);
  // báo / ghi khóa chỉ khi có món thật sự khóa (soát 11/11: quà chỉ có Mật đồ thần bí + tiền mà tích khóa thì không món nào khóa); có Mật đồ thì ghi "trừ …"
  const kh = monKhoa(qua), tru = kh ? truKhoa(qua) : "";
  NK.ghi("ma", tk.ten, h.name, `Nhập mã kích hoạt ${k}: ${ds.join(", ")}${kh ? ` (món khóa vĩnh viễn${tru ? `, trừ ${tru}` : ""})` : ""}`);
  return { ds, loi: m.loi || "", ...(kh ? { khoa: 1, ...(tru ? { khoaTru: tru } : {}) } : {}) };
}
const laKhoa = (m) => !!(m.qua && m.qua.kbh); // mã đặt khóa (ô tích ở F10)
const khongKhoa = (x) => DO.NOI.KHONG_KHOA.has(String(x && x.k)); // Mật đồ thần bí: taoQua không bao giờ khóa
const monKhoa = (q) => !!(q && q.kbh) && (q.mon || []).some((x) => !khongKhoa(x));
const truKhoa = (q) => (q.mon || []).filter(khongKhoa).map((x) => DO.tenMon({ k: x.k }).trim()).join(", ");

// quà của mã: thử trên 1 nhân vật trống (món có thật, vừa 1 hành trang) -> { qua đã lọc, ds: chữ quà }
function kiemQua(b) {
  const qua = { tien: Math.max(0, Math.floor(+b.tien || 0)), xu: Math.max(0, Math.floor(+b.xu || 0)),
    exp: Math.min(999999999999, Math.max(0, Math.floor(+b.exp || 0))),
    mon: (Array.isArray(b.mon) ? b.mon : []).slice(0, 20).map((m) => ({ k: String(m && m.k), n: Math.max(1, m.n | 0), ...(m.dong != null ? { dong: m.dong | 0, he: m.he == null ? -1 : m.he | 0 } : {}) })),
    ...(b.khoa ? { kbh: DO.NOI.KBH_VV } : {}) };
  const ds = DO.taoQua({ bag: [], uN: 0, gold: 0, xu: 0 }, qua);
  return { qua, ds };
}
const nhom = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); // 1234567 -> 1.234.567
function tomTat(m) {
  const q = m.qua || {}, ds = (q.mon || []).map((x) => `${x.n} ${DO.tenMon({ k: x.k }).trim()}${x.dong != null ? ` (${x.dong ? x.dong + " dòng" : "trắng"})` : ""}`);
  if (q.tuDong) ds.unshift("Quà theo phái + giới tính, chuyển sinh 9 + sẵn sàng vòng 10 + bộ đồ Hoàng Kim (mã chung, hệ/dòng ngẫu nhiên)");
  if (q.tien) ds.push(DO.NOI.tien(q.tien)); if (q.xu) ds.push(`${q.xu} Xu`); if (q.exp) ds.push(`${nhom(q.exp)} kinh nghiệm`);
  return ds.join(", ");
}
const chuKhoa = (m) => (laKhoa(m) ? " · món khóa vĩnh viễn" : ""); // nhật ký quản trị
function quanTri(qt, b) {
  const all = doc(), t = Date.now();
  if (b.viec === "ds") {
    return { ds: Object.entries(all.ma).map(([ma, m]) => ({ ma, qua: tomTat(m), ...(laKhoa(m) ? { khoa: 1 } : {}), loi: m.loi || "", toiDa: m.toiDa | 0, daDung: m.dung.length, ai: m.dung.slice(-DUNG_GUI).reverse(),
      het: m.het || 0, tt: tinhTrang(m, t), tao: m.tao })).sort((a, c) => (c.tao.luc || 0) - (a.tao.luc || 0)) };
  }
  if (b.viec === "tao") {
    let k = chuanMa(b.ma);
    if (String(b.ma || "").trim() && !k) loi("Mã chỉ gồm chữ không dấu, số, dấu - và _ (4–32 ký tự). Gõ lại cho đúng.");
    if (!k) do k = sinhMa(); while (all.ma[k]);
    if (all.ma[k]) loi(`Mã ${k} đã có rồi. Đặt mã khác đi.`);
    const { qua } = kiemQua(b), ngay = Math.max(0, Math.min(3650, +b.ngay || 0));
    if (b.tuDong) qua.tuDong = 1; // mã chung theo phái: quà tính lúc nhập, không ghi sẵn danh sách món
    all.ma[k] = { qua, loi: sach(b.loi, LOI_MAX), toiDa: Math.max(0, Math.min(1e6, b.toiDa | 0)), het: ngay ? t + ngay * 86400e3 : 0, tao: { boi: qt.ten, luc: t }, dung: [] };
    ghi(all);
    NK.ghi("qt", qt.ten, null, `Tạo mã kích hoạt ${k}: ${tomTat(all.ma[k])}${chuKhoa(all.ma[k])}${all.ma[k].toiDa ? ` · ${all.ma[k].toiDa} lượt` : ""}${ngay ? ` · hạn ${ngay} ngày` : ""}`);
    return { msg: `Tạo xong mã ${k}.`, ma: k };
  }
  const k = chuanMa(b.ma), m = k && all.ma[k];
  if (!m) loi("Không có mã này. Gõ lại đi.", 404);
  if (b.viec === "tat" || b.viec === "mo") {
    m.tat = b.viec === "tat"; if (!m.tat) delete m.tat;
    ghi(all); NK.ghi("qt", qt.ten, null, `${b.viec === "tat" ? "Tắt" : "Mở lại"} mã kích hoạt ${k}`);
    return { msg: `${b.viec === "tat" ? "Tắt mã" : "Mở lại mã"} ${k} rồi` };
  }
  if (b.viec === "lay") {
    const q = m.qua || {};
    const mon = (q.mon || []).map((x) => {
      const r = DO.timMon(x.k, 1e9).find((y) => y.k === x.k) || { k: x.k, n: x.k, loai: x.dong != null ? "do" : "chong" }; // món không còn trong game: vẫn hiện để bỏ đi
      return { ...r, so: x.n, ...(r.loai === "do" ? { dong: x.dong == null ? 3 : x.dong, he: x.he == null ? -1 : x.he } : {}) };
    });
    return { ma: k, tien: q.tien || 0, xu: q.xu || 0, exp: q.exp || 0, mon, khoa: laKhoa(m) ? 1 : 0, loi: m.loi || "", toiDa: m.toiDa | 0, daDung: m.dung.length, het: m.het || 0 };
  }
  if (b.viec === "sua") {
    // trang quản trị cũ (chưa tải lại — không gửi khoa) bấm Lưu: giữ khóa đang có, không lặng lẽ bỏ khóa
    const { qua } = kiemQua({ ...b, khoa: b.khoa == null ? laKhoa(m) : b.khoa });
    if (m.qua && m.qua.tuDong) qua.tuDong = 1; // mã chung: sửa chỉ đổi tiền/Xu/exp/hạn/lượt, quà theo phái giữ nguyên
    let han = "giữ hạn";
    if (b.ngay !== "giu") {
      const ngay = Math.max(0, Math.min(3650, +b.ngay || 0));
      m.het = ngay ? Math.max(m.het || 0, t) + ngay * 86400e3 : 0;
      han = ngay ? `gia hạn ${ngay} ngày` : "bỏ hạn";
    }
    m.qua = qua; m.loi = sach(b.loi, LOI_MAX); m.toiDa = Math.max(0, Math.min(1e6, b.toiDa | 0));
    ghi(all); NK.ghi("qt", qt.ten, null, `Sửa mã kích hoạt ${k}: ${tomTat(m)}${chuKhoa(m)}${m.toiDa ? ` · ${m.toiDa} lượt` : ""} · ${han}`);
    return { msg: `Lưu mã ${k} xong.` };
  }
  if (b.viec === "xoa") {
    delete all.ma[k];
    ghi(all); NK.ghi("qt", qt.ten, null, `Xóa mã kích hoạt ${k} (${m.dung.length} lượt đã dùng)`);
    return { msg: `Xóa mã ${k} xong.` };
  }
  loi("Không rõ việc gì. Gửi lại cho đúng.");
}

module.exports = { nhap, quanTri, FILE };
