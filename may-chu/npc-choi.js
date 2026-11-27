// NPC chơi như người thật — 170 NHÂN VẬT (kế hoạch ke-hoach-npc-170-nhan-vat.md).
// Mỗi bot = 1 tài khoản thật + 1 nhân vật thật, đóng vai client phía máy chủ: gửi nhịp hiện diện qua
// the-gioi.js nhip, giết quái / nhặt đồ qua đúng luật do.js gietQuai/nhat, bày sạp qua đúng luật
// cho-troi.js lam. Không sửa ma-qua.js / do.js. Bảng chiêu suy lúc chạy bằng may-chu/npc-bang-chieu.js
// (dữ liệu thật skills.json + rules.js + luyen-ky-nang.json); cấu hình 170 bot ở npc-choi-config.json
// (tên, phái, nhánh, bãi train, chỗ sạp — sinh bởi kiem-170-2611/gen-config-170.mjs).
// Chỉ chạy khi VL_NPC_CHOI=1. Mặc định TẮT. VL_NPC_CHOI_SO: số bot tối đa (mặc định 170).
// VL_NPC_CHOI_HIEN: nhịp hiện diện của mỗi bot, ms (mặc định 1500 — chia lát 500ms).
// VL_NPC_CHOI_CHAT_CHUNG: tiết lưu trả lời/rao kênh chung cho cả bầy bot, ms (mặc định 30000 — lệnh Huy 12:39 26/11).
// RESET LV1 + HÃM TỐC (lệnh Huy 18:42–18:52 ngày 26/11/2026 — bot sống như người chơi thật):
// VL_NPC_CHOI_CAP1: tạo bot mới từ cấp 1 (mặc định BẬT; = "0" mới tạo kiểu MAXPING cũ — chỉ
//   dùng khi kiểm hồi quy / rollback, là đặc quyền còn lại, chờ Huy quyết xóa hẳn).
// VL_NPC_CHOI_EXP_NGAY: trần tổng exp 1 bot nhận trong 1 ngày VN (mặc định 1.000.000.000;
//   = "0" là không giới hạn — chỉ dùng để đo). Chạm trần thì bot về thành bày sạp/ngồi chơi,
//   không giết quái, không vào hoạt động, tới ngày mới mới train tiếp.
// VL_NPC_CHOI_DO=1: chế độ đo lường (chỉ máy thử): bỏ hoạt động + sạp, bãi/cấp lấy từ config đo,
//   ghi số liệu giết/chết/mua vào $VL_DU_LIEU/do-luong/*.jsonl. Mặc định TẮT.
// LUẬT AN TOÀN test1 (sửa 26/11/2026 — trước đây chặn chỉ vì FILE tài khoản test1 tồn tại, nên trên
// máy chủ live không bao giờ chạy được): chỉ từ chối KHỞI ĐỘNG khi test1 đang có PHIÊN ĐANG CHƠI
// (hiện diện còn mới trong the-gioi.js). File tồn tại + bật VL_NPC_CHOI=1 tường minh thì KHÔNG chặn.
// Đang bị chặn vì test1 chơi thì thử lại mỗi 60 giây cho tới khi test1 rời game.
// CHIẾN ĐẤU: bot có máu / nội lực THẬT tính bằng đúng luật chỉ số của game (rules.heroStats +
// itemdb.equipStats + vocong.skillB — cùng cách dựng Phân Thân ở nhanvatmay.js; ItemDB nạp từ đĩa
// vì máy chủ không có fetch trình duyệt). Khi bị đánh, bot đánh trả bằng chiêu đúng nhánh của mình,
// tôn trọng hồi chiêu, tốn nội lực, yêu cầu vũ khí và tầm đánh như người chơi; sát thương tính bằng
// đúng công thức client (vocong.js skDamage: vật lý + ngũ hành theo kháng, tương khắc, hỗ trợ,
// nội công, chí mạng). Quái đánh tới chết rồi train tiếp; người chơi thì bot chỉ tự vệ, không chủ
// động PK, không đuổi quá dây (leash) quanh chỗ bị đánh. Chết thì theo đúng luật chết của game
// (do.js chet) rồi hồi sinh ở thành và train tiếp.
// GIỚI HẠN KIẾN TRÚC: máu người chơi bị đánh do CHÍNH MÁY CỦA NGƯỜI ĐÓ tự trừ (the-gioi.js chỉ giữ
// hiện diện, không giữ máu); ngoài Tống Kim / Lôi Đài không có đường nào để trình duyệt báo sát thương
// lên người khác. Đòn của người chơi lên bot đi qua MÓC BÁO ĐÒN nhanBaoDon() (Huy duyệt 25/11/2026):
// trình duyệt gửi kèm nhịp { npcHit: [[seq, chiêu, x, y, t], ...] } (world.js npcHit — chỉ sự kiện,
// KHÔNG gửi số sát thương, KHÔNG gửi đích — client chỉ theo dõi được 1 thực thể _npcChoi), máy chủ
// PHÂN GIẢI ĐÍCH = bot gần vị trí người đánh nhất cùng bãi (trong các bot đang train), kiểm tra chống
// giả rồi TỰ TÍNH sát thương và gọi nhanDon(); đòn đánh trả gửi lại cho người bị đánh kèm nhịp sau
// (layDanhCho -> api.js ket.npcDanh -> main.js npcDanhNhan).
// Đòn của quái lên bot thì mô phỏng ngay trong nhịp này bằng đúng rules.mobDamage (quái của bãi train,
// hệ số bãi canBang như client spawnMob), vì quái của mỗi máy là riêng, máy chủ không giữ quái chung.
// TỌA ĐỘ TRAIN (sửa 26/11/2026): bản mẫu cũ đứng ở (15000, 9500) — NGOÀI khung 2688×2688 của bản đồ
// Dương Trung động nên người chơi thật không bao giờ nhìn thấy. Nay tâm train lấy từ các ô đi được thật
// của GameMap (cùng thuật toán vùng liên thông lớn nhất như client), rải đều khắp bãi.
//   batDau() / dung() / trangThai() / tuDong() (tự chạy khi có VL_NPC_CHOI=1 — chay-game.js gọi 1 dòng)
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const D = require("./du-lieu");
const DO = require("./do");
const TG = require("./the-gioi");
const CHO = require("./cho-troi");
const NK = require("./nhat-ky");
const BC = require("./npc-bang-chieu");
const KT = require("./bot-kinh-te"); // vòng kinh tế bot (Huy chốt 00:36 27/11/2026): chấm điểm / giá theo chất / mua ở sạp
const AIQL = require("./ai-quan-ly"); // AI quản lý trả lời khi được hỏi (Huy chốt 00:11 27/11/2026): chỉ chạy khi có khóa + VL_AI_QUAN_LY_BAT=1, không thì traLoi dùng câu mẫu như cũ
// Hoạt động (lệnh Huy 12:29 26/11): nạp lười như các module khác để khỏi vòng require
const BTG = () => require("./boss-tg");
const SN = () => require("./san-nhim");
const RTB = () => require("./ruong-tb");
const PQ = () => require("./phu-quy");
const PH = () => require("./phong-hoa");
const TK = () => require("./tong-kim");
const PLD = () => require("./phong-lang-do");
const SAT = () => require("./sat-thu");
const DT = () => require("./da-tau");
const VAI = () => require("./vuot-ai");
const MC = () => require("./minh-chu");
const QCH = () => require("./quai-chung");
const ONL = () => require("./online");
const PD = () => require("./phuc-duyen");
const TLAM = () => require("./tu-lam");
const TD = () => require("./to-doi");

const CFG_PATH = process.env.VL_NPC_CHOI_CONFIG || path.join(__dirname, "npc-choi-config.json");
const CFG = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
const Z_TOWN = 37; // Biện Kinh (thành, được bày sạp)
const ZONES = CFG.zones || {};
const SO_TOI_DA = Math.max(1, Math.min(CFG.bots.length, +process.env.VL_NPC_CHOI_SO || 170));
const HIEN_MS = Math.max(500, +process.env.VL_NPC_CHOI_HIEN || 1500);
const LAT = Math.max(1, Math.min(12, Math.round(HIEN_MS / 500))); // lát hiện diện: mỗi 500ms 1 lát
const EXP_MAXPING = 97566772100, TIEN_MAXPING = 50000000, XU_MAXPING = 100; // đúng số mã MAXPING — CHỈ dùng ở đường tạo cũ (CAP1=0), không cấp phát cho bot mới
// Tạo mới từ cấp 1 (mặc định BẬT — bot sống như người chơi thật, không đặc quyền).
const CAP1 = process.env.VL_NPC_CHOI_CAP1 !== "0";
// Trần exp/ngày: "0" = không giới hạn (chỉ để đo); số khác = trần; thiếu/sai thì 1.000.000.000.
const _EXP_ENV = +process.env.VL_NPC_CHOI_EXP_NGAY;
const EXP_NGAY = process.env.VL_NPC_CHOI_EXP_NGAY === "0" ? Infinity : (Number.isFinite(_EXP_ENV) && _EXP_ENV > 0 ? _EXP_ENV : 1000000000);
const DO_MODE = process.env.VL_NPC_CHOI_DO === "1"; // đo lường trên máy thử (không hoạt động, không sạp, ghi số liệu)

// ---------- bảng bãi train theo cấp (20 dải — thiết kế bot-reset-lv1-2611 §3, hiệu chuẩn bằng số đo thật) ----------
// Dải [lo, lo+10): cấp lo..lo+9 train ở bãi chính; quá 9 con/bãi thì tràn sang bãi phụ cùng dải.
// lo/hi của bãi khớp đúng dải (map.json zones) nên capVao không chặn; mobLv kẹp trong [lo, hi] của bãi.
const BANDS = [
  { lo: 1, chinh: 140, phu: [] },
  { lo: 10, chinh: 2, phu: [195] },
  { lo: 20, chinh: 3, phu: [7, 19, 70, 43, 179] },
  { lo: 30, chinh: 92, phu: [90, 193, 74, 145] },
  { lo: 40, chinh: 21, phu: [41, 122, 167] },
  { lo: 50, chinh: 42, phu: [] },
  { lo: 60, chinh: 56, phu: [68, 342, 341] },
  { lo: 70, chinh: 319, phu: [224] },
  { lo: 80, chinh: 319, phu: [320, 123] }, // hiệu chuẩn 26/11/2026: 319 hơn 320 ở cả 2 cửa (924/790 vs 852/745 giết/giờ, 0 chết)
  { lo: 90, chinh: 225, phu: [] },
  { lo: 100, chinh: 225, phu: [226] }, // hiệu chuẩn 26/11/2026: 225 gấp đôi 226 ở cửa 5' (1020 vs 480 giết/giờ), 0 chết
  { lo: 110, chinh: 226, phu: [93] }, // hiệu chuẩn 26/11/2026: 226 ít chết hơn 93 (0 vs 1), exp tương đương
  { lo: 120, chinh: 75, phu: [] },
  { lo: 130, chinh: 227, phu: [] },
  { lo: 140, chinh: 321, phu: [] },
  { lo: 150, chinh: 322, phu: [] },
  { lo: 160, chinh: 336, phu: [] },
  { lo: 170, chinh: 340, phu: [] },
  { lo: 180, chinh: 201, phu: [] },
  { lo: 190, chinh: 205, phu: [] },
];
function baiChoCap(lvl) {
  const l = Math.max(1, Math.min(200, Math.floor(+lvl || 1)));
  let b = BANDS[0];
  for (const x of BANDS) if (l >= x.lo) b = x;
  return b;
}
// Tâm train từng bãi (ô đi được thật, sinh bởi gen-zones-train.mjs). Thiếu file thì dùng bãi cố định trong config.
let ZONE_TRAIN = null;
try {
  const zf = JSON.parse(fs.readFileSync(path.join(__dirname, "npc-choi-zones.json"), "utf8"));
  ZONE_TRAIN = zf.zones || null;
} catch (e) { console.log("[npc-choi] không đọc được npc-choi-zones.json — dùng bãi cố định trong config:", e.message); }
const GIET_TRIP = +process.env.VL_NPC_CHOI_GIET || 40;   // giết chừng này con thì về thành 1 chuyến
const STALL_MS = (+process.env.VL_NPC_CHOI_SAP || 120) * 1000; // sạp mở chừng này rồi đóng, đi train tiếp
const SAT_NGHI_MS = (+process.env.VL_NPC_CHOI_SAT_NGHI || 600) * 1000; // nghỉ sau mỗi boss Sát thủ xong: về train/bày sạp, khỏi đứng yên cả chuỗi 8 boss
const ACCT0 = "npcmau1"; // tài khoản bot mẫu đầu tiên (Pháp Không) — giữ để tương thích harness cũ
const TEN0 = "Pháp Không";
const FAC_TEN = { shaolin: "Thiếu Lâm", tianwang: "Thiên Vương", tangmen: "Đường Môn", wudu: "Ngũ Độc", emei: "Nga Mi", cuiyan: "Thúy Yên", gaibang: "Cái Bang", tianren: "Thiên Nhẫn", wudang: "Võ Đang", kunlun: "Côn Lôn" };
const TEN_NHANH = { "-1": "Tay không", 0: "Kiếm", 1: "Đao", 2: "Côn", 3: "Thương", 4: "Chùy", 5: "Song đao", 100: "Phi tiêu", 101: "Phi đao", 102: "Tụ tiễn" };

const N = DO.NOI, BY = N.BY;
// Đồ MAXPING theo phái — cùng bảng ma-qua.js doTheoPhai (vũ khí theo nhánh, còn lại theo giới + hệ),
// chỉ đổi ngựa horse:10/horse:55 -> horse:131 Siêu Quang (ngựa cấp 150, tốc độ 100, dùng được ở cấp 200).
const VU_KHI = { 0: "meleeweapon:10", 1: "meleeweapon:20", 2: "meleeweapon:30", 3: "meleeweapon:40", 4: "meleeweapon:50", 5: "meleeweapon:60", 100: "rangeweapon:10", 101: "rangeweapon:20", 102: "rangeweapon:30" };
function doTheoPhai(h, eqt) {
  const series = h.series | 0, nu = h.sex === "f", fac = +h.fac, mon = [], wk = VU_KHI[eqt];
  if (wk) mon.push({ k: wk, n: 1, dong: 6, he: series });
  const ao = nu ? (series === 4 ? "armor:90" : fac === 6 ? "armor:130" : "armor:120") : (series === 4 ? "armor:20" : fac === 6 ? "armor:60" : "armor:50");
  const mu = nu ? (series === 4 ? "helm:90" : "helm:130") : (series === 4 ? "helm:20" : "helm:50");
  mon.push({ k: ao, n: 1, dong: 6, he: series }, { k: "ring:10", n: 2, dong: 6, he: series },
    { k: nu ? "amulet:10" : "amulet:20", n: 1, dong: 6, he: series }, { k: nu ? "boot:40" : "boot:20", n: 1, dong: 6, he: series },
    { k: "belt:20", n: 1, dong: 6, he: series }, { k: mu, n: 1, dong: 6, he: series },
    { k: nu ? "cuff:10" : "cuff:20", n: 1, dong: 6, he: series }, { k: nu ? "pendant:10" : "pendant:20", n: 1, dong: 6, he: series },
    { k: "horse:131", n: 1, dong: 6, he: series }, { k: "ms:26", n: 15 }, { k: "ms:22", n: 15 });
  return mon;
}

const QC = "Đồ ngon, tới xem"; // lời rao sạp, 15 chữ (giới hạn chợ trời 16)
const LOOK_KEYS = ["helm", "armor", "weapon", "horse", "mantle"];

// ---------- lọc đồ ngon bày sạp (Huy lệnh 26/11/2026: chỉ bày đồ chỉ số ngon, không bán đồ rác) ----------
// Thang của game sẵn có, không bịa thang mới:
//  - số dòng xanh it.d (gieoDong — do.js): đồ rơi thường 0–6 dòng, Bảo rương đồ xanh tối thiểu 3 dòng,
//    Trợ Thủ "Bán đồ trong túi" cũng lấy số dòng làm mốc giữ / bán (h.locDo, do.js banTuBan).
//  - chất từng dòng: giá trị dòng / mức cao nhất của thuộc tính đó trong bảng client
//    (assets/data/dong-xanh.json — cùng bảng gieoDong dùng; chỉ tính dòng có khoảng biến thiên).
// NGON = từ NGON_DONG dòng trở lên, hoặc đúng 2 dòng mà có 1 dòng đạt >= NGON_CHAT trần thuộc tính đó.
// Mô phỏng 30.000 món rơi thật ở bãi bot (quái 165–195): ~5,1% món đạt — sạp thưa nhưng toàn đồ ngon.
// Món rác ở lại túi bot (KHÔNG vứt, KHÔNG bán cho NPC, KHÔNG xóa); chỉ là không bày lên sạp.
const NGON_DONG = Math.max(1, +process.env.VL_NPC_CHOI_DONG || 3);
const NGON_CHAT = Math.min(1, Math.max(0, +process.env.VL_NPC_CHOI_CHAT || 0.7));
const CHAT_CHUNG_MS = Math.max(1000, +process.env.VL_NPC_CHOI_CHAT_CHUNG || 30000); // kênh chung: cả bầy bot gộp lại tối đa 1 tin trả lời / 30 giây (lệnh Huy 12:39 26/11 — không làm loãng kênh)
const DX_TRAN = (() => { // khóa thuộc tính -> mức cao nhất (chỉ dòng biến thiên: trần > sàn)
  try {
    const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "data", "dong-xanh.json"), "utf8")).rows || [];
    const lo = new Map(), hi = new Map();
    for (const r of rows) { const p = r.p && r.p[0]; if (!p) continue; lo.set(r.k, Math.min(lo.get(r.k) ?? Infinity, p[0])); hi.set(r.k, Math.max(hi.get(r.k) ?? -Infinity, p[1])); }
    const m = new Map();
    for (const [k, h] of hi) if (h > (lo.get(k) ?? h)) m.set(k, h);
    return m;
  } catch { return new Map(); }
})();
function chatLuongMon(it) { // dòng tốt nhất đạt bao nhiêu % trần thuộc tính đó (0 = không có dòng biến thiên)
  let q = 0;
  for (const [k, v] of (it.d || [])) { const h = DX_TRAN.get(k); if (h) q = Math.max(q, v / h); }
  return q;
}

// ---------- chiến đấu ----------
const NG_THUOC = { hp: 0.5, mp: 0.3 }; // ngưỡng uống thuốc = Trợ Thủ mặc định (SL 0,5 / NL 0,3)
const THUOC_HP = "potion:3", THUOC_MP = "potion:8"; // Kim Sáng Dược (đại) / Ngưng Thần đan (đại)
const LEASH = 700;            // người chơi: không đuổi quá 700 (đơn vị logic) quanh chỗ bị đánh
const DANH_TOI_DA = 20000;    // người chơi: đánh trả tối đa 20 giây rồi thôi (không dây dưa / grief)
const QUAI_DANH_XS = 1 / 6;   // mỗi nhịp ở bãi: xác suất 1 con quái quanh đó chủ động đánh bot (mô phỏng aggro)
const SCALE = 0.75, TICK_GIAY = 1 / 18; // = src/game/rules.js SCALE / TICK (không export — ghi trị giống hệt)
const KHAC = [1, 4, 3, 0, 2];  // hệ khắc: Kim→Mộc, Mộc→Thổ, Thủy→Hỏa, Hỏa→Kim, Thổ→Thủy (vocong.js KHAC)
const ELEM_KEYS = { colddamage_v: "cold", firedamage_v: "fire", lightingdamage_v: "light" }; // vocong.js ELEM

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (L) => L[Math.floor(Math.random() * L.length)];
const boDau = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();

let bots = []; // [{ cfg, tab, tk, h, fakeTk, key, zone, x, y, dir, act, ... }] — bot 0 = Pháp Không
let timer = null, timerHien = null, timerThu = null, tickN = 0;
const choDanh = new Map(); // tài khoản người chơi -> [đòn đánh trả đang chờ gửi kèm nhịp sau] (layDanhCho)
let traLoiChungAll = 0; // chống spam kênh chung: tất cả bot gộp lại tối đa 1 tin trả lời / CHAT_CHUNG_MS (mặc định 30 giây)
const log = (...a) => console.log("[npc-choi]", ...a);

function tenMayChu() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "server.json"), "utf8")).name || "S1"; }
  catch { return "S1"; }
}

