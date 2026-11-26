// NPC chơi như người thật — 170 NHÂN VẬT (kế hoạch ke-hoach-npc-170-nhan-vat.md).
// Mỗi bot = 1 tài khoản thật + 1 nhân vật thật, đóng vai client phía máy chủ: gửi nhịp hiện diện qua
// the-gioi.js nhip, giết quái / nhặt đồ qua đúng luật do.js gietQuai/nhat, bày sạp qua đúng luật
// cho-troi.js lam. Không sửa ma-qua.js / do.js. Bảng chiêu suy lúc chạy bằng may-chu/npc-bang-chieu.js
// (dữ liệu thật skills.json + rules.js + luyen-ky-nang.json); cấu hình 170 bot ở npc-choi-config.json
// (tên, phái, nhánh, bãi train, chỗ sạp — sinh bởi kiem-170-2611/gen-config-170.mjs).
// Chỉ chạy khi VL_NPC_CHOI=1. Mặc định TẮT. VL_NPC_CHOI_SO: số bot tối đa (mặc định 170).
// VL_NPC_CHOI_HIEN: nhịp hiện diện của mỗi bot, ms (mặc định 1500 — chia lát 500ms).
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

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "npc-choi-config.json"), "utf8"));
const Z_TOWN = 37; // Biện Kinh (thành, được bày sạp)
const ZONES = CFG.zones || {};
const SO_TOI_DA = Math.max(1, Math.min(CFG.bots.length, +process.env.VL_NPC_CHOI_SO || 170));
const HIEN_MS = Math.max(500, +process.env.VL_NPC_CHOI_HIEN || 1500);
const LAT = Math.max(1, Math.min(12, Math.round(HIEN_MS / 500))); // lát hiện diện: mỗi 500ms 1 lát
const EXP_MAXPING = 97566772100, TIEN_MAXPING = 50000000, XU_MAXPING = 100; // đúng số mã MAXPING
const GIET_TRIP = +process.env.VL_NPC_CHOI_GIET || 40;   // giết chừng này con thì về thành 1 chuyến
const STALL_MS = (+process.env.VL_NPC_CHOI_SAP || 120) * 1000; // sạp mở chừng này rồi đóng, đi train tiếp
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
let traLoiChungAll = 0; // chống spam kênh chung: tất cả bot gộp lại tối đa 1 tin trả lời / 5 giây
const log = (...a) => console.log("[npc-choi]", ...a);

function tenMayChu() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "server.json"), "utf8")).name || "S1"; }
  catch { return "S1"; }
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

// Ép bảng chiêu của bot về đúng chuẩn phái (cả khi tài khoản đã tạo từ bản cũ thiếu / thừa chiêu).
function chuanChieu(bot) {
  const tab = bot.tab;
  bot.h.skills = { ...tab.skills, ...tab.luyen };
  bot.h.books = [...tab.books];
  bot.h.luyen = { ...tab.luyen0 };
}

