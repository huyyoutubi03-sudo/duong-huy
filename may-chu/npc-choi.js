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
const BH = () => require("./bang-hoi"); // bang hội (Huy 16:08 28/11/2026): bot vào bang như người chơi thật
const PH = () => require("./phong-hoa");
const TK = () => require("./tong-kim");
const PLD = () => require("./phong-lang-do");
const CH = () => require("./chi-huy-tk"); // bảng chỉ huy tổ đội Tống Kim (Huy 22:09/22:21 27/11/2026) — gọi lười, tránh vòng require
const SAT = () => require("./sat-thu");
const DT = () => require("./da-tau");
const VAI = () => require("./vuot-ai");
const MC = () => require("./minh-chu");
const QCH = () => require("./quai-chung");
const ONL = () => require("./online");
const PD = () => require("./phuc-duyen");
const TLAM = () => require("./tu-lam");
const TD = () => require("./to-doi");
const CS = () => require("./chuyen-sinh"); // chuyển sinh (Huy quyết Q6 13:49 ngày 27/11/2026): bot CÓ chuyển sinh — đi chuỗi nhiệm vụ như người chơi, trần ngày như nhau

const CFG_PATH = process.env.VL_NPC_CHOI_CONFIG || path.join(__dirname, "npc-choi-config.json");
const CFG = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
const Z_TOWN = 37; // Biện Kinh (thành, được bày sạp)
const Z_BL = 53; // Ba Lăng huyện (thôn, được bày sạp — 1 mớ bot bày ở đây cho vui, lệnh Huy 14:38 28/11/2026)
const TEN_THANH = { 37: "Biện Kinh", 53: "Ba Lăng" };
const O_THANH = (z) => z === Z_TOWN || z === Z_BL; // vùng an toàn thành/thôn: không bị đánh / không chọn làm mục tiêu
function thanhCua(bot) { // thành/thôn bot về bày sạp: có stalls53 trong config thì Ba Lăng, không thì Biện Kinh (mặc định cũ)
  if (bot.cfg && Array.isArray(bot.cfg.stalls53) && bot.cfg.stalls53.length) return { zone: Z_BL, stalls: bot.cfg.stalls53, ten: TEN_THANH[Z_BL] };
  return { zone: Z_TOWN, stalls: bot.cfg.stalls, ten: TEN_THANH[Z_TOWN] };
}
const ZONES = CFG.zones || {};
const SO_TOI_DA = Math.max(1, Math.min(CFG.bots.length, +process.env.VL_NPC_CHOI_SO || 170));
const HIEN_MS = Math.max(500, +process.env.VL_NPC_CHOI_HIEN || 1500);
const LAT = Math.max(1, Math.min(12, Math.round(HIEN_MS / 500))); // lát hiện diện: mỗi 500ms 1 lát
const EXP_MAXPING = 22566772100, TIEN_MAXPING = 50000000, XU_MAXPING = 100; // tổng exp 1→200 sau kẹp Q2 (bảng char.json kẹp 300M, Huy quyết 13:49 ngày 27/11/2026; gốc 97.566.772.100) — CHỈ dùng ở đường tạo cũ (CAP1=0) + công thức T(h), không cấp phát cho bot mới
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
let timer = null, timerHien = null, timerThu = null, timerBang = null, tickN = 0;
const choDanh = new Map(); // tài khoản người chơi -> [đòn đánh trả đang chờ gửi kèm nhịp sau] (layDanhCho)
let traLoiChungAll = 0; // chống spam TIN RAO: chỉ rao dùng (Huy 10:18 27/11/2026: câu trả lời trực tiếp không qua cửa chung 30s nữa)
const tenBot = new Set(); // tên nhân vật của bầy bot — bot CHỈ trả lời người chơi thật, không trả lời tin của bot khác (khỏi vòng lặp bot tự hỏi tự đáp khi AI không còn qua cửa chung 30s; Huy 10:18 27/11/2026)
let traLoiNhan = new Map(); // nhận câu hỏi công khai (Huy 10:18 27/11/2026): 1 câu hỏi chỉ 1 bot nhận, khỏi 170 con cùng trả lời; khóa = kênh|người|nội dung, hết hạn sau NHAN_MS (10 giây, bằng traLoiDen)
const NHAN_MS = 10000;
function nhanCauHoi(msg) { // true = bot này nhận câu này; false = bot khác đã nhận rồi
  const khoa = `${msg.ch || ""}|${msg.name || ""}|${String(msg.text || "")}`;
  const t = Date.now();
  for (const [k, v] of traLoiNhan) if (t - v > NHAN_MS) traLoiNhan.delete(k); // dọn nhận cũ
  if (traLoiNhan.has(khoa)) return false;
  traLoiNhan.set(khoa, t);
  return true;
}
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
  // Chuyển sinh: mỗi vòng đã qua = đủ tổng exp 1→200 (EXP_MAXPING, đã kẹp Q2) + phần 1→90 bỏ qua
  // khi về cấp 90 (Σneed 1..89 ≈ 234M, ~1% — chấp vào trần ngày, như bản 3 vòng cũ)
  return t + (h.reborn | 0) * EXP_MAXPING;
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
  // Chuyển động chân thật (28/11/2026): mốc phủ KÍN khoảng hiện diện — trước 3 mốc chỉ phủ
  // 1000ms trong khi hiện diện cách nhau 1500ms nên client hết mốc, bot đứng chết ~0,5 giây
  // mỗi nhịp rồi nhảy đoạn mới. Nay 4 mốc phủ đủ span, nội suy êm (smoothstep: chậm ở đầu/
  // cuối đoạn như người tăng–giảm tốc) + bo cong Bézier khi đổi hướng (cắt góc trong thay
  // vì cua gấp 60°–90°). Dịch tức thời (đổi map/về thành, đoạn > 600): giữ kiểu cũ thẳng/1 giây.
  // Số lần gửi, nhịp hiện diện, va chạm, đích đến không đổi.
  const t = Date.now(), px = bot.px ?? bot.x, py = bot.py ?? bot.y;
  const span = Math.max(500, Math.min(3000, t - (bot._pxT || t - 1500)));
  const doiMap = bot._pxZone != null && bot._pxZone !== bot.zone;
  bot.px = bot.x; bot.py = bot.y; bot._pxZone = bot.zone; bot._pxT = t;
  const act = bot.mucTieu ? "attack" : bot.act;
  const dx = bot.x - px, dy = bot.y - py, dy2 = dy * 2, dai = Math.hypot(dx, dy2);
  if (dai > 20) bot.dir = _dirCua(dx, dy2); // hướng đứng = hướng vừa đi (trước gần như hằng số 2)
  const mocCu = (f) => [t - Math.round((1 - f) * 1000), Math.round(px + dx * f), Math.round(py + dy * f), bot.dir, act, bot.atkN | 0, 1, bot.mucTieu ? 1 : 0];
  if (doiMap || dai > 600) return { zone: bot.zone, lvl: bot.h.lvl | 0, npc: 1, look: { ...bot.look }, tr: [mocCu(1 / 3), mocCu(2 / 3), mocCu(1)], hp, mp };
  // Bo cong theo góc cua với bước trước (không gian nhìn: y nhân 2; dấu cua theo cross).
  let cx = (px + bot.x) / 2, cyv = py + bot.y; // điểm điều khiển Bézier (cyv ở không gian nhìn: (2py+2y)/2)
  const vx0 = bot._vx || 0, vy0 = bot._vy || 0, f0 = Math.hypot(vx0, vy0);
  bot._vx = dx; bot._vy = dy2;
  if (f0 > 20 && dai > 20) {
    const cross = vx0 * dy2 - vy0 * dx, dot = vx0 * dx + vy0 * dy2;
    const gocCua = Math.atan2(Math.abs(cross), dot);
    const bo = 0.18 * dai * Math.sin(gocCua / 2);
    if (bo > 1) {
      const side = cross >= 0 ? 1 : -1; // pháp tuyến phải (y xuống) khi cua thuận chiều kim đồng hồ
      cx += (dy2 / dai) * bo * side;
      cyv += (-dx / dai) * bo * side;
    }
  }
  const moc = (f) => {
    const e = f * f * (3 - 2 * f), u = 1 - e; // smoothstep
    const qx = u * u * px + 2 * u * e * cx + e * e * bot.x;
    const qyv = u * u * (py * 2) + 2 * u * e * cyv + e * e * (bot.y * 2);
    return [t - Math.round((1 - f) * span), Math.round(qx), Math.round(qyv / 2), bot.dir, act, bot.atkN | 0, 1, bot.mucTieu ? 1 : 0];
  };
  return { zone: bot.zone, lvl: bot.h.lvl | 0, npc: 1, look: { ...bot.look }, tr: [moc(0), moc(1 / 3), moc(2 / 3), moc(1)], hp, mp };
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
  const truTuong = mob == null; // giết trừu tượng (không có mục tiêu thật): nhịp sinh tinh anh mới áp được
  mob = mob || pick(T.mobs); lv = lv || T.mobLv;
  const x = bot.x, y = bot.y;
  // Chuyển sinh bước 2 (bot cần hồn): cứ 50 con trừu tượng thì 1 con tính là tinh anh (đúng nhịp
  // QD.tinhAnhMoi của quai-chung.js:1362) để hồn Linh Hồn Chiến có đường rơi 40%. Cổng TA_GAP/taBai
  // trong gietQuai tự chặn khi bãi không có tinh anh (con đó chỉ tính "bo"). Trước đây gietMot luôn
  // r[3]=0 nên bot không bao giờ có hồn, kẹt vĩnh viễn ở bước 2. Chỉ khi còn thiếu hồn (đã nộp + túi < cần);
  // giết có mục tiêu (vongDanh) giữ nguyên quái thường.
  let loai = 0;
  if (truTuong) {
    const D = bot.h && bot.h.cs;
    if (D && D.buoc === 2) {
      const M = CS().muc(D.vong);
      const trongTui = (bot.h.bag || []).reduce((t, it) => t + (it && it.k === CS().HON ? (it.n | 0) || 1 : 0), 0);
      if (D.hon + trongTui < M.hon) { bot._taDem = (bot._taDem | 0) + 1; if (bot._taDem % 50 === 0) loai = 2; }
    }
  }
  let kq;
  try { kq = DO.gietQuai(bot.h, [[bot.zone, mob, lv, loai, 0, x, y]], { ten: bot.cfg.acct, admin: false, key: bot.key }); }
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
  for (const [sx, sy] of thanhCua(bot).stalls) {
    bot.x = sx; bot.y = sy; hienDien(bot); // chỗ mở sạp = chỗ đang đứng (nhịp gần nhất của máy chủ)
    try {
      const r = CHO.lam(bot.fakeTk, bot.h, 0, { viec: "mo", on: 1, bai: thanhCua(bot).zone, x: sx, y: sy });
      bot.stallSpot = [sx, sy];
      log(`mở sạp ở ${thanhCua(bot).ten}: ${bot.h.name} — ${r && r.msg ? r.msg : ""}`);
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

// Rao BÁN (lệnh Huy 12:39 26/11 — bot được phép rao mua bán): chỉ khi sạp đang mở và có đồ; đi qua cửa
// tiết lưu kênh chung RIÊNG cho rao (traLoiChungAll / CHAT_CHUNG_MS) — từ 27/11/2026 câu trả lời trực tiếp
// không qua cửa này nữa nên cửa này chỉ còn siết rao (cả bầy ≤ ~2 tin rao/phút).
// ĐX-1 (Huy duyệt 00:42 27/11/2026): rao lần đầu 5–15 giây sau khi mở sạp; còn ngồi bán thì rao lại mỗi ~100 giây (+ jitter).
// Sạp trống thì không rao. Rao MUA không làm (xem báo cáo đợt việc): giao dịch cần 2 trình duyệt thẩm định
// lẫn nhau, bot không có cơ chế an toàn để nhận mua đồ người chơi.
const RAO_BAN_MS = 100 * 1000; // ĐX-1: còn ngồi bán thì rao lại mỗi ~100 giây (qua cửa chung nên cả bầy ≤ ~2 tin/phút)
const RAO_MAX = 100; // Huy chốt 01:15 27/11/2026: tin rao ≤100 ký tự (trần TIN_MAX ở the-gioi.js) — rút ở ranh giới từ, giữ nguyên tên + giá cả 2 món
function rutTinRao(mon, monDau, tenThanh) {
  // Ưu tiên: giữ nguyên danh sách món → rút khẩu hiệu trước → rút đầu → cuối cùng chỉ còn món đầu (không bao giờ cắt giữa tên/giá)
  const khauHieu = ["Tới mà xem, đừng hỏi nhiều.", "Tới mà xem.", "Tới xem."];
  const ten = tenThanh || "Biện Kinh";
  const daus = [`Bán đồ ngon ở sạp ${ten}: `, `Sạp ${ten}: `, ""];
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
  const dsMon = ds.slice(0, 2).map((it) => `<${DO.tenMon(it) || "?"}> ${(it.gia | 0) || giaCua(it)} lượng`); // giá niêm yết thật trên sạp; tên trong <> để hiện link món (its theo thứ tự)
  const tin = rutTinRao(dsMon.join(", "), dsMon[0], thanhCua(bot).ten);
  traLoiChungAll = t;
  bot.raoDen = t + RAO_BAN_MS + ri(0, 20 * 1000);
  try {
    const sap = bot.h.sap || {}, its = ds.slice(0, 2).map((it) => { const { x, y, ...r } = it; return JSON.parse(JSON.stringify(r)); });
    TG.chat(bot.fakeTk, { o: 0, ch: "CH_WORLD", t: tin, its, toas: [{ z: sap.bai || thanhCua(bot).zone, x: Math.round(sap.x != null ? sap.x : bot.x || 0), y: Math.round(sap.y != null ? sap.y : bot.y || 0) }] }, true);
  } catch (e) { log(`rao bán lỗi (${bot.h.name}):`, e.message); }
}

// ---------- chuyển sinh của bot (Q6 — Huy quyết 13:49 ngày 27/11/2026) ----------
// Bot cấp 200 + đã bái nhập phái thì tự đi chuỗi nhiệm vụ như người chơi, trần đếm/ngày như nhau
// (chuyen-sinh.js ngayMoi). Bước 1 (giết quái ngang cấp) và bước 3 (dấu Boss) chạy tự động qua đúng
// móc gietQuai (do.js) / ghiDau (boss-tg.js) sẵn có — ở đây chỉ lái nhận (buoc 0), nộp hồn (buoc 2)
// và xác nhận (buoc 4). Đo lường (DO_MODE) thì không lái, giữ số đo grind thuần.
// Xác nhận chỉ khi không trong hoạt động (hd) và không đang chết — khỏi lột xác giữa trận.
// Sau lột xác: về thành (mode "ve") + xóa bãi train để capNhatBai chọn lại bãi theo cấp 90.
function hdChuyenSinh(bot) {
  try {
    const h = bot.h; if (!h || DO_MODE) return;
    if ((h.lvl | 0) < 200 || h.fac == null || (h.reborn | 0) >= 10) return;
    const D = h.cs && typeof h.cs === "object" ? h.cs : null;
    if (!D || !D.buoc) { try { CS().lam(h, { viec: "nhan" }, bot.key); } catch {} return; } // chưa nhận / vừa xong vòng: nhận vòng mới (lỗi thường: đội đang đánh boss — nhịp sau thử lại, không ghi log)
    if (D.buoc === 2) { try { CS().lam(h, { viec: "nop" }, bot.key); } catch {} return; } // có hồn trong túi thì nộp (hết trần ngày / hết hồn thì thôi)
    if (D.buoc >= 4 && bot.mode !== "hd" && bot.mode !== "chet") {
      if (!CS().botMienPhi(bot.key, D.vong) && (h.gold | 0) < CS().muc(D.vong).phi) return; // chưa đủ phí: chờ kiếm tiền, không gọi xacNhan để khỏi spam log loi() mỗi nhịp (vòng 10 miễn phí cho bot — Huy chốt 15:44 28/11/2026)
      const kq = CS().lam(h, { viec: "xacNhan" }, bot.key);
      if (kq && kq.chuyenSinh) {
        boMucTieu(bot); bot.baiTrain = null; bot.mode = "ve";
        log(`chuyển sinh lần ${kq.chuyenSinh} — về cấp 90, về thành (${h.name})`);
      }
    }
  } catch (e) { log(`chuyển sinh lỗi (${bot.h && bot.h.name}):`, e.message); }
}

function tickBot(bot) {
  try {
    try { ONL().dem(bot.h, bot.key, false); } catch {} // online tích lũy theo nhịp thật (≤90 giây mới tính)
    lamMoiTab(bot); // lên cấp thì bảng chiêu theo kịp (chiêu/tiềm năng mới chỉ áp ở thành — như người chơi cộng điểm)
    hdChuyenSinh(bot); // Q6: bot cấp 200 thì đi chuỗi chuyển sinh (nhận/nộp/xác nhận); bước 1 + 3 chạy qua đúng gietQuai/ghiDau sẵn có
    if (bot.mode === "hd") { hdTick(bot); return; }
    // Chạm trần exp/ngày thì không vào hoạt động nữa (kể cả đang bày sạp) — về nghỉ ở thành.
    if ((bot.mode === "luyen" || bot.mode === "cho") && !DO_MODE && !hetTran(bot)) hdKiemTra(bot); // hoạt động có giờ: vào đúng cửa, hết thì về train/sạp
    if (bot.mode === "hd") { hdTick(bot); return; }
    if (bot.mode === "luyen") {
      // Chạm trần: dừng giết, về thành nghỉ (bày sạp/ngồi chơi) tới ngày mới — không nhận thêm exp.
      if (!DO_MODE && hetTran(bot)) {
        boMucTieu(bot);
        const th = thanhCua(bot);
        bot.mode = "nghi"; bot.zone = th.zone; bot.x = th.stalls[0][0]; bot.y = th.stalls[0][1];
        bot.dir = 2; bot.act = "sit"; bot.daMoSapNghi = false;
        try { DO.baiNay(bot.key, th.zone); } catch {}
        hienDien(bot); viecThanh(bot); luu(bot);
        log(`chạm trần exp/ngày — về thành nghỉ (${bot.h.name}, cấp ${bot.h.lvl})`);
        return;
      }
      const T = baiTrain(bot);
      if (!bot.mucTieu) {
        // Lang thang đi BỘ (28/11/2026): trước gán thẳng vị trí mỗi nhịp nên bot
        // nhấp nháy lung tung không va chạm; nay chọn đích rồi đi qua buocToi
        // (có va chạm, tốc độ riêng, nghỉ ngẫu nhiên), tới nơi thì đứng đánh/
        // ngó quanh như người cày. Vùng và tần suất đổi chỗ giữ nguyên.
        const lt = bot._langThang;
        const toiDich = lt && Math.hypot(lt[0] - bot.x, (lt[1] - bot.y) * 2) <= 60;
        if (!lt || toiDich || bot.buocKet) {
          if (Math.random() < 0.3) { // đứng lại: đánh/ngó quanh, nghỉ 1 nhịp
            bot._langThang = null; bot.dir = ri(0, 7);
            bot.act = Math.random() < 0.7 ? "attack" : "stand";
            bot._nghiTuTick = tickN; bot._nghiDenTick = tickN + 1;
          } else {
            bot._langThang = [
              Math.max(T.cx - T.r, Math.min(T.cx + T.r, bot.x + ri(-250, 250))),
              Math.max(T.cy - T.r, Math.min(T.cy + T.r, bot.y + ri(-150, 150))),
            ];
          }
        }
        if (bot._langThang) {
          const ox = bot.x, oy = bot.y;
          buocToi(bot, bot._langThang[0], bot._langThang[1], 200);
          bot.act = (bot.x !== ox || bot.y !== oy) ? "run" : "stand";
        }
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
      if (Date.now() - bot.chetLuc >= 3000) { bot.mode = "ve"; hoiDay(bot); log(`hồi sinh ở ${thanhCua(bot).ten} (${bot.h.name}), máu / nội lực đầy`); }
    } else if (bot.mode === "ve") {
      const th = thanhCua(bot);
      bot.zone = th.zone; bot.x = th.stalls[0][0]; bot.y = th.stalls[0][1]; bot.dir = 2; bot.act = "stand";
      // Bình mua bằng lượng farm được ở viecThanh (muaBinh) — KHÔNG cấp phát miễn phí như P2 cũ.
      DO.baiNay(bot.key, th.zone); hienDien(bot); viecThanh(bot); bot.mode = "ban"; bot.kills = 0; luu(bot);
    } else if (bot.mode === "ban") {
      if (DO_MODE) { // đo lường: bỏ qua sạp, về train ngay để đo grind thuần
        bot.mode = "luyen"; capNhatBai(bot); veBaiTrain(bot); bot.act = "run"; luu(bot);
      } else {
        napLai(bot); // bán hàng trong lúc bày sạp ghi thẳng tệp (cho-troi.js "mua"): nạp lại trước khi mở sạp, khỏi bị luu() ghi đè mất tiền bán + khỏi bày lại món đã bán
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
        napLai(bot); // như trên: tiền bán + món đã bán + tin báo sạp nằm ở tệp, nạp lại trước khi đóng sạp khỏi ghi đè mất
        dongSap(bot);
        bot.mode = "luyen"; capNhatBai(bot); veBaiTrain(bot); bot.act = "run";
        hoiDay(bot); luu(bot);
        log(`đóng sạp, ra train tiếp (${bot.h.name})`);
      }
    } else if (bot.mode === "nghi") {
      // Nghỉ vì chạm trần: ở thành, bày sạp nếu có đồ ngon, ngồi chơi, vẫn trả lời chat qua hiện diện.
      const th = thanhCua(bot);
      bot.zone = th.zone; bot.act = "sit";
      if (!(bot.h.sap && bot.h.sap.mo) && !bot.daMoSapNghi) {
        bot.x = th.stalls[0][0]; bot.y = th.stalls[0][1];
        bot.daMoSapNghi = true;
        napLai(bot); // như nhánh "ban": nạp lại trước khi mở sạp (chưa kiểm đường "nghi" — cần bot chạm trần ngày)
        if (moSap(bot)) { bot.stallDen = Date.now() + STALL_MS; bot.raoDen = Date.now() + ri(5, 15) * 1000; } // ĐX-1: rao lần đầu 5–15 giây sau khi mở sạp
      }
      if (bot.h.sap && bot.h.sap.mo && Date.now() >= (bot.raoDen || 0)) raoBan(bot);
      if (!hetTran(bot)) { // ngày mới: đóng sạp (nếu có), ra train tiếp
        if (bot.h.sap && bot.h.sap.mo) { napLai(bot); dongSap(bot); }
        bot.daMoSapNghi = false;
        bot.mode = "luyen"; capNhatBai(bot); veBaiTrain(bot); bot.act = "run";
        hoiDay(bot); luu(bot);
        log(`hết nghỉ — ra train tiếp (${bot.h.name}, cấp ${bot.h.lvl})`);
      }
    }
    if ((tickN + bot.idx) % 20 === 0) { if (bot.mode === "cho" || bot.mode === "nghi") napLai(bot); luu(bot); } // ngồi bán / ngồi nghỉ: h không đổi trong bộ nhớ, nạp lại trước khi lưu để khỏi ghi đè mất tiền bán + món đã bán (ghi thẳng tệp lúc bày sạp)
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
  if (bot.mode !== "luyen" || O_THANH(bot.zone)) return { ok: false, lyDo: "vung-an-toan" };
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
    if (b.mode !== "luyen" || O_THANH(b.zone) || !b.chiSo || b.hpCur <= 0) continue;
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
    // Nhích chỗ lúc đánh (28/11/2026): trước gán thẳng vị trí; nay qua buocToi
    // bước nhỏ (có va chạm), nhìn như dịch chân lúc đánh.
    buocToi(bot,
      Math.max(bot.x - 20, Math.min(bot.x + 20, bot.x + ri(-20, 20))),
      Math.max(bot.y - 12, Math.min(bot.y + 12, bot.y + ri(-12, 12))), 48);
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
  // Kênh bang (CH_TONG — Huy 16:09 28/11/2026: bot như người chơi thật, chat bang như người chơi):
  // trả lời cả tin hỏi ở kênh bang; tin hệ thống kênh bang (name rỗng) thì không.
  if (msg.ch !== "CH_WORLD" && msg.ch !== "CH_NEARBY" && msg.ch !== "CH_CITY" && msg.ch !== "CH_TEAM" && msg.ch !== "PRIVATE" && msg.ch !== "CH_TONG") return;
  const n = msg.name || "", txt = String(msg.text || "");
  if (!n || n === bot.h.name || !txt.trim()) return;
  if (tenBot.has(n)) return; // tin của bot khác trong bầy — chỉ trả lời người chơi thật
  if (bot.traLoiDen && Date.now() < bot.traLoiDen) return; // 10 giây mới trả lời cùng người 1 lần
  const rieng = msg.ch === "PRIVATE";
  const t = boDau(txt);
  // Kênh công khai: 1 câu hỏi chỉ 1 bot nhận (theo nội dung, hết hạn 10s) — khỏi 170
  // con cùng trả lời 1 câu. Tin mật chỉ đúng bot nhận nên khỏi nhận.
  if (!rieng && !nhanCauHoi(msg)) return;
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
  } else {
    // Câu hỏi tự do (chào, giúp, hỏi thân phận, mọi câu khác): AI TRẢ LỜI TRỰC TIẾP
    // (Huy 10:18 27/11/2026 — "cho ai trả luôn trả lời đi"), không qua cửa tiết lưu
    // kênh chung 30s; cửa đó chỉ còn giữ cho tin rao. Câu mẫu từng
    // nhánh chỉ dùng khi AI không nhận (tắt/hàng đầy) — không bao giờ im lặng.
    // Nhánh giá/ở đâu ở trên giữ nguyên (số liệu hệ thống, không qua AI).
    let mau;
    if (/(giup|giúp|huong dan|hướng dẫn|lam gi|làm gì)/.test(t)) mau = "Muốn mua đồ thì ghé sạp ta ở Biện Kinh. Hỏi giá thì gõ 'giá'. Ta chỉ nói một lần.";
    else if (/(xin chao|xin chào|hello|chao|chào)/.test(t)) mau = "Ờ. Cần gì thì nói mau.";
    else if (/(ban co|bạn có|may co|mày có|npc|bot|nguoi may|người máy|ai quan ly|ai quản lý)/.test(t)) mau = "Ta là nhân vật máy do máy chủ chạy. Train quái, bán đồ, đánh trả như người chơi. Có việc thì nói, không thì tránh ra.";
    else mau = "Hỏi giá thì gõ 'giá', hỏi chỗ thì gõ 'ở đâu'. Đừng nói nhảm.";
    const guiAI = (t) => { try { TG.chat(bot.fakeTk, { o: 0, ch: msg.ch || "CH_WORLD", t, ...(rieng ? { toi: n } : {}) }); } catch (e) { log(`trả lời AI lỗi (${bot.h.name}):`, e.message); } };
    const nhan = AIQL.hoi({
      // toaDoClient: tọa độ DẠNG CLIENT như ĐX-2, tính từ vị trí thật lúc hỏi (thống nhất
      // 27/11/2026 — câu AI không còn kèm tọa độ thô "(x, y)" nữa); null thì ai-quan-ly.js tự rơi về dạng thô.
      bot: { ten: bot.h.name, facKey: bot.cfg.facKey || bot.h.facKey, zone: bot.zone, zoneTen: DO.tenBai(bot.zone), x: bot.x, y: bot.y, toaDoClient: toaDoClient(bot) },
      cauHoi: txt, rieng,
      gui: guiAI,
      duPhong: () => mau,
    });
    if (nhan) { bot.traLoiDen = Date.now() + 10000; return; } // AI đã nhận: giữ nhịp 10s/bot như cũ, khỏi nhận thêm câu khác trong lúc chờ AI
    noi = mau;
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
// Chuyển động chân thật (28/11/2026 — Huy: bot nhìn không chân thật): tốc độ
// riêng từng con + nghỉ ngẫu nhiên 1 nhịp khi đi đường không mục tiêu. Chỉ đổi
// CÁCH ĐI NHÌN THẤY: đích đến, va chạm, tốc độ trung bình cả bầy không đổi.
const _tocDoCua = (bot) => {
  if (bot._tocDo) return bot._tocDo;
  bot._tocDo = 0.92 + ((tkHash(`toc|${bot.cfg.acct}`) % 1000) / 1000) * 0.16;
  return bot._tocDo;
};
const _dirCua = (dx, dy2) => (Math.round(Math.atan2(-dx, dy2) / (Math.PI / 4)) % 8 + 8) % 8; // giống src/dir.js
const _coTheNghi = (bot) => { // đi đường không mục tiêu: 5% nghỉ 1 nhịp (lệch pha cả bầy)
  if (bot.mucTieu || bot.buocKet) return;
  if (Math.random() < 0.05) { bot._nghiTuTick = tickN; bot._nghiDenTick = tickN + 1; }
};
function buocToi(bot, x, y, buoc = 160) {
  buoc *= _tocDoCua(bot); // tốc độ riêng từng con, trung bình cả bầy không đổi
  // Nghỉ 1 nhịp đã chốt từ nhịp trước (chỉ đi đường không mục tiêu mới nghỉ).
  if (!bot.mucTieu && bot._nghiTuTick != null && tickN > bot._nghiTuTick && tickN <= bot._nghiDenTick) {
    bot.act = "stand"; return false;
  }
  // Chống xuyên tường (27/11/2026): bước thẳng cũ đi xuyên ô vật cản; nay kiểm tra toàn bộ đoạn
  // bước theo lưới j.obs (tkDiDuoc, ô 24×12, mẫu mỗi 6 đơn vị để không nhảy qua tường mỏng),
  // kẹt thì trượt dọc tường (lệch ±30°/±60°), kẹt hẳn thì đứng lại + báo bot.buocKet để nhịp gọi
  // chọn lại mục tiêu/điểm — không dịch chuyển tức thời, không kẹt vĩnh viễn.
  // Sửa 28/11/2026 (lỗ nhánh d <= buoc): trước đây đoạn ngắn chỉ kiểm ô đích nên bước thẳng
  // xuyên tường mỏng (đo 8 đoạn/trận Tống Kim); nay kiểm toàn bộ đoạn, mẫu mỗi 6 đơn vị
  // (tỉ lệ như nhánh xa); bị chặn thì bước từng phần có trượt như nhánh xa (độ dài bước = d,
  // không vượt đích) thay vì đứng chết.
  bot.buocKet = false;
  const dx = x - bot.x, dy = (y - bot.y) * 2, d = Math.hypot(dx, dy);
  if (d <= buoc) {
    const n = Math.max(1, Math.ceil(d / 6));
    let thong = true;
    for (let i = 1; i <= n; i++) {
      if (!tkDiDuoc(bot.zone, bot.x + (dx * i) / n, bot.y + ((y - bot.y) * i) / n)) { thong = false; break; }
    }
    if (thong) { bot.x = x; bot.y = y; _coTheNghi(bot); return true; }
    // Bị chặn giữa đường: rơi xuống bước từng phần có trượt bên dưới.
  }
  const goc = Math.atan2(dy, dx);
  const dai = Math.min(d, buoc); // nhánh xa: dai = buoc như cũ; đoạn ngắn bị chặn: không vượt đích
  for (const lech of [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3]) {
    const a = goc + lech, sx = Math.cos(a) * dai, sy = (Math.sin(a) * dai) / 2;
    // Mẫu theo độ dài ĐÃ TỈ LỆ (dai/6): ô lưới 24×12, mẫu thưa theo hypot chưa tỉ lệ
    // nhảy qua góc tường ở bước gần dọc (đo đơn vị 28/11/2026: 1/40 lọt).
    const n = Math.max(1, Math.ceil(dai / 6));
    let k = n;
    for (let i = 1; i <= n; i++) {
      if (!tkDiDuoc(bot.zone, bot.x + (sx * i) / n, bot.y + (sy * i) / n)) { k = i - 1; break; }
    }
    if (k > 0) { bot.x += (sx * k) / n; bot.y += (sy * k) / n; _coTheNghi(bot); return false; }
  }
  bot.buocKet = true; return false;
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
  const cho = (D.loai === "tran" && !D.batDau) ? tkChoDung(bot, dk.phe, D) : null; // vào sớm: về thẳng chỗ đứng riêng, không chồng ở điểm trại (Huy lệnh 22:03 27/11/2026)
  dichChuyen(bot, vao ? vao.zone : D.bai, cho ? cho[0] : (vao && vao.at ? vao.at[0] : trai[0]), cho ? cho[1] : (vao && vao.at ? vao.at[1] : trai[1]));
  const m = TK().botVao(bot.cfg.acct, bot.h, 0, bot.hpMax);
  if (!m) return false;
  bot.hdNgay.tk = key;
  batDauHd(bot, "tk", { phe: dk.phe });
  return true;
}
// Tản ra trong Tống Kim (27/11/2026): trước đây mọi bot áp sát đúng điểm mục tiêu nên chồng lên nhau (đo thật: 148/170 bot trong vòng R=300, khoảng cách gần nhất ~0).
// Mỗi bot giữ 1 góc + bán kính riêng quanh mục tiêu + bị đẩy khỏi bot cùng phe gần đó. Sát thương không đổi (botDanh/botBiDanh không xét khoảng cách).
function gocTan(bot) { let h = 0; const s = String((bot.cfg && bot.cfg.acct) || ""); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function diemTan(bot, x, y, phe, keyMuc) {
  const h = gocTan(bot), g = (h % 360) * Math.PI / 180, R = 120 + (h % 60);
  let nx = x + R * Math.cos(g), ny = y + (R / 2) * Math.sin(g);
  const day = (ox, oy) => {
    const d = Math.hypot(ox - nx, (oy - ny) * 2);
    if (d < 60) {
      if (d > 0.01) { const k = (60 - d) / d; nx += (nx - ox) * k; ny += ((ny - oy) * k) / 2; }
      else { nx += 60 * Math.cos(g + 1); ny += 30 * Math.sin(g + 1); }
    }
  };
  for (const o of bots) {
    if (o === bot || !o.hd || o.hd.loai !== "tk" || o.hd.phe !== phe) continue;
    day(o.x, o.y);
    const t = o.hd.tkMuc; // điểm tản đã chốt của bot cùng phe nhắm cùng mục tiêu: ổn định hơn vị trí tức thời (sửa chạy loạn 27/11/2026)
    if (t && t.key === keyMuc && t.sx != null) day(t.sx, t.sy);
  }
  if (!tkDiDuoc(bot.zone, nx, ny)) { // điểm tản trong tường: kẹp về ô đi được gần nhất (chống xuyên tường 27/11/2026)
    let tim = false;
    for (let r = 24; r <= 480 && !tim; r += 24) {
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4, px = nx + r * Math.cos(a), py = ny + (r / 2) * Math.sin(a);
        if (tkDiDuoc(bot.zone, px, py)) { nx = px; ny = py; tim = true; break; }
      }
    }
    if (!tim) { nx = x; ny = y; } // sâu trong vùng tường: về vị trí neo (mục tiêu/doanh — ô đi được trong thực tế), khỏi đứng ở điểm cấm
  }
  return [nx, ny];
}
// ---- chỗ đứng chờ Tống Kim (Huy lệnh 22:03 27/11/2026): mỗi bot 1 chỗ RIÊNG, tản ra, đứng yên như người chơi thật ----
// Ô đi được phía máy chủ: đọc đúng lưới j.obs như client map.js (bit 1 = vật cản, ô 24×12), qua N.ZONES[].jmo như cho-troi.js đọc jmo.an.
const TK_JMO = (() => { try { const F = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets/web/map/full/index.json"), "utf8")); return F && F.jmo ? F.jmo : null; } catch { return null; } })();
const TK_OBS = new Map();
function tkDiDuoc(bai, x, y) {
  const Z = N.ZONES.get(bai | 0), J = Z && TK_JMO && TK_JMO[Z.jmo];
  if (!J || !J.obs) return x >= 0 && y >= 0; // không lưới: trong khung như client khi grid null (vùng gọi đã giới hạn)
  let g = TK_OBS.get(Z.jmo);
  if (!g) TK_OBS.set(Z.jmo, (g = { b: Buffer.from(J.obs, "base64"), gw: J.gw, gh: J.gh, cw: J.cw, ch: J.ch }));
  const cx = Math.floor(x / g.cw), cy = Math.floor(y / g.ch);
  if (!(cx >= 0 && cy >= 0 && cx < g.gw && cy < g.gh)) return false;
  const i = cy * g.gw + cx;
  return ((g.b[i >> 3] >> (i & 7)) & 1) === 0;
}
function tkHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ----- Bẫy cổng hậu doanh phía máy chủ (sửa 28/11/2026 — Huy duyệt 00:58) -----
// Người chơi ra khỏi hậu doanh bằng bẫy ra.bay -> ra.toi (tongkim.js bay /
// tkbot.js tkRaHau); phía máy chủ trước đây không có code bẫy nào nên bot đi
// bộ thẳng vào hàng rào và kẹt vĩnh viễn. Trường khoảng cách BFS (mốc đường
// tính sẵn): flood-fill 1 lần/trận/phe từ các ô đi được quanh điểm bẫy, bot
// đi theo ô kề có khoảng cách nhỏ dần. Không port A* của client (map.js
// path): nặng, cần cả bộ máy lưới/vùng-liên; BFS đủ vì chỉ cần tới bẫy
// trong cùng vùng-liên, tính 1 lần rồi dùng chung cho cả trận.
const TK_BAY = new Map(); // key gio|kc|phe -> { dist, gw, gh, cw, ch, bay, toi, bayR, rect, ok }
function tkBayDiem(a) { // [x, y] từ JSON thô -> số hữu hạn
  if (!Array.isArray(a)) return [];
  const o = [];
  for (const v of a) if (Array.isArray(v) && Number.isFinite(+v[0]) && Number.isFinite(+v[1])) o.push([+v[0], +v[1]]);
  return o;
}
function tkBayDuLieu(D, phe) {
  const key = `${D.gio || ""}|${D.kc || 0}|${phe}`;
  const cu = TK_BAY.get(key);
  if (cu) return cu;
  const e = { ok: false, dist: null, gw: 0, gh: 0, cw: 24, ch: 12, bay: [], toi: [], bayR: 24, rect: null, veBay: [], veToi: [] };
  TK_BAY.set(key, e);
  if (TK_BAY.size > 4) TK_BAY.delete(TK_BAY.keys().next().value); // chỉ giữ vài trận gần nhất
  try {
    const T = (D.td && Array.isArray(D.td.phe) && D.td.phe[phe]) || {};
    const ra = T.ra || {};
    e.bay = tkBayDiem(ra.bay); e.toi = tkBayDiem(ra.toi);
    const ve = T.ve || {}; // bẫy VỀ (sửa 28/11/2026): cùng entry cache, khỏi tính BFS riêng
    e.veBay = tkBayDiem(ve.bay); e.veToi = tkBayDiem(ve.toi);
    e.bayR = (D.td && +D.td.bayR > 0) ? +D.td.bayR : 24;
    const vg = T.hau && Array.isArray(T.hau.vung) ? T.hau.vung[0] : null;
    if (vg && vg.length >= 4) e.rect = [+vg[0], +vg[1], +vg[2], +vg[3]];
    if (!e.bay.length || !e.toi.length) return e;
    const Z = N.ZONES.get(D.bai | 0), J = Z && TK_JMO && TK_JMO[Z.jmo];
    if (!J || !J.obs) return e;
    let g = TK_OBS.get(Z.jmo);
    if (!g) TK_OBS.set(Z.jmo, (g = { b: Buffer.from(J.obs, "base64"), gw: J.gw, gh: J.gh, cw: J.cw, ch: J.ch }));
    const { b, gw, gh, cw, ch } = g;
    e.gw = gw; e.gh = gh; e.cw = cw; e.ch = ch;
    const di = (cx, cy) => cy * gw + cx;
    const trong = (cx, cy) => cx >= 0 && cy >= 0 && cx < gw && cy < gh && ((b[di(cx, cy) >> 3] >> (di(cx, cy) & 7)) & 1) === 0;
    const dist = new Int32Array(gw * gh).fill(-1);
    const q = new Int32Array(gw * gh);
    let head = 0, tail = 0;
    const gieo = (cx, cy) => { const i = di(cx, cy); if (dist[i] < 0) { dist[i] = 0; q[tail++] = i; } };
    // Gieo: mọi ô đi được có tâm trong tầm kích hoạt quanh điểm bẫy (đứng lên
    // là qua cổng, như client giẫm bẫy theo khoảng cách — không cần tới đúng ô).
    const R = e.bayR + 16; // +16 như tkRaHau: đường dừng ở tâm ô đi được gần nhất
    for (const [bx, by] of e.bay) {
      const x0 = Math.max(0, Math.floor((bx - R) / cw)), x1 = Math.min(gw - 1, Math.floor((bx + R) / cw));
      const y0 = Math.max(0, Math.floor((by - R) / ch)), y1 = Math.min(gh - 1, Math.floor((by + R) / ch));
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        if (!trong(cx, cy)) continue;
        if (Math.hypot((cx + 0.5) * cw - bx, ((cy + 0.5) * ch - by) * 2) <= R) gieo(cx, cy);
      }
    }
    if (tail === 0) { // dự phòng: bẫy nằm sâu trong tường, không ô nào trong tầm -> gieo ô đi được gần nhất mỗi điểm bẫy
      for (const [bx, by] of e.bay) {
        let tot = -1, totD = Infinity;
        const x0 = Math.max(0, Math.floor(bx / cw) - 60), x1 = Math.min(gw - 1, Math.floor(bx / cw) + 60);
        const y0 = Math.max(0, Math.floor(by / ch) - 60), y1 = Math.min(gh - 1, Math.floor(by / ch) + 60);
        for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
          if (!trong(cx, cy)) continue;
          const d = Math.hypot((cx + 0.5) * cw - bx, ((cy + 0.5) * ch - by) * 2);
          if (d < totD) { totD = d; tot = di(cx, cy); }
        }
        if (tot >= 0) { dist[tot] = 0; q[tail++] = tot; }
      }
    }
    if (tail === 0) return e;
    while (head < tail) { // 8 hướng, không cắt góc (đúng luật vùng-liên của client)
      const i = q[head++], cx = i % gw, cy = (i / gw) | 0, d = dist[i] + 1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!trong(nx, ny) || dist[di(nx, ny)] >= 0) continue;
        if (dx && dy && !(trong(cx + dx, cy) && trong(cx, cy + dy))) continue;
        dist[di(nx, ny)] = d; q[tail++] = di(nx, ny);
      }
    }
    e.dist = dist; e.ok = true;
  } catch { /* không lưới/dữ liệu: giữ hành vi cũ, không sập nhịp bot */ }
  return e;
}
function tkBayTai(e, x, y) { // khoảng cách BFS từ ô của (x, y) tới bẫy; -1 = khác vùng / không lưới
  if (!e || !e.ok || !e.dist) return -1;
  const cx = Math.floor(x / e.cw), cy = Math.floor(y / e.ch);
  if (!(cx >= 0 && cy >= 0 && cx < e.gw && cy < e.gh)) return -1;
  return e.dist[cy * e.gw + cx];
}
function tkBayTrongRect(e, x, y) { const r = e.rect; return !!r && x >= r[0] && y >= r[1] && x <= r[2] && y <= r[3]; }
function tkBayGan(e, x, y) { // khoảng cách logic tới điểm bẫy gần nhất
  let m = Infinity;
  for (const p of e.bay) { const d = Math.hypot(x - p[0], (y - p[1]) * 2); if (d < m) m = d; }
  return m;
}
function tkBayDiemGan(e, x, y) {
  let tot = null, m = Infinity;
  for (const p of e.bay) { const d = Math.hypot(x - p[0], (y - p[1]) * 2); if (d < m) { m = d; tot = p; } }
  return tot;
}
function tkBayDich(bot, D, phe, e) { // qua cổng: tới 1 điểm ra.toi ngẫu nhiên, lệch vào ô đi được như client dichChuyen
  const c = e.toi[(Math.random() * e.toi.length) | 0];
  let x = c[0], y = c[1];
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 30;
    const nx = c[0] + Math.cos(a) * r, ny = c[1] + Math.sin(a) * r * 0.5;
    if (tkDiDuoc(D.bai, nx, ny)) { x = nx; y = ny; break; }
  }
  dichChuyen(bot, D.bai, Math.round(x), Math.round(y));
  bot.hd.tkMuc = null; bot.hd.mucTk = null; bot.hd.tkKet = 0; // chọn lại mục tiêu/điểm tản ở chiến trường
  bot.act = "stand";
}
// Lệnh đội hiện tại có phải giữ hậu doanh? Đội RÚT (neo luôn là traiTa) hoặc
// đội GIỮ neo traiTa (viTri("traiTa") === D.trai[phe] — so theo tọa độ, khỏi
// động vào chi-huy-tk.js). Dùng chung cho miễn trừ tkBayRa + cổng tkBayVe.
// lenCho đã throttle 5 giây trong capNhat nên gọi thêm mỗi nhịp không tốn.
// Không lệnh / lỗi: false (giữ hành vi cũ: ra cổng đánh).
function tkLenhVeNha(bot, D, phe) {
  try {
    const lenh = CH().lenCho(bot.cfg.acct, D, phe);
    if (!lenh) return false;
    if (lenh.cheDo === "rut") return true;
    if (lenh.cheDo === "giu" && D.trai && D.trai[phe]) {
      const tr = D.trai[phe];
      return Math.abs(lenh.neo[0] - tr[0]) <= 2 && Math.abs(lenh.neo[1] - tr[1]) <= 2;
    }
  } catch {}
  return false;
}
// Bot còn ở phía hậu doanh thì nhịp này chỉ lo ra cổng. Trả true = đã xử
// lý (đi tới bẫy / dịch chuyển), nhịp gọi return; false = đã ở chiến trường.
function tkBayRa(bot, D, phe) {
  const e = tkBayDuLieu(D, phe);
  if (!e || !e.ok) return false;
  const tai = tkBayTai(e, bot.x, bot.y);
  if (!(tai >= 0 || tkBayTrongRect(e, bot.x, bot.y))) return false;
  if (tkLenhVeNha(bot, D, phe)) return false; // giữ hậu doanh (sửa 28/11/2026): đã về nhà thì ở yên, không ra cổng
  if (tkBayGan(e, bot.x, bot.y) <= e.bayR + 16) { tkBayDich(bot, D, phe, e); return true; }
  if (tai > 0) { // đi theo trường BFS: ô kề có khoảng cách nhỏ dần
    const cx = Math.floor(bot.x / e.cw), cy = Math.floor(bot.y / e.ch);
    let tot = null, totD = tai;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (!(nx >= 0 && ny >= 0 && nx < e.gw && ny < e.gh)) continue;
      const d = e.dist[ny * e.gw + nx];
      if (d >= 0 && d < totD) { totD = d; tot = [(nx + 0.5) * e.cw, (ny + 0.5) * e.ch]; }
    }
    if (tot) {
      buocToi(bot, tot[0], tot[1], 200);
      bot.act = bot.buocKet ? "stand" : "run";
      if (!bot.buocKet && tkBayGan(e, bot.x, bot.y) <= e.bayR + 16) tkBayDich(bot, D, phe, e);
      return true;
    }
    bot.act = "stand"; return true;
  }
  if (tai === 0) { bot.act = "stand"; return true; } // đã ở ô bẫy: nhịp sau kích hoạt theo khoảng cách
  // Túi khác vùng (chỗ chờ cũ / ngoài hàng rào): đi thẳng tới điểm bẫy gần
  // nhất — bẫy kích hoạt theo khoảng cách nên qua được cả khi có tường chắn.
  const c = tkBayDiemGan(e, bot.x, bot.y);
  if (c) { buocToi(bot, c[0], c[1], 200); bot.act = bot.buocKet ? "stand" : "run"; }
  else bot.act = "stand";
  return true;
}
// ----- Bẫy cổng VỀ phía máy chủ (sửa 28/11/2026 — Huy lệnh 01:22 "nào hợp lý thì triển khai") -----
// Đối xứng tkBayRa: bot được lệnh về giữ hậu doanh (đội RÚT / đội GIỮ neo traiTa)
// mà còn ở ngoài chiến trường, giẫm bẫy ve.bay -> ve.toi thì về nhà như người
// chơi (tongkim.js bay / tkbot.js tkVe — tọa độ lấy từ D.td, không hardcode).
// CHỈ khi có lệnh về nhà: bot đang đánh mà vô tình giẫm bẫy thì KHÔNG bị giật
// về (người chơi tự chọn đường đi; bot không có "ý định" ngoài lệnh đội —
// giật về giữa lúc đánh sẽ phá đội hình và tạo vòng lặp về <-> ra với tkBayRa).
// Không dữ liệu ve thì giữ hành vi cũ. Trả true = đã dịch chuyển, nhịp gọi return.
function tkBayVe(bot, D, phe) {
  const e = tkBayDuLieu(D, phe);
  if (!e || !e.ok || !e.veBay.length || !e.veToi.length) return false;
  if (!tkLenhVeNha(bot, D, phe)) return false;
  const tai = tkBayTai(e, bot.x, bot.y);
  if (tai >= 0 || tkBayTrongRect(e, bot.x, bot.y)) return false; // đã ở hậu doanh: để tkBayRa / đứng neo xử lý
  let gan = Infinity;
  for (const p of e.veBay) { const d = Math.hypot(bot.x - p[0], (bot.y - p[1]) * 2); if (d < gan) gan = d; }
  if (!(gan <= e.bayR + 16)) return false;
  const c = e.veToi[(Math.random() * e.veToi.length) | 0];
  let x = c[0], y = c[1];
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 30;
    const nx = c[0] + Math.cos(a) * r, ny = c[1] + Math.sin(a) * r * 0.5;
    if (tkDiDuoc(D.bai, nx, ny)) { x = nx; y = ny; break; }
  }
  dichChuyen(bot, D.bai, Math.round(x), Math.round(y));
  bot.hd.tkMuc = null; bot.hd.mucTk = null; bot.hd.tkKet = 0; // về nhà: bỏ mục tiêu/điểm tản cũ, chọn lại sau
  bot.act = "stand";
  return true;
}
// ----- Tìm đường BFS khi kẹt (B2-1 — Huy duyệt 06:46 28/11/2026) -----
// buocToi tham lam (thẳng + trượt ±30°/±60°) kẹt ở hàng rào/hành lang cong:
// cả 5 hướng đều bị chặn ngay mẫu đầu nên bot đứng chết rồi chọn lại đúng mục
// tiêu cũ. Khi kẹt >= 3 nhịp, đi 1 bước theo trường khoảng cách BFS tới điểm
// tản/mục tiêu (tái dùng kiểu tkBayDuLieu: flood-fill từ đích, 8 hướng không
// cắt góc, tính theo nhu cầu, cache theo trận/phe/ô đích, dừng sớm khi tới
// được ô bot — không tính sẵn toàn map). Không lưới/không tới được: null,
// nhịp gọi giữ hành vi cũ. Chỉ dùng trong nhánh kẹt, không đụng buocToi.
const TK_BFS = new Map(); // key gio|kc|phe|cx|cy đích -> {dist: Map, gw, gh, cw, ch, ok}
const TK_BFS_TOI_DA = 6; // số trường giữ lại (đích đổi liên tục theo điểm tản)
const TK_BFS_CELL_TOI_DA = 60000; // chặn flood vô hạn
const TK_THONG_KE = { bfsTinh: 0, bfsBuoc: 0, bfsHong: 0, camBo: 0 }; // chỉ đếm phục vụ đo, không đổi hành vi
function tkBfsBuoc(bot, D, phe, sx, sy) { // 1 bước (tâm ô kề) theo trường BFS; null = không có đường/không lưới
  if (sx == null || sy == null) return null;
  const Z = N.ZONES.get(D.bai | 0), J = Z && TK_JMO && TK_JMO[Z.jmo];
  if (!J || !J.obs) return null;
  let g = TK_OBS.get(Z.jmo);
  if (!g) TK_OBS.set(Z.jmo, (g = { b: Buffer.from(J.obs, "base64"), gw: J.gw, gh: J.gh, cw: J.cw, ch: J.ch }));
  const { b, gw, gh, cw, ch } = g;
  const di = (cx, cy) => cy * gw + cx;
  const trong = (cx, cy) => cx >= 0 && cy >= 0 && cx < gw && cy < gh && ((b[di(cx, cy) >> 3] >> (di(cx, cy) & 7)) & 1) === 0;
  const dcx = Math.floor(sx / cw), dcy = Math.floor(sy / ch);
  const bcx = Math.floor(bot.x / cw), bcy = Math.floor(bot.y / ch);
  const canCell = bcx >= 0 && bcy >= 0 && bcx < gw && bcy < gh ? di(bcx, bcy) : -1;
  const key = `${D.gio || ""}|${D.kc || 0}|${phe}|${dcx}|${dcy}`;
  let e = TK_BFS.get(key);
  if (e && (canCell < 0 || !e.dist.has(canCell))) e = null; // trường cũ dừng sớm trước ô bot này: tính lại
  if (!e) {
    e = { dist: new Map(), gw, gh, cw, ch, ok: false };
    TK_BFS.set(key, e);
    if (TK_BFS.size > TK_BFS_TOI_DA) TK_BFS.delete(TK_BFS.keys().next().value);
    let goc = [];
    if (trong(dcx, dcy)) goc = [[dcx, dcy]];
    else for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (trong(dcx + dx, dcy + dy)) goc.push([dcx + dx, dcy + dy]);
    if (goc.length && canCell >= 0) {
      const q = [];
      for (const [cx, cy] of goc) { const i = di(cx, cy); if (!e.dist.has(i)) { e.dist.set(i, 0); q.push(i); } }
      let head = 0, thay = e.dist.has(canCell);
      while (head < q.length && !thay) {
        const i = q[head++], cx = i % gw, cy = (i / gw) | 0, d = e.dist.get(i) + 1;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy, ni = di(nx, ny);
          if (!trong(nx, ny) || e.dist.has(ni)) continue;
          if (dx && dy && !(trong(cx + dx, cy) && trong(cx, cy + dy))) continue;
          e.dist.set(ni, d); q.push(ni);
          if (ni === canCell) thay = true;
        }
        if (e.dist.size > TK_BFS_CELL_TOI_DA) break;
      }
      e.ok = e.dist.has(canCell);
      if (e.ok) TK_THONG_KE.bfsTinh++;
    }
  }
  if (!e.ok || canCell < 0) { TK_THONG_KE.bfsHong++; return null; }
  const d0 = e.dist.get(canCell);
  if (d0 <= 1) return [sx, sy]; // kề đích: về thẳng đích
  let tot = null, totD = d0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = bcx + dx, ny = bcy + dy;
    if (!(nx >= 0 && ny >= 0 && nx < gw && ny < gh)) continue;
    const d = e.dist.get(di(nx, ny));
    if (d != null && d < totD) { totD = d; tot = [(nx + 0.5) * cw, (ny + 0.5) * ch]; }
  }
  if (!tot) { TK_THONG_KE.bfsHong++; return null; }
  TK_THONG_KE.bfsBuoc++;
  return tot;
}
// B1-3: giới hạn số bot 1 phe dồn Nguyên Soái (độc chiếm Soái khóa trận).
// 6 ≈ 1/3 đội 17 — Soái vẫn có người đánh, còn lại đánh người/quân như cũ.
// Đếm TRỰC TIẾP (không qua demMucLuc cache theo nhịp): cache khiến cả 40 bot
// trong cùng 1 nhịp đều thấy số cũ và cùng lấy Soái (đo 28/11: 20/20 mỗi phe).
const TK_SOAI_TOI_DA = 6;
function tkSoaiDay(phe) {
  let n = 0;
  for (const o of bots) {
    if (!o.hd || o.hd.loai !== "tk" || o.hd.phe !== phe) continue;
    const tm = o.hd.tkMuc;
    if (tm && tm.loai === "soai") n++;
  }
  return n;
}
// B2-3: mục tiêu vừa bị bỏ vì kẹt thì cấm chọn lại 2 nhịp (phá vòng kẹt -> chọn lại đúng mục tiêu cũ).
function tkBiCam(bot, key) { const c = bot.hd && bot.hd.tkCam; return !!(c && c.key === key && tickN < c.den); }
function tkChoTrongBay(D, phe, x, y) { // chỗ đứng chờ phải cùng vùng-liên với bẫy; không dữ liệu bẫy thì giữ hành vi cũ
  const e = tkBayDuLieu(D, phe);
  if (!e || !e.ok) return true;
  return tkBayTai(e, x, y) >= 0;
}
function tkJit(seed, amp) { const h = tkHash(seed); return [(h % (2 * amp + 1)) - amp, ((h >>> 9) % (2 * amp + 1)) - amp]; } // >>> không dấu: >> bị dấu khi h ≥ 2^31 khiến jy tới -54, phá khoảng cách tối thiểu (đo 29,1px 27/11/2026)
// Chỗ đứng chờ: lưới ô 96×96 trong vùng hậu doanh + jitter ±18; mỗi ô tối đa 1 bot/phe/trận -> cách nhau ≥ 60 theo cấu trúc.
// Tính 1 lần lúc vào, lưu bot.tkCho (key = giờ|kc: ổn định qua khởi động lại cùng trận); chỉ nhận điểm đi được.
function tkChoDung(bot, phe, D) {
  const key = `${D.gio || ""}|${D.kc || 0}`;
  const cu = bot.tkCho;
  if (cu && cu.key === key && cu.phe === phe && Array.isArray(cu.at)) return cu.at;
  const T = (D.td && Array.isArray(D.td.phe) && D.td.phe[phe]) || {};
  const vg = T.hau && Array.isArray(T.hau.vung) ? T.hau.vung[0] : null;
  const tam = (D.trai && D.trai[phe]) || [0, 0];
  const x1 = vg ? +vg[0] : tam[0] - 400, y1 = vg ? +vg[1] : tam[1] - 300, x2 = vg ? +vg[2] : tam[0] + 400, y2 = vg ? +vg[3] : tam[1] + 300;
  const OM = 96, cols = Math.max(1, Math.floor((x2 - x1) / OM)), rows = Math.max(1, Math.floor((y2 - y1) / OM)), nO = cols * rows;
  const lay = new Set();
  for (const b of bots) { const c = b.tkCho; if (c && c.key === key && c.phe === phe && c.o != null && b !== bot) lay.add(c.o); }
  const h = tkHash(`${key}|${bot.cfg.acct}|${phe}`);
  let chon = null;
  for (let i = 0; i < nO && !chon; i++) {
    const o = (h + i) % nO;
    if (lay.has(o)) continue;
    const bx = x1 + (o % cols) * OM + OM / 2, by = y1 + ((o / cols) | 0) * OM + OM / 2;
    for (let v = 0; v < 5; v++) {
      const [jx, jy] = tkJit(`${h}:${v}`, 18), px = Math.round(bx + jx), py = Math.round(by + jy);
      if (px < x1 || py < y1 || px > x2 || py > y2 || !tkDiDuoc(D.bai, px, py) || !tkChoTrongBay(D, phe, px, py)) continue;
      chon = { o, at: [px, py] }; break;
    }
  }
  if (!chon) { // hết ô trống/đi được: quét lại mọi ô (bỏ ô đã chiếm), jitter rộng, vẫn kiểm đi được + cách ≥ 48 mọi chỗ đã gán
    const diem = [];
    for (const b of bots) { const c = b.tkCho; if (c && c.key === key && c.phe === phe && Array.isArray(c.at) && b !== bot) diem.push(c.at); }
    const xa = (px, py) => diem.every((q) => (px - q[0]) * (px - q[0]) + (py - q[1]) * (py - q[1]) >= 60 * 60);
    for (let i = 0; i < nO && !chon; i++) {
      const o = (h + i) % nO;
      if (lay.has(o)) continue;
      const bx = x1 + (o % cols) * OM + OM / 2, by = y1 + ((o / cols) | 0) * OM + OM / 2;
      for (let v = 0; v < 40 && !chon; v++) {
        const [jx, jy] = tkJit(`${h}:f${v}`, 30), px = Math.round(bx + jx), py = Math.round(by + jy);
        if (px >= x1 && py >= y1 && px <= x2 && py <= y2 && xa(px, py) && tkDiDuoc(D.bai, px, py) && tkChoTrongBay(D, phe, px, py)) chon = { o, at: [px, py] };
      }
    }
    if (!chon) { // vẫn không có: lấy mẫu 200 điểm trong vùng, chọn điểm xa nhất so với các chỗ đã gán (maximin), vẫn kiểm đi được
      let tot = null, totD = -1;
      for (let v = 0; v < 200; v++) {
        const [jx, jy] = tkJit(`${h}:m${v}`, 100000), px = x1 + ((jx % (x2 - x1)) + (x2 - x1)) % (x2 - x1), py = y1 + ((jy % (y2 - y1)) + (y2 - y1)) % (y2 - y1);
        if (!tkDiDuoc(D.bai, px, py) || !tkChoTrongBay(D, phe, px, py)) continue;
        const dmin = diem.length ? Math.min(...diem.map((q) => (px - q[0]) * (px - q[0]) + (py - q[1]) * (py - q[1]))) : 1e12;
        if (dmin > totD) { totD = dmin; tot = [px, py]; }
      }
      chon = tot ? { o: -1, at: tot } : { o: -1, at: [Math.round(tam[0]), Math.round(tam[1])] };
    }
  }
  bot.tkCho = { key, phe, o: chon.o, at: chon.at };
  return chon.at;
}
// dem bot cung phe dang nham moi muc tieu — tinh 1 lan moi nhip 1500ms, chon muc tieu tan ra (toi da 3 bot/muc tieu, het thi lay gan nhat)
let demMucTick = -1, demMuc = new Map();
function demMucLuc() {
  if (demMucTick === tickN) return demMuc;
  demMucTick = tickN; demMuc = new Map();
  for (const o of bots) {
    if (!o.hd || o.hd.loai !== "tk" || !o.hd.mucTk) continue;
    const k = o.hd.phe + "|" + o.hd.mucTk;
    demMuc.set(k, (demMuc.get(k) || 0) + 1);
  }
  return demMuc;
}
// Dính mục tiêu + vùng chết (sửa chạy loạn 27/11/2026 — giữ nguyên luật 3 bot/mục tiêu + chống chồng đống,
// giữ nguyên cơ chế sát thương botDanh/botBiDanh không xét khoảng cách):
// bot giữ mục tiêu tới khi mục tiêu chết/mất/xa quá ngưỡng mới chọn lại; tới trong vùng chết quanh
// điểm tản đã chốt thì ĐỨNG YÊN đánh, không bước nữa. Điểm tản chỉ tính lúc chọn mục tiêu (hoặc khi
// mục tiêu dịch đáng kể), không tính lại mỗi nhịp từ vị trí tức thời của hàng xóm (điểm đến rung
// liên tục làm bot không bao giờ tới nơi nên chạy vòng mãi).
const TK_GIU_XA = 900;    // giữ mục tiêu đang dính tới khi xa hơn ngưỡng này mới chọn lại
const TK_VUNG_CHET = 120; // trong vùng này quanh điểm tản đã chốt thì đứng yên, không bước tiếp
const TK_TAN_DICH = 150;  // mục tiêu dịch quá ngưỡng này (so với lúc chốt điểm tản) thì tính lại điểm tản
function buocToiTan(bot, sx, sy) {
  if (sx == null || sy == null) return true; // chưa có điểm tản: đứng yên, khỏi chạy giả
  const d = Math.hypot(sx - bot.x, (sy - bot.y) * 2);
  if (d <= TK_VUNG_CHET) return true;
  const toi = buocToi(bot, sx, sy, 200);
  return bot.buocKet ? "ket" : toi; // kẹt tường: báo riêng để nhịp gọi đứng lại + chọn lại điểm/mục tiêu
}
function datMucTk(bot, phe, tm) {
  const p = tm.x == null ? null : diemTan(bot, tm.x, tm.y, phe, tm.key);
  tm.sx = p ? p[0] : null; tm.sy = p ? p[1] : null; tm.ax = tm.x; tm.ay = tm.y;
  bot.hd.tkMuc = tm; bot.hd.mucTk = tm.key;
  return tm;
}
function mucTkHien(bot, D, phe) {
  const tm = bot.hd && bot.hd.tkMuc;
  if (!tm) return null;
  // Nguyên Soái địch vừa xuất hiện thì dồn vào ngay (giữ luật cũ: soái luôn ưu tiên nhất) —
  // trừ khi đã đủ người dồn (B1-3) hoặc bot này vừa bị cấm chọn Soái vì kẹt (B2-3): giữ mục tiêu cũ.
  if (tm.loai !== "soai") {
    for (const e of D.binh.values()) if (e.phe !== phe && e.bac === 5 && e.mau > 0 && tkSoaiDay(phe) < TK_SOAI_TOI_DA && !tkBiCam(bot, "soai" + e.id)) return null;
  }
  let x = null, y = null, ok = false;
  if (tm.loai === "soai") {
    const e = D.binh.get(tm.id);
    if (e && e.phe !== phe && e.bac === 5 && e.mau > 0) { x = e.x; y = e.y; ok = true; }
  } else if (tm.loai === "nguoi") {
    const mm = TK().botNguoi(tm.tk);
    if (mm && mm.hp > 0) { const p = TG.dangChoi(tm.tk); if (p && p.zone === D.bai) { x = p.x; y = p.y; ok = true; } }
  } else {
    const b = D.bot.get(tm.id) || D.binh.get(tm.id);
    if (b && b.phe !== phe && !b.chet && b.mau > 0) {
      ok = true;
      const v = D.vt.get(tm.id);
      if (v) { x = v[0]; y = v[1]; }
    }
  }
  if (!ok) return null;
  if (x != null) {
    if (Math.hypot(x - bot.x, (y - bot.y) * 2) > TK_GIU_XA) return null; // mục tiêu chạy quá xa: chọn lại
    if (tm.sx == null || tm.ax == null || Math.hypot(x - tm.ax, (y - tm.ay) * 2) > TK_TAN_DICH) {
      const p = diemTan(bot, x, y, phe, tm.key);
      tm.sx = p[0]; tm.sy = p[1]; tm.ax = x; tm.ay = y;
    }
    tm.x = x; tm.y = y;
  }
  bot.hd.mucTk = tm.key;
  return tm;
}
function chonMucTk(bot, D, phe, neoL) {
  // Thứ tự ưu tiên giữ như cũ: Nguyên Soái địch > người địch gần nhất > bot/quân địch,
  // với 3 nới theo Huy duyệt 06:46 28/11/2026: B1-3 Soái có trần dồn, B1-1 đội CÔNG
  // được đánh quân khi hết người địch trong tầm giao chiến, B2-3 cấm chọn lại mục tiêu vừa bỏ vì kẹt.
  const soaiDu = tkSoaiDay(phe) >= TK_SOAI_TOI_DA;
  for (const e of D.binh.values()) {
    if (e.phe === phe || e.bac !== 5 || !(e.mau > 0)) continue;
    if (!soaiDu && !tkBiCam(bot, "soai" + e.id)) return datMucTk(bot, phe, { loai: "soai", key: "soai" + e.id, id: e.id, x: e.x, y: e.y, binh: true });
    break; // Soái đã đủ người dồn / bị cấm: xuống nhánh dưới, không xét Soái nữa
  }
  const ds = [];
  for (const x of D.nguoi.values()) {
    if (x.phe === phe || x.tk === bot.cfg.acct) continue;
    if (!x.bot) continue; // người thật: máu do trình duyệt họ tự trừ, bot không có đường gửi đòn tới — chỉ đánh được bot/người-máy khác
    const mm = TK().botNguoi(x.tk); if (!mm || !(mm.hp > 0)) continue;
    const p = TG.dangChoi(x.tk);
    if (!p || p.zone !== D.bai) continue;
    ds.push({ d: Math.hypot(p.x - bot.x, (p.y - bot.y) * 2), tk: x.tk, x: p.x, y: p.y });
  }
  ds.sort((a, b) => a.d - b.d);
  const dem = demMucLuc();
  // B1-1: đội CÔNG chỉ ưu tiên người khi còn người địch trong tầm giao chiến của đội
  // (quanh neo, bán kính bk); hết thì xuống đánh quân. Đội GIỮ/RÚT giữ thứ tự cũ.
  // Không có lệnh đội: coi như CÔNG, tầm quanh vị trí bot, bk 600 như đội công.
  const cheDo = neoL ? neoL.cheDo : "cong";
  const tam = neoL ? neoL.neo : [bot.x, bot.y];
  const bk = neoL ? (neoL.bk || 600) : 600;
  const hetNguoiGan = cheDo === "cong" && !ds.some((c) => Math.hypot(c.x - tam[0], (c.y - tam[1]) * 2) <= bk);
  if (!hetNguoiGan) {
    const chon = ds.find((c) => !tkBiCam(bot, c.tk) && (dem.get(phe + "|" + c.tk) || 0) < 3) || ds.find((c) => !tkBiCam(bot, c.tk));
    if (chon) return datMucTk(bot, phe, { loai: "nguoi", key: chon.tk, tk: chon.tk, x: chon.x, y: chon.y, nguoi: true });
  }
  const vt = D.vt, ds2 = [];
  for (const b of [...D.bot.values(), ...D.binh.values()]) {
    if (b.phe === phe || b.chet || !(b.mau > 0)) continue;
    if (b.bac === 5 && (soaiDu || tkBiCam(bot, "soai" + b.id))) continue; // B1-3: Soái không dồn qua nhánh quân
    const v = vt.get(b.id);
    let bx = v ? v[0] : null, by = v ? v[1] : null;
    // B1-2: dự phòng khi vt rỗng (không có trình duyệt chủ trận báo vị trí).
    // ĐÃ XÁC MINH 28/11/2026: quân KHÔNG di chuyển phía máy chủ (e.x/e.y chỉ đổi
    // lúc sinh/hồi sinh — đó là điểm nhà, không phải vị trí đang đánh); bot máy
    // chủ D.bot không có x/y. Dùng điểm nhà cho quân (đánh theo mã, sát thương
    // botDanh không xét khoảng cách nên đòn vẫn trúng thật), bot máy chủ giữ null
    // (đánh mù như nhánh x==null cũ). Ghi rõ: tọa độ này TĨNH, không phải vị trí sống.
    if (bx == null && Number.isFinite(+b.x) && Number.isFinite(+b.y)) { bx = +b.x; by = +b.y; }
    ds2.push({ d: bx == null ? 1e9 : Math.hypot(bx - bot.x, (by - bot.y) * 2), id: b.id, x: bx, y: by, binh: !!b.bac });
  }
  ds2.sort((a, b) => a.d - b.d);
  const chon2 = ds2.find((c) => !tkBiCam(bot, "b" + c.id) && (dem.get(phe + "|b" + c.id) || 0) < 3) || ds2.find((c) => !tkBiCam(bot, "b" + c.id));
  if (chon2) return datMucTk(bot, phe, { loai: "bot", key: "b" + chon2.id, id: chon2.id, x: chon2.x, y: chon2.y, binh: chon2.binh });
  return null;
}
function diemDoanh(bot, D, phe) {
  // Điểm tản ở doanh địch: doanh không di chuyển nên chốt 1 lần cho cả trận, khỏi tính lại mỗi nhịp.
  const hd = bot.hd;
  if (!hd.tkDoanh) { const tr = D.trai[1 - phe]; const p = diemTan(bot, tr[0], tr[1], phe, "doanh"); hd.tkDoanh = { sx: p[0], sy: p[1] }; }
  return hd.tkDoanh;
}
// Điểm tản quanh neo của đội (chỉ huy tổ đội): cache theo khoa lệnh, kẹp ô đi được qua diemTan sẵn có (không viết lại kiểm tra tường).
function neoTam(bot, neoL, phe) {
  const hd = bot.hd;
  if (!hd.tkNeo || hd.tkNeo.khoa !== neoL.khoa) {
    const p = diemTan(bot, neoL.neo[0], neoL.neo[1], phe, "neo" + neoL.khoa);
    hd.tkNeo = p ? { khoa: neoL.khoa, sx: p[0], sy: p[1] } : { khoa: neoL.khoa, sx: neoL.neo[0], sy: neoL.neo[1] };
  }
  return hd.tkNeo;
}
function veNeo(bot, D, phe, neoL) { return neoL ? neoTam(bot, neoL, phe) : diemDoanh(bot, D, phe); }
function hdTkTick(bot) {
  const D = TK()._thu.D;
  if (!D || D.ket) return ketThucHd(bot, "trận xong");
  const m = TK().botNguoi(bot.cfg.acct);
  if (!m) return ketThucHd(bot, "không còn trong phòng");
  if (D.loai === "tran" && !D.batDau) { // pha chờ (vào sớm — Huy lệnh 22:03 27/11/2026): đứng yên tại chỗ đứng riêng, không đi lại, không chạy sang doanh địch
    const cd = tkChoDung(bot, m.phe, D);
    if (Math.hypot(cd[0] - bot.x, cd[1] - bot.y) > 30) dichChuyen(bot, D.bai, cd[0], cd[1]); // lệch chỗ (hồi sinh/lạc) -> về chỗ 1 lần, không đi bộ
    bot.act = "stand";
    return;
  }
  if ((m.hp | 0) <= 0) { // chờ hồi sinh ở hậu doanh
    if (Date.now() >= (m.hoiLuc || 0)) { TK().botHoiSinh(bot.cfg.acct); const tr = D.trai[m.phe]; dichChuyen(bot, D.bai, tr[0], tr[1]); }
    bot.hd.tkMuc = null; bot.hd.mucTk = null; bot.hd.tkDoanh = null; bot.hd.tkKet = 0; // chết thì bỏ mục tiêu/điểm tản cũ, hồi sinh chọn lại
    bot.act = "stand"; return;
  }
  const phe = m.phe; // dmg tính lười (donHoatDong trừ nội lực): chỉ tính khi sắp ra đòn thật, khỏi đốt nội lực ở nhịp áp sát
  if (D.batDau && tkBayRa(bot, D, phe)) return; // còn ở hậu doanh: ra cổng bẫy trước, chưa đánh (sửa bẫy cổng 28/11/2026)
  if (D.batDau && tkBayVe(bot, D, phe)) return; // lệnh về giữ hậu doanh: giẫm bẫy về thì về nhà (sửa bẫy về 28/11/2026)
  // Chỉ huy tổ đội (chi-huy-tk.js): lệnh theo đội — neo + bán kính giao chiến; đội đổi lệnh thì giãn xuất phát 0–2 nhịp, khỏi ùa đi cùng lúc.
  let neoL = null;
  try { neoL = CH().lenCho(bot.cfg.acct, D, phe); } catch { neoL = null; }
  if (neoL) {
    if (bot.hd.tkKhoa !== neoL.khoa) { bot.hd.tkKhoa = neoL.khoa; bot.hd.tkChoLenh = tickN + (tkHash(bot.cfg.acct) % 3); }
    if (tickN < (bot.hd.tkChoLenh || 0)) { bot.act = "stand"; return; }
  }
  // Mục tiêu dính: giữ tới khi chết/mất/xa quá ngưỡng mới chọn lại (sửa chạy loạn 27/11/2026).
  let tm = mucTkHien(bot, D, phe) || chonMucTk(bot, D, phe, neoL);
  if (neoL && neoL.cheDo !== "cong" && neoL.cheDo !== "ungCuu" && tm && tm.x != null && Math.hypot(tm.x - neoL.neo[0], (tm.y - neoL.neo[1]) * 2) > neoL.bk) { // mục tiêu ngoài khu vực đội GIỮ/RÚT: bỏ, về neo; đội CÔNG/ỨNG CỨU được giao chiến ngoài bk (sửa veto 28/11/2026)
    bot.hd.tkMuc = null; bot.hd.mucTk = null; bot.hd.tkKet = 0; tm = null; // B2-2: bỏ mục tiêu thì reset đếm kẹt
  }
  if (!tm) { // không còn mục tiêu: về neo đội (có chỉ huy) hoặc tiến về doanh địch (không chỉ huy), tới điểm tản thì đứng chờ
    bot.hd.mucTk = null; bot.hd.tkKet = 0; // B2-2: không mục tiêu thì không còn kẹt tồn đọng
    const c = veNeo(bot, D, phe, neoL);
    const toi0 = buocToiTan(bot, c.sx, c.sy);
    if (toi0 === "ket") { // B2-1: kẹt đường về neo thì thử 1 bước BFS, không đứng chết
      const step = tkBfsBuoc(bot, D, phe, c.sx, c.sy);
      if (step) { buocToi(bot, step[0], step[1], 200); bot.act = bot.buocKet ? "stand" : "run"; }
      else bot.act = "stand";
    } else bot.act = toi0 ? "stand" : "run";
    return;
  }
  if (tm.nguoi) {
    const d = Math.hypot(tm.x - bot.x, (tm.y - bot.y) * 2);
    if (d > 400) {
      // SỬA 26/11/2026 (bot Tống Kim không đánh nhau): còn người địch sống thì áp sát đúng người đó, không rẽ sang quân.
      // Kẹt tường xử lý như nhánh cuối (sửa 28/11/2026): đếm nhịp, tính lại điểm tản, bỏ mục tiêu — khỏi đứng chết vĩnh viễn.
      const toi = buocToiTan(bot, tm.sx, tm.sy);
      if (toi === "ket") {
        const k = (bot.hd.tkKet | 0) + 1; bot.hd.tkKet = k;
        let diDuoc = false;
        if (k >= 3) { // B2-1: kẹt 3 nhịp thì thử 1 bước BFS tới điểm tản; đi được thì hết kẹt
          const step = tkBfsBuoc(bot, D, phe, tm.sx != null ? tm.sx : tm.x, tm.sy != null ? tm.sy : tm.y);
          if (step) { buocToi(bot, step[0], step[1], 200); if (!bot.buocKet) { bot.hd.tkKet = 0; bot.act = "run"; diDuoc = true; } }
        }
        if (!diDuoc) {
          bot.act = "stand";
          if (k % 3 === 0) tm.ax = null;
          if (k >= 10) { // B2-2 + B2-3: bỏ mục tiêu, reset kẹt, cấm chọn lại mục tiêu này 2 nhịp
            bot.hd.tkMuc = null; bot.hd.mucTk = null; bot.hd.tkKet = 0;
            bot.hd.tkCam = { key: tm.key, den: tickN + 2 }; TK_THONG_KE.camBo++;
          }
        }
      } else {
        bot.hd.tkKet = 0;
        bot.act = toi ? "stand" : "run";
      }
      return;
    }
  }
  if (tm.x == null) { // không có vị trí từ chủ trận: về neo đội / tiến về doanh địch, đánh mù trong giới hạn phe/hạn mức
    bot.hd.tkKet = 0; // B2-2: đánh mù ở neo thì không còn kẹt tồn đọng
    const c = veNeo(bot, D, phe, neoL);
    buocToiTan(bot, c.sx, c.sy);
    bot.act = "attack";
    const dmg = donHoatDong(bot);
    if (dmg > 0) TK().botDanh(bot.cfg.acct, [[tm.id, dmg]]);
    return;
  }
  const toi = buocToiTan(bot, tm.sx, tm.sy);
  if (toi === "ket") { // kẹt tường: đứng yên đánh (sát thương không xét khoảng cách), đếm nhịp kẹt để chọn lại điểm/mục tiêu
    bot.act = "attack";
    const k = (bot.hd.tkKet | 0) + 1; bot.hd.tkKet = k;
    if (k % 3 === 0) tm.ax = null; // mỗi 3 nhịp kẹt: tính lại điểm tản ở nhịp sau
    if (k >= 10) { // B2-2 + B2-3: kẹt 10 nhịp: bỏ mục tiêu, chọn lại, cấm chọn lại mục tiêu này 2 nhịp
      bot.hd.tkMuc = null; bot.hd.mucTk = null; bot.hd.tkKet = 0;
      bot.hd.tkCam = { key: tm.key, den: tickN + 2 }; TK_THONG_KE.camBo++;
    }
  } else {
    bot.hd.tkKet = 0;
    bot.act = toi ? "attack" : "run";
  }
  const dmg = donHoatDong(bot);
  if (dmg <= 0) return;
  if (tm.nguoi) TK().botBiDanh(tm.tk, bot.cfg.acct, dmg);
  else TK().botDanh(bot.cfg.acct, [[tm.id, dmg]]);
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

// ----- Boss Hoàng Kim: xoay 20 suất/phiên cho bot CẦN dấu chuyển sinh -----
// Trần 20 bot/phiên giữ nguyên như cũ (bot.idx < 20) — chỉ đổi NGƯỜI được chọn: ưu tiên bot đang ở
// bước 3 (cần dấu Boss), ít dấu nhất trước; còn suất thì bot khác. Xếp hạng tính lại khi đổi phiên
// hoặc mỗi 60 giây (dấu chỉ đổi khi boss chết nên hạng ổn định trong phiên). Không tăng quân đánh
// boss, không đụng cân bằng boss — chỉ chia đều suất cho dàn bot cùng làm nhiệm vụ vòng 10.
const BTG_TOI_DA = 20;
let btgChon = { u: null, at: 0, ds: [] };
function duocDanhBtg(bot) {
  let u = null;
  try { const tt = BTG().trangThai(bot.cfg.acct); u = tt ? String(tt.u) : null; } catch {}
  const t = Date.now();
  if (btgChon.u !== u || t - btgChon.at > 60000) {
    const xep = [...bots].map((b) => {
      const D = b.h && b.h.cs;
      return { b, uu: D && D.buoc === 3 ? 0 : 1, dau: (D && D.dau) | 0, idx: b.idx };
    }).sort((a, c) => (a.uu - c.uu) || (a.dau - c.dau) || (a.idx - c.idx));
    btgChon = { u, at: t, ds: xep.slice(0, BTG_TOI_DA).map((x) => x.b) };
  }
  return btgChon.ds.includes(bot);
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
    // Giới hạn theo idx đã đủ (30 Nhím / 10 Rương / 40 Phong Hỏa); Boss xoay 20 suất/phiên
    // (duocDanhBtg) — không bọc thêm theo tổng số bot, khỏi làm đợt kiểm ít bot mất hoạt động giờ.
    if (duocDanhBtg(bot) && hdBtgVao(bot)) return;
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
    if (duocDanhBtg(bot) && BTG().dangCo()) {
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
function nhanThuongDangNhap(bot) { // thưởng đăng nhập ngày (Xu) — đúng luật thuongDN (do.js): 1 lần/tài khoản/ngày, chuỗi theo nhân vật; quá 42 ngày: trả 5 Xu lấy 60 Xu, không đủ Xu thì về lại ngày 1. Ghi vào bot.tk THẬT (luu() ngay sau viecThanh mới bền; fakeTk chỉ là shim, không ghi).
  try {
    const h = bot.h, tk = bot.tk;
    if (!h || !tk) return;
    const xem = DO.thuongDN(h, tk, {});
    if (!xem || !xem.tt || xem.tt.da) return;
    const n = xem.tt.n | 0;
    const b = n >= 43 ? ((h.xu | 0) >= 5 ? { nhan: 42, chon: "tra" } : { nhan: 42, chon: "lai" }) : { nhan: n };
    const r = DO.thuongDN(h, tk, b);
    if (r && r.xu) log(`thưởng đăng nhập (${h.name}): +${r.xu} Xu (ngày ${n})`);
  } catch (e) { log(`thưởng đăng nhập lỗi (${bot.h && bot.h.name}):`, e.message); }
}
function dungLaHan(bot) { // Thiết La Hán ms:23 — đúng luật case laHan (do.js): cấp ≤ 180, tối đa 10 quyển + trần kinh nghiệm/ngày; chạm trần thì case ném lỗi, dừng, để mai.
  const h = bot.h;
  if (!h || (h.lvl | 0) > 180) return;
  for (let i = 0; i < 10; i++) {
    const o = (h.bag || []).find((x) => x.k === "ms:23");
    if (!o) return;
    try { DO.lam(h, { act: "dung", u: o.u }, bot.key, bot.fakeTk); }
    catch { return; }
  }
}
function viecThanh(bot) { // chạy 1 lần mỗi lần về thành, trước khi lưu
  try { ONL().dem(bot.h, bot.key, true); } catch {}
  try { ONL().lam(bot.h, bot.key, { viec: "nhan" }); } catch {}
  try { PD().lam(bot.h, bot.key, { viec: "nhan" }); } catch {}
  nhanThuongDangNhap(bot); dungLaHan(bot);
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

// ---------- bang hội (Huy lệnh 16:08–16:09 28/11/2026) ----------
// Bot như người chơi thật trong hệ bang hội: nửa đầu dàn bot vào Đại Tống (phe Chánh), nửa sau
// vào Đại Kim (phe Tà). Đổi quy tắc chia chỉ cần sửa 1 chỗ: BANG_BOT / NUA_BOT ở dưới.
// Bang chủ vẫn là người chơi thật (TYT1/TNT1); bot chỉ làm thành viên (cv "de" — bang-hoi.js
// vaoBangBot). Nhãn bang, danh sách thành viên, đếm online, chat bang đều đi đường chung của
// người chơi (the-gioi.js nhip/chat/dangChoi, bang-hoi.js nhan/xemCua) nên tự hiện như người chơi.
const BANG_BOT = ["Đại Tống", "Đại Kim"];
const NUA_BOT = Math.ceil((CFG.bots || []).length / 2); // 170 bot -> 85/85
const bangCuaBot = (idx) => BANG_BOT[idx < NUA_BOT ? 0 : 1];
function vaoBang(bot) {
  if (bot._bangOk) return;
  try {
    const r = BH().vaoBangBot(bot.cfg.acct, 0, bot.h.name, bangCuaBot(bot.idx));
    if (r.vao || r.daCo) bot._bangOk = true;
  } catch (e) { log(`vào bang lỗi (${bot.h.name}):`, e.message); }
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
  for (const b of created) if (b.h && b.h.name) tenBot.add(b.h.name);
  // Bang hội: cho cả dàn bot vào 2 bang (idempotent — đã là thành viên thì giữ nguyên);
  // thử lại mỗi 60 giây cho bot nào chưa vào được (bang chưa lập, đang chờ rời bang...).
  for (const b of bots) vaoBang(b);
  const vao = bots.filter((b) => b._bangOk);
  log(`vào bang: ${vao.length}/${bots.length} bot đã ở bang (${BANG_BOT.map((t) => `${t}: ${vao.filter((b) => bangCuaBot(b.idx) === t).length}`).join(", ")})`);
  timerBang = setInterval(() => { for (const b of bots) vaoBang(b); }, 60000);
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
  if (timerBang) clearInterval(timerBang);
  timer = timerHien = timerThu = timerBang = null;
  for (const b of bots) {
    try { if (b.h.sap && b.h.sap.mo) dongSap(b); } catch {}
    try { luu(b); } catch {}
    try { TG.roi(b.cfg.acct); } catch {}
  }
  log(`đã dừng ${bots.length} NPC`);
  bots = [];
  tenBot.clear();
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
  soBot: () => bots.length, // số bot đang chạy (nhẹ, không dựng object trạng thái) — đếm online (Huy chốt 16:21 28/11/2026: bot như người chơi thật, tính bot luôn)
  layBotTheoTen: (ten, tenNv) => bots.find((b) => b.tk && b.tk.ten === ten && b.h && b.h.name === tenNv) || null,
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
    // Chống xuyên tường (chỉ kiểm chứng): lưới đi được + bước thật + đặt vị trí bot.
    diDuocI: (bai, x, y) => tkDiDuoc(bai, x, y),
    diemTanI: (i, x, y, phe, key) => { const b = bots[i]; return b ? diemTan(b, x, y, phe, key) : null; },
    tkKetI: (i) => { const b = bots[i]; return b && b.hd ? (b.hd.tkKet | 0) : 0; },
    tkThongKeI: () => ({ ...TK_THONG_KE, bfsCache: TK_BFS.size, soaiToiDa: TK_SOAI_TOI_DA }), // B1/B2 (chỉ đo)
    buocToiI: (i, x, y, buoc) => { const b = bots[i]; if (!b) return null; const ox = b.x, oy = b.y; const toi = buocToi(b, x, y, buoc || 200); return { toi, ket: !!b.buocKet, x: b.x, y: b.y, dx: b.x - ox, dy: b.y - oy }; },
    datViTriI: (i, zone, x, y) => { const b = bots[i]; if (!b) return false; b.zone = zone; b.x = x; b.y = y; b.buocKet = false; return true; },
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