// ---------- trần exp/ngày + bãi theo cấp + đo lường (reset lv1, 26/11/2026) ----------
// Tiến trình tổng exp của anh hùng: Σ need(1..lvl-1) + exp hiện tại — tính lại được từ dữ liệu
// sẵn có, mọi nguồn exp (grind + hoạt động) đều đi qua đây nên trần bắt được hết.
function tienTrinh(h) {
  let t = (h.exp || 0);
  for (let lv = 1; lv < (h.lvl | 0); lv++) t += N.need(lv);
  return t;
}
// Chạm trần ngày chưa? Mốc ngày lưu bền trong chính file tài khoản bot (ghi cùng luu()),
// khởi động lại không reset. Chết mất exp thì tiến trình giảm theo — "hoàn" lại ít trần.
function hetTran(bot) {
  if (!Number.isFinite(EXP_NGAY)) return false; // 0 = không giới hạn
  const h = bot.h; if (!h) return false;
  const ngay = ngayVN();
  const bh = h.botHam && typeof h.botHam === "object" ? h.botHam : null;
  if (!bh || bh.ngay !== ngay) { h.botHam = { ngay, moc: tienTrinh(h) }; return false; }
  // KHÔNG dùng (moc | 0): mốc tổng exp vượt 2^31 (bot cấp cao ~97,5 tỷ) — phép | 0
  // cắt về 32-bit âm khiến hiệu luôn ≥ trần, bot cấp cao nghỉ oan ngay nhịp thứ 2.
  const moc = Number.isFinite(bh.moc) ? bh.moc : 0;
  return tienTrinh(h) - moc >= EXP_NGAY;
}
// Ghi số liệu đo lường (chỉ khi VL_NPC_CHOI_DO=1): 1 dòng JSON / sự kiện, không bao giờ làm kẹt nhịp.
const DO_LUONG_DIR = path.join(D.ROOT, "do-luong");
let doLuongDirOk = false;
function ghiDoLuong(bot, loai, data) {
  if (!DO_MODE) return;
  try {
    if (!doLuongDirOk) { fs.mkdirSync(DO_LUONG_DIR, { recursive: true }); doLuongDirOk = true; }
    fs.appendFileSync(path.join(DO_LUONG_DIR, bot.cfg.acct + ".jsonl"),
      JSON.stringify({ t: Date.now(), loai, lvl: bot.h.lvl | 0, zone: bot.zone, ...(data || {}) }) + "\n");
  } catch {}
}
// Bình theo cấp: dưới cấp 3 mua/uống bình tiểu (50 lượng), từ cấp 3 bình đại (250 lượng).
// (do.js không kiểm tra cấp khi mua/uống thuốc — người chơi có tiền vẫn mua được bình đại ở cấp 1;
// chia 2 nấc này theo đúng thiết kế, rẻ cho cấp thấp, không phải luật cấm.)
function thuocCap(bot) {
  return (bot.h.lvl | 0) < 3 ? ["potion:1", "potion:6"] : [THUOC_HP, THUOC_MP];
}
// Bãi train hiện tại của bot (động theo cấp) hoặc bãi cố định trong config (đường cũ / đo lường).
function baiTrain(bot) {
  return bot.baiTrain || { zone: bot.cfg.zone, cx: bot.cfg.cx, cy: bot.cfg.cy, r: bot.cfg.r || 320, mobs: bot.cfg.mobs, mobLv: bot.cfg.mobLv };
}
function tamBai(zone, idx) { // 1 điểm đi được thật trong bãi (điểm thứ idx), hoặc null nếu không có dữ liệu
  const zt = ZONE_TRAIN && ZONE_TRAIN[+zone];
  if (!zt || !Array.isArray(zt.pts) || !zt.pts.length) return null;
  return zt.pts[(idx | 0) % zt.pts.length];
}
// Chọn bãi theo cấp + cân tải: bãi chính tới khi đủ 9 con thì tràn sang phụ cùng dải.
// Chỉ gọi ở ranh giới chuyến (vào train / hết hoạt động / hết nghỉ) — không dịch chuyển giữa trận.
function capNhatBai(bot) {
  const cfg = bot.cfg;
  if (!ZONE_TRAIN || !CAP1 || DO_MODE) {
    bot.baiTrain = { zone: cfg.zone, cx: cfg.cx, cy: cfg.cy, r: cfg.r || 320, mobs: cfg.mobs, mobLv: cfg.mobLv };
    return bot.baiTrain;
  }
  const band = baiChoCap(bot.h.lvl | 0);
  const cands = [band.chinh, ...band.phu];
  const dem = new Map();
  for (const b of bots) { const z = b.baiTrain && b.baiTrain.zone; if (z != null) dem.set(z, (dem.get(z) || 0) + 1); }
  let chon = cands[0], itNhat = Infinity;
  for (const z of cands) {
    const n = dem.get(z) || 0;
    if (n < 9) { chon = z; break; }
    if (n < itNhat) { itNhat = n; chon = z; }
  }
  const zt = ZONE_TRAIN[chon];
  if (!zt || !Array.isArray(zt.pts) || !zt.pts.length) {
    bot.baiTrain = { zone: cfg.zone, cx: cfg.cx, cy: cfg.cy, r: cfg.r || 320, mobs: cfg.mobs, mobLv: cfg.mobLv };
    return bot.baiTrain;
  }
  const pt = zt.pts[bot.idx % zt.pts.length];
  const Z = N.ZONES && N.ZONES.get ? N.ZONES.get(+chon) : null;
  const mobs = (Z && Array.isArray(Z.m) && Z.m.length) ? Z.m : cfg.mobs;
  const mobLv = Z ? Math.max(Z.lo | 0, Math.min(Z.hi | 0, bot.h.lvl | 0)) : cfg.mobLv;
  bot.baiTrain = { zone: chon, cx: pt[0], cy: pt[1], r: zt.r || 320, mobs, mobLv };
  return bot.baiTrain;
}
// Đưa bot về đúng chỗ train hiện tại (bãi theo cấp), ghi hiện diện.
function veBaiTrain(bot) {
  const T = baiTrain(bot);
  bot.zone = T.zone; bot.x = T.cx; bot.y = T.cy; bot.dir = 2;
  try { DO.baiNay(bot.key, T.zone); } catch {}
  hienDien(bot);
}
// Bảng chiêu theo cấp hiện tại (cache theo cấp + sách đã học) — gọi đầu mỗi nhịp, rẻ khi chưa lên cấp.
function lamMoiTab(bot) {
  const lvl = bot.h.lvl | 0;
  if (lvl !== bot.tabLvl) {
    bot.tab = BC.bangChieu(bot.cfg.fac, bot.cfg.eqt, lvl, new Set(bot.h.books || []));
    bot.tabLvl = lvl;
  }
}

// Tài khoản + nhân vật bot: có sẵn thì dùng lại (đúng tên + đúng phái), chưa có thì tạo mới
// (đồ MAXPING + lên 200 đúng luật chung). nameSet: tên đã có (quét 1 lần lúc khởi động) + tên đã nhận.
function taoBot(cfg, tab, nameSet) {
  const tkCu = D.docTk(cfg.acct);
  if (tkCu && tkCu.nv && tkCu.nv[0]) {
    const h0 = tkCu.nv[0];
    if (h0.name === cfg.ten && +h0.fac === cfg.fac) {
      if (!tkCu.npc) { tkCu.npc = 1; D.ghiTk(tkCu); }
      return { tk: tkCu, h: h0, moi: false };
    }
    throw new Error(`Tài khoản ${cfg.acct} đã có nhân vật khác (${h0.name}) — không ghi đè`);
  }
  let ten = null;
  for (const cand of [cfg.ten, ...(cfg.tenDuPhong || [])]) {
    if (!nameSet.has(D.khoaTen(cand))) { ten = cand; break; }
  }
  if (!ten) throw new Error(`Tên ${cfg.ten} và tên dự phòng đều đã có người dùng`);
  nameSet.add(D.khoaTen(ten));
  const t = Date.now();
  const h = { v: 1, slot: 0, name: ten, server: tenMayChu(), lvl: 1, exp: 0, gold: 0, xu: 0, bag: [], equip: {}, looks: {},
    uN: 0, locDo: 0, sex: cfg.sex, series: cfg.series, fac: cfg.fac, facKey: cfg.facKey, start: {}, created: t, last: t,
    attr: { ...tab.attr }, skills: { ...tab.skills, ...tab.luyen }, books: [...tab.books],
    luyen: { ...tab.luyen0 } }; // độ luyện ở cấp đang có = 0: vừa chạm trần bảng luyện (như công cụ quản trị)
  const tk = { v: 1, ten: cfg.acct, bam: D.bam(crypto.randomBytes(24).toString("hex")), admin: false, phien: null,
    nv: [h, null, null], tao: t, vao: null, npc: 1 };
  DO.taoQua(h, { tien: TIEN_MAXPING, xu: XU_MAXPING, mon: doTheoPhai(h, cfg.eqt) }); // đồ + tiền + Xu như mã MAXPING
  h.exp += EXP_MAXPING;
  const len = N.lenCap(h); // lên cấp đúng luật chung, trần 200
  if (h.lvl !== 200) throw new Error(`Lên cấp MAXPING chỉ tới cấp ${h.lvl} (cần 200)`);
  N.themChong(h, BY.get("potion:3"), 20); // Kim Sáng Dược (đại): hồi sinh lực
  N.themChong(h, BY.get("potion:8"), 20); // Ngưng Thần đan (đại): hồi nội lực
  DO.chuan(h);
  // Mặc đồ: túi -> ô trang bị theo SLOT_OF của máy chủ (nhẫn 2 chiếc: Ring1 rồi Ring2)
  for (const it of [...h.bag]) {
    const x = BY.get(it.k); if (!x || typeof x.t !== "number") continue;
    let slot = DO.SLOT_OF[x.t]; if (!slot) continue;
    if (slot === "Ring1" && h.equip.Ring1) slot = "Ring2";
    if (h.equip[slot]) continue;
    h.equip[slot] = it; h.bag.splice(h.bag.indexOf(it), 1);
  }
  for (const [slot, it] of Object.entries(h.equip)) {
    const x = BY.get(it.k);
    if (x && LOOK_KEYS.includes(x.g) && x.id) h.looks[x.g] = x.id; // kiểu dáng người khác nhìn thấy
  }
  DO.chuan(h);
  D.ghiTk(tk);
  try { NK.ghi("npc", cfg.acct, ten, `Tạo NPC: ${FAC_TEN[cfg.facKey]} hệ ${TEN_NHANH[cfg.eqt]}, cấp 200, đồ MAXPING + ngựa Siêu Quang (lên ${len} cấp)`); } catch {}
  return { tk, h, moi: true };
}

// Tạo bot mới từ cấp 1 — NHƯ NGƯỜI CHƠI THẬT MỚI TẠO NHÂN VẬT (lệnh Huy 18:51 26/11/2026):
// lvl 1, exp 0, gold 0, xu 0, túi rỗng, không đồ, không sách, không bình, không ngựa.
// Mọi thứ sau đó đều farm/lên cấp/mua bằng đúng luật chung. Tên/phái/nhánh/giới/hệ đặt sẵn như cũ.
function taoBotCap1(cfg, nameSet) {
  const tkCu = D.docTk(cfg.acct);
  if (tkCu && tkCu.nv && tkCu.nv[0]) {
    const h0 = tkCu.nv[0];
    if (h0.name === cfg.ten && +h0.fac === cfg.fac) {
      if (!tkCu.npc) { tkCu.npc = 1; D.ghiTk(tkCu); }
      return { tk: tkCu, h: h0, moi: false };
    }
    throw new Error(`Tài khoản ${cfg.acct} đã có nhân vật khác (${h0.name}) — không ghi đè`);
  }
  let ten = null;
  for (const cand of [cfg.ten, ...(cfg.tenDuPhong || [])]) {
    if (!nameSet.has(D.khoaTen(cand))) { ten = cand; break; }
  }
  if (!ten) throw new Error(`Tên ${cfg.ten} và tên dự phòng đều đã có người dùng`);
  nameSet.add(D.khoaTen(ten));
  const t = Date.now();
  const h = { v: 1, slot: 0, name: ten, server: tenMayChu(), lvl: 1, exp: 0, gold: 0, xu: 0, bag: [], equip: {}, looks: {},
    uN: 0, locDo: 0, sex: cfg.sex, series: cfg.series, fac: cfg.fac, facKey: cfg.facKey, start: {}, created: t, last: t,
    attr: {}, skills: {}, books: [], luyen: {} };
  const tk = { v: 1, ten: cfg.acct, bam: D.bam(crypto.randomBytes(24).toString("hex")), admin: false, phien: null,
    nv: [h, null, null], tao: t, vao: null, npc: 1 };
  DO.chuan(h);
  D.ghiTk(tk);
  try { NK.ghi("npc", cfg.acct, ten, `Tạo NPC: ${FAC_TEN[cfg.facKey]} hệ ${TEN_NHANH[cfg.eqt]}, cấp 1 (reset lv1 — không đồ/tiền/sách cấp phát)`); } catch {}
  // Đo lường (chỉ máy thử): đặt cấp đo bằng đúng hàm lên cấp của game, để đo bãi theo cấp.
  if (DO_MODE && Number.isInteger(cfg.lvl) && cfg.lvl > 1) {
    h.exp = tienTrinh({ lvl: cfg.lvl, exp: 0 });
    const len = N.lenCap(h);
    if (h.lvl !== cfg.lvl) throw new Error(`Đặt cấp đo chỉ tới cấp ${h.lvl} (cần ${cfg.lvl})`);
    h.exp = 0;
    DO.chuan(h);
    D.ghiTk(tk);
    try { NK.ghi("npc", cfg.acct, ten, `Đặt cấp đo: lên ${len} cấp tới cấp ${cfg.lvl} (chỉ máy thử)`); } catch {}
  }
  return { tk, h, moi: true };
}

// Ép bảng chiêu của bot về đúng chuẩn phái (cả khi tài khoản đã tạo từ bản cũ thiếu / thừa chiêu).
function chuanChieu(bot) {
  const tab = bot.tab;
  // Chiêu luyện đã học (sách) giữ nguyên cấp do độ luyện quyết — bảng theo cấp không cấp phát lại.
  const luyenCu = {};
  for (const [id, lv] of Object.entries(bot.h.skills || {})) if (DO.laLuyen(id) && (lv | 0) > 0) luyenCu[id] = lv | 0;
  bot.h.skills = { ...tab.skills, ...tab.luyen, ...luyenCu };
  bot.h.books = [...tab.books];
  bot.h.luyen = { ...tab.luyen0 };
  bot.h.attr = { ...tab.attr };
}

// Đồng bộ chiêu + tiềm năng theo cấp hiện tại (chạy ở thành, sau mỗi lần lên cấp):
// bảng chiêu suy lại ở cấp mới (đúng ngân sách điểm đã kiếm được — không cho thêm điểm),
// chiêu luyện đã học giữ nguyên, sách giữ nguyên. Trả true nếu có đổi.
function dongBoCap(bot) {
  const lvl = bot.h.lvl | 0;
  if (lvl === bot.capDaDongBo) return false;
  bot.tab = BC.bangChieu(bot.cfg.fac, bot.cfg.eqt, lvl, new Set(bot.h.books || []));
  bot.tabLvl = lvl;
  const luyenCu = {};
  for (const [id, lv] of Object.entries(bot.h.skills || {})) if (DO.laLuyen(id) && (lv | 0) > 0) luyenCu[id] = lv | 0;
  bot.h.skills = { ...bot.tab.skills, ...luyenCu };
  bot.h.attr = { ...bot.tab.attr };
  DO.hamChieu(bot.h);
  bot.capDaDongBo = lvl;
  ghiDoLuong(bot, "cap", {});
  tinhChiSo(bot); // chiêu/tiềm năng đổi thì chỉ số đổi: tính lại (máu/nội lực đầy ở thành như cũ)
  log(`đồng bộ cấp ${lvl} (${bot.h.name}): ${Object.keys(bot.tab.skills).length} chiêu, bãi ${bot.baiTrain ? bot.baiTrain.zone : bot.cfg.zone}`);
  return true;
}

function snapshot(bot) {
  const hp = bot.hpMax ? Math.max(0, Math.min(100, Math.round((100 * (bot.hpCur ?? bot.hpMax)) / bot.hpMax))) : 100;
  const mp = bot.mpMax ? Math.max(0, Math.min(100, Math.round((100 * (bot.mpCur ?? bot.mpMax)) / bot.mpMax))) : 100;
  // P1 (26/11/2026): 3 mốc nội suy / lần hiện diện + số đòn atkN + cờ fight, để client
  // vẽ chuyển động mượt và phát lại động tác đánh (world.js updateOther chỉ phát khi atkN đổi).
  // act suy từ mục tiêu (đường đánh trả không tự đặt act) — sạp / chết / đứng không có mục tiêu nên không ảnh hưởng.
  const t = Date.now(), px = bot.px ?? bot.x, py = bot.py ?? bot.y;
  bot.px = bot.x; bot.py = bot.y;
  const act = bot.mucTieu ? "attack" : bot.act;
  const moc = (k, w) => [t - (1 - k) * 1000, Math.round(px + (bot.x - px) * w), Math.round(py + (bot.y - py) * w), bot.dir, act, bot.atkN | 0, 1, bot.mucTieu ? 1 : 0];
  return { zone: bot.zone, lvl: bot.h.lvl | 0, npc: 1, look: { ...bot.look }, tr: [moc(0, 1 / 3), moc(0.5, 2 / 3), moc(1, 1)], hp, mp };
}

function hienDien(bot) {
  try {
    const r = TG.nhip(bot.fakeTk, { o: 0, tin: bot.lastTin, s: snapshot(bot) });
    // lastTin=null = chưa nhận đợt nào: đợt đầu chỉ ghi mốc, không trả lời tin cũ.
    // (Khởi tạo 0 là sai: tinId=0 khiến mốc không bao giờ ghi, rồi tin đầu tiên bị bỏ.)
    if (r && typeof r.tinId === "number") { if (bot.lastTin !== null && bot.lastTin !== undefined) docTin(bot, r.tin || []); bot.lastTin = r.tinId; }
  } catch (e) { if (!bot.loiHien || Date.now() - bot.loiHien > 60000) { bot.loiHien = Date.now(); log(`nhịp hiện diện lỗi (${bot.h.name}):`, e.message); } }
}

function soThuoc(bot, k) { return (bot.h.bag || []).filter((o) => o.k === k).reduce((t, o) => t + (o.n || 0), 0); }

function gietMot(bot, mob, lv) {
  const T = baiTrain(bot);
  mob = mob || pick(T.mobs); lv = lv || T.mobLv;
  const x = bot.x, y = bot.y;
  let kq;
  try { kq = DO.gietQuai(bot.h, [[bot.zone, mob, lv, 0, 0, x, y]], { ten: bot.cfg.acct, admin: false, key: bot.key }); }
  catch (e) { log(`giết quái lỗi (${bot.h.name}):`, e.message); return; }
  if (!kq || !kq.n) { bot.stats.bo += (kq && kq.bo) || 1; return; } // bị luật chặn: đếm để thấy trong kiểm chứng
  bot.kills++; bot.stats.giet++; bot.stats.kn += kq.kn || 0;
  ghiDoLuong(bot, "giet", { kn: kq.kn || 0, mob, mobLv: lv });
  ghiLuyenGiet(bot);
  const gs = [...(kq.roi || []).map((r) => r[2]), ...(kq.nhan || []).map((m) => m && m.g)].filter((g) => Number.isFinite(+g));
  if (gs.length) {
    try { const n = DO.nhat(bot.h, bot.key, gs); bot.stats.nhat += (n.nhan || []).length; bot.stats.tienNhat += n.tien || 0; }
    catch (e) { log(`nhặt đồ lỗi (${bot.h.name}):`, e.message); }
  }
}

function giaCua(it) { try { return DO.giaBan(it) | 0; } catch { return 0; } }
function laDoFarm(it) {
  const x = BY.get(it.k);
  return !!(x && typeof x.t === "number" && x.t <= 10 && !it.kbh && !it.het && giaCua(it) > 0);
}
function laDoNgon(it) { // chỉ bày đồ ngon: đủ dòng, hoặc 2 dòng mà có dòng đạt trần (xem khối lọc đồ ngon ở trên)
  const d = it.d || [];
  return laDoFarm(it) && (d.length >= NGON_DONG || (d.length === 2 && chatLuongMon(it) >= NGON_CHAT));
}

function moSap(bot) {
  // Dọn món rác còn nằm trên sạp từ trước (bản cũ bày tất cả): thu về túi; túi đầy thì để lại chuyến sau.
  // Món ngon còn trên sạp: định giá lại theo chất nếu lệch ≥10% (công thức đổi / đồ đổi tay) — khỏi spam sạp vì lệch nhỏ.
  for (const it of [...((bot.h.sap && bot.h.sap.ds) || [])]) {
    if (laDoNgon(it)) {
      try {
        const moi = KT.giaChat(bot.h, it);
        if (moi > 0 && (it.gia | 0) > 0 && Math.abs(moi - (it.gia | 0)) / (it.gia | 0) >= 0.10) {
          CHO.lam(bot.fakeTk, bot.h, 0, { viec: "dinhGia", u: it.u, gia: moi });
        }
      } catch (e) { /* dưới cấp 80 / lỗi: giữ giá cũ */ }
      continue;
    }
    try { CHO.lam(bot.fakeTk, bot.h, 0, { viec: "thuHoi", u: it.u }); }
    catch (e) { /* túi đầy / món vướng: để lại, không kẹt */ }
  }
  let dinh = 0;
  for (const it of [...bot.h.bag]) {
    if (!laDoNgon(it)) continue; // đồ rác không bày (bán cho NPC ở viecThanh — lệnh Huy 01:49 27/11/2026)
    try { CHO.lam(bot.fakeTk, bot.h, 0, { viec: "dinhGia", u: it.u, gia: KT.giaChat(bot.h, it) }); dinh++; }
    catch (e) { /* món không lên sạp được thì để túi */ }
  }
  if (!dinh && !(bot.h.sap && (bot.h.sap.ds || []).length)) {
    bot.demKhongSap = (bot.demKhongSap || 0) + 1; // toàn đồ rác / chưa có đồ: về train, khỏi spam nhật ký
    if (bot.demKhongSap % 10 === 1) log(`không có đồ ngon để bày (${bot.h.name}) — về train tiếp`);
    return false;
  }
  try { CHO.lam(bot.fakeTk, bot.h, 0, { viec: "loiRao", qc: QC }); } catch (e) { log(`đặt lời rao lỗi (${bot.h.name}):`, e.message); return false; }
  for (const [sx, sy] of bot.cfg.stalls) {
    bot.x = sx; bot.y = sy; hienDien(bot); // chỗ mở sạp = chỗ đang đứng (nhịp gần nhất của máy chủ)
    try {
      const r = CHO.lam(bot.fakeTk, bot.h, 0, { viec: "mo", on: 1, bai: Z_TOWN, x: sx, y: sy });
      bot.stallSpot = [sx, sy];
      log(`mở sạp ở Biện Kinh: ${bot.h.name} — ${r && r.msg ? r.msg : ""}`);
      return true;
    } catch (e) { /* chỗ này sát sạp khác / ngoài vùng an toàn: thử điểm dự phòng */ }
  }
  log(`không mở được sạp (${bot.h.name}) — 3 điểm đều vướng, về train tiếp`);
  return false;
}