function snapshot(bot) {
  const hp = bot.hpMax ? Math.max(0, Math.min(100, Math.round((100 * (bot.hpCur ?? bot.hpMax)) / bot.hpMax))) : 100;
  const mp = bot.mpMax ? Math.max(0, Math.min(100, Math.round((100 * (bot.mpCur ?? bot.mpMax)) / bot.mpMax))) : 100;
  return { zone: bot.zone, lvl: 200, npc: 1, look: { ...bot.look }, tr: [[Date.now(), bot.x, bot.y, bot.dir, bot.act, 0, 1, 0]], hp, mp };
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
  mob = mob || pick(bot.cfg.mobs); lv = lv || bot.cfg.mobLv;
  const x = bot.x, y = bot.y;
  let kq;
  try { kq = DO.gietQuai(bot.h, [[bot.zone, mob, lv, 0, 0, x, y]], { ten: bot.cfg.acct, admin: false, key: bot.key }); }
  catch (e) { log(`giết quái lỗi (${bot.h.name}):`, e.message); return; }
  if (!kq || !kq.n) { bot.stats.bo += (kq && kq.bo) || 1; return; } // bị luật chặn: đếm để thấy trong kiểm chứng
  bot.kills++; bot.stats.giet++; bot.stats.kn += kq.kn || 0;
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
  for (const it of [...((bot.h.sap && bot.h.sap.ds) || [])]) {
    if (laDoNgon(it)) continue;
    try { CHO.lam(bot.fakeTk, bot.h, 0, { viec: "thuHoi", u: it.u }); }
    catch (e) { /* túi đầy / món vướng: để lại, không kẹt */ }
  }
  let dinh = 0;
  for (const it of [...bot.h.bag]) {
    if (!laDoNgon(it)) continue; // đồ rác ở lại túi — không vứt, không bán NPC, không xóa
    try { CHO.lam(bot.fakeTk, bot.h, 0, { viec: "dinhGia", u: it.u, gia: giaCua(it) }); dinh++; }
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

function tickBot(bot) {
  try {
    if (bot.mode === "luyen") {
      if (!bot.mucTieu) {
        bot.x = Math.max(bot.cfg.cx - bot.cfg.r, Math.min(bot.cfg.cx + bot.cfg.r, bot.x + ri(-250, 250)));
        bot.y = Math.max(bot.cfg.cy - bot.cfg.r, Math.min(bot.cfg.cy + bot.cfg.r, bot.y + ri(-150, 150)));
        bot.dir = ri(0, 7); bot.act = Math.random() < 0.7 ? "attack" : "run";
      }
      // Máu / nội lực thật: hồi theo nhịp từ bình đã uống, uống khi dưới ngưỡng Trợ Thủ, quái có thể đánh trước.
      hoiTheoNhip(bot);
      if (bot.chiSo) {
        if (bot.hpCur / bot.hpMax < NG_THUOC.hp) uongThat(bot, THUOC_HP);
        if (bot.mpCur / bot.mpMax < NG_THUOC.mp) uongThat(bot, THUOC_MP);
        if (!bot.mucTieu && Math.random() < QUAI_DANH_XS) quaiTanCong(bot);
      }
      if (bot.mucTieu) vongDanh(bot);
      // Giãn đều: mỗi bot chỉ giết trừu tượng 1 con / 3 nhịp (4,5 giây) — 170 bot không dồn luật giết cùng lúc.
      else if ((tickN + bot.idx) % 3 === 0) gietMot(bot);
      const hetThuoc = soThuoc(bot, "potion:3") + soThuoc(bot, "potion:8") < 6;
      if (bot.kills >= GIET_TRIP || N.oTrong(bot.h) < 6 || hetThuoc) {
        boMucTieu(bot);
        bot.mode = "ve"; log(`về thành: ${bot.h.name} ${bot.kills} con, ô trống ${N.oTrong(bot.h)}, thuốc còn ${soThuoc(bot, "potion:3") + soThuoc(bot, "potion:8")} bình`);
      }
    } else if (bot.mode === "chet") {
      bot.act = "die";
      if (Date.now() - bot.chetLuc >= 3000) { bot.mode = "ve"; hoiDay(bot); log(`hồi sinh ở Biện Kinh (${bot.h.name}), máu / nội lực đầy`); }
    } else if (bot.mode === "ve") {
      bot.zone = Z_TOWN; bot.x = bot.cfg.stalls[0][0]; bot.y = bot.cfg.stalls[0][1]; bot.dir = 2; bot.act = "stand";
      DO.baiNay(bot.key, Z_TOWN); hienDien(bot); bot.mode = "ban"; bot.kills = 0; luu(bot);
    } else if (bot.mode === "ban") {
      bot.mode = moSap(bot) ? "cho" : "luyen";
      if (bot.mode === "cho") bot.stallDen = Date.now() + STALL_MS;
      else { bot.zone = bot.cfg.zone; bot.x = bot.cfg.cx; bot.y = bot.cfg.cy; DO.baiNay(bot.key, bot.cfg.zone); }
      luu(bot);
    } else if (bot.mode === "cho") {
      bot.act = "sit";
      if (Date.now() >= bot.stallDen) {
        dongSap(bot);
        bot.mode = "luyen"; bot.zone = bot.cfg.zone; bot.x = bot.cfg.cx; bot.y = bot.cfg.cy; bot.act = "run";
        DO.baiNay(bot.key, bot.cfg.zone); hoiDay(bot); luu(bot);
        log(`đóng sạp, ra train tiếp (${bot.h.name})`);
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
    while (xoay[nx] === id) nx = (nx + 1) % xoay.length;
    bot.vongChieu = nx;
    return id;
  }
  return 0;
}
function danhBot(bot, muc) {
  const id = chonChieu(bot, muc);
  if (id) { const kq = donChieu(bot, id, muc); if (kq) return kq; }
  return danhThuong(bot, muc);
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
  if (m.loai === "quai") {
    if (m.hpCur <= 0) { boMucTieu(bot); return; }
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
  const mob = pick(bot.cfg.mobs), lv = bot.cfg.mobLv;
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
  if (bot.h.sap && bot.h.sap.mo) dongSap(bot);
  try { DO.chet(bot.h); } catch (e) { log(`chết lỗi (${bot.h.name}):`, e.message); }
  log(`chết (${bot.h.name}) — hồi sinh ở thành sau 3 giây`);
}

// ---------- chat ----------
// Tin từ TG.nhip có dạng { id, ch, name, text } — ch là kênh (CH_WORLD/PRIVATE/...),
// text là nội dung. Trả lời qua TG.chat(tk, { o, ch, t, toi? }) — đúng 2 đối số.
function traLoi(bot, msg) {
  const n = msg.name || "", txt = String(msg.text || "");
  if (n === bot.h.name || !txt.trim()) return;
  if (bot.traLoiDen && Date.now() < bot.traLoiDen) return; // 10 giây mới trả lời cùng người 1 lần
  const rieng = msg.ch === "PRIVATE";
  const t = boDau(txt);
  let noi = null;
  if (/\b(gia|bao nhieu|bao nhiêu)\b/.test(t)) {
    if (bot.h.sap && bot.h.sap.mo) {
      const ds = (bot.h.sap.ds || []).slice(0, 2).map((it) => `${DO.tenMon(it) || "?"} ${giaCua(it)} lượng`).join(", ");
      noi = ds ? `Sạp ta ở Biện Kinh đang bán: ${ds}. Muốn mua thì tới mà xem.` : "Sạp ta trống trơn. Đừng hỏi nữa.";
    } else noi = "Chưa mở sạp. Ta đang train. Lát về thành mới bày — chờ đấy.";
  } else if (/(o dau|o đâu|dang o dau|dang o đâu|o cho nao)/.test(t)) {
    noi = `Ta đang train ở ${DO.tenBai(bot.zone) || "bãi quái"}. Muốn gặp thì tự tới, đừng hỏi nhiều.`;
  } else if (/(giup|giúp|huong dan|hướng dẫn|lam gi|làm gì)/.test(t)) {
    noi = "Muốn mua đồ thì ghé sạp ta ở Biện Kinh. Hỏi giá thì gõ 'giá'. Ta chỉ nói một lần.";
  } else if (/(xin chao|xin chào|hello|chao|chào)/.test(t)) {
    noi = "Ờ. Cần gì thì nói mau.";
  } else if (/(ban co|bạn có|may co|mày có|npc|bot|nguoi may|người máy|ai quan ly|ai quản lý)/.test(t)) {
    noi = "Ta là nhân vật máy do máy chủ chạy. Train quái, bán đồ, đánh trả như người chơi. Có việc thì nói, không thì tránh ra.";
  } else {
    noi = "Hỏi giá thì gõ 'giá', hỏi chỗ thì gõ 'ở đâu'. Đừng nói nhảm.";
  }
  if (!rieng) {
    if (Date.now() - traLoiChungAll < 5000) return; // kênh chung: cả 170 bot gộp lại 1 tin / 5 giây
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

// ---------- vòng đời ----------
function test1DangChoi() {
  try { return !!TG.dangChoi("test1"); }
  catch { return false; }
}
function khoiTaoBot(cfg, idx, nameSet) {
  const tab = BC.bangChieu(cfg.fac, cfg.eqt);
  const { tk, h, moi } = taoBot(cfg, tab, nameSet);
  const bot = { cfg, tab, tk, h, idx, fakeTk: { ten: cfg.acct, admin: false, nv: [h] }, key: cfg.acct + "|0",
    zone: cfg.zone, x: cfg.cx, y: cfg.cy, dir: 2, act: "stand", mode: "luyen", kills: 0, cd: {}, mucTieu: null,
    vongChieu: 0, danhBatDau: 0, danhTuChoi: 0, gocX: cfg.cx, gocY: cfg.cy, chetLuc: 0, lastTin: null,
    traLoiDen: 0, traLoiChung: 0, stallDen: 0, stallSpot: null, lastDanhNguoi: null, potHp: null, potMp: null,
    stats: { giet: 0, kn: 0, nhat: 0, tienNhat: 0, bo: 0, thuoc: 0, ban: 0, danhThuong: 0, nhanDon: 0, gay: 0, gayNguoi: 0, gietThat: 0 }, moi };
  chuanChieu(bot);
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
  },
};
