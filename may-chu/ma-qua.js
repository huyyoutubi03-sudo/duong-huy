// Mã kích hoạt (anh 29/10: "thêm vào Lễ Quan chức năng đổi mã kích hoạt, dùng để kích hoạt các mã code mà game cho, nhận quà tương ứng").
// Quản trị tạo mã ở bảng quản trị (F10 — thẻ Mã quà, src/game/quantri.js): quà như Gửi quà (ngân lượng, Xu, vật phẩm — do.js taoQua) + kinh nghiệm
// (chủ server 22/11/2026: nhập mã nhận exp, lên cấp theo đúng luật chung lenCap, trần 200), số lần
// dùng tối đa của cả máy chủ (0 = không giới hạn), hạn dùng, lời nhắn. Mỗi nhân vật dùng 1 mã 1 lần (chủ server 23/11/2026: đổi từ mỗi tài khoản —
// nhân vật khác cùng tài khoản vẫn dùng được; lượt đã dùng ghi cả tài khoản lẫn tên nhân vật nên nhân vật đã dùng vẫn bị chặn như cũ). NGOẠI LỆ (chủ server
// 25/11/2026): mã chung (tuDong, vd MAXPING) dùng lại KHÔNG GIỚI HẠN; nhập lại thì ngân lượng/Xu KHÔNG cộng dồn, chỉ nhận lại đồ (chỉ số gieo ngẫu nhiên
// mới qua taoQua) + kinh nghiệm. Người chơi
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

const FILE = path.join(D.ROOT, "ma-qua.json");
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
const doTheoPhai = (h, eqt) => { // bộ đồ cấp 10 như mã MAXPING từng phái (tao-ma-maxping.py): vũ khí theo hệ đã chọn, còn lại theo giới + hệ ngũ hành
  const series = h.series | 0, nu = h.sex === "f", fac = +h.fac, mon = [], wk = VU_KHI[eqt];
  if (wk) mon.push({ k: wk, n: 1, dong: 6, he: series });
  const ao = nu ? (series === 4 ? "armor:90" : fac === 6 ? "armor:130" : "armor:120") : (series === 4 ? "armor:20" : fac === 6 ? "armor:60" : "armor:50");
  const mu = nu ? (series === 4 ? "helm:90" : "helm:130") : (series === 4 ? "helm:20" : "helm:50");
  mon.push({ k: ao, n: 1, dong: 6, he: series }, { k: "ring:10", n: 2, dong: 6, he: series },
    { k: nu ? "amulet:10" : "amulet:20", n: 1, dong: 6, he: series }, { k: nu ? "boot:40" : "boot:20", n: 1, dong: 6, he: series },
    { k: "belt:20", n: 1, dong: 6, he: series }, { k: mu, n: 1, dong: 6, he: series },
    { k: nu ? "cuff:10" : "cuff:20", n: 1, dong: 6, he: series }, { k: nu ? "pendant:10" : "pendant:20", n: 1, dong: 6, he: series },
    { k: "horse:10", n: 1, dong: 6, he: series }, { k: "horse:55", n: 1, dong: 6, he: series }, { k: "ms:26", n: 15 }, { k: "ms:22", n: 15 }); // ngựa nhanh nhất (25/11/2026): Chiếu Dạ Ngọc Sư Tử, tốc độ 100, cấp 80, không giới hạn hệ/giới/trùng sinh — thêm 1 con, giữ nguyên horse:10
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
// mã không phân biệt hoa / thường, bỏ khoảng trắng; chữ không dấu, số, - _ (4–32 ký tự)
const chuanMa = (s) => { const k = String(s || "").replace(/\s+/g, "").toUpperCase(); return /^[A-Z0-9_-]{4,32}$/.test(k) ? k : null; };
const sinhMa = () => Array.from({ length: 10 }, () => CHU[crypto.randomInt(CHU.length)]).join("");
const sai = new Map(); // tài khoản -> { n, den }

function doc() {
  try { const j = JSON.parse(fs.readFileSync(FILE, "utf8")); if (j && j.ma && typeof j.ma === "object") return j; } catch {}
  return { ma: {} };
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
  let qua = m.qua;
  if (qua && qua.tuDong) { // mã chung: quà theo phái + giới tính; chưa chọn hệ thì chỉ trả lựa chọn, chưa tính là đã dùng
    if (h.fac == null) loi("Mã này chỉ dành cho người đã vào phái. Chưa bái nhập thì đi bái nhập trước đi, rồi hãy quay lại.");
    const nhanh = nhanhPhai(h.fac);
    if (!nhanh.length) loi("Phái này chưa có quà mã chung. Đừng nhập nữa.");
    const he = he0 == null || he0 === "" ? null : +he0;
    if (nhanh.length > 1 && he == null) return { chonHe: nhanh.map((e) => ({ eqt: e, ten: TEN_HE[e] || `Hệ ${e}` })), ma: k };
    const chon = he == null ? nhanh[0] : he;
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
  if (q.tuDong) ds.unshift("Quà theo phái + giới tính (mã chung)");
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