function dongSap(bot) {
  try { CHO.lam(bot.fakeTk, bot.h, 0, { viec: "mo", on: 0 }); } catch {}
  const tin = bot.h.choTin || [];
  if (tin.length) { bot.stats.ban += tin.length; log(`sạp báo (${bot.h.name}):`, tin.join(" · ")); bot.h.choTin = []; }
}

// Rao BÁN (lệnh Huy 12:39 26/11 — bot được phép rao mua bán): chỉ khi sạp đang mở và có đồ; đi qua CÙNG cửa
// tiết lưu kênh chung với traLoi (traLoiChungAll / CHAT_CHUNG_MS) nên rao + trả lời gộp lại không vượt trần.
// ĐX-1 (Huy duyệt 00:42 27/11/2026): rao lần đầu 5–15 giây sau khi mở sạp; còn ngồi bán thì rao lại mỗi ~100 giây (+ jitter).
// Sạp trống thì không rao. Rao MUA không làm (xem báo cáo đợt việc): giao dịch cần 2 trình duyệt thẩm định
// lẫn nhau, bot không có cơ chế an toàn để nhận mua đồ người chơi.
const RAO_BAN_MS = 100 * 1000; // ĐX-1: còn ngồi bán thì rao lại mỗi ~100 giây (qua cửa chung nên cả bầy ≤ ~2 tin/phút)
const RAO_MAX = 100; // Huy chốt 01:15 27/11/2026: tin rao ≤100 ký tự (trần TIN_MAX ở the-gioi.js) — rút ở ranh giới từ, giữ nguyên tên + giá cả 2 món
function rutTinRao(mon, monDau) {
  // Ưu tiên: giữ nguyên danh sách món → rút khẩu hiệu trước → rút đầu → cuối cùng chỉ còn món đầu (không bao giờ cắt giữa tên/giá)
  const khauHieu = ["Tới mà xem, đừng hỏi nhiều.", "Tới mà xem.", "Tới xem."];
  const daus = ["Bán đồ ngon ở sạp Biện Kinh: ", "Sạp Biện Kinh: ", ""];
  for (const d of daus)
    for (const kh of khauHieu) {
      const t = `${d}${mon}. ${kh}`;
      if (t.length <= RAO_MAX) return t;
    }
  for (const d of daus) { const t = d + mon; if (t.length <= RAO_MAX) return t; }
  return monDau; // tên/giá quá dài: chỉ món đầu nguyên vẹn
}
function raoBan(bot) {
  const ds = (bot.h.sap && bot.h.sap.mo && bot.h.sap.ds) || [];
  if (!ds.length) return; // sạp trống / chưa mở: không rao
  const t = Date.now();
  if (t - traLoiChungAll < CHAT_CHUNG_MS) { bot.raoDen = t + 1500; return; } // ĐX-1: cửa chung bận thì thử lại nhịp sau (1,5 giây), khỏi dời +30 giây rồi mất lượt khi sạp đóng
  const dsMon = ds.slice(0, 2).map((it) => `${DO.tenMon(it) || "?"} ${(it.gia | 0) || giaCua(it)} lượng`); // giá niêm yết thật trên sạp
  const tin = rutTinRao(dsMon.join(", "), dsMon[0]);
  traLoiChungAll = t;
  bot.raoDen = t + RAO_BAN_MS + ri(0, 20 * 1000);
  try {
    TG.chat(bot.fakeTk, { o: 0, ch: "CH_WORLD", t: tin });
  } catch (e) { log(`rao bán lỗi (${bot.h.name}):`, e.message); }
}

function tickBot(bot) {
  try {
    try { ONL().dem(bot.h, bot.key, false); } catch {} // online tích lũy theo nhịp thật (≤90 giây mới tính)
    lamMoiTab(bot); // lên cấp thì bảng chiêu theo kịp (chiêu/tiềm năng mới chỉ áp ở thành — như người chơi cộng điểm)
    if (bot.mode === "hd") { hdTick(bot); return; }
    // Chạm trần exp/ngày thì không vào hoạt động nữa (kể cả đang bày sạp) — về nghỉ ở thành.
    if ((bot.mode === "luyen" || bot.mode === "cho") && !DO_MODE && !hetTran(bot)) hdKiemTra(bot); // hoạt động có giờ: vào đúng cửa, hết thì về train/sạp
    if (bot.mode === "hd") { hdTick(bot); return; }
    if (bot.mode === "luyen") {
      // Chạm trần: dừng giết, về thành nghỉ (bày sạp/ngồi chơi) tới ngày mới — không nhận thêm exp.
      if (!DO_MODE && hetTran(bot)) {
        boMucTieu(bot);
        bot.mode = "nghi"; bot.zone = Z_TOWN; bot.x = bot.cfg.stalls[0][0]; bot.y = bot.cfg.stalls[0][1];
        bot.dir = 2; bot.act = "sit"; bot.daMoSapNghi = false;
        try { DO.baiNay(bot.key, Z_TOWN); } catch {}
        hienDien(bot); viecThanh(bot); luu(bot);
        log(`chạm trần exp/ngày — về thành nghỉ (${bot.h.name}, cấp ${bot.h.lvl})`);
        return;
      }
      const T = baiTrain(bot);
      if (!bot.mucTieu) {
        bot.x = Math.max(T.cx - T.r, Math.min(T.cx + T.r, bot.x + ri(-250, 250)));
        bot.y = Math.max(T.cy - T.r, Math.min(T.cy + T.r, bot.y + ri(-150, 150)));
        bot.dir = ri(0, 7); bot.act = Math.random() < 0.7 ? "attack" : "run";
      }
      // Máu / nội lực thật: hồi theo nhịp từ bình đã uống, uống khi dưới ngưỡng Trợ Thủ, quái có thể đánh trước.
      hoiTheoNhip(bot);
      const [kHp, kMp] = thuocCap(bot);
      if (bot.chiSo) {
        if (bot.hpCur / bot.hpMax < NG_THUOC.hp && !bot.potHp) uongThat(bot, kHp); // P2: chỉ uống khi chưa có hiệu lực cùng loại — bình cũ còn tác dụng thì không đốt bình mới
        if (bot.mpCur / bot.mpMax < NG_THUOC.mp && !bot.potMp) uongThat(bot, kMp);
        if (!bot.mucTieu && Math.random() < QUAI_DANH_XS) quaiTanCong(bot);
      }
      if (bot.mucTieu) vongDanh(bot);
      // Giãn đều: mỗi bot chỉ giết trừu tượng 1 con / 3 nhịp (4,5 giây) — 170 bot không dồn luật giết cùng lúc.
      else if ((tickN + bot.idx) % 3 === 0) gietMot(bot);
      // Hết thuốc thì về thành — nhưng chỉ khi có tiền mua (không tiền thì ở lại farm tiếp,
      // kẻo về thành tay không rồi lại ra ngay, kẹt vòng lặp ve/ban/luyen).
      const hetThuoc = soThuoc(bot, kHp) + soThuoc(bot, kMp) < 6 && (bot.h.gold || 0) >= 50;
      if (bot.kills >= GIET_TRIP || N.oTrong(bot.h) < 6 || hetThuoc) {
        boMucTieu(bot);
        bot.mode = "ve"; log(`về thành: ${bot.h.name} ${bot.kills} con, ô trống ${N.oTrong(bot.h)}, thuốc còn ${soThuoc(bot, kHp) + soThuoc(bot, kMp)} bình`);
      }
    } else if (bot.mode === "chet") {
      bot.act = "die";
      if (Date.now() - bot.chetLuc >= 3000) { bot.mode = "ve"; hoiDay(bot); log(`hồi sinh ở Biện Kinh (${bot.h.name}), máu / nội lực đầy`); }
    } else if (bot.mode === "ve") {
      bot.zone = Z_TOWN; bot.x = bot.cfg.stalls[0][0]; bot.y = bot.cfg.stalls[0][1]; bot.dir = 2; bot.act = "stand";
      // Bình mua bằng lượng farm được ở viecThanh (muaBinh) — KHÔNG cấp phát miễn phí như P2 cũ.
      DO.baiNay(bot.key, Z_TOWN); hienDien(bot); viecThanh(bot); bot.mode = "ban"; bot.kills = 0; luu(bot);
    } else if (bot.mode === "ban") {
      if (DO_MODE) { // đo lường: bỏ qua sạp, về train ngay để đo grind thuần
        bot.mode = "luyen"; capNhatBai(bot); veBaiTrain(bot); bot.act = "run"; luu(bot);
      } else {
        bot.mode = moSap(bot) ? "cho" : "luyen";
        if (bot.mode === "cho") { bot.stallDen = Date.now() + STALL_MS; bot.raoDen = Date.now() + ri(5, 15) * 1000; } // ĐX-1: rao đầu 5–15 giây sau khi mở sạp, trong cửa sạp mở (STALL_MS 120s)
        else { capNhatBai(bot); veBaiTrain(bot); bot.act = "run"; }
        luu(bot);
      }
    } else if (bot.mode === "cho") {
      bot.act = "sit";
      if (Date.now() >= (bot.raoDen || 0)) raoBan(bot); // rao bán thưa, qua cửa tiết lưu chung
      // Chạm trần thì giữ sạp mở, ngồi chơi tới ngày mới (không đóng sạp rồi ra train ngay).
      if (Date.now() >= bot.stallDen && (DO_MODE || !hetTran(bot))) {
        dongSap(bot);
        bot.mode = "luyen"; capNhatBai(bot); veBaiTrain(bot); bot.act = "run";
        hoiDay(bot); luu(bot);
        log(`đóng sạp, ra train tiếp (${bot.h.name})`);
      }
    } else if (bot.mode === "nghi") {
      // Nghỉ vì chạm trần: ở thành, bày sạp nếu có đồ ngon, ngồi chơi, vẫn trả lời chat qua hiện diện.
      bot.zone = Z_TOWN; bot.act = "sit";
      if (!(bot.h.sap && bot.h.sap.mo) && !bot.daMoSapNghi) {
        bot.x = bot.cfg.stalls[0][0]; bot.y = bot.cfg.stalls[0][1];
        bot.daMoSapNghi = true;
        if (moSap(bot)) { bot.stallDen = Date.now() + STALL_MS; bot.raoDen = Date.now() + ri(5, 15) * 1000; } // ĐX-1: rao lần đầu 5–15 giây sau khi mở sạp
      }
      if (bot.h.sap && bot.h.sap.mo && Date.now() >= (bot.raoDen || 0)) raoBan(bot);
      if (!hetTran(bot)) { // ngày mới: đóng sạp (nếu có), ra train tiếp
        if (bot.h.sap && bot.h.sap.mo) dongSap(bot);
        bot.daMoSapNghi = false;
        bot.mode = "luyen"; capNhatBai(bot); veBaiTrain(bot); bot.act = "run";
        hoiDay(bot); luu(bot);
        log(`hết nghỉ — ra train tiếp (${bot.h.name}, cấp ${bot.h.lvl})`);
      }
    }
    if ((tickN + bot.idx) % 20 === 0) luu(bot);
  } catch (e) { log(`tick lỗi (${bot.h.name}):`, e.message); }
}

function luu(bot) { try { bot.h.last = Date.now(); D.ghiTk(bot.tk); } catch (e) { log(`lưu lỗi (${bot.h.name}):`, e.message); } }

// ---------- dữ liệu + chỉ số (đúng luật client: rules.js + vocong.js + itemdb.js) ----------
function napDuLieu() {
  const ROOT = path.join(__dirname, "..");
  const rules = require(path.join(ROOT, "src", "game", "rules.js"));
  const vocong = require(path.join(ROOT, "src", "game", "vocong.js"));
  const itemdb = require(path.join(ROOT, "src", "game", "itemdb.js"));
  const docJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
  const SK = docJSON("assets/web/skill/skills.json");
  const db = vocong.suaVoCong({ ...(SK.skills || {}) });
  const CHR = docJSON("assets/data/char.json");
  const MS = docJSON("assets/data/mobstats.json");
  const DEF = docJSON("assets/data/monsters.json");
  const VC = docJSON("assets/web/vocong/vocong.json");
  // ItemDB của client nạp bằng fetch trình duyệt — máy chủ không có: nạp từ đĩa y hệt ItemDB.load().
  const pack = docJSON("assets/web/item/items.json");
  const goc = docJSON("assets/data/do-goc.json");
  const attr = docJSON("assets/data/attr.json");
  const th = docJSON("assets/data/thuoc.json");
  itemdb.ItemDB.pack = pack;
  itemdb.ItemDB.by = new Map(pack.items.map((x) => [x.k, x]));
  for (const [k, x] of Object.entries(th.items || {})) itemdb.ItemDB.by.set(k, { ...x, k, thuoc: 1 });
  itemdb.ItemDB.goc = goc.items; itemdb.ItemDB.serDmg = attr.serDmg || {};
  return { rules, vocong, itemdb, db, CHR, MS, DEF, PACK: VC.sk || {}, factions: SK.factions || [] };
}
const napDuLieuBot = (() => { let cache = null; return () => cache || (cache = napDuLieu()); })();

function tinhChiSoCua(h) {
  const { rules, vocong, itemdb, db, CHR } = napDuLieuBot();
  const skills = { ...(h.skills || {}) };
  const H = { name: h.name, lvl: h.lvl, sex: h.sex, series: h.series, fac: +h.fac, facKey: h.facKey || BC.FACKEY[+h.fac],
    start: {}, attr: { ...(h.attr || {}) }, equip: h.equip || {}, skills, looks: h.looks || {}, books: h.books || [], mt: h.mt || 0, luyen: h.luyen || {} };
  const idx = (H.series | 0) * 2 + (H.sex === "f" ? 1 : 0);
  H.start = { ...((CHR.start || [])[idx] || {}), ...(h.start || {}) };
  const start = (CHR.factions || []).find((f) => f.id === +h.fac) || {};
  if (start.series != null) H.series = start.series;
  itemdb.syncRanged(H);
  const wk = itemdb.weaponKind(H);
  // Vòng sáng đang học (kindOf "aura", không nhắm địch) đi qua danh sách ngoai — mỗi nhánh có vòng riêng.
  const ngoai = Object.keys(H.skills).filter((id) => (H.skills[id] | 0) > 0 && vocong.kindOf(db[id], db) === "aura")
    .map((id) => [+id, H.skills[id] | 0]);
  const buffs = new Map();
  const B = vocong.mergeB(itemdb.equipStats(H, false), vocong.skillB(H, db, wk, buffs, null, ngoai));
  const p = rules.heroStats(H, CHR, B);
  const sup = vocong.skillSupport(H, db);
  return { H, wk, db, p, sup, buffs, hpM: p.hpMax, mpM: p.mpMax };
}

function tinhChiSo(bot) {
  bot.chiSo = tinhChiSoCua(bot.h);
  bot.hpMax = bot.chiSo.hpM; bot.mpMax = bot.chiSo.mpM;
  bot.hpCur = bot.hpMax; bot.mpCur = bot.mpMax;
  bot.look = { ...bot.h.looks };
}
function hoiDay(bot) { bot.hpCur = bot.hpMax; bot.mpCur = bot.mpMax; bot.cd = {}; bot.mucTieu = null; bot.potHp = bot.potMp = null; }
function uongThat(bot, k) {
  if (!bot.chiSo || bot.hpCur <= 0) return false;
  const x = BY.get(k); if (!x) return false;
  const i = (bot.h.bag || []).findIndex((o) => o.k === k && (o.n || 0) > 0);
  if (i < 0) return false;
  const it = bot.h.bag[i]; it.n -= 1; if (!it.n) bot.h.bag.splice(i, 1);
  // Mô hình client (world.js drink): bình mới thay bình cũ cùng loại, hồi ở nhịp sau, mỗi nửa giây 1 lần.
  if (x.hp) bot.potHp = { v: x.hp[0], con: x.hp[1] };
  if (x.mp) bot.potMp = { v: x.mp[0], con: x.mp[1] };
  bot.stats.thuoc++;
  return true;
}
function hoiTheoNhip(bot) {
  if (!bot.chiSo || bot.hpCur <= 0) return;
  for (const [key, field, max] of [["potHp", "hpCur", bot.hpMax], ["potMp", "mpCur", bot.mpMax]]) {
    const pot = bot[key]; if (!pot) continue;
    const heal = pot.v * Math.min(3, Math.max(0, pot.con / 0.5)); // nhịp 1,5 giây = 3 lần nửa giây
    bot[field] = Math.min(max, bot[field] + heal);
    pot.con -= 1.5;
    if (pot.con <= 0) bot[key] = null;
  }
}

// ---------- quái mô phỏng (chỉ số thật + hệ số bãi như client spawnMob) ----------
function quaiMau(bot, id, lv) {
  const { rules, MS, DEF } = napDuLieuBot();
  const B = ((DO.LUAT.canBang || {}).bai || {})[bot.zone] || {};
  const sid = B.chiSo && MS.mobs[B.chiSo] ? B.chiSo : id;
  const def = DEF[id] || DEF[String(id)] || {};
  const st = rules.mobStats(def, sid, lv, 0, 75, MS, undefined);
  const km = B.mau ?? 1, kd = B.satThuong ?? 1;
  const hpMax = Math.max(1, Math.round(st.hpMax * km));
  const ten = def.n || def.name || ("Quái " + id);
  return { loai: "quai", id, lv, ten, x: bot.x + ri(-40, 40), y: bot.y + ri(-25, 25), hpMax, hpCur: hpMax,
    mpMax: 100, mpCur: 100, series: st.series, def: Math.round(st.def * (B.neTranh ?? 1)), res: st.res,
    dmg: st.dmg.map((v) => Math.round(v * kd)), ar: Math.max(1, Math.round(st.ar * (B.chinhXac ?? 1))),
    exp: st.exp, mau: hpMax };
}
function taoMucQuai(bot, id, lv, ten) {
  const m = quaiMau(bot, id, lv);
  if (ten) m.ten = ten;
  return m;
}
function boMucTieu(bot) { bot.mucTieu = null; bot.danhBatDau = 0; }

// ---------- công thức sát thương (vocong.js skDamage / handDamage, đọc nguyên) ----------
const NOI_CONG = +((DO.LUAT && DO.LUAT.noiCong) || 0);
function skTam(s, A) { return ((A.skill_attackradius && A.skill_attackradius[0]) || s.radius || 75); }
function skCost(s, A) { return (A.skill_cost_v && A.skill_cost_v[0]) || 0; }
function cdMs(s, A, packK) {
  const ticks = Math.max(18, (A.skill_mintimepercast_v && A.skill_mintimepercast_v[0]) || 0, (packK && packK.tpc) || 0);
  return Math.round((ticks * 1000) / 18); // tối thiểu 18 vòng = 1 giây (nhịp ra đòn của client)
}
function elemChinh(s, A) {
  for (const key of Object.keys(ELEM_KEYS)) if (A[key]) return ELEM_KEYS[key];
  return "phys";
}
function elemOf(p, s, A) {
  const extra = s.phys ? p.elem : p.elemMagic, hoan = (s.phys ? p.hoanElem : p.hoanMagic) || {}, out = [];
  for (const [key, t] of Object.entries(ELEM_KEYS)) {
    const a = A[key], add = (s.phys ? extra[t] || 0 : 0) + (a ? (s.phys ? 0 : extra[t] || 0) + (hoan[t] || 0) : 0);
    if (!a && !add) continue;
    let lo = (a ? a[0] : 0) + add, hi = (a ? a[2] || a[0] : 0) + add;
    if (t === "fire") hi *= 1 + (p.enh.fire || 0) / 100;
    if (t === "light") lo = Math.min(hi, lo * (1 + (p.enh.light || 0) / 100));
    out.push([t, lo, hi]);
  }
  return out;
}
function noiK(p, s) { return s && !s.phys && NOI_CONG > 0 ? 1 + ((p.eng || 0) * NOI_CONG) / 100 : 1; }
function kyK(s, facKey) {
  const K = DO.LUAT && DO.LUAT.kyNangPhai;
  if (!K || !s) return 1;
  const p = K.phai && facKey != null ? +K.phai[facKey] : NaN, c = K.chieu ? +K.chieu[s.id] : NaN;
  return (p > 0 ? p / 100 : 1) * (c > 0 ? c / 100 : 1);
}
function serK(p, s, A, eSeries, heroSeries) {
  const se = s && s.series >= 0 ? s.series : heroSeries;
  const X = (A.seriesdamage_p && A.seriesdamage_p[0]) || 0;
  const ser = (KHAC[se] === eSeries ? X : KHAC[eSeries] === se ? -X : 0) + (p.vsSeries[eSeries] || 0);
  return Math.max(0.1, 1 + ser / 100);
}
// Chiêu con (sub.child / pack kid): dòng sát thương ở chiêu con, cấp theo chiêu cha (kidLv = -1).
function gocSatThuong(C, id) {
  const s = C.db[id];
  if (!s) return null;
  const child = s.sub && s.sub.child, g = child && C.db[child] ? C.db[child] : s;
  return { s: g, goc: child && C.db[child] ? child : id, cha: s };
}
// Sát thương 1 đòn của chiêu id lên mục tiêu e ({def, res, series}) hoặc thô (e = null: người chơi —
// máy người đó tự trừ khiên/nội lực hộ thân, máy chủ chỉ gửi số thô). rollTrung: xét trúng/trượt như
// client (chỉ dùng khi xét báo đòn của người chơi; đòn của bot luôn trúng để khỏi flaky).
function tinhSatThuong(C, id, e, rollTrung) {
  const { rules, vocong, PACK } = napDuLieuBot();
  const g = gocSatThuong(C, id);
  if (!g) return { v: 0, none: true };
  const lv = C.H.skills[id] | 0;
  if (lv <= 0) return { v: 0, none: true };
  const s = g.s, A = vocong.lvAttrs(s, lv);
  const packK = PACK[id] || {};
  if (rollTrung && packK.useAR !== 0) {
    const ar = C.p.ar * (1 + ((A.attackrating_p && A.attackrating_p[0]) || 0) / 100);
    const defV = e ? Math.max(0, e.def || 0) : 0;
    const ign = Math.min(100, (C.p.ignoreDef || 0) + ((A.ignoredefense_p && A.ignoredefense_p[0]) || 0));
    if (e && Math.random() * 100 >= rules.hitPercent(ar, defV * (1 - ign / 100))) return { miss: true, v: 0 };
  }
  const mobRes = (k) => e ? Math.min(95, (e.res && e.res[k]) || 0) : 0;
  let v = 0, cold = 0;
  const cha = g.cha;
  const vlNoi = cha.phys || !(A.physicsenhance_p || A.physicsdamage_v) ? 0 : ((C.p.elemMagic && C.p.elemMagic.physics) || 0) + ((C.p.hoanMagic && C.p.hoanMagic.physics) || 0);
  if (A.physicsenhance_p || A.physicsdamage_v || vlNoi) {
    let ph = A.physicsenhance_p ? ri(C.p.dmg[0], C.p.dmg[1]) * (1 + A.physicsenhance_p[0] / 100) : 0;
    if (A.physicsdamage_v) ph += ri(A.physicsdamage_v[0], A.physicsdamage_v[2] || A.physicsdamage_v[0]);
    ph += vlNoi;
    v += Math.max(0, (ph * (100 - mobRes("phys"))) / 100);
  }
  for (const [t, lo, hi] of elemOf(C.p, cha, A)) {
    const x = Math.max(0, (ri(Math.floor(lo), Math.floor(hi)) * (100 - mobRes(t))) / 100);
    v += x; if (t === "cold") cold = x;
  }
  const supPct = (C.sup && C.sup[id]) || 0;
  const nk = noiK(C.p, cha), kk = kyK(cha, C.H.facKey);
  const serKF = e && e.series != null ? serK(C.p, cha, A, e.series, C.H.series) : 1;
  v *= (1 + supPct / 100) * serKF * nk * kk;
  if (A.poisondamage_v) {
    const [v0, tm, every] = A.poisondamage_v;
    const add = (cha.phys ? C.p.elem.poison || 0 : C.p.elemMagic.poison || 0) + (((cha.phys ? C.p.hoanElem : C.p.hoanMagic) || {}).poison || 0);
    const pv = (v0 * (1 + supPct / 100) + add) * nk * kk;
    const dur = (tm || 54) * (1 + (C.p.enh.poison || 0) / 100), ev = Math.max(1, every || 9);
    v += Math.max(0, ((pv * Math.floor(dur / ev)) * (100 - mobRes("poison"))) / 100) * serKF;
  }
  const crit = Math.random() * 100 < ((A.deadlystrike_p && A.deadlystrike_p[0]) || 0) + (C.p.crit || 0);
  if (crit) v *= 2;
  if (!v) return { v: 0, none: true };
  return { v: Math.max(1, Math.floor(v)), crit, cold };
}
function tenChieu(bot, id) {
  const s = bot.chiSo && bot.chiSo.db[id];
  return String((s && s.n) || ("Chiêu " + id)).split("_")[0].trim();
}

// Ra 1 chiêu của bot lên mục tiêu (null = ngoài tầm / sai vũ khí / thiếu nội lực — không tốn gì).
function donChieu(bot, id, muc) {
  const C = bot.chiSo;
  if (!C) return null;
  const { vocong, PACK } = napDuLieuBot();
  const cha = C.db[id];
  if (!cha) return null;
  const lv = C.H.skills[id] | 0;
  if (lv <= 0) return null;
  const kind = vocong.kindOf(cha, C.db);
  if (kind !== "attack" && kind !== "curse") return null;
  const g = gocSatThuong(C, id);
  const A = vocong.lvAttrs(g.s, lv);
  const tam = skTam(cha, vocong.lvAttrs(cha, lv));
  const dx = bot.x - muc.x, dy = (bot.y - muc.y) * 2;
  if (Math.hypot(dx, dy) > tam) return null;
  if (!vocong.eqtOk(cha, C.wk)) return null;
  const cost = skCost(cha, vocong.lvAttrs(cha, lv));
  if (bot.mpCur < cost) return null;
  const kq = tinhSatThuong(C, id, muc.loai === "quai" ? muc : null, false);
  bot.mpCur = Math.max(0, bot.mpCur - cost);
  bot.cd[id] = Date.now() + cdMs(cha, vocong.lvAttrs(cha, lv), PACK[id]);
  if (kq.miss) return { id, lv, sat: 0, miss: true, kind, tam, mp: cost };
  if (kq.none) return { id, lv, sat: 0, none: true, kind, tam, mp: cost };
  const out = { id, lv, sat: kq.v, crit: kq.crit, cold: kq.cold || 0, loai: elemChinh(cha, A), kind, tam, mp: cost };
  if (muc.loai === "quai") apDungLenMuc(bot, muc, out);
  return out;
}
function danhThuong(bot, muc) {
  const C = bot.chiSo;
  if (!C) return null;
  const dx = bot.x - muc.x, dy = (bot.y - muc.y) * 2;
  if (Math.hypot(dx, dy) > 90) return null;
  bot.stats.danhThuong++;
  if (muc.loai === "quai") {
    const { rules } = napDuLieuBot();
    const base = ri(C.p.dmg[0], C.p.dmg[1]);
    let v = Math.max(1, Math.floor((base * (100 - Math.min(95, (muc.res && muc.res.phys) || 0))) / 100));
    for (const t of ["cold", "fire", "light"]) {
      const el = (C.p.elem && C.p.elem[t]) || 0;
      if (el > 0) v += Math.max(0, Math.floor((el * (100 - Math.min(95, (muc.res && muc.res[t]) || 0))) / 100));
    }
    v = Math.floor(v * serK(C.p, { series: C.H.series }, {}, muc.series, C.H.series));
    const crit = Math.random() * 100 < (C.p.crit || 0);
    if (crit) v *= 2;
    const out = { id: 0, sat: Math.max(1, v), crit, cold: 0, loai: "phys", kind: "attack", tam: 90, mp: 0 };
    apDungLenMuc(bot, muc, out);
    return out;
  }
  const sat = Math.max(1, ri(C.p.dmg[0], C.p.dmg[1]));
  return { id: 0, sat, loai: "phys", kind: "attack", tam: 90, mp: 0 };
}
function chonChieu(bot, muc) {
  const C = bot.chiSo;
  if (!C) return 0;
  const { vocong } = napDuLieuBot();
  const sanSang = (id) => {
    const lv = C.H.skills[id] | 0;
    if (lv <= 0) return false;
    return bot.mpCur >= skCost(C.db[id], vocong.lvAttrs(C.db[id], lv)) * 1.1;
  };
  // KHÔNG kiểm hồi chiêu ở đây: xoay chiêu 4 chiêu / nhịp 1,5 giây đã giãn mỗi chiêu ≥ 4,5 giây,
  // dài hơn mọi hồi chiêu (tối đa 3 giây) nên hồi chiêu không bao giờ là nút thắt; cd vẫn ghi ở
  // donChieu để quan sát. Chiêu đầu lặp 2 lần trong bảng chỉ để mở màn: chọn rồi thì bỏ qua ô trùng
  // kế tiếp để xoay tiếp (không đánh cùng chiêu 2 vòng liền).
  const xoay = bot.tab.xoay;
  for (let k = 0; k < xoay.length; k++) {
    const id = xoay[(bot.vongChieu + k) % xoay.length];
    if (!sanSang(id)) continue;
    let nx = (bot.vongChieu + k + 1) % xoay.length;
    // Bảng xoay cấp thấp có thể chỉ còn 1 chiêu duy nhất (vd [10,10]) — vòng while cũ
    // tìm chiêu khác sẽ quay vô hạn, treo cả máy chủ. Giới hạn đúng 1 vòng bảng.
    for (let g = 0; g < xoay.length && xoay[nx] === id; g++) nx = (nx + 1) % xoay.length;
    bot.vongChieu = nx;
    return id;
  }
  return 0;
}
function danhBot(bot, muc) {
  const id = chonChieu(bot, muc);
  let kq = null;
  if (id) kq = donChieu(bot, id, muc);
  if (!kq) kq = danhThuong(bot, muc); // donChieu trả null (hết tầm / thiếu nội lực / sai vũ khí) thì đánh thường như cũ; miss/none (sat 0) thì không đánh bù
  if (kq && kq.sat > 0) bot.atkN = (bot.atkN | 0) + 1; // P1: đòn trúng tăng số đòn để client phát lại động tác đánh
  return kq;
}
function thuKetLieu(bot, m) {
  const C = bot.chiSo;
  for (const id of bot.tab.finishers) {
    if ((C.H.skills[id] | 0) <= 0) continue;
    if (bot.cd[id] && bot.cd[id] > Date.now()) continue;
    const kq = donChieu(bot, id, m);
    if (kq) return kq;
  }
  return null;
}

// Chỉ trừ máu (không khóa mục tiêu — bên gọi tự khóa). Trả false nếu bot đã chết / không nhận đòn.
function apDungDon(bot, dmg, nguon) {
  if (!bot.chiSo || bot.mode === "chet" || bot.hpCur <= 0) return false;
  const tru = Math.max(1, Math.round(dmg || 0));
  bot.hpCur = Math.max(0, bot.hpCur - tru);
  bot.stats.nhanDon++;
  if (bot.hpCur <= 0) chetBot(bot, nguon);
  return true;
}
// Đòn trực tiếp lên bot 0 (harness + đường nội bộ): đúng luật từ chối + đánh trả ngay vòng đầu.
// d = { nguon: "nguoi"|"quai", ten, dmg, x, y, id?, lv?, tk? }
function nhanDon(d) {
  const bot = bots[0];
  if (!bot) return { ok: false, lyDo: "bot-tat" };
  return nhanDonBot(bot, d || {});
}
function nhanDonBot(bot, d) {
  if (!bot.chiSo) return { ok: false, lyDo: "bot-tat" };
  if (bot.mode === "chet" || bot.hpCur <= 0) return { ok: false, lyDo: "da-chet" };
  if (bot.mode !== "luyen" || bot.zone === Z_TOWN) return { ok: false, lyDo: "vung-an-toan" };
  const dmg = d.dmg;
  if (!Number.isFinite(dmg) || dmg <= 0) return { ok: false, lyDo: "khong-sat-thuong" };
  apDungDon(bot, dmg, d);
  if (bot.mode === "chet") return { ok: true, chet: true };
  if (d.nguon === "quai") {
    if (!bot.mucTieu) { bot.mucTieu = taoMucQuai(bot, d.id, d.lv, d.ten); bot.danhBatDau = Date.now(); }
    return { ok: true };
  }
  const moi = !bot.mucTieu;
  if (moi) {
    bot.mucTieu = { loai: "nguoi", ten: d.ten, tk: d.tk || d.ten, x: d.x ?? bot.x, y: d.y ?? bot.y,
      hpMax: d.hpMax || 999999, hpCur: d.hpCur ?? d.hpMax ?? 999999 };
    bot.gocX = bot.x; bot.gocY = bot.y; bot.danhBatDau = Date.now(); bot.danhTuChoi = 0;
  } else {
    if (Number.isFinite(d.x)) bot.mucTieu.x = d.x;
    if (Number.isFinite(d.y)) bot.mucTieu.y = d.y;
  }
  if (moi) {
    const kq = danhBot(bot, bot.mucTieu);
    if (kq && kq.sat > 0) {
      bot.lastDanhNguoi = { st: kq.sat, chieu: tenChieu(bot, kq.id), id: kq.id };
      bot.stats.gayNguoi += kq.sat;
    }
  }
  return { ok: true };
}

function layDanhCho(tk) {
  const ds = choDanh.get(tk) || [];
  choDanh.delete(tk);
  return ds;
}

// ---------- móc báo đòn npcHit: kiểm tra chống giả, máy chủ tự tính sát thương ----------
// Báo: [seq, mã chiêu, x, y, t] — x/y là VỊ TRÍ NGƯỜI ĐÁNH (không có đích, không có sát thương).
// Mỗi tài khoản: seq tăng đơn điệu; hồi chiêu riêng từng chiêu (đòn thường 300ms, chiêu 600ms);
// ≥5 lần bị từ chối thì ngó lơ 60 giây. Đích = bot đang train gần nhất cùng bãi.
const MAX_BAO = 40, SAI_TAM = 250, DUNG_SAI_TAM = 250;
const baoTK = new Map(); // tk -> { seq, cd: Map(id -> lúc hết), tuChoi, camDen }
function layRec(tk) {
  let r = baoTK.get(tk);
  if (!r) { r = { seq: 0, cd: new Map(), tuChoi: 0, camDen: 0 }; baoTK.set(tk, r); }
  return r;
}
function ghiTuChoi(tk, rec) {
  rec.tuChoi++;
  if (rec.tuChoi >= 5) rec.camDen = Date.now() + 60000;
}
function gocVaCap(h, id, db) {
  const s = db[id];
  if (!s) return null;
  const lv = (h.skills || {})[id] | 0;
  if (lv <= 0) return null;
  return { goc: id, lv, s };
}
function giaiQuyetDich(hien, bx, by) {
  const zone = hien && hien.zone;
  const px = hien && Number.isFinite(hien.x) ? hien.x : bx;
  const py = hien && Number.isFinite(hien.y) ? hien.y : by;
  let dich = null, dMin = Infinity;
  for (const b of bots) {
    if (b.mode !== "luyen" || b.zone === Z_TOWN || !b.chiSo || b.hpCur <= 0) continue;
    if (zone != null && b.zone !== zone) continue;
    const d = Math.hypot(px - b.x, (py - b.y) * 2);
    if (d < dMin) { dMin = d; dich = b; }
  }
  return dich;
}
function tinhDonThuongNguoi(C, e) {
  const { rules } = napDuLieuBot();
  const r = rules.heroDamage(C.p, e);
  if (r.miss) return { miss: true, v: 0 };
  return { v: Math.max(1, Math.floor(r.v)), crit: r.crit, cold: r.cold || 0 };
}
function xuLyMotBao(tk, h, hien, C, r, now) {
  const tkTen = (tk && tk.ten) || "?";
  const rec = layRec(tkTen);
  const tuChoi = (lyDo) => { ghiTuChoi(tkTen, rec); return { ok: false, lyDo }; };
  if (rec.camDen && now < rec.camDen) return { ok: false, lyDo: "dang-cam" };
  if (!Array.isArray(r) || r.length < 5) return tuChoi("sai-bao");
  const [seq, id, bx, by, t] = r;
  if (![seq, id, bx, by, t].every(Number.isFinite)) return tuChoi("sai-bao");
  if (seq <= rec.seq) return tuChoi("trung-seq");
  rec.seq = Math.max(rec.seq, seq); // seq đã dùng thì không dùng lại, kể cả khi báo này bị từ chối sau đó
  if (now - t > 2000 || t > now + 500) return tuChoi("sai-gio");
  const { vocong } = napDuLieuBot();
  const db = (C && C.db) || napDuLieuBot().db;
  const s = db[id];
  if (id !== 0 && !s) return tuChoi("khong-co-chieu");
  let lv = 1, cost = 0;
  if (id !== 0) {
    const g = gocVaCap(h, id, db);
    if (!g) return tuChoi("chua-hoc");
    lv = g.lv;
    if (!vocong.eqtOk(g.s, C.wk)) return tuChoi("sai-vu-khi");
    if (vocong.kindOf(g.s, db) !== "attack") return tuChoi("khong-gay-sat-thuong");
    cost = skCost(g.s, vocong.lvAttrs(g.s, lv));
    const mpMax = (C.p && C.p.mpMax) || 0;
    const mpPct = hien && Number.isFinite(hien.mp) ? hien.mp : 100;
    if (cost > (mpMax * (mpPct + 25)) / 100) return tuChoi("thieu-noi-luc");
  }
  if (hien && Number.isFinite(hien.x) && Number.isFinite(hien.y)) {
    if (Math.hypot(bx - hien.x, (by - hien.y) * 2) > SAI_TAM) return tuChoi("lech-vi-tri");
  }
  const bot = giaiQuyetDich(hien, bx, by);
  if (!bot) return tuChoi("bot-an-toan");
  const hx = hien && Number.isFinite(hien.x) ? hien.x : bx, hy = hien && Number.isFinite(hien.y) ? hien.y : by;
  const tam = id === 0 ? 90 : skTam(s, vocong.lvAttrs(s, lv)) + DUNG_SAI_TAM;
  if (Math.hypot(hx - bot.x, (hy - bot.y) * 2) > tam) return tuChoi("ngoai-tam");
  const last = rec.cd.get(id) || 0, cdCan = id === 0 ? 300 : 600;
  if (now - last < cdCan) return tuChoi("chua-hoi-chieu");
  rec.cd.set(id, now); // trượt vẫn tốn hồi chiêu
  const e = { def: bot.chiSo.p.def, res: bot.chiSo.p.res, series: bot.chiSo.H.series };
  const kq = id === 0 ? tinhDonThuongNguoi(C, e) : tinhSatThuong(C, id, e, true);
  if (kq.miss) {
    if (!bot.mucTieu && bot.mode !== "chet") khoaVaDanhNgay(bot, h, tkTen, hx, hy);
    return { ok: true, dmg: 0, miss: true };
  }
  if (kq.none || !(kq.v > 0)) return { ok: true, dmg: 0 };
  const moiKhoa = !bot.mucTieu;
  apDungDon(bot, kq.v, { loai: "nguoi", ten: h.name, x: hx, y: hy });
  if (bot.mode !== "chet" && moiKhoa) khoaVaDanhNgay(bot, h, tkTen, hx, hy);
  return { ok: true, dmg: kq.v, ...(bot.mode === "chet" ? { chet: true } : {}) };
}
// Khóa mục tiêu người đánh + đánh trả NGAY 1 vòng, xếp hàng gửi kèm chính nhịp này
// (api.js đọc layDanhCho ngay sau nhanBaoDon) — như đòn trực tiếp nhanDon.
function khoaVaDanhNgay(bot, h, tkTen, hx, hy) {
  bot.mucTieu = { loai: "nguoi", ten: h.name, tk: tkTen, x: hx, y: hy, hpMax: 999999, hpCur: 999999 };
  bot.gocX = bot.x; bot.gocY = bot.y; bot.danhBatDau = Date.now(); bot.danhTuChoi = 0;
  const kq = danhBot(bot, bot.mucTieu);
  xepDanhTra(bot, bot.mucTieu, kq);
}
function xepDanhTra(bot, m, kq) {
  if (!kq || !(kq.sat > 0)) return;
  bot.stats.gayNguoi += kq.sat;
  bot.lastDanhNguoi = { st: kq.sat, chieu: tenChieu(bot, kq.id), id: kq.id };
  const key = m.tk || m.ten;
  const ds = choDanh.get(key) || [];
  ds.push({ st: kq.sat, id: kq.id, loai: kq.loai, ten: bot.h.name, crit: !!kq.crit, cold: kq.cold || 0 });
  choDanh.set(key, ds);
}
function nhanBaoDon(tk, h, o, ds) {
  if (!Array.isArray(ds) || !ds.length) return { ok: false, lyDo: "rong" };
  if (!bots.length) return { ok: false, lyDo: "bot-tat" };
  const tkTen = (tk && tk.ten) || "?";
  const rec = layRec(tkTen);
  if (rec.camDen && Date.now() < rec.camDen) return { ok: false, lyDo: "dang-cam" };
  if (!h || typeof h !== "object") return { ok: false, lyDo: "khong-co-hero" };
  // Hiện diện xét từ bản máy chủ giữ (TG.dangChoi — nhịp TRƯỚC, vì api.js xử lý npcHit trước khi
  // gửi TG.nhip của nhịp này). o chỉ là chỉ số ô nhân vật, KHÔNG phải hiện diện. Không có hiện diện
  // (gọi trực tiếp trong kiểm chứng) thì xét theo tọa độ báo + không kiểm vùng/chết.
  let hien = null;
  try { hien = TG.dangChoi(tkTen) || null; } catch {}
  if (!hien) {
    const tr = o && o.s && o.s.tr && o.s.tr[0];
    if (tr) hien = { name: h.name, zone: o.s.zone, hp: o.s.hp, mp: o.s.mp, x: tr[1], y: tr[2] };
  }
  if (hien && hien.hp != null && hien.hp <= 0) { ghiTuChoi(tkTen, rec); return { ok: false, lyDo: "da-chet" }; }
  const C = tinhChiSoCua(h);
  const now = Date.now();
  const kq = [];
  let firstRej = null;
  for (const b of ds.slice(0, MAX_BAO)) {
    if (!Array.isArray(b)) continue; // báo dạng object giả danh: bỏ qua, không đếm
    const r = xuLyMotBao(tk, h, hien, C, b, now);
    if (r && r.ok) kq.push(r);
    else if (r && !firstRej) firstRej = r;
  }
  if (kq.length) return { ok: true, kq };
  if (firstRej) return firstRej; // cả đợt bị loại (vd bot đang an toàn): trả đúng lý do
  return { ok: true, kq: [] };
}

function apDungLenMuc(bot, m, kq) {
  if (m.loai !== "quai" || !kq || !(kq.sat > 0)) return;
  bot.stats.gay += kq.sat;
  m.hpCur = Math.max(0, m.hpCur - kq.sat);
  if (m.hpCur <= 0) {
    if (m.id != null && m.lv != null) { gietMot(bot, m.id, m.lv); bot.stats.gietThat++; }
    log(`đánh chết ${m.ten} (${bot.h.name})`);
    boMucTieu(bot);
  }
}
function vongDanh(bot) {
  const m = bot.mucTieu;
  if (!m || !bot.chiSo) return;
  bot.act = "attack";
  if (m.loai === "quai") {
    if (m.hpCur <= 0) { boMucTieu(bot); return; }
    // P3: 1 trận tối đa 45 giây — đánh mãi không chết (sát thương thấp) thì coi như hạ xong
    // bằng đòn trừu tượng đúng luật giết quái của con đó, tránh đứng chết cứng 69 giây.
    if (bot.danhBatDau && Date.now() - bot.danhBatDau > 45000) {
      if (m.id != null && m.lv != null) { gietMot(bot, m.id, m.lv); bot.stats.gietThat++; }
      else gietMot(bot);
      log(`hạ ${m.ten} sau 45 giây kẹt trận (${bot.h.name})`);
      boMucTieu(bot);
      return;
    }
    bot.x = Math.max(bot.x - 20, Math.min(bot.x + 20, bot.x + ri(-20, 20)));
    bot.y = Math.max(bot.y - 12, Math.min(bot.y + 12, bot.y + ri(-12, 12)));
    danhBot(bot, m);
    return;
  }
  const dx = bot.x - m.x, dy = (bot.y - m.y) * 2;
  if (Math.hypot(dx, dy) > 448 || Math.hypot(bot.x - bot.gocX, (bot.y - bot.gocY) * 2) > LEASH || Date.now() - bot.danhBatDau > DANH_TOI_DA) {
    boMucTieu(bot); // quá tầm / quá dây / quá 20 giây: thôi ngay, không dây dưa
    return;
  }
  bot.danhTuChoi = 0;
  let kq = null;
  if (m.hpCur != null && m.hpMax && m.hpCur / m.hpMax < 0.4) kq = thuKetLieu(bot, m);
  if (!kq) kq = danhBot(bot, m);
  xepDanhTra(bot, m, kq);
}
function quaiTanCong(bot) {
  const { rules } = napDuLieuBot();
  const T = baiTrain(bot);
  const mob = pick(T.mobs), lv = T.mobLv;
  const m = taoMucQuai(bot, mob, lv);
  const r = rules.mobDamage({ ar: m.ar, dmg: m.dmg }, bot.chiSo.p);
  const sat = r.miss ? 0 : Math.max(1, Math.round(r.v));
  if (sat > 0) apDungDon(bot, sat, { loai: "quai", ten: m.ten, x: m.x, y: m.y });
  if (bot.mode !== "chet" && !bot.mucTieu && bot.mode === "luyen") {
    bot.mucTieu = m; bot.danhBatDau = Date.now();
    log(`quái đánh trước ${bot.h.name} — đánh trả`);
  }
}
function chetBot(bot, nguon) {
  if (bot.mode === "chet") return;
  bot.mode = "chet"; bot.chetLuc = Date.now(); bot.act = "die"; bot.hpCur = 0;
  bot.potHp = bot.potMp = null;
  boMucTieu(bot);
  ghiDoLuong(bot, "chet", {});
  if (bot.h.sap && bot.h.sap.mo) dongSap(bot);
  try { DO.chet(bot.h); } catch (e) { log(`chết lỗi (${bot.h.name}):`, e.message); }
  log(`chết (${bot.h.name}) — hồi sinh ở thành sau 3 giây`);
}

// ---------- chat ----------
// Tin từ TG.nhip có dạng { id, ch, name, text } — ch là kênh (CH_WORLD/PRIVATE/...),
// text là nội dung. Trả lời qua TG.chat(tk, { o, ch, t, toi? }) — đúng 2 đối số.
// ĐX-2 (Huy duyệt 00:42 27/11/2026): tọa độ client (X/Y) từ vị trí thật của bot — đúng công thức
// main.js setHudMap (toClient): X = floor((reg[0]*512 + x/s)/256), Y = floor((reg[1]*1024 + 2y/s)/512),
// với reg = client.region của bản đồ chứa bãi, s = scale bản đồ (0,75); dữ liệu lấy đúng chỗ
// npc-gan.js vẫn dùng (N.ZONES / N.FULL / N.MAPS). Không có region thì trả null (không bịa tọa độ).
function toaDoClient(bot) {
  try {
    const Z = N.ZONES.get(bot.zone | 0);
    const M = (Z && ((N.FULL && N.FULL.maps && N.FULL.maps[Z.map]) || (N.MAPS && N.MAPS.maps && N.MAPS.maps[Z.map]))) || null;
    const c = M && M.client;
    if (!c || !Array.isArray(c.region)) return null;
    const s = +(N.MAPS && N.MAPS.scale) || 0.75;
    const X = Math.floor((c.region[0] * 512 + bot.x / s) / 256);
    const Y = Math.floor((c.region[1] * 1024 + (2 * bot.y) / s) / 512);
    if (!Number.isFinite(X) || !Number.isFinite(Y)) return null;
    return `${X}/${Y}`;
  } catch { return null; }
}
function duoiToaDo(bot) { // đuôi tọa độ gắn vào mọi câu trả lời; không có region thì không gắn (không bịa)
  const td = toaDoClient(bot);
  return td ? ` Ta đang ở ${DO.tenBai(bot.zone) || "bãi quái"} (${td}).` : "";
}
function traLoi(bot, msg) {
  // Chỉ trả lời tin chat thật của người chơi. Tin hệ thống (CH_SYSTEM) và các kênh khác không
  // phải lời hỏi — trả lời chúng vừa lỗi kênh, vừa đốt cửa tiết lưu kênh chung (26/11/2026).
  if (msg.ch !== "CH_WORLD" && msg.ch !== "CH_NEARBY" && msg.ch !== "CH_CITY" && msg.ch !== "CH_TEAM" && msg.ch !== "PRIVATE") return;
  const n = msg.name || "", txt = String(msg.text || "");
  if (n === bot.h.name || !txt.trim()) return;
  if (bot.traLoiDen && Date.now() < bot.traLoiDen) return; // 10 giây mới trả lời cùng người 1 lần
  const rieng = msg.ch === "PRIVATE";
  const t = boDau(txt);
  let noi = null, coToaDo = false; // ĐX-2: nhánh "ở đâu" tự gắn tọa độ đầy đủ, các nhánh khác gắn đuôi sau
  if (/\b(gia|bao nhieu|bao nhiêu)\b/.test(t)) {
    if (bot.h.sap && bot.h.sap.mo) {
      const ds = (bot.h.sap.ds || []).slice(0, 2).map((it) => `${DO.tenMon(it) || "?"} ${giaCua(it)} lượng`).join(", ");
      noi = ds ? `Sạp ta ở Biện Kinh đang bán: ${ds}. Muốn mua thì tới mà xem.` : "Sạp ta trống trơn. Đừng hỏi nữa.";
    } else noi = "Chưa mở sạp. Ta đang train. Lát về thành mới bày — chờ đấy.";
  } else if (/(o dau|o đâu|dang o dau|dang o đâu|o cho nao)/.test(t)) {
    const td = toaDoClient(bot); // ĐX-2: câu tọa độ đầy đủ, tính từ vị trí thật lúc trả lời
    if (td) { noi = `Ta đang ở ${DO.tenBai(bot.zone) || "bãi quái"} (${td}). Muốn gặp thì tự tới, đừng hỏi nhiều.`; coToaDo = true; }
    else noi = `Ta đang train ở ${DO.tenBai(bot.zone) || "bãi quái"}. Muốn gặp thì tự tới, đừng hỏi nhiều.`;
  } else if (/(giup|giúp|huong dan|hướng dẫn|lam gi|làm gì)/.test(t)) {
    noi = "Muốn mua đồ thì ghé sạp ta ở Biện Kinh. Hỏi giá thì gõ 'giá'. Ta chỉ nói một lần.";
  } else if (/(xin chao|xin chào|hello|chao|chào)/.test(t)) {
    noi = "Ờ. Cần gì thì nói mau.";
  } else if (/(ban co|bạn có|may co|mày có|npc|bot|nguoi may|người máy|ai quan ly|ai quản lý)/.test(t)) {
    noi = "Ta là nhân vật máy do máy chủ chạy. Train quái, bán đồ, đánh trả như người chơi. Có việc thì nói, không thì tránh ra.";
  } else {
    // AI cũng tôn trọng cửa tiết lưu kênh chung: bot khác vừa trả lời (từ khóa hay AI)
    // thì thôi, khỏi 1 câu hỏi 2 trả lời — kiểm tra TRƯỚC khi gọi hoi() vì nhánh AI
    // return sớm, không đi qua đoạn kiểm cửa chung phía dưới. Tin mật không siết.
    if (!rieng && Date.now() - traLoiChungAll < CHAT_CHUNG_MS) return;
    // AI quản lý (Huy chốt 00:11 27/11/2026, đoạn mã KET-QUA.md §4): câu không khớp từ khóa
    // nào → gửi AI chung; hoi() trả true thì module tự gửi (kèm tọa độ chụp lúc hỏi), traLoi
    // return ngay, không gửi thêm. Trả false (tắt/hàng đầy/cửa đóng)
    // thì rơi xuống câu mẫu như cũ. facKey lấy từ cfg/h (bot không có facKey trực tiếp).
    const guiAI = (t) => { try { TG.chat(bot.fakeTk, { o: 0, ch: msg.ch || "CH_WORLD", t, ...(rieng ? { toi: n } : {}) }); } catch (e) { log(`trả lời AI lỗi (${bot.h.name}):`, e.message); } };
    const nhan = AIQL.hoi({
      // toaDoClient: tọa độ DẠNG CLIENT như ĐX-2, tính từ vị trí thật lúc hỏi (thống nhất
      // 27/11/2026 — câu AI không còn kèm tọa độ thô "(x, y)" nữa); null thì ai-quan-ly.js tự rơi về dạng thô.
      bot: { ten: bot.h.name, facKey: bot.cfg.facKey || bot.h.facKey, zone: bot.zone, zoneTen: DO.tenBai(bot.zone), x: bot.x, y: bot.y, toaDoClient: toaDoClient(bot) },
      cauHoi: txt, rieng,
      gui: guiAI,
      duPhong: () => "Hỏi giá thì gõ 'giá', hỏi chỗ thì gõ 'ở đâu'. Đừng nói nhảm.",
    });
    if (nhan) {
      // Giữ cửa tiết lưu kênh chung: AI nhận câu này thì chiếm luôn 1 lượt chung
      // (không thì bot khác thấy cùng tin sẽ gửi thêm câu mẫu — 1 câu hỏi 2 trả lời).
      // Tin mật không đụng cửa chung, đúng luật cũ.
      if (!rieng) traLoiChungAll = Date.now();
      return;
    }
    noi = "Hỏi giá thì gõ 'giá', hỏi chỗ thì gõ 'ở đâu'. Đừng nói nhảm.";
  }
  if (!coToaDo) { // ĐX-2: các nhánh khác thêm đuôi tọa độ ngắn; dài quá trần 100 thì rút câu chính, giữ tọa độ
    const duoi = duoiToaDo(bot);
    if (duoi) {
      noi += duoi;
      if (noi.length > 100) { // rút câu chính ở ranh giới từ, giữ nguyên đuôi tọa độ
        const gioiHan = noi.slice(0, 100 - duoi.length);
        const cat = gioiHan.lastIndexOf(" ");
        noi = (cat > 20 ? gioiHan.slice(0, cat) : gioiHan) + duoi;
      }
    }
  }
  if (noi.length > 100) noi = noi.slice(0, 100);
  if (!rieng) {
    if (Date.now() - traLoiChungAll < CHAT_CHUNG_MS) return; // kênh chung: cả 170 bot gộp lại 1 tin / CHAT_CHUNG_MS (tin mật không siết thêm)
    traLoiChungAll = Date.now();
  }
  bot.traLoiDen = Date.now() + 10000;
  try {
    TG.chat(bot.fakeTk, { o: 0, ch: msg.ch || "CH_WORLD", t: noi, ...(rieng ? { toi: n } : {}) });
  } catch (e) { log(`trả lời chat lỗi (${bot.h.name}):`, e.message); }
}
function docTin(bot, ds) {
  if (!Array.isArray(ds)) return;
  // TG.nhip đã lọc: chỉ tin bot này được thấy (tin mật chỉ đúng người nhận).
  for (const m of ds) {
    if (!m || typeof m !== "object") continue;
    traLoi(bot, m);
  }
}

// ---------- hoạt động (lệnh Huy 12:29 26/11: bot tham gia mọi hoạt động; Tống Kim chia 2 phe) ----------
// Nguyên tắc: chỉ gọi đúng hàm module sẵn có, đúng luật (hạn mức, phí, cấp, số lần/ngày) —
// không bịa luật riêng. Bot không có trình duyệt nên 3 module có móc hiện diện BOT (quai-chung,
// phong-hoa, tong-kim). Hết hoạt động thì về train/sạp như cũ. Mọi lỗi đều bắt, không kẹt.
const ngayVN = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
function dichChuyen(bot, zone, x, y) {
  bot.zone = zone; bot.x = x; bot.y = y; bot.mucTieu = null;
  try { DO.baiNay(bot.key, zone); } catch {}
  hienDien(bot);
}
function napLai(bot) { // module khác ghi thẳng tệp tài khoản (thưởng Tống Kim / phí Vượt Ải): nạp lại, khỏi bị luu() ghi đè mất
  try {
    const tk = D.docTk(bot.cfg.acct), h = tk && Array.isArray(tk.nv) ? tk.nv[0] : null;
    if (h && h.name === bot.h.name) { bot.h = h; bot.fakeTk.nv[0] = h; bot.tk = tk; tinhChiSo(bot); return true; }
  } catch (e) { log(`nạp lại lỗi (${bot.h.name}):`, e.message); }
  return false;
}
function buocToi(bot, x, y, buoc = 160) {
  const dx = x - bot.x, dy = (y - bot.y) * 2, d = Math.hypot(dx, dy);
  if (d <= buoc) { bot.x = x; bot.y = y; return true; }
  bot.x += (dx / d) * buoc; bot.y += ((dy / d) * buoc) / 2; return false;
}
function donHoatDong(bot) { // 1 đòn đánh hoạt động: chiêu xoay + sát thương đúng công thức client (tinhSatThuong)
  const id = chonChieu(bot, null), C = bot.chiSo;
  if (!id || !C) return 0;
  const lv = C.H.skills[id] | 0; if (lv <= 0) return 0;
  try {
    const { vocong } = napDuLieuBot();
    const cost = skCost(C.db[id], vocong.lvAttrs(C.db[id], lv));
    if (bot.mpCur < cost) return 0;
    const kq = tinhSatThuong(C, id, null, false);
    if (kq.miss || kq.none || !(kq.v > 0)) return 0;
    bot.mpCur = Math.max(0, bot.mpCur - cost);
    bot.atkN = (bot.atkN | 0) + 1;
    return kq.v;
  } catch { return 0; }
}
function mobCuaBai(zone) {
  try {
    const Z = DO.NOI && DO.NOI.ZONES && DO.NOI.ZONES.get(+zone);
    if (!Z || !Array.isArray(Z.m) || !Z.m.length) return null;
    return { mob: Z.m[Math.floor(Math.random() * Z.m.length)], lv: Z.hi || Z.lo || 1 };
  } catch { return null; }
}
function gietTaiBai(bot, zone, mob, lv, r3 = 0, he = 0) { // giết 1 con ở bãi bất kỳ qua đúng DO.gietQuai + nhặt đồ
  let kq;
  try { kq = DO.gietQuai(bot.h, [[zone, mob, lv, r3, he, Math.round(bot.x), Math.round(bot.y)]], { ten: bot.cfg.acct, admin: false, key: bot.key }); }
  catch (e) { return 0; }
  if (!kq || !kq.n) return 0;
  bot.kills++; bot.stats.giet++; bot.stats.kn += kq.kn || 0;
  const gs = [...(kq.roi || []).map((r) => r[2]), ...(kq.nhan || []).map((m) => m && m.g)].filter((g) => Number.isFinite(+g));
  if (gs.length) { try { DO.nhat(bot.h, bot.key, gs); } catch {} }
  ghiLuyenGiet(bot);
  return kq.n;
}
function ghiLuyenGiet(bot) { // luyện chiêu kết liễu: ~6 đòn trúng / con (trừu tượng như gietMot) — flush ở thành
  const fin = (bot.tab.finishers || []).find((id) => (bot.h.skills[id] | 0) > 0);
  if (fin) bot.luyenDem[fin] = (bot.luyenDem[fin] | 0) + 6;
}
function ketThucHd(bot, lyDo) { // dọn móc hiện diện, về bãi train, ghi log
  const hd = bot.hd; bot.hd = null;
  // Bỏ chuyến thuyền giữa chừng (hết giờ/nhường): xóa trạng thái thuyền kẻo kẹt ở bờ Bắc chuyến sau.
  if (hd && hd.loai === "pld" && bot.h && bot.h.pld) { try { delete bot.h.pld; } catch {} }
  // Hết giờ (45 phút) mà chưa xong việc ngày: nghỉ hoạt động đó 5 phút để hoạt động cày khác tới lượt, khỏi vào lại ngay rồi kẹt cả ngày.
  if (hd && lyDo === "quá giờ" && (hd.loai === "sat" || hd.loai === "dt" || hd.loai === "mc")) bot.hdNghi[hd.loai] = Date.now() + 5 * 60 * 1000;
  try {
    if (hd) {
      if (hd.loai === "tk") TK().botRa(bot.cfg.acct);
      if (hd.loai === "ph") PH().botRa(bot.cfg.acct);
      if (hd.loai === "sat" || hd.loai === "dt") QCH().botRa(bot.cfg.acct);
      if (hd.loai === "va" && hd.doi) { try { TD().raDoi(bot.cfg.acct, ""); } catch {} }
    }
  } catch {}
  if (hd && hd.loai === "tk") { try { napLai(bot); } catch {} }
  bot.mode = "luyen"; capNhatBai(bot); veBaiTrain(bot); bot.act = "run";
  hienDien(bot); luu(bot);
  log(`hết hoạt động ${hd ? hd.loai : "?"} (${bot.h.name}): ${lyDo}`);
}
function batDauHd(bot, loai, them = {}) { // vào mode hoạt động (đóng sạp trước nếu đang bày)
  if (bot.h.sap && bot.h.sap.mo) { try { dongSap(bot); } catch {} }
  bot.hd = { loai, batDau: Date.now(), ...them };
  bot.mode = "hd"; bot.mucTieu = null; bot.act = "stand";
  log(`vào hoạt động ${loai} (${bot.h.name})`);
}

// ----- Tống Kim: phe ổn định = chỉ số bot % 2 (0 Tống / 1 Kim); đăng ký phe ít người hơn nếu phe ưu tiên đầy -----
function hdTkVao(bot) {
  const L = TK().lich();
  if (!L || (L.pha !== "bd" && L.pha !== "danh") || Date.now() >= (L.het || 0)) return false;
  const key = `${L.gio || ""}|${L.kc || 0}`;
  if (bot.hdNgay.tk === key) return false;
  // Chưa đủ cấp/phí thì đừng dịch chuyển về thành rồi báo danh hụt mỗi nhịp (bot lv thấp kẹt ở thành).
  if ((bot.h.lvl | 0) < (TK().CF.cap || 100) || (bot.h.gold | 0) < (TK().CF.phi || 3000)) return false;
  const pheUu = bot.idx % 2;
  dichChuyen(bot, 37, bot.cfg.stalls[0][0], bot.cfg.stalls[0][1]); // phải ở Biện Kinh / Điểm báo danh mới báo danh được
  tinhChiSo(bot);
  let dk = null;
  for (const x of [pheUu, 1 - pheUu]) {
    try {
      const r = TK().lam(bot.h, { viec: "phe", x, o: 0 }, bot.cfg.acct);
      const D = TK()._thu.D;
      dk = D && D.dk.get(bot.cfg.acct + "|0");
      if (dk) { bot.hdDi = r && r.vao; break; }
    } catch (e) { log(`Tống Kim báo danh lỗi (${bot.h.name}):`, e.message); }
  }
  if (!dk) return false;
  const D = TK()._thu.D;
  const vao = bot.hdDi;
  const trai = D.trai[dk.phe];
  dichChuyen(bot, vao ? vao.zone : D.bai, vao && vao.at ? vao.at[0] : trai[0], vao && vao.at ? vao.at[1] : trai[1]);
  const m = TK().botVao(bot.cfg.acct, bot.h, 0, bot.hpMax);
  if (!m) return false;
  bot.hdNgay.tk = key;
  batDauHd(bot, "tk", { phe: dk.phe });
  return true;
}
function hdTkTick(bot) {
  const D = TK()._thu.D;
  if (!D || D.ket) return ketThucHd(bot, "trận xong");
  const m = TK().botNguoi(bot.cfg.acct);
  if (!m) return ketThucHd(bot, "không còn trong phòng");
  if ((m.hp | 0) <= 0) { // chờ hồi sinh ở hậu doanh
    if (Date.now() >= (m.hoiLuc || 0)) { TK().botHoiSinh(bot.cfg.acct); const tr = D.trai[m.phe]; dichChuyen(bot, D.bai, tr[0], tr[1]); }
    bot.act = "stand"; return;
  }
  const phe = m.phe; // dmg tính lười (donHoatDong trừ nội lực): chỉ tính khi sắp ra đòn thật, khỏi đốt nội lực ở nhịp áp sát
  // mục tiêu: Nguyên Soái địch > người địch gần nhất > bot/quân địch
  let muc = null, loai = "";
  for (const e of D.binh.values()) {
    if (e.phe === phe || e.bac !== 5 || !(e.mau > 0)) continue;
    muc = { id: e.id, x: e.x, y: e.y, binh: true }; loai = "soai"; break;
  }
  if (!muc) {
    let gan = 1e12;
    for (const x of D.nguoi.values()) {
      if (x.phe === phe || x.tk === bot.cfg.acct) continue;
      if (!x.bot) continue; // người thật: máu do trình duyệt họ tự trừ, bot không có đường gửi đòn tới — chỉ đánh được bot/người-máy khác
      const mm = TK().botNguoi(x.tk); if (!mm || !(mm.hp > 0)) continue;
      const p = TG.dangChoi(x.tk);
      if (!p || p.zone !== D.bai) continue;
      const d = Math.hypot(p.x - bot.x, (p.y - bot.y) * 2);
      if (d < gan) { gan = d; muc = { tk: x.tk, x: p.x, y: p.y, nguoi: true }; }
    }
    if (muc) {
      loai = "nguoi";
      if (gan > 400) {
        // SỬA 26/11/2026 (bot Tống Kim không đánh nhau): trước đây người địch xa hơn 400 thì
        // bỏ mục tiêu, rẽ sang đánh mù quân — quân hồi vô hạn nên bot mài quân cả trận, gần như
        // không chạm mặt nhau. Nay: còn người địch sống thì áp sát đúng người đó, không rẽ sang quân.
        buocToi(bot, muc.x, muc.y, 200); bot.act = "run";
        return;
      }
    }
  }
  if (!muc) {
    let gan = 1e12;
    const vt = D.vt;
    for (const b of [...D.bot.values(), ...D.binh.values()]) {
      if (b.phe === phe || b.chet || !(b.mau > 0)) continue;
      const v = vt.get(b.id), bx = v ? v[0] : null, by = v ? v[1] : null;
      const d = bx == null ? 1e9 : Math.hypot(bx - bot.x, (by - bot.y) * 2);
      if (d < gan) { gan = d; muc = { id: b.id, x: bx, y: by, binh: !!b.bac }; }
    }
    if (muc && muc.x == null) { // không có vị trí từ chủ trận: tiến về doanh địch, đánh mù trong giới hạn phe/hạn mức
      const tr = D.trai[1 - phe];
      buocToi(bot, tr[0], tr[1], 200); bot.act = "run";
      const dmg = donHoatDong(bot);
      if (dmg > 0) TK().botDanh(bot.cfg.acct, [[muc.id, dmg]]);
      return;
    }
    if (muc) loai = "bot";
  }
  if (!muc) { const tr = D.trai[1 - phe]; buocToi(bot, tr[0], tr[1], 200); bot.act = "run"; return; }
  const toi = buocToi(bot, muc.x, muc.y, 200);
  bot.act = toi ? "attack" : "run";
  const dmg = donHoatDong(bot);
  if (dmg <= 0) return;
  if (loai === "nguoi") TK().botBiDanh(muc.tk, bot.cfg.acct, dmg);
  else TK().botDanh(bot.cfg.acct, [[muc.id, dmg]]);
}

// ----- Phong Hỏa Liên Thành: 40 bot, đánh quân Tống (phe falsy) -----
function hdPhVao(bot) {
  const L = PH().lich();
  if (!L || !L.mo || Date.now() >= (L.kc || 0)) return false;
  if (bot.hdNgay.ph === String(L.u)) return false;
  if ((bot.h.lvl | 0) < (PH().CF.cap || 90) || (bot.h.gold | 0) < (PH().CF.phi || 1000000)) return false;
  dichChuyen(bot, 37, bot.cfg.stalls[0][0], bot.cfg.stalls[0][1]);
  let r;
  try { r = PH().lam(bot.h, { viec: "vao" }, bot.cfg.acct); } catch (e) { log(`Phong Hỏa báo danh lỗi (${bot.h.name}):`, e.message); return false; }
  if (!r || !r.vao) return false;
  dichChuyen(bot, r.vao.zone, r.vao.at ? r.vao.at[0] : 0, r.vao.at ? r.vao.at[1] : 0);
  PH().botVao(bot.cfg.acct);
  bot.hdNgay.ph = String(L.u);
  batDauHd(bot, "ph", { dem: 0 });
  return true;
}
function hdPhTick(bot) {
  const D = PH()._thu.D;
  if (!D || D.ket) { try { PH().nhanThuong(bot.h, bot.cfg.acct, bot.key, false); } catch {} return ketThucHd(bot, "trận xong"); }
  bot.hd.dem = (bot.hd.dem | 0) + 1;
  if (bot.hd.dem % 10 === 0) { try { PH().nhanThuong(bot.h, bot.cfg.acct, bot.key, false); } catch {} }
  let gan = 1e12, muc = null;
  for (const e of D.q.values()) {
    if (e.phe || e.mau <= 0) continue;
    const d = Math.hypot(e.x - bot.x, (e.y - bot.y) * 2);
    if (d < gan) { gan = d; muc = e; }
  }
  if (!muc) { bot.act = "stand"; return; }
  const toi = buocToi(bot, muc.x, muc.y, 200);
  bot.act = toi ? "attack" : "run";
  const dmg = donHoatDong(bot);
  if (dmg > 0) { try { PH().danh(bot.cfg.acct, PH().BAI, { s: ++bot.hdSeq, d: [[muc.uid, dmg]] }); } catch {} }
}

// ----- Boss Hoàng Kim: 20 bot -----
function hdBtgVao(bot) {
  if (!BTG().dangCo()) return false;
  const tt = BTG().trangThai(bot.cfg.acct);
  if (!tt || tt.ket) return false;
  if (bot.hdNgay.btg === String(tt.u)) return false;
  bot.hdNgay.btg = String(tt.u);
  dichChuyen(bot, tt.bai, tt.x, tt.y);
  batDauHd(bot, "btg", { u: tt.u, dem: 0 });
  return true;
}
function hdBtgTick(bot) {
  const tt = BTG().trangThai(bot.cfg.acct);
  if (!tt || tt.ket || !BTG().dangCo()) { try { BTG().nhanThuong(bot.h, bot.cfg.acct); } catch {} return ketThucHd(bot, "boss xong"); }
  bot.hd.dem = (bot.hd.dem | 0) + 1;
  if (bot.hd.dem % 20 === 0) { try { BTG().nhanThuong(bot.h, bot.cfg.acct); } catch {} }
  if (bot.zone !== tt.bai) dichChuyen(bot, tt.bai, tt.x, tt.y);
  const toi = buocToi(bot, tt.x, tt.y, 200);
  bot.act = toi ? "attack" : "run";
  const dmg = donHoatDong(bot);
  if (dmg > 0) { try { BTG().danh(bot.cfg.acct, tt.u, dmg); } catch {} }
}

// ----- Nhường sân boss (Huy duyệt 01:24 27/11/2026, cách 2): có người thật còn sống trong tầm quanh
// Nhím/Sát thủ thì bot không đánh con đó; người rời/chết thì đánh lại. Chặn theo KHOẢNG CÁCH + còn sống
// (hp > 0, đúng luật cổng của san-nhim.js), KHÔNG chặn theo "có người trong bãi" (tránh AFK đóng băng bot).
// Hiện diện lấy 1 lần/giây qua TG.dsDangChoi (có sẵn), gom theo bãi, cả bầy dùng chung — không quét mỗi tick.
const NHUONG_TAM = Math.max(1, +process.env.VL_NPC_CHOI_NHUONG_TAM || 1200); // cùng CF.gan của Săn Nhím
const NHUONG_CACHE_MS = 1000;
const BOT_ACCT = new Set((CFG.bots || []).map((b) => b.acct)); // tài khoản bot — loại khỏi "người thật"
let nhuongCache = { at: 0, theoBai: new Map() }; // zone -> [[x, y], ...] (chỉ người thật còn sống)
function nguoiThatGan(bai, x, y) {
  const t = Date.now();
  if (t - nhuongCache.at > NHUONG_CACHE_MS) {
    const theoBai = new Map();
    try {
      for (const p of TG.dsDangChoi()) {
        if (BOT_ACCT.has(p.tk) || !(p.hp > 0)) continue;
        const L = theoBai.get(p.zone) || [];
        L.push([p.x, p.y]);
        theoBai.set(p.zone, L);
      }
    } catch {}
    nhuongCache = { at: t, theoBai };
  }
  const L = nhuongCache.theoBai.get(+bai);
  if (!L) return false;
  for (const [px, py] of L) if (Math.hypot(px - x, py - y) <= NHUONG_TAM) return true;
  return false;
}

// ----- Săn Nhím: 30 bot, tối đa 10 con/ngày -----
function hdSnVao(bot) {
  if (!SN().dangCo()) return false;
  if ((SN().demNgay(bot.h.name) | 0) >= 10) return false;
  const tt = SN().trangThai(bot.cfg.acct);
  if (!tt || !tt.ds || !tt.ds.some((n) => !n[8] && n[5] > 0)) return false;
  batDauHd(bot, "sn", {});
  return true;
}
function hdSnTick(bot) {
  const tt = SN().trangThai(bot.cfg.acct);
  if (!tt || !tt.ds || !tt.ds.some((n) => !n[8] && n[5] > 0)) { try { SN().nhanThuong(bot.h); } catch {} return ketThucHd(bot, "hết đợt"); }
  if ((SN().demNgay(bot.h.name) | 0) >= 10) { try { SN().nhanThuong(bot.h); } catch {} return ketThucHd(bot, "đủ 10 con"); }
  let gan = 1e12, muc = null;
  for (const n of tt.ds) {
    if (n[8] || n[5] <= 0) continue;
    if (nguoiThatGan(n[1], n[2], n[3])) continue; // nhường sân: có người thật gần con này thì không tranh
    const d = (n[1] === bot.zone ? Math.hypot(n[2] - bot.x, (n[3] - bot.y) * 2) : 1e6 + Math.abs(n[1] - bot.zone));
    if (d < gan) { gan = d; muc = n; }
  }
  if (!muc) { bot.act = "stand"; bot.stats.nhuong = (bot.stats.nhuong | 0) + 1; return; } // mọi con đều có người gần: đứng chờ, không rời hoạt động
  if (bot.zone !== muc[1]) dichChuyen(bot, muc[1], muc[2], muc[3]);
  const toi = buocToi(bot, muc[2], muc[3], 200);
  bot.act = toi ? "attack" : "run";
  const dmg = donHoatDong(bot);
  if (dmg > 0) { try { SN().danh(bot.cfg.acct, muc[0], dmg); } catch {} }
}

// ----- Rương Thần Bí: 10 bot -----
function hdRtbVao(bot) {
  if ((bot.h.lvl | 0) < (RTB().CF.capMo || 120)) return false;
  const ds = RTB().dong();
  if (!ds.length) return false;
  const r = ds[0];
  dichChuyen(bot, r[1], r[2], r[3]);
  batDauHd(bot, "rtb", { id: r[0], bai: r[1], x: r[2], y: r[3] });
  return true;
}
function hdRtbTick(bot) {
  const ds = RTB().dong(), r = ds.find((x) => x[0] === bot.hd.id);
  if (!r) return ketThucHd(bot, "rương đã mất");
  if (bot.zone !== r[1]) dichChuyen(bot, r[1], r[2], r[3]);
  const toi = buocToi(bot, r[2], r[3], 200);
  bot.act = toi ? "attack" : "run";
  if (!toi) return;
  try { RTB().mo(bot.cfg.acct, bot.h, r[0]); bot.stats.ruong = (bot.stats.ruong | 0) + 1; }
  catch (e) { log(`mở rương lỗi (${bot.h.name}):`, e.message); }
  return ketThucHd(bot, "đã mở rương");
}

// ----- Phong Lăng Độ: 20 bot/chuyến, vé Kỳ Trân Các 5 Xu -----
function hdPldVao(bot) {
  let L;
  try { L = PLD().lich(); } catch { return false; }
  if (!L || L.nghi) return false;
  const t = L.t | 0, baoDanh = (PLD().CF && PLD().CF.baoDanh) || 10;
  if (t < 0 || t >= baoDanh) return false; // chỉ lên thuyền trong 10 phút báo danh đầu giờ chẵn
  const key = `${L.chuyen}|${bot.idx % 3}`;
  if (bot.hdNgay.pld === key) return false;
  const CF = PLD().CF, veKey = CF.lenhBai;
  dichChuyen(bot, 37, bot.cfg.stalls[0][0], bot.cfg.stalls[0][1]); // mua vé ở thành
  let ve = bot.h.bag.find((o) => o.k === veKey && (o.n || 1) <= 1);
  if (!ve) {
    try { DO.lam(bot.h, { act: "muaKtc", k: veKey, n: 1 }, bot.key, bot.fakeTk); } catch (e) { log(`mua vé PLĐ lỗi (${bot.h.name}):`, e.message); return false; }
    ve = bot.h.bag.find((o) => o.k === veKey && (o.n || 1) <= 1);
    if (!ve) return false;
  }
  const ben = (bot.idx % 3) + 1, NAM = PLD().NAM;
  dichChuyen(bot, NAM, bot.x, bot.y);
  let r;
  try { r = PLD().lam(bot.h, { viec: "lenhBai", ben, u: [ve.u] }, bot.cfg.acct, 0); } catch (e) { log(`lên thuyền lỗi (${bot.h.name}):`, e.message); return false; }
  if (!r || !r.di) return false;
  bot.hdNgay.pld = key;
  dichChuyen(bot, r.di.z, r.di.at ? r.di.at[0] : bot.x, r.di.at ? r.di.at[1] : bot.y);
  batDauHd(bot, "pld", { ben, gd: "thuyen" });
  return true;
}
function hdPldTick(bot) {
  const P = bot.h.pld;
  // Sau cập bờ, h.pld = {bac:1} không còn `chuyen` — vẫn ở pha bờ Bắc, phải đi veNam, không được thoát.
  if (!P || (!P.chuyen && !P.bac)) return ketThucHd(bot, "không còn trên thuyền");
  let L;
  try { L = PLD().lam(bot.h, { viec: "lich" }, bot.cfg.acct, 0); } catch { return ketThucHd(bot, "không đọc được lịch thuyền"); }
  const t = L && L.lich ? L.lich.t : 99, capBo = (PLD().CF && PLD().CF.capBo) || 39;
  if (bot.hd.gd === "thuyen") {
    if (t >= capBo) {
      let r;
      try { r = PLD().lam(bot.h, { viec: "cap" }, bot.cfg.acct, 0); } catch { return ketThucHd(bot, "cập bờ lỗi"); }
      if (r && r.di) dichChuyen(bot, r.di.z, r.di.at ? r.di.at[0] : bot.x, r.di.at ? r.di.at[1] : bot.y);
      bot.hd.gd = "bac"; bot.hd.bacDen = Date.now() + 3000;
      return;
    }
    const mz = mobCuaBai(bot.zone);
    if (mz) gietTaiBai(bot, bot.zone, mz.mob, mz.lv, 0, 0);
    bot.act = "attack";
    return;
  }
  if (Date.now() < (bot.hd.bacDen || 0)) { bot.act = "stand"; return; }
  try { const r = PLD().lam(bot.h, { viec: "veNam", ben: bot.hd.ben }, bot.cfg.acct, 0); if (r && r.di) dichChuyen(bot, r.di.z, r.di.at ? r.di.at[0] : bot.x, r.di.at ? r.di.at[1] : bot.y); } catch {}
  return ketThucHd(bot, "đi thuyền xong");
}

// ----- Boss Sát thủ: toàn bộ bot, tối đa 8 boss/ngày, gộp giản sau khi xong -----
function hdSatVao(bot) {
  if (bot.hdNgay.sat === ngayVN()) return false;
  if (Date.now() < (bot.hdNghi.sat || 0)) return false;
  try { TLAM().lam(bot.h, { viec: "mo", loai: "st" }, bot.cfg.acct); }
  catch (e) { log(`mở khóa Sát thủ lỗi (${bot.h.name}):`, e.message); bot.hdNghi.sat = Date.now() + 10 * 60 * 1000; return false; }
  batDauHd(bot, "sat", { dem: 0, dem0: (bot.h.satThu && bot.h.satThu.dem) | 0 });
  return true;
}
function hdSatTick(bot) {
  bot.hd.dem = (bot.hd.dem | 0) + 1;
  if (bot.hd.dem > 900) { hdSatGop(bot); return ketThucHd(bot, "quá giờ"); }
  const demHien = (bot.h.satThu && bot.h.satThu.dem) | 0;
  if (bot.hd.dem0 != null && demHien > bot.hd.dem0) { bot.hdNghi.sat = Date.now() + SAT_NGHI_MS; return ketThucHd(bot, "xong 1 boss — về train"); }
  let r;
  try { r = SAT().buocTu(bot.h); } catch (e) { log(`Sát thủ lỗi (${bot.h.name}):`, e.message); return ketThucHd(bot, "lỗi buocTu"); }
  if (!r) return ketThucHd(bot, "không có bước");
  if (r.tiep === "het" || r.tiep === "dung") { hdSatGop(bot); bot.hdNgay.sat = ngayVN(); return ketThucHd(bot, r.tiep === "het" ? "đủ 8 boss" : `dừng: ${r.ly || ""}`); }
  if (r.tiep !== "danh" || !r.boss) return;
  const B = r.boss, S = SAT().ST.boss[B.id] || {};
  const bai = B.bai;
  if (bot.zone !== bai) { dichChuyen(bot, bai, B.x, B.y); if (QCH().bat(bai)) QCH().botVao(bot.cfg.acct, bai); return; }
  if (QCH().bat(bai)) {
    QCH().botVao(bot.cfg.acct, bai); // đăng ký mỗi nhịp: bot train sẵn ở đúng bãi thì nhánh "vừa tới" không chạy, không có hiện diện thì boss không sinh
    try { QCH().nvSat(bot.cfg.acct, B.id); } catch {}
    const ds = QCH().ds(bai).filter((m) => m[8] === B.id && m[4] > 0);
    if (!ds.length) { bot.act = "stand"; return; }
    const m = ds[0];
    if (nguoiThatGan(bai, m[6], m[7])) { bot.act = "stand"; bot.stats.nhuong = (bot.stats.nhuong | 0) + 1; return; } // nhường sân: có người thật gần boss thì không đánh (đánh lại khi người rời/chết)
    const toi = buocToi(bot, m[6], m[7], 200);
    bot.act = toi ? "attack" : "run";
    const dmg = donHoatDong(bot);
    if (dmg > 0) { try { QCH().danh(bot.cfg.acct, bai, { s: ++bot.hdSeq, d: [[m[0], dmg]] }); } catch {} }
    try { QCH().nhanThuong(bot.h, bot.cfg.acct, bot.key, false); } catch {}
    return;
  }
  const he = (bot.h.satThu && bot.h.satThu.he) | 0;
  const n = gietTaiBai(bot, bai, S.tpl || B.id, S.lv || 200, 3, he);
  bot.act = n ? "attack" : "stand";
}
function hdSatGop(bot) { // 5 Sát Thủ lệnh -> 1 giản (đúng luật gop, dùng lệnh của chính bot)
  try {
    const uids = bot.h.bag.filter((o) => { try { return (DO.NOI.BY.get(o.k) || {}).satThu === "lenh"; } catch { return false; } }).map((o) => o.u);
    if (uids.length) SAT().lam(bot.h, { viec: "gop", u: uids }, bot.cfg.acct);
  } catch (e) { log(`gộp giản lỗi (${bot.h.name}):`, e.message); }
}

// ----- Dã Tẩu: toàn bộ bot, theo đúng buocTu (không hủy dồn dập) -----
function hdDtVao(bot) {
  if (bot.hdNgay.dt === ngayVN()) return false;
  if (Date.now() < (bot.hdNghi.dt || 0)) return false;
  try { TLAM().lam(bot.h, { viec: "mo", loai: "dt" }, bot.cfg.acct); }
  catch (e) { log(`mở khóa Dã Tẩu lỗi (${bot.h.name}):`, e.message); bot.hdNghi.dt = Date.now() + 10 * 60 * 1000; return false; }
  batDauHd(bot, "dt", { dem: 0, choDen: 0 });
  return true;
}
function hdDtTick(bot) {
  bot.hd.dem = (bot.hd.dem | 0) + 1;
  if (bot.hd.dem > 900) { bot.hdNgay.dt = ngayVN(); return ketThucHd(bot, "quá giờ"); }
  if (Date.now() < (bot.hd.choDen || 0)) { bot.act = "stand"; return; }
  for (let k = 0; k < 3; k++) {
    let r;
    try { r = DT().buocTu(bot.h, { thuong: "kn", giuHuy: 2, gian: 0, huy: "dung" }); } catch (e) { log(`Dã Tẩu lỗi (${bot.h.name}):`, e.message); return ketThucHd(bot, "lỗi buocTu"); }
    if (!r) return ketThucHd(bot, "không có bước");
    if (r.tiep === "het" || r.tiep === "dung" || r.tiep === "tui") { bot.hdNgay.dt = ngayVN(); return ketThucHd(bot, `${r.tiep}${r.ly ? ": " + r.ly : ""}`); }
    if (r.tiep === "cho") { bot.hd.choDen = Date.now() + ((r.giay | 0) || 60) * 1000; return; }
    if (r.tiep === "danh") {
      const bai = r.bai || bot.cfg.zone;
      if (bot.zone !== bai) { const mz = mobCuaBai(bai); const tam = tamBai(bai, bot.idx); dichChuyen(bot, bai, tam ? tam[0] : bot.cfg.cx, tam ? tam[1] : bot.cfg.cy); if (!mz) return; }
      const mz = mobCuaBai(bai);
      if (!mz) return;
      for (let i = 0; i < 5; i++) gietTaiBai(bot, bai, mz.mob, mz.lv, 0, 0);
      bot.act = "attack";
      return;
    }
    // "lai": buocTu đã tiến bước — gọi tiếp trong cùng nhịp (tối đa 3 lần)
  }
}

// ----- Võ Lâm Minh Chủ: giết + giao thư + hái (theo đúng MC.lam) -----
let MC_JSON = null;
function mcJson() {
  if (!MC_JSON) { try { MC_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "data", "minh-chu.json"), "utf8")); } catch { MC_JSON = {}; } }
  return MC_JSON;
}
function hdMcVao(bot) {
  if ((bot.h.lvl | 0) < (MC().CF.cap || 120)) return false; // chưa đủ cấp: nhanGiet không tạo nhiệm vụ, bot vào-ra kẹt vòng lặp
  if (bot.hdNgay.mc === ngayVN()) return false;
  if (Date.now() < (bot.hdNghi.mc || 0)) return false;
  const tt = MC().tomTat(bot.h);
  if (tt && tt.xong && tt.xong.giet && tt.xong.thu && tt.xong.hai) { bot.hdNgay.mc = ngayVN(); return false; }
  batDauHd(bot, "mc", { buoc: "giet", dem: 0 });
  return true;
}
function hdMcTick(bot) {
  bot.hd.dem = (bot.hd.dem | 0) + 1;
  if (bot.hd.dem > 900) { bot.hdNgay.mc = ngayVN(); return ketThucHd(bot, "quá giờ"); }
  if (bot.hd.buoc === "giet") {
    let G = bot.h && bot.h.mc && bot.h.mc.giet;
    if (!G) { try { MC().lam(bot.h, { viec: "nhanGiet" }, bot.cfg.acct); } catch (e) { log(`Minh Chủ nhận giết lỗi (${bot.h.name}):`, e.message); bot.hd.buoc = "thu"; return; } G = bot.h && bot.h.mc && bot.h.mc.giet; if (!G) { bot.hd.buoc = "thu"; return; } }
    if (!G) { bot.hd.buoc = "thu"; return; }
    const bai = G.bai || G.zone, mob = G.mob || G.tpl || G.id || G.quai, can = G.can | 0, n = G.n | 0;
    if (!bai || !mob || !can) { bot.hd.buoc = "thu"; return; }
    if (n >= can) { try { MC().lam(bot.h, { viec: "xongGiet" }, bot.cfg.acct); } catch {} bot.hd.buoc = "thu"; return; }
    { const tam = tamBai(bai, bot.idx); if (bot.zone !== bai) dichChuyen(bot, bai, tam ? tam[0] : bot.cfg.cx, tam ? tam[1] : bot.cfg.cy); }
    const mz = mobCuaBai(bai);
    gietTaiBai(bot, bai, mob, (mz && mz.lv) || 200, 0, 0);
    bot.act = "attack";
    return;
  }
  if (bot.hd.buoc === "thu") {
    let T = bot.h && bot.h.mc && bot.h.mc.thu;
    if (!T) { try { MC().lam(bot.h, { viec: "nhanThu" }, bot.cfg.acct); } catch (e) { log(`Minh Chủ nhận thư lỗi (${bot.h.name}):`, e.message); bot.hd.buoc = "hai"; return; } T = bot.h && bot.h.mc && bot.h.mc.thu; if (!T) { bot.hd.buoc = "hai"; return; } }
    if (!T) { bot.hd.buoc = "hai"; return; }
    const nn = (mcJson().nguoiNhan || []).find((x) => x.ten === T.ai) || (mcJson().nguoiNhan || [])[0];
    if (!nn) { bot.hd.buoc = "hai"; return; }
    const bai = Array.isArray(nn.bai) ? nn.bai[0] : nn.bai;
    if (bot.zone !== bai) { dichChuyen(bot, bai, nn.x || 0, nn.y || 0); return; }
    buocToi(bot, nn.x || 0, nn.y || 0, 200);
    let ok = false;
    try { const r = MC().traoThu(bot.h, bot.cfg.acct, T.ai); ok = !!(r && r.tin && /trao/i.test(r.tin)); } catch {}
    if (!ok) {
      try { MC().lam(bot.h, { viec: "matThu" }, bot.cfg.acct); const r = MC().traoThu(bot.h, bot.cfg.acct, T.ai); ok = !!(r && r.tin && /trao/i.test(r.tin)); } catch {}
    }
    if (ok) { try { MC().lam(bot.h, { viec: "xongThu" }, bot.cfg.acct); } catch {} }
    else log(`Minh Chủ giao thư chưa được (${bot.h.name}, ai=${T.ai}) — bỏ bước này hôm nay`);
    bot.hd.buoc = "hai";
    return;
  }
  // hái: giết hộ vệ cụm cây rồi hái đủ số lượng
  let H = bot.h && bot.h.mc && bot.h.mc.hai;
  if (!H) { try { MC().lam(bot.h, { viec: "nhanHai" }, bot.cfg.acct); } catch (e) { log(`Minh Chủ nhận hái lỗi (${bot.h.name}):`, e.message); bot.hdNgay.mc = ngayVN(); return ketThucHd(bot, "không nhận hái được"); } H = bot.h && bot.h.mc && bot.h.mc.hai; }
  if (!H) { bot.hdNgay.mc = ngayVN(); return ketThucHd(bot, "không có nhiệm vụ hái"); }
  const cay = (mcJson().cay || []).find((c) => c.loai === H.loai && (c.bai === H.bai || (Array.isArray(c.bai) && c.bai.includes(H.bai)))) || (mcJson().cay || []).find((c) => c.loai === H.loai);
  if (!cay) { log(`Minh Chủ: không thấy cây loại ${H.loai} trong dữ liệu — bỏ hái`); bot.hdNgay.mc = ngayVN(); return ketThucHd(bot, "không có dữ liệu cây"); }
  const bai = Array.isArray(cay.bai) ? cay.bai[0] : (cay.bai || H.bai);
  if (bot.zone !== bai) { dichChuyen(bot, bai, cay.x || 0, cay.y || 0); return; }
  const co = (bot.h.bag || []).filter((o) => o.k === H.mon).reduce((s, o) => s + (o.n || 1), 0);
  if (co >= (H.can | 0)) { try { MC().lam(bot.h, { viec: "xongHai" }, bot.cfg.acct); } catch {} bot.hdNgay.mc = ngayVN(); return ketThucHd(bot, "xong Minh Chủ"); }
  let ve = [];
  try { const s = MC().veTT(bot.cfg.acct); ve = Array.isArray(s) ? s : (s && (s.s || s.ds)) || []; } catch {}
  // Hộ Vệ canh cây: veTT không trả mã cụm (hàng [u,bai,x,y,mau,...]) — lấy Hộ Vệ còn sống cùng bãi, đứng gần cây.
  const song = ve.filter((g) => { const gb = g[1] != null ? g[1] : g.bai; const gm = g[4] != null ? g[4] : g.mau; const gx = g[2] != null ? g[2] : g.x, gy = g[3] != null ? g[3] : g.y; return gb === bai && gm > 0 && Math.hypot(gx - (cay.x || 0), (gy - (cay.y || 0)) * 2) < 800; });
  if (song.length) {
    const g = song[0], gx = g[2] != null ? g[2] : g.x, gy = g[3] != null ? g[3] : g.y, uid = g[0] != null ? g[0] : g.u;
    const toi = buocToi(bot, gx, gy, 200);
    bot.act = toi ? "attack" : "run";
    const dmg = donHoatDong(bot);
    if (dmg > 0) { try { MC().danhVe(bot.cfg.acct, uid, dmg); } catch {} }
    return;
  }
  if (!bot.hd.batLuc) { try { const r = MC().lam(bot.h, { viec: "haiBat", cay: cay.id }, bot.cfg.acct); if (r) bot.hd.batLuc = Date.now(); } catch (e) { log(`hái bắt đầu lỗi (${bot.h.name}):`, e.message); } return; }
  if (Date.now() - bot.hd.batLuc >= 3000) {
    try { MC().lam(bot.h, { viec: "hai", cay: cay.id }, bot.cfg.acct); } catch (e) { log(`hái lỗi (${bot.h.name}):`, e.message); }
    bot.hd.batLuc = 0;
  }
}

// ----- Vượt Ải: đội 3 bot cùng bộ 3 (đội trưởng idx%3==0) -----
function hdVaThanhVien(bot) { // thành viên: thấy lời mời của đội trưởng bộ 3 thì nhận + vào mode chờ
  if (bot.idx % 3 === 0) return false;
  let c;
  try { c = TD().cua(bot.cfg.acct); } catch { return false; }
  if (!c || !c.moi || !c.moi.length) return false;
  const truong = bots[bot.idx - (bot.idx % 3)];
  const m = c.moi.find((x) => x.tu === (truong && truong.h.name));
  if (!m) return false;
  try { TD().lam(bot.cfg.acct, { viec: "nhan", id: m.id }); } catch { return false; }
  batDauHd(bot, "va", { doi: truong.cfg.acct, gd: "choVao" });
  return true;
}
function hdVaVao(bot) { // đội trưởng: lập đội + mời 2 thành viên bộ 3
  if (bot.idx % 3 !== 0 || bot.idx + 2 >= bots.length) return false;
  if (bot.hdNgay.va === ngayVN()) return false;
  if (Date.now() < (bot.hdNghi.va || 0)) return false; // vừa bị từ chối: chờ rồi thử lại, khỏi đốt cả ngày
  const tv = [bots[bot.idx + 1], bots[bot.idx + 2]];
  if (tv.some((b) => !b || b.mode === "hd" || b.mode === "chet")) return false;
  try {
    TD().lam(bot.cfg.acct, { viec: "lap" });
    for (const b of tv) TD().lam(bot.cfg.acct, { viec: "moi", ten: b.h.name });
  } catch (e) { log(`Vượt Ải lập đội lỗi (${bot.h.name}):`, e.message); return false; }
  batDauHd(bot, "va", { doi: 1, gd: "cho", choDen: Date.now() + 20000 });
  return true;
}
function hdVaTick(bot) {
  if (bot.hd.gd === "cho") {
    let tv = [];
    try { const d = TD().thanhVien(bot.cfg.acct); tv = (d && d.tv) || []; } catch {}
    if (tv.length >= 3) { bot.hd.gd = "vao"; return; }
    if (Date.now() > (bot.hd.choDen || 0)) return ketThucHd(bot, "đủ đội không kịp");
    bot.act = "stand"; return;
  }
  if (bot.hd.gd === "vao") {
    let r = null;
    try { r = VAI().lam(bot.h, { viec: "vao" }, bot.fakeTk); } catch (e) { log(`Vượt Ải vào lỗi (${bot.h.name}):`, e.message); return ketThucHd(bot, "vào ải lỗi"); }
    // "vao" trả say(...) khi thiếu điều kiện (tiền/giản/lượt) — ghi rõ lý do, nghỉ 10 phút rồi thử lại, khỏi nuốt lặng + đốt cả ngày.
    if (r && r.say) {
      const ly = String((r.say.text || r.say) + "").replace(/<[^>]*>/g, "").slice(0, 120);
      log(`Vượt Ải bị từ chối (${bot.h.name}):`, ly);
      bot.hdNghi.va = Date.now() + 10 * 60 * 1000;
      return ketThucHd(bot, "vào ải bị từ chối");
    }
    bot.hdNgay.va = ngayVN();
    bot.hd.gd = "danh"; return;
  }
  if (bot.hd.gd === "choVao") { // thành viên chờ đội trưởng kéo vào
    if (Date.now() - bot.hd.batDau > 30000) return ketThucHd(bot, "chờ vào ải quá lâu");
    let di = null;
    try { di = VAI().layDi(bot.cfg.acct); } catch {}
    if (di && di.di) { dichChuyen(bot, di.di.z, di.di.at ? di.di.at[0] : bot.x, di.di.at ? di.di.at[1] : bot.y); napLai(bot); bot.hd.gd = "danh"; return; }
    bot.act = "stand"; return;
  }
  // danh
  let tt = null;
  try { tt = VAI().tomTat(bot.h); } catch {}
  const dang = tt && tt.dang;
  if (!dang || dang.ket) {
    try { VAI().nhanPhong(bot.h, bot.cfg.acct, bot.key); } catch {}
    try { VAI().lam(bot.h, { viec: "ra" }, bot.fakeTk); } catch {}
    return ketThucHd(bot, "xong ải");
  }
  if (!bot.hd.phong) {
    let di = null;
    try { di = VAI().layDi(bot.cfg.acct); } catch {}
    if (di && di.di) dichChuyen(bot, di.di.z, di.di.at ? di.di.at[0] : bot.x, di.di.at ? di.di.at[1] : bot.y);
    bot.hd.phong = dang.phong;
  }
  let P = null, Pbai = null;
  try { P = VAI()._thu.PHONG.get(dang.phong); Pbai = P && P.bai; } catch {}
  if (Pbai && bot.zone !== Pbai) { try { dichChuyen(bot, Pbai, bot.x, bot.y); } catch {} }
  bot.hd.dem = (bot.hd.dem | 0) + 1;
  if (bot.hd.dem % 10 === 0) { try { VAI().nhanPhong(bot.h, bot.cfg.acct, bot.key); } catch {} }
  let gan = 1e12, muc = null;
  if (P && P.q) for (const e of P.q.values()) {
    if (!(e.mau > 0)) continue;
    const d = Math.hypot((e.x || 0) - bot.x, ((e.y || 0) - bot.y) * 2);
    if (d < gan) { gan = d; muc = e; }
  }
  if (!muc) { bot.act = "stand"; return; }
  const toi = buocToi(bot, muc.x || 0, muc.y || 0, 200);
  bot.act = toi ? "attack" : "run";
  const dmg = donHoatDong(bot);
  if (dmg > 0) { try { VAI().danhP(bot.cfg.acct, { s: ++bot.hdSeq, d: [[muc.uid, dmg]] }); } catch {} }
}

// ----- điều phối hoạt động: gọi mỗi nhịp khi bot rảnh (train/sạp) -----
function hdKiemTra(bot) {
  if (bot.hdNgay.ngay !== ngayVN()) bot.hdNgay = { ngay: ngayVN() };
  if (hdVaThanhVien(bot)) return;
  try {
    // Giới hạn theo idx đã đủ (20 Boss / 30 Nhím / 10 Rương / 40 Phong Hỏa); không bọc thêm
    // theo tổng số bot — bọc so>=170 làm đợt kiểm ít bot (và live thiếu bot) mất hẳn 4 hoạt động giờ.
    if (bot.idx < 20 && hdBtgVao(bot)) return;
    if (bot.idx < 30 && hdSnVao(bot)) return;
    if (bot.idx < 10 && hdRtbVao(bot)) return;
    if (bot.idx < 40 && hdPhVao(bot)) return;
    if (hdTkVao(bot)) return;
    if (bot.idx < 20 && hdPldVao(bot)) return;
    if (hdSatVao(bot)) return;
    if (hdDtVao(bot)) return;
    if (hdMcVao(bot)) return;
    if (hdVaVao(bot)) return;
  } catch (e) { log(`điều phối hoạt động lỗi (${bot.h.name}):`, e.message); }
}
function hdCoUuTien(bot) { // rẻ, không tác dụng phụ: có hoạt động THEO GIỜ đang mở mà bot đủ điều kiện + chưa nhường cho đợt này không?
  try {
    if (bot.idx < 20 && BTG().dangCo()) {
      const tt = BTG().trangThai(bot.cfg.acct);
      if (tt && !tt.ket && bot.hdNgay.btg !== String(tt.u) && bot.hdNhuong !== "btg" + tt.u) return "btg" + tt.u;
    }
    if (bot.idx < 30 && SN().dangCo()) {
      const tt = SN().trangThai(bot.cfg.acct);
      if (tt && tt.ds && tt.ds.some((n) => !n[8] && n[5] > 0) && (SN().demNgay(bot.h.name) | 0) < 10 && bot.hdNhuong !== "sn" + tt.u) return "sn" + tt.u;
    }
    if (bot.idx < 10) {
      const ds = RTB().dong();
      if (ds.length && (bot.h.lvl | 0) >= 120 && bot.hdNhuong !== "rtb" + ds[0][0]) return "rtb" + ds[0][0];
    }
    if (bot.idx < 40) {
      const L = PH().lich();
      if (L && L.mo && Date.now() < (L.kc || 0) && bot.hdNgay.ph !== String(L.u) && bot.hdNhuong !== "ph" + L.u) return "ph" + L.u;
    }
    {
      const L = TK().lich();
      if (L && (L.pha === "bd" || L.pha === "danh") && Date.now() < (L.het || 0) && bot.hdNgay.tk !== `${L.gio || ""}|${L.kc || 0}` && bot.hdNhuong !== "tk" + L.kc) return "tk" + L.kc;
    }
    if (bot.idx < 20) {
      const L = PLD().lich();
      if (L && !L.nghi) {
        const t = L.t | 0, baoDanh = (PLD().CF && PLD().CF.baoDanh) || 10;
        const key = `${L.chuyen}|${bot.idx % 3}`;
        if (t >= 0 && t < baoDanh && bot.hdNgay.pld !== key && bot.hdNhuong !== "pld" + L.chuyen) return "pld" + L.chuyen;
      }
    }
  } catch {}
  return null;
}
function hdTick(bot) {
  try {
    hoiTheoNhip(bot);
    if (bot.chiSo) {
      const [kHp, kMp] = thuocCap(bot);
      if (bot.hpCur / bot.hpMax < NG_THUOC.hp && !bot.potHp) uongThat(bot, kHp);
      if (bot.mpCur / bot.mpMax < NG_THUOC.mp && !bot.potMp) uongThat(bot, kMp);
    }
    if (bot.hd) {
      // Nhường hoạt động theo giờ: bot đang cày dài (Sát thủ/Dã Tẩu/Minh Chủ/chờ ải) thì thoát
      // để tham gia hoạt động có cửa giờ; mỗi đợt chỉ nhường 1 lần (khỏi vào-ra liên tục).
      if (bot.hd.loai === "sat" || bot.hd.loai === "dt" || bot.hd.loai === "mc" || (bot.hd.loai === "va" && bot.hd.gd !== "danh")) {
        const k = hdCoUuTien(bot);
        if (k) { bot.hdNhuong = k; return ketThucHd(bot, "nhường hoạt động giờ"); }
      }
      if (Date.now() - bot.hd.batDau > 45 * 60 * 1000) return ketThucHd(bot, "quá giờ");
      const fn = { tk: hdTkTick, ph: hdPhTick, btg: hdBtgTick, sn: hdSnTick, rtb: hdRtbTick, pld: hdPldTick, sat: hdSatTick, dt: hdDtTick, mc: hdMcTick, va: hdVaTick }[bot.hd.loai];
      if (fn) fn(bot);
      else ketThucHd(bot, "loại lạ");
      hienDien(bot);
    }
  } catch (e) { log(`hoạt động lỗi (${bot.h.name}):`, e.message); ketThucHd(bot, "lỗi: " + e.message); }
}

// ----- việc ở thành: sửa đồ, nâng chiêu, luyện, Phú Quý, online/phúc duyên -----
function suaDo(bot) { // sửa độ bền <= mốc cảnh báo (LUAT.sua.bao=5) bằng đúng phí của game, chỉ khi về thành
  const bao = (DO.LUAT && DO.LUAT.sua && DO.LUAT.sua.bao) || 5;
  for (const slot of Object.keys(bot.h.equip || {})) {
    const it = bot.h.equip[slot];
    if (!it || it.ben == null || it.ben > bao) continue;
    try { DO.lam(bot.h, { act: "sua", slot }, bot.key, bot.fakeTk); log(`sửa đồ ${slot} (${bot.h.name})`); }
    catch (e) { log(`sửa đồ ${slot} lỗi (${bot.h.name}):`, e.message); }
  }
}
function boSungChieu(bot) { // nâng chiêu ĐÃ CÓ về đúng bảng phái, trong ngân sách điểm còn lại, kẹp trần — không mở chiêu mới, không cho điểm
  try {
    const tab = bot.tab, h = bot.h;
    let dung = 0;
    try { dung = DO.diemDaDung(h); } catch { dung = 0; }
    const tong = ((h.lvl | 0) - 1) + (h.mt | 0);
    let con = Math.max(0, tong - dung);
    if (con <= 0) return;
    for (const [idS, cap] of Object.entries(tab.skills || {})) {
      const id = +idS, co = (h.skills[id] | 0);
      if (co >= cap || co <= 0) continue;
      const them = Math.min(cap - co, con);
      h.skills[id] = co + them; con -= them;
      if (con <= 0) break;
    }
    DO.hamChieu(h);
    log(`bổ sung chiêu (${bot.h.name}): còn ${con} điểm`);
  } catch (e) { log(`bổ sung chiêu lỗi (${bot.h.name}):`, e.message); }
}
function nopLuyen(bot) { // xả độ luyện đã ghi: luyenDon theo đợt <=150 + luyenKn theo exp tăng
  try {
    const zone = bot.cfg.zone;
    for (const [idS, so] of Object.entries(bot.luyenDem || {})) {
      const id = +idS;
      let con = so | 0;
      while (con > 0) {
        const don = Math.min(150, con);
        try { DO.luyenDon(bot.h, [[id, don]], zone); } catch (e) { log(`luyện đơn lỗi (${bot.h.name}):`, e.message); break; }
        con -= don;
      }
      bot.luyenDem[id] = 0;
    }
    const kn = (bot.stats.kn | 0) - (bot.knMoc | 0);
    if (kn > 0) { try { DO.luyenKn(bot.h, kn); } catch {} bot.knMoc = bot.stats.kn | 0; }
  } catch (e) { log(`nộp luyện lỗi (${bot.h.name}):`, e.message); }
}
function phuQuyTown(bot) { // mua hộp ở Thần Tài + dùng + nhận thưởng, đúng luật PQ (1 Xu/hộp, cấp>=60, <10 lần/đợt)
  try {
    const CF = PQ().CF;
    let hop = bot.h.bag.filter((o) => o.k === (CF.mon || "ms:2402")).reduce((s, o) => s + (o.n || 1), 0);
    const xu = bot.h.xu | 0;
    if (hop < 1 && xu >= (CF.gia || 1) && (bot.h.lvl | 0) >= (CF.cap || 60)) {
      try { PQ().lam(bot.h, { viec: "mua", n: 1 }, bot.cfg.acct); hop = 1; } catch (e) { log(`mua Phú Quý lỗi (${bot.h.name}):`, e.message); }
    }
    if (hop >= 1) {
      const o = bot.h.bag.find((x) => x.k === (CF.mon || "ms:2402"));
      if (o) { try { DO.lam(bot.h, { act: "dung", so: 10 + ri(0, 89), u: o.u }, bot.key, bot.fakeTk); } catch (e) { log(`dùng Phú Quý lỗi (${bot.h.name}):`, e.message); } }
    }
    try { PQ().lam(bot.h, { viec: "nhanThuong" }, bot.cfg.acct); } catch {}
    try { PQ().lam(bot.h, { viec: "nhanDb" }, bot.cfg.acct); } catch {}
  } catch (e) { log(`Phú Quý lỗi (${bot.h.name}):`, e.message); }
}
// Mua bình bằng lượng farm được (đúng đường mua ở tiệm của người chơi — DO.lam "mua"):
// mua tới 20 bình mỗi loại, chỉ mua đủ tiền, thiếu tiền thì mua ít / không mua, không cấp bù.
// (Sửa lỗ hổng P2: trước đây nạp đầy 20+20 bằng themChong không trừ tiền.)
function muaBinh(bot) {
  const h = bot.h, [kHp, kMp] = thuocCap(bot);
  for (const k of [kHp, kMp]) {
    const x = BY.get(k); if (!x) continue;
    const co = soThuoc(bot, k), can = Math.max(0, 20 - co);
    if (can <= 0) continue;
    const gia1 = x.gia | 0; if (!(gia1 > 0)) continue;
    const n = Math.min(can, Math.floor((h.gold || 0) / gia1));
    if (n < 1) continue;
    try {
      const truoc = h.gold | 0;
      DO.lam(h, { act: "mua", k, n }, bot.key, bot.fakeTk);
      ghiDoLuong(bot, "muaBinh", { k, n, gia: truoc - (h.gold | 0) });
      log(`mua ${n} ${x.n} (${h.name}): -${truoc - (h.gold | 0)} lượng`);
    } catch (e) { log(`mua bình lỗi (${h.name}):`, e.message); }
  }
}
// Mặc đồ rơi được: món tốt nhất đủ điều kiện vào ô trống / thay món yếu hơn — đúng đường mặc
// của người chơi (DO.lam "mac"/"thao", yeuCau chặn sai cấp bên trong). Đồ ngon còn lại để bày sạp.
function macDoRoi(bot) {
  const h = bot.h;
  const ung = [];
  for (const it of [...(h.bag || [])]) {
    const x = BY.get(it.k);
    if (!x || typeof x.t !== "number") continue;
    if (x.thuoc || x.ktc || x.phu) continue;
    if (it.kbh || it.het) continue;
    if (x.dung && x.dung.loai === "sach") continue;
    ung.push(it);
  }
  if (!ung.length) return;
  const lvYc = (it) => ((BY.get(it.k) || {}).lv | 0);
  const diemDong = (it) => (it.d || []).reduce((s, r) => s + (r[1] | 0), 0);
  ung.sort((a, b) => (lvYc(b) - lvYc(a)) || ((b.d || []).length - (a.d || []).length) || (diemDong(b) - diemDong(a)));
  let doi = false;
  for (const it of ung) {
    if (!h.bag.includes(it)) continue;
    const x = BY.get(it.k);
    let slot = DO.SLOT_OF[x.t]; if (!slot) continue;
    if (slot === "Ring1") slot = !h.equip.Ring1 ? "Ring1" : !h.equip.Ring2 ? "Ring2" : "Ring1";
    const cu = h.equip[slot];
    if (cu && (lvYc(cu) > lvYc(it) || (lvYc(cu) === lvYc(it) && ((cu.d || []).length >= (it.d || []).length)))) continue;
    if (cu) { try { DO.lam(h, { act: "thao", slot }, bot.key, bot.fakeTk); } catch { continue; } }
    try {
      DO.lam(h, { act: "mac", u: it.u, ...(slot === "Ring1" || slot === "Ring2" ? { slot } : {}) }, bot.key, bot.fakeTk);
      doi = true;
    } catch { /* không mặc được (sai cấp/giới/vũ khí): để túi, bày sạp sau */ }
  }
  if (doi) { DO.chuan(h); tinhChiSo(bot); }
}
// Mua ngựa ở tiệm bằng lượng farm: thang ngựa bán ở tiệm theo hệ (lv 20→72), con tốt nhất đủ cấp.
// Ngựa lv 80/150 (horse:51+, horse:131) KHÔNG bán ở tiệm — bot dừng ở ngựa lv 72, chờ nguồn khác.
const NGUA_CAP = [20, 25, 30, 35, 40, 45, 50, 55, 60, 72];
function capCuaNgua(k) {
  const m = /^horse:(\d+)$/.exec(String(k || ""));
  if (!m) return 0;
  const n = +m[1];
  if (n > 50) return 150; // ngựa đặc biệt (mã bài/KTC), không bán ở tiệm
  return NGUA_CAP[(n - 1) % 10] || 0;
}
function muaNgua(bot) {
  const h = bot.h, s = h.series | 0;
  if (!(s >= 0 && s <= 4)) return;
  const lvl = h.lvl | 0;
  let muc = -1;
  for (let i = 0; i < NGUA_CAP.length; i++) if (lvl >= NGUA_CAP[i]) muc = i;
  if (muc < 0) return; // chưa đủ cấp cưỡi ngựa
  const khoa = "horse:" + (s * 10 + muc + 1);
  let co = 0;
  for (const it of [...(h.bag || []), ...Object.values(h.equip || {})]) {
    if (it && typeof it.k === "string" && it.k.startsWith("horse:")) co = Math.max(co, capCuaNgua(it.k));
  }
  if (co >= NGUA_CAP[muc]) return; // đã có ngựa ngang / hơn
  try {
    const truoc = h.gold | 0;
    DO.lam(h, { act: "mua", k: khoa, n: 1 }, bot.key, bot.fakeTk);
    ghiDoLuong(bot, "muaNgua", { k: khoa, gia: truoc - (h.gold | 0) });
    log(`mua ngựa ${khoa} (${h.name}): -${truoc - (h.gold | 0)} lượng`);
  } catch { /* chưa đủ tiền / túi đầy: để chuyến sau, không cấp bù */ }
}
// Học sách luyện rơi/mua được (đúng đường đọc sách của người chơi — DO.lam "dung" -> dungVat case "sach";
// gọi thẳng act "sach" thì lam không nhận, rơi "Không rõ việc gì" — lỗi cũ lặng lẽ từ trước, sửa 27/11/2026):
// đúng phái, đủ cấp, chưa học. Không có sách thì không có chiêu luyện — như người chơi mới.
function hocSach(bot) {
  const h = bot.h;
  for (const it of [...(h.bag || [])]) {
    const x = BY.get(it.k), d = x && x.dung;
    if (!d || d.loai !== "sach" || !d.chieu) continue;
    if (d.phai !== +h.fac) continue;
    if ((h.lvl | 0) < (d.cap | 0)) continue;
    if ((h.books || []).includes(+d.chieu)) continue;
    try { DO.lam(h, { act: "dung", u: it.u }, bot.key, bot.fakeTk); log(`học sách chiêu ${d.chieu} (${h.name})`); }
    catch (e) { log(`học sách lỗi (${h.name}):`, e.message); }
  }
}
function viecThanh(bot) { // chạy 1 lần mỗi lần về thành, trước khi lưu
  try { ONL().dem(bot.h, bot.key, true); } catch {}
  try { ONL().lam(bot.h, bot.key, { viec: "nhan" }); } catch {}
  try { PD().lam(bot.h, bot.key, { viec: "nhan" }); } catch {}
  dongBoCap(bot); suaDo(bot); muaBinh(bot); macDoRoi(bot); muaNgua(bot); hocSach(bot);
  // Kinh tế bot (Huy chốt 00:36 27/11/2026): mặc đồ hơn theo S2, bán rác cho NPC (lệnh 01:49 27/11/2026),
  // quét sạp người khác mua món nâng cấp/sách.
  // Lỗi kinh tế không được kẹt chuyến về thành: bắt riêng từng bước.
  let doiKT = 0;
  try { doiKT += KT.quyetDinh(bot); } catch (e) { log(`quyết định kinh tế lỗi (${bot.h.name}):`, e.message); }
  try { KT.banRac(bot); } catch (e) { log(`bán rác lỗi (${bot.h.name}):`, e.message); }
  try { doiKT += KT.quetSapMua(bot); } catch (e) { log(`quét sạp mua lỗi (${bot.h.name}):`, e.message); }
  if (doiKT) { try { DO.chuan(bot.h); tinhChiSo(bot); } catch (e) { log(`làm mới chỉ số lỗi (${bot.h.name}):`, e.message); } }
  boSungChieu(bot); nopLuyen(bot); phuQuyTown(bot);
}

// ---------- vòng đời ----------
function test1DangChoi() {
  try { return !!TG.dangChoi("test1"); }
  catch { return false; }
}
function khoiTaoBot(cfg, idx, nameSet) {
  // CAP1 (mặc định): tạo mới từ cấp 1, không cấp phát. CAP1=0: đường cũ MAXPING cấp 200 (chỉ hồi quy/rollback).
  const { tk, h, moi } = CAP1 ? taoBotCap1(cfg, nameSet) : taoBot(cfg, BC.bangChieu(cfg.fac, cfg.eqt), nameSet);
  const tab = BC.bangChieu(cfg.fac, cfg.eqt, h.lvl, new Set(h.books || []));
  const bot = { cfg, tab, tk, h, idx, fakeTk: { ten: cfg.acct, admin: false, nv: [h] }, key: cfg.acct + "|0",
    zone: cfg.zone, x: cfg.cx, y: cfg.cy, dir: 2, act: "stand", mode: "luyen", kills: 0, cd: {}, mucTieu: null,
    vongChieu: 0, danhBatDau: 0, danhTuChoi: 0, gocX: cfg.cx, gocY: cfg.cy, chetLuc: 0, lastTin: null, atkN: 0, px: cfg.cx, py: cfg.cy,
    traLoiDen: 0, traLoiChung: 0, stallDen: 0, stallSpot: null, lastDanhNguoi: null, potHp: null, potMp: null,
    hd: null, hdNgay: {}, luyenDem: {}, knMoc: 0, hdSeq: 0, hdNhuong: "", hdNghi: {},
    tabLvl: h.lvl | 0, capDaDongBo: h.lvl | 0, daMoSapNghi: false, baiTrain: null,
    stats: { giet: 0, kn: 0, nhat: 0, tienNhat: 0, bo: 0, thuoc: 0, ban: 0, danhThuong: 0, nhanDon: 0, gay: 0, gayNguoi: 0, gietThat: 0 }, moi };
  chuanChieu(bot);
  capNhatBai(bot);
  const T = baiTrain(bot);
  bot.zone = T.zone; bot.x = T.cx; bot.y = T.cy; bot.gocX = T.cx; bot.gocY = T.cy; bot.px = T.cx; bot.py = T.cy;
  DO.baiNay(bot.key, bot.zone);
  tinhChiSo(bot);
  return bot;
}
function batDau() {
  if (bots.length) return { ok: true, daChay: true, soBot: bots.length };
  if (test1DangChoi()) {
    const err = new Error("test1 đang chơi — không chạy NPC để khỏi động vào phiên của Huy; thử lại sau 60 giây");
    err.code = "test1-dang-choi";
    throw err;
  }
  const nameSet = new Set();
  try {
    for (const ten of D.dsTk()) { const t = D.docTk(ten); if (t && t.nv && t.nv[0]) nameSet.add(D.khoaTen(t.nv[0].name)); }
  } catch (e) { log("quét tên lỗi:", e.message); }
  const created = [], loi = [];
  for (let i = 0; i < SO_TOI_DA; i++) {
    const cfg = CFG.bots[i];
    try { const bot = khoiTaoBot(cfg, i, nameSet); bots.push(bot); created.push(bot); }
    catch (e) { loi.push(`${cfg.acct}: ${e.message}`); log(`tạo bot lỗi (${cfg.acct}):`, e.message); }
  }
  if (!bots.length) throw new Error("Không tạo được bot nào: " + loi.join(" | "));
  if (loi.length) log(`cảnh báo: ${loi.length} bot không chạy:`, loi.join(" | "));
  // Nhịp chung 1500ms cho tất cả bot (giết quái + trạng thái); hiện diện chia lát theo VL_NPC_CHOI_HIEN.
  timer = setInterval(() => { tickN++; for (const b of bots) tickBot(b); }, 1500);
  let latN = 0;
  timerHien = setInterval(() => {
    const lat = latN++ % LAT;
    for (const b of bots) if (b.idx % LAT === lat) hienDien(b);
  }, 500);
  const zones = {};
  for (const b of bots) zones[b.zone] = (zones[b.zone] || 0) + 1;
  log(`đã chạy ${bots.length} NPC (${created.filter((b) => b.moi).length} mới tạo, ${created.length - created.filter((b) => b.moi).length} dùng lại) — bãi: ${Object.entries(zones).map(([z, n]) => `${DO.tenBai(+z) || z}:${n}`).join(", ")}`);
  return { ok: true, soBot: bots.length, zones };
}
function dung() {
  if (timer) clearInterval(timer);
  if (timerHien) clearInterval(timerHien);
  if (timerThu) clearInterval(timerThu);
  timer = timerHien = timerThu = null;
  for (const b of bots) {
    try { if (b.h.sap && b.h.sap.mo) dongSap(b); } catch {}
    try { luu(b); } catch {}
    try { TG.roi(b.cfg.acct); } catch {}
  }
  log(`đã dừng ${bots.length} NPC`);
  bots = [];
}
function trangThai() {
  const b0 = bots[0];
  if (!b0) return { bat: false, soBot: 0 };
  return {
    bat: true, soBot: bots.length, ten: b0.h.name, phai: FAC_TEN[b0.cfg.facKey], he: TEN_NHANH[b0.cfg.eqt],
    cap: b0.h.lvl, mode: b0.mode, zone: b0.zone, x: b0.x, y: b0.y, hp: Math.round(100 * (b0.hpCur || 0) / (b0.hpMax || 1)),
    mp: Math.round(100 * (b0.mpCur || 0) / (b0.mpMax || 1)),
    hpCur: b0.hpCur, hpMax: b0.hpMax, mpCur: b0.mpCur, mpMax: b0.mpMax,
    skills: { ...b0.h.skills }, vuKhi: b0.chiSo ? b0.chiSo.wk : null, mucTieu: b0.mucTieu,
    lastDanhNguoi: b0.lastDanhNguoi, kills: b0.kills, stats: { ...b0.stats },
    gold: b0.h.gold, xu: b0.h.xu, oTrong: N.oTrong(b0.h), thuoc: { hp: soThuoc(b0, THUOC_HP), mp: soThuoc(b0, THUOC_MP) },
    sap: !!(b0.h.sap && b0.h.sap.mo),
    bots: bots.map((b) => ({ ten: b.h.name, phai: FAC_TEN[b.cfg.facKey], he: TEN_NHANH[b.cfg.eqt], mode: b.mode, zone: b.zone, x: b.x, y: b.y, kills: b.kills, hp: Math.round(100 * (b.hpCur || 0) / (b.hpMax || 1)) })),
  };
}
function tuDong() {
  if (process.env.VL_NPC_CHOI !== "1") return null;
  try { batDau(); }
  catch (e) {
    if (e.code === "test1-dang-choi") {
      log(e.message);
      if (!timerThu) timerThu = setInterval(() => {
        if (bots.length) { clearInterval(timerThu); timerThu = null; return; }
        try { batDau(); clearInterval(timerThu); timerThu = null; log("test1 đã rời — NPC bắt đầu chạy"); }
        catch (e2) { if (e2.code !== "test1-dang-choi") { log("khởi động NPC lỗi:", e2.message); clearInterval(timerThu); timerThu = null; } }
      }, 60000);
      return null;
    }
    log("khởi động NPC lỗi:", e.message);
  }
  return null;
}

const B0 = () => bots[0] || null;
const TAB0 = () => BC.bangChieu(0, 2);
module.exports = {
  batDau, dung, trangThai, tuDong, nhanDon, nhanBaoDon, layDanhCho,
  ACCT: ACCT0, TEN: TEN0,
  _test: {
    layS: () => B0(),
    layTat: () => bots,
    tinhChiSo: () => { const b = B0(); if (b) tinhChiSo(b); },
    tinhChiSoCua,
    quaiMau: (id, lv) => { const b = B0(); return b ? quaiMau(b, id, lv) : null; },
    danhChieu: (id, muc) => { const b = B0(); return b ? donChieu(b, id, muc) : null; },
    danhThuong: (muc) => { const b = B0(); return b ? danhThuong(b, muc) : null; },
    chonChieu: (muc) => { const b = B0(); return b ? chonChieu(b, muc) : 0; },
    nhanDon,
    nhanBaoDon,
    layDanhCho,
    xuLyMotBao: (tk, h, hien, C, r, now) => xuLyMotBao(tk, h, hien, C, r, now),
    vongDanh: () => { const b = B0(); if (b) vongDanh(b); },
    quaiTanCong: () => { const b = B0(); if (b) quaiTanCong(b); },
    chetBot: (m) => { const b = B0(); if (b) chetBot(b, m); },
    laDoNgon: (it) => laDoNgon(it),
    chatLuongMon: (it) => chatLuongMon(it),
    uongThat: (k) => { const b = B0(); return b ? uongThat(b, k) : false; },
    hoiTheoNhip: () => { const b = B0(); if (b) hoiTheoNhip(b); },
    hoiDay: () => { const b = B0(); if (b) hoiDay(b); },
    CHIEU: TAB0().skills, LUYEN_BOT: TAB0().luyen, SACH_BOT: TAB0().books, bangChieu: BC.bangChieu,
    // Helper theo chỉ số bot — chỉ phục vụ kiểm chứng, cùng đường code thật, không đổi hành vi.
    botAt: (i) => bots[i] || null,
    tinhChiSoI: (i) => { const b = bots[i]; if (b) tinhChiSo(b); },
    chonChieuI: (i, muc) => { const b = bots[i]; return b ? chonChieu(b, muc) : 0; },
    danhBotI: (i, muc) => { const b = bots[i]; return b ? danhBot(b, muc) : null; },
    nhanDonI: (i, d) => { const b = bots[i]; return b ? nhanDonBot(b, d || {}) : { ok: false, lyDo: "khong-co-bot" }; },
    quaiMauI: (i, id, lv) => { const b = bots[i]; return b ? quaiMau(b, id, lv) : null; },
    vongDanhI: (i) => { const b = bots[i]; if (b) vongDanh(b); },
    uongThatI: (i, k) => { const b = bots[i]; return b ? uongThat(b, k) : false; },
    hoiTheoNhipI: (i) => { const b = bots[i]; if (b) hoiTheoNhip(b); },
    // Reset lv1 + hãm tốc (chỉ kiểm chứng): bảng bãi, tiến trình exp, trần ngày, việc ở thành.
    baiChoCap,
    tienTrinh: (i) => { const b = bots[i]; return b ? tienTrinh(b.h) : null; },
    hetTranI: (i) => { const b = bots[i]; return b ? hetTran(b) : null; },
    dongBoCapI: (i) => { const b = bots[i]; return b ? dongBoCap(b) : false; },
    muaBinhI: (i) => { const b = bots[i]; if (b) muaBinh(b); },
    macDoRoiI: (i) => { const b = bots[i]; if (b) macDoRoi(b); },
    muaNguaI: (i) => { const b = bots[i]; if (b) muaNgua(b); },
    thuocCapI: (i) => { const b = bots[i]; return b ? thuocCap(b) : null; },
    capNhatBaiI: (i) => { const b = bots[i]; return b ? capNhatBai(b) : null; },
  },
};
