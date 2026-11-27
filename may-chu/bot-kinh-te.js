// Vòng kinh tế của bot — tự xài / tự bán / tự mua (Huy ra luật 00:15, chốt hết theo đề xuất 00:36 ngày 27/11/2026).
// Thiết kế: ~/workspace/vl1-mot-thoi-ky-niem/kinh-te-bot-2611/THIET-KE.md (§4 chấm điểm, §5 định giá,
// §6 mua an toàn ở sạp, §7 thứ tự tiêu tiền, §9 các giới hạn đã chốt).
//   Q1 ngưỡng mua: S2 thắng dmgHit +3% (trụ không giảm quá 2%) hoặc trụ +10% (dmg không giảm quá 5%).
//   Q2 trả tối đa: 1,0× giá trị thẩm định V (so GIÁ NIÊM YẾT với V; thuế 10% chỉ kiểm với ngân sách).
//   Q3 trần giá bán tuyệt đối: chưa đặt (xem số đo bán thật rồi chốt) — chỉ có trần công thức 3× sàn.
//   Q4 sách: ĐƯỢC mua ở sạp; giá thị trường = giá niêm yết ở Kỳ Trân Các (Xu) × tỉ giá mua Xu ở
//        Tiền trang (DO.LUAT.tienTrang.luongMotXu) — Huy chốt "đúng giá thị trường" 01:49 ngày 27/11/2026,
//        bỏ trần cố định 2.000.000. Căn cứ: giaBan(sách KTC) = 0 (do.js:540) nên không làm giá được;
//        53/53 sách đều có giá KTC (25 Xu sách cap 80, 150 Xu sách cap 150).
//   Q5 giới hạn mua: 10 món/ngày, tổng ≤ 5.000.000 lượng (đếm bền trong file tài khoản bot).
//   Q6 bot dưới cấp 80: GIỮ LUẬT GAME — không bày bán được (dinhGia/mo chặn, moSap đã bắt lỗi).
// Mua ở SẠP đã an toàn sẵn phía máy chủ (cho-troi.js "mua": giá đúng từng lượng, đủ tiền, đủ chỗ,
// nguyên tử 2 tài khoản) — bot chỉ thêm lớp thẩm định trước khi gọi. KHÔNG mua qua giao dịch 2 bên.
// Chạy ở chuyến về thành (viecThanh), không chạy giữa bãi. Không sửa giao-dich.js / cho-troi.js.
// Bán rác (Huy lệnh 01:49 27/11/2026 — ĐỔI LUẬT so với thiết kế cũ "rác ở lại túi"): đồ rác bán cho NPC
// lấy vàng cho trống túi, bằng đúng đường "ban" của DO.lam, chạy sau quyetDinh, trước quetSapMua.
"use strict";
const fs = require("fs");
const path = require("path");
const D = require("./du-lieu");
const DO = require("./do");
const CHO = require("./cho-troi");
const NK = require("./nhat-ky");
const BC = require("./npc-bang-chieu");

const N = DO.NOI, BY = N.BY;

const MUA_BAT = process.env.VL_NPC_CHOI_MUA !== "0"; // mua đồ người khác ở sạp: mặc định BẬT khi áp
const MUA_NGAY = Math.max(0, parseInt(process.env.VL_NPC_CHOI_MUA_NGAY || "10", 10) || 10);
const MUA_TIEN = Math.max(0, parseInt(process.env.VL_NPC_CHOI_MUA_TIEN || "5000000", 10) || 5000000);
const TRA_TOI_DA = Math.max(0, parseFloat(process.env.VL_NPC_CHOI_TRA_TOI_DA || "1") || 1);
const MUA_LUOT_TOI_DA = 2; // tối đa món mua mỗi chuyến về thành (giới hạn ngày Q5 mới là chặn chính)
const S2_TOI_DA = 12; // tối đa lần mô phỏng S2 mỗi chuyến (khỏi nặng nhịp thành)
const BAN_RAC_BAT = process.env.VL_NPC_CHOI_BAN_RAC !== "0"; // bán đồ rác cho NPC: mặc định BẬT khi áp
const NGON_DONG_KT = Math.max(1, +process.env.VL_NPC_CHOI_DONG || 3); // cùng ngưỡng moSap (npc-choi.js)
const NGON_CHAT_KT = Math.min(1, Math.max(0, +process.env.VL_NPC_CHOI_CHAT || 0.7));
const BAN_RAC_S2_TOI_DA = 12; // mô phỏng S2 tối đa mỗi chuyến trong banRac (như quyetDinh)

const log = (...a) => console.log("[bot-kinh-te]", ...a);
const ngayVN = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

// ---------- nạp dữ liệu (lười, y hệt napDuLieu của npc-choi.js — khỏi vòng require) ----------
let CACHE = null;
function nap() {
  if (CACHE) return CACHE;
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
  const pack = docJSON("assets/web/item/items.json");
  const goc = docJSON("assets/data/do-goc.json");
  const attr = docJSON("assets/data/attr.json");
  const th = docJSON("assets/data/thuoc.json");
  itemdb.ItemDB.pack = pack;
  itemdb.ItemDB.by = new Map(pack.items.map((x) => [x.k, x]));
  for (const [k, x] of Object.entries(th.items || {})) itemdb.ItemDB.by.set(k, { ...x, k, thuoc: 1 });
  itemdb.ItemDB.goc = goc.items; itemdb.ItemDB.serDmg = attr.serDmg || {};
  const DX = docJSON("assets/data/dong-xanh.json");
  const KTC = docJSON("assets/data/ky-tran-cac.json");
  const GIA_XU = new Map(); // giá niêm yết Kỳ Trân Các (Xu) theo khóa món — y hệt HANG_KTC của do.js
  for (const t of KTC.the || []) for (const o of t.hang || []) if (o.k) GIA_XU.set(String(o.k), o.gia | 0);
  const lo = new Map(), hi = new Map();
  for (const r of DX.rows || []) { const p = r.p && r.p[0]; if (!p) continue; lo.set(r.k, Math.min(lo.get(r.k) ?? Infinity, p[0])); hi.set(r.k, Math.max(hi.get(r.k) ?? -Infinity, p[1])); }
  const DX_TRAN = new Map();
  for (const [k, h] of hi) if (h > (lo.get(k) ?? h)) DX_TRAN.set(k, h);
  const WD_MAX = (() => { let mx = 1; const g = itemdb.ItemDB.goc || {}; for (const o of Object.values(g)) if (o.dmg) mx = Math.max(mx, (o.dmg[0] + o.dmg[1]) / 2); return mx; })();
  const BASE_MAX = (() => { const m = { def: 1, life: 1, stamina: 1, move: 1, resAll: 1, lifeRegen: 1, arPct: 1 };
    const g = itemdb.ItemDB.goc || {};
    for (const o of Object.values(g)) for (const k of Object.keys(m)) if (o[k] > m[k]) m[k] = o[k];
    return m; })();
  CACHE = { rules, vocong, itemdb, db, CHR, MS, DEF, DX_TRAN, WD_MAX, BASE_MAX, GIA_XU };
  return CACHE;
}

// ---------- trọng số dòng (§4.4 thiết kế — suy từ công thức sát thương, không bịa) ----------
const HE_CHINH = { 0: ["addphysicsdamage_v", "addphysicsdamage_p", "metalskill_v"],
  1: ["addpoisondamage_v", "woodskill_v"], 2: ["addcolddamage_v", "waterskill_v"],
  3: ["addfiredamage_v", "fireskill_v"], 4: ["addlightingdamage_v", "earthskill_v"] };
const W_CO_BAN = { lifemax_v: 0.8, manamax_v: 0.8, staminamax_v: 0.8, strength_v: 0.7, dexterity_v: 0.7,
  vitality_v: 0.7, attackratingenhance_v: 0.8, ignoredefense_p: 0.8, attackspeed_v: 0.8, castspeed_v: 0.8,
  physicsres_p: 0.6, poisonres_p: 0.6, coldres_p: 0.6, fireres_p: 0.6, lightingres_p: 0.6, allres_p: 0.6,
  lifereplenish_v: 0.6, manareplenish_v: 0.6, staminareplenish_v: 0.6, steallifeenhance_p: 0.6,
  stealmanaenhance_p: 0.6, lucky_v: 0.4, fastwalkrun_p: 0.4, damage2addmana_p: 0.4,
  fasthitrecover_v: 0.4, freezetimereduce_p: 0.4, stuntimereduce_p: 0.4, poisontimereduce_p: 0.4,
  meleedamagereturn_v: 0.3, indestructible_b: 0.3 };
function trongSo(h, k) {
  const chinh = HE_CHINH[h.series | 0] || [];
  if (k === "addphysicsdamage_v" || k === "addphysicsdamage_p") return 1.0;
  if (chinh.includes(k)) return 1.0;
  if (/^add(poison|cold|fire|lighting)damage_v$/.test(k)) return 0.15; // hệ khác hệ chiêu
  if (/skill_v$/.test(k)) return 0.15; // dòng nội công hệ khác
  return W_CO_BAN[k] ?? 0.3;
}
function chatDong(k, v) { const h = nap().DX_TRAN.get(k); if (!h) return 1; return Math.max(0, Math.min(1, v / h)); }

// Ô trang bị của món (nhẫn: chọn ô trống, cả 2 đầy thì xét cả 2 ô).
function slotsCua(h, it) {
  const x = BY.get(it.k); if (!x || typeof x.t !== "number") return [];
  let slot = DO.SLOT_OF[x.t]; if (!slot) return [];
  if (slot === "Ring1") {
    if (!h.equip.Ring1) return ["Ring1"];
    if (!h.equip.Ring2) return ["Ring2"];
    return ["Ring1", "Ring2"];
  }
  return [slot];
}

// ---------- S1: chấm nhanh theo dòng có tác dụng + điểm nền ----------
function chamDiem(h, it, slotOverride) {
  const { itemdb } = nap();
  const slots = slotOverride ? [slotOverride] : slotsCua(h, it);
  if (!slots.length) return 0;
  const slot = slots[0];
  const hero = { ...h, equip: { ...(h.equip || {}), [slot]: it } };
  const kich = itemdb.soKich(hero, slot, it);
  let s = 0;
  (it.d || []).forEach(([k, v], i) => { if (!itemdb.coTacDung(i, kich)) return; s += chatDong(k, v) * trongSo(h, k); });
  const { WD_MAX, BASE_MAX } = nap();
  const g = (itemdb.ItemDB.goc || {})[it.k] || {};
  if (slot === "Weapon" && g.dmg) s += ((g.dmg[0] + g.dmg[1]) / 2) / WD_MAX;
  s += 0.5 * (Math.min(1, (g.def || 0) / BASE_MAX.def) + Math.min(1, (g.life || 0) / BASE_MAX.life)
    + Math.min(1, (g.stamina || 0) / BASE_MAX.stamina) + Math.min(1, (g.move || 0) / BASE_MAX.move)
    + Math.min(1, (g.resAll || 0) / BASE_MAX.resAll) + Math.min(1, (g.lifeRegen || 0) / BASE_MAX.lifeRegen)
    + Math.min(1, (g.arPct || 0) / BASE_MAX.arPct));
  return s;
}
// Chất trung bình của dòng có tác dụng — để giá không lệch khi so món nhiều dòng rác với món ít dòng ngon.
function chatTB(h, it) {
  const { itemdb } = nap();
  const slots = slotsCua(h, it); if (!slots.length) return 0;
  const slot = slots[0];
  const hero = { ...h, equip: { ...(h.equip || {}), [slot]: it } };
  const kich = itemdb.soKich(hero, slot, it);
  let tu = 0, mau = 0;
  (it.d || []).forEach(([k, v], i) => { if (!itemdb.coTacDung(i, kich)) return; const w = trongSo(h, k); tu += chatDong(k, v) * w; mau += w; });
  return mau > 0 ? tu / mau : 0;
}
// ---------- định giá bán (§5): sàn NPC × (1 + 2×chất) — khoảng [sàn, 3× sàn], đơn điệu theo chất ----------
function giaChat(h, it) {
  let base = 0;
  try { base = DO.giaBan(it) | 0; } catch { base = 0; }
  if (base <= 0) return 0;
  return Math.max(1, Math.round(base * (1 + 2 * chatTB(h, it))));
}

// ---------- cổng mặc được (§4.1): cấp/giới/sức mạnh/thân pháp + vũ khí đúng nhánh ----------
function macDuoc(h, eqt, it) {
  const { itemdb } = nap();
  const x = BY.get(it.k); if (!x || typeof x.t !== "number") return { ok: false, why: "khong-phai-trang-bi" };
  const g = (itemdb.ItemDB.goc || {})[it.k] || {};
  if ((h.lvl || 1) < (g.lv || 1)) return { ok: false, why: "thieu-cap" };
  if (g.sex && g.sex !== h.sex) return { ok: false, why: "sai-gioi" };
  const c = itemdb.diemCo(heroTinh(h));
  if (g.str && c.str < g.str) return { ok: false, why: "thieu-suc-manh" };
  if (g.dex && c.dex < g.dex) return { ok: false, why: "thieu-than-phap" };
  if (x.t === 0 || x.t === 1) {
    const wk = itemdb.weaponKind({ equip: { Weapon: it } });
    if (wk !== eqt && wk !== -1) return { ok: false, why: "sai-nhanh-vu-khi" };
  }
  return { ok: true };
}

// ---------- S2: mô phỏng mặc thật bằng đúng pipeline game (tinhChiSoCua của npc-choi.js) ----------
function heroTinh(h) {
  const { vocong, itemdb, db, CHR } = nap();
  const skills = { ...(h.skills || {}) };
  const H = { name: h.name, lvl: h.lvl, sex: h.sex, series: h.series, fac: +h.fac, facKey: h.facKey || BC.FACKEY[+h.fac],
    start: {}, attr: { ...(h.attr || {}) }, equip: h.equip || {}, skills, looks: h.looks || {}, books: h.books || [], mt: h.mt || 0, luyen: h.luyen || {} };
  const idx = (H.series | 0) * 2 + (H.sex === "f" ? 1 : 0);
  H.start = { ...((CHR.start || [])[idx] || {}), ...(h.start || {}) };
  const start = (CHR.factions || []).find((f) => f.id === +h.fac) || {};
  if (start.series != null) H.series = start.series;
  itemdb.syncRanged(H);
  return H;
}
function statsCua(h) {
  const { rules, vocong, itemdb, db, CHR } = nap();
  const H = heroTinh(h);
  const wk = itemdb.weaponKind(H);
  const ngoai = Object.keys(H.skills).filter((id) => (H.skills[id] | 0) > 0 && vocong.kindOf(db[id], db) === "aura").map((id) => [+id, H.skills[id] | 0]);
  const buffs = new Map();
  const B = vocong.mergeB(itemdb.equipStats(H, false), vocong.skillB(H, db, wk, buffs, null, ngoai));
  return { H, wk, db, p: rules.heroStats(H, CHR, B) };
}
function mobMau(zone, mobId, mobLv) {
  const { rules, MS, DEF } = nap();
  const B = ((DO.LUAT.canBang || {}).bai || {})[zone] || {};
  const sid = B.chiSo && MS.mobs[B.chiSo] ? B.chiSo : mobId;
  const def = DEF[mobId] || DEF[String(mobId)] || {};
  const st = rules.mobStats(def, sid, mobLv, 0, 75, MS, undefined);
  const km = B.mau ?? 1, kd = B.satThuong ?? 1;
  const hpMax = Math.max(1, Math.round(st.hpMax * km));
  return { loai: "quai", id: mobId, lv: mobLv, hpMax, hpCur: hpMax, mpMax: 100, mpCur: 100,
    series: st.series, def: Math.round(st.def * (B.neTranh ?? 1)), res: st.res,
    dmg: st.dmg.map((v) => Math.round(v * kd)), ar: Math.max(1, Math.round(st.ar * (B.chinhXac ?? 1))),
    exp: st.exp, mau: hpMax };
}
function tiTrongNoi(h) {
  const { vocong, db } = nap();
  let noi = 0, tong = 0;
  for (const [id, lv] of Object.entries(h.skills || {})) {
    if (!(lv | 0)) continue;
    const s = db[id]; if (!s) continue;
    if (vocong.kindOf(s, db) !== "attack") continue;
    tong++; if (!s.phys) noi++;
  }
  return tong ? noi / tong : 0;
}
function diemManh(h, mob) {
  const { rules } = nap();
  const { p } = statsCua(h);
  const hit = rules.hitPercent(p.ar, mob.def * (1 - (p.ignoreDef || 0) / 100)) / 100;
  const phys = Math.max(1, ((p.dmg[0] + p.dmg[1]) / 2) * (100 - (mob.res.phys || 0)) / 100);
  let elem = 0;
  for (const k of ["poison", "cold", "fire", "light"]) elem += Math.max(0, ((p.elem || {})[k] || 0) * (100 - (mob.res[k] || 0)) / 100);
  const magic = Object.values(p.elemMagic || {}).reduce((a, b) => a + b, 0);
  const dmg = hit * (phys + elem) + magic * tiTrongNoi(h) * hit * 0.5;
  const hitQ = rules.hitPercent(mob.ar, p.def) / 100;
  const resQ = Math.min(p.res.phys, (p.resCap && p.resCap.phys) || 75);
  const mobHit = Math.max(1, hitQ * ((mob.dmg[0] + mob.dmg[1]) / 2) * (100 - resQ) / 100);
  return { dmg, hit, hpMax: p.hpMax, surv: p.hpMax / mobHit, mobHit };
}
// S2 có thắng đồ đang mặc không (Pareto + dung sai Q1)? Trả về ô tốt nhất (nhẫn xét cả 2 ô).
function s2Thang(h, it, mob) {
  const slots = slotsCua(h, it);
  let tot = null;
  for (const slot of slots) {
    const cu = (h.equip || {})[slot];
    const truoc = diemManh(h, mob);
    const H1 = { ...h, equip: { ...(h.equip || {}), [slot]: it } };
    const sau = diemManh(H1, mob);
    const dDmg = (sau.dmg - truoc.dmg) / Math.max(1, truoc.dmg);
    const dSurv = (sau.surv - truoc.surv) / Math.max(1, truoc.surv);
    const dHp = (sau.hpMax - truoc.hpMax) / Math.max(1, truoc.hpMax);
    const thang = !cu
      ? (dDmg >= -0.01 && dSurv >= -0.01 && (dDmg > 0.005 || dSurv > 0.005 || dHp > 0))
      : ((dDmg >= 0.03 && dSurv >= -0.02) || (dSurv >= 0.10 && dDmg >= -0.05));
    const gain = dDmg + dSurv;
    if (!tot || gain > tot.gain) tot = { thang, slot, cu: cu ? cu.k : null, dDmg, dHp, dSurv, gain };
  }
  return tot || { thang: false, slot: null, cu: null, dDmg: 0, dHp: 0, dSurv: 0, gain: -Infinity };
}

// ---------- quyết định ở thành: món hơn thì MẶC (S2), còn lại để moSap bày / nằm túi ----------
function laTrangBi(it) {
  const x = BY.get(it.k);
  if (!x || typeof x.t !== "number") return false;
  if (x.thuoc || x.ktc || x.phu) return false;
  if (it.kbh || it.het) return false;
  if (x.dung && x.dung.loai === "sach") return false;
  return true;
}
function ghiNK(bot, m, it) {
  try { NK.ghi("npc", bot.tk.ten, bot.h.name, m, it ? { mon: [NK.mon(it)] } : {}); } catch {}
}
function quyetDinh(bot) {
  const h = bot.h;
  let mac = 0, s2 = 0;
  const T = bot.baiTrain || { zone: bot.cfg.zone, mobs: bot.cfg.mobs, mobLv: bot.cfg.mobLv };
  const mob = mobMau(T.zone, (T.mobs || [])[0], T.mobLv);
  for (const it of [...(h.bag || [])]) {
    if (!laTrangBi(it)) continue;
    if (!h.bag.includes(it)) continue; // đã mặc / đã khỏi túi trong vòng này
    const gate = macDuoc(h, bot.cfg.eqt, it);
    if (!gate.ok) continue; // không xài được: để bày sạp nếu ngon (người khác xài được)
    const slots = slotsCua(h, it);
    const cur = slots.map((s) => h.equip[s]).find(Boolean);
    if (cur && chamDiem(h, it) < chamDiem(h, cur) * 0.8) continue; // S1 lọc nhanh: kém hẳn thì khỏi mô phỏng
    if (s2 >= S2_TOI_DA) break;
    s2++;
    let r;
    try { r = s2Thang(h, it, mob); } catch (e) { log(`S2 lỗi (${h.name} ${it.k}):`, e.message); continue; }
    if (!r.thang) continue;
    try {
      DO.lam(h, { act: "mac", u: it.u, ...(r.slot === "Ring1" || r.slot === "Ring2" ? { slot: r.slot } : {}) }, bot.key, bot.fakeTk);
      mac++;
      bot.stats.ktMac = (bot.stats.ktMac | 0) + 1;
      log(`mặc đồ hơn: ${h.name} ← ${DO.tenMon(it)} (dmg ${(r.dDmg * 100).toFixed(1)}%, trụ ${(r.dSurv * 100).toFixed(1)}%)`);
      ghiNK(bot, `Kinh tế bot: mặc ${DO.tenMon(it)} (hơn đồ cũ: dmg ${(r.dDmg * 100).toFixed(1)}%, trụ ${(r.dSurv * 100).toFixed(1)}%)`, it);
    } catch (e) { /* DO.lam chặn lại (rương khóa / túi đầy): để túi, chuyến sau */ }
  }
  return mac;
}

// ---------- dự trữ (§7): tiền thuốc 1 chuyến × 1,5 — không bao giờ tiêu tới 0 vì 1 món đồ ----------
function duTru(bot) {
  const h = bot.h;
  const [kHp, kMp] = (h.lvl | 0) < 3 ? ["potion:1", "potion:6"] : ["potion:3", "potion:8"]; // = thuocCap của npc-choi.js
  let t = 0;
  for (const k of [kHp, kMp]) { const x = BY.get(k); if (x && x.gia > 0) t += 30 * (x.gia | 0); }
  return t;
}
function demMua(h) {
  const ngay = ngayVN();
  const bm = h.botMua && typeof h.botMua === "object" ? h.botMua : null;
  if (!bm || bm.ngay !== ngay) { h.botMua = { ngay, dem: 0, tien: 0 }; return h.botMua; }
  return bm;
}
// ---------- giá thị trường của sách (§9 Q4): giá KTC (Xu) × tỉ giá mua Xu (lượng/Xu) ----------
// Không có giá KTC / không có tỉ giá -> 0 = không mua (không trả giá bừa).
function giaThiTruongSach(it) {
  const { GIA_XU } = nap();
  const xu = GIA_XU.get(it.k) || 0;
  if (!xu) return 0;
  let rate = 0;
  try { rate = DO.LUAT.tienTrang.luongMotXu | 0; } catch { rate = 0; }
  if (!rate) return 0;
  return xu * rate;
}
// Sách mua được ở sạp? Gating = đúng đường đọc sách của game (DO.lam "sach" chặn lại y hệt).
function sachDuoc(h, it) {
  const x = BY.get(it.k), d = x && x.dung;
  if (!d || d.loai !== "sach" || !d.chieu) return false;
  if (d.phai !== +h.fac) return false;
  if ((h.lvl | 0) < (d.cap | 0)) return false;
  if ((h.books || []).includes(+d.chieu)) return false;
  if (!DO.sachPhai(+h.fac, +d.chieu)) return false;
  return true;
}

// ---------- quét sạp người khác, thẩm định rồi mua an toàn (§6) ----------
function quetSapMua(bot) {
  if (!MUA_BAT) return 0;
  const h = bot.h;
  const bm = demMua(h);
  if (bm.dem >= MUA_NGAY || bm.tien >= MUA_TIEN) return 0;
  // Ngân sách = vàng hiện có − dự trữ (bm.tien đã trừ khỏi vàng lúc mua rồi, không trừ nữa).
  const nganSach = (h.gold | 0) - duTru(bot);
  if (nganSach <= 0) return 0;
  let ds;
  try { ds = CHO.lam(bot.fakeTk, h, 0, { viec: "ds" }); } catch (e) { log(`quét sạp lỗi (${h.name}):`, e.message); return 0; }
  const muc = (ds && ds.ds) || [];
  if (!muc.length) return 0;
  const T = bot.baiTrain || { zone: bot.cfg.zone, mobs: bot.cfg.mobs, mobLv: bot.cfg.mobLv };
  const mob = mobMau(T.zone, (T.mobs || [])[0], T.mobLv);
  const ung = [];
  let s2 = 0;
  const idSapMinh = h.sap && h.sap.id;
  for (const m of muc) {
    if (!m || m.k === "ht" || m.ht) continue; // sạp Hệ thống (Dã Tẩu): không mua
    if (idSapMinh && m.k === idSapMinh) continue; // sạp chính mình: máy chủ cũng chặn
    const it = m.it; if (!it || it.kbh || it.het || it.tk) continue;
    const gia = it.gia | 0; if (!(gia >= 1)) continue;
    if (laTrangBi(it)) {
      if (!macDuoc(h, bot.cfg.eqt, it).ok) continue;
      const slots = slotsCua(h, it);
      const cur = slots.map((s2lot) => h.equip[s2lot]).find(Boolean);
      if (cur && chamDiem(h, it) < chamDiem(h, cur) * 0.8) continue;
      if (s2 >= S2_TOI_DA) continue;
      s2++;
      let r;
      try { r = s2Thang(h, it, mob); } catch (e) { continue; }
      if (!r.thang) continue;
      const V = giaChat(h, it);
      if (gia > V * TRA_TOI_DA) continue; // không trả cao hơn giá mình tự bán món tương đương
      ung.push({ k: m.k, ten: m.ten, it, gia, tra: it.mua | 0, gain: r.gain, sach: false, slot: r.slot });
    } else if (sachDuoc(h, it)) {
      const V = giaThiTruongSach(it);
      if (!V || gia > V * TRA_TOI_DA) continue; // không trả cao hơn giá thị trường (giá mua mới ở KTC)
      ung.push({ k: m.k, ten: m.ten, it, gia, tra: it.mua | 0, gain: 0, sach: true, slot: null });
    }
  }
  // Đồ nâng cấp trước (gain cao trước), sách sau.
  ung.sort((a, b) => ((b.sach ? 0 : 1) - (a.sach ? 0 : 1)) || (b.gain - a.gain) || (a.gia - b.gia));
  let mua = 0;
  for (const cd of ung) {
    if (mua >= MUA_LUOT_TOI_DA) break;
    if (bm.dem >= MUA_NGAY || bm.tien >= MUA_TIEN) break;
    const tra = cd.tra;
    if (!(tra > 0) || tra > (h.gold | 0) - duTru(bot)) continue;
    if (bm.tien + tra > MUA_TIEN) continue;
    // Chụp tươi: "xem" lại sạp, khớp giá mới mua (đổi giá giữa chừng -> máy chủ từ chối, không mất tiền).
    let xem;
    try { xem = CHO.lam(bot.fakeTk, h, 0, { viec: "xem", k: cd.k }); } catch { continue; }
    if (!xem || !xem.xem || xem.xem.minh) continue;
    const tuoi = (xem.xem.ds || []).find((o) => o.u === cd.it.u);
    if (!tuoi || (tuoi.gia | 0) !== cd.gia) continue; // bán rồi / đổi giá: bỏ
    const traTuoi = tuoi.mua | 0;
    if (traTuoi !== tra) continue; // thuế/giá lệch: bỏ cho chắc
    // Chỗ túi (mô phỏng): đủ ô trống cho món mới vào thì mới gọi mua.
    const [w, hh] = DO.coMon(cd.it);
    if (N.oTrong(h) < w * hh) continue;
    const uTruoc = new Set((h.bag || []).map((o) => o.u));
    let r;
    try { r = CHO.lam(bot.fakeTk, h, 0, { viec: "mua", k: cd.k, u: cd.it.u, gia: traTuoi }); } catch (e) { log(`mua hỏng (${h.name} ${DO.tenMon(cd.it)}):`, e.message); continue; }
    if (!r || !r.doi) continue;
    bm.dem++; bm.tien += traTuoi; mua++;
    bot.stats.ktMua = (bot.stats.ktMua | 0) + 1;
    bot.stats.ktMuaTien = (bot.stats.ktMuaTien | 0) + traTuoi;
    log(`mua ở sạp ${cd.ten}: ${h.name} ← ${DO.tenMon(cd.it)} — ${traTuoi} lượng (niêm yết ${cd.gia})`);
    ghiNK(bot, `Kinh tế bot: mua ${DO.tenMon(cd.it)} của ${cd.ten} — ${traTuoi} lượng (niêm yết ${cd.gia})`, cd.it);
    // Mua xong thì xài ngay: mặc đồ / học sách ở chuyến này luôn.
    // Món mới có thể đã bị dồn chồng (donChong trong "mua") vào chồng cũ cùng khóa — u mới mất,
    // chỉ còn chồng cũ: sách thì học từ chồng nào cũng được (cùng chiêu), đồ mặc thì chỉ nhận đúng u mới.
    const moi = (h.bag || []).find((o) => !uTruoc.has(o.u) && o.k === cd.it.k)
      || (cd.sach ? (h.bag || []).find((o) => o.k === cd.it.k) : null);
    if (moi) {
      try {
        if (cd.sach) { DO.lam(h, { act: "dung", u: moi.u }, bot.key, bot.fakeTk); log(`học sách vừa mua (${h.name})`); } // "dung" -> dungVat case "sach": gọi act "sach" thì lam không nhận (rơi "Không rõ việc gì")
        else if (macDuoc(h, bot.cfg.eqt, moi).ok) {
          DO.lam(h, { act: "mac", u: moi.u, ...(cd.slot === "Ring1" || cd.slot === "Ring2" ? { slot: cd.slot } : {}) }, bot.key, bot.fakeTk);
          bot.stats.ktMac = (bot.stats.ktMac | 0) + 1;
        }
      } catch (e) { /* mặc/học không được thì để túi, chuyến sau xử lý */ }
    }
  }
  return mua;
}

// ---------- bán đồ rác cho NPC (Huy lệnh 01:49 27/11/2026 — ĐỔI LUẬT: rác không còn ở lại túi) ----------
// Rác = trang bị dưới ngưỡng đồ ngon của moSap (dưới 3 dòng, và không phải 2 dòng có 1 dòng ≥70% trần),
// không phải món mặc hơn đồ đang mặc. Bán bằng đúng đường "ban" của người chơi (DO.lam): giá NPC thu mua
// giaBan, tiền vào túi, món vào danh sách mua lại — không bịa API. Ngưỡng: MỌI chuyến về thành (viecThanh),
// bán hết rác trong túi — rác không còn đường dùng nào khác trong game (không hệ cường hóa, không lên sạp,
// món nhiệm vụ/khóa đã loại). Chạy SAU quyetDinh (mặc đồ hơn trước) và TRƯỚC quetSapMua (trống ô + thêm vàng để mua).
function laDoNgonKT(h, it) { // cùng ngưỡng laDoNgon/moSap (npc-choi.js), tính bằng dữ liệu nap() của file này
  if (!laTrangBi(it)) return false;
  if (!slotsCua(h, it).length) return false;
  const d = it.d || [];
  if (d.length >= NGON_DONG_KT) return true;
  if (d.length === 2) {
    const { DX_TRAN } = nap();
    let q = 0;
    for (const [k, v] of d) { const hh = DX_TRAN.get(k); if (hh) q = Math.max(q, v / hh); }
    if (q >= NGON_CHAT_KT) return true;
  }
  return false;
}
function laRacBanDuoc(h, it) {
  if (!laTrangBi(it)) return false;
  if ((it.n | 0) > 1) return false; // chồng nhiều món: "ban" bán cả chồng 1 giá — để nguyên cho chắc
  if (it.dt || it.vv || it.tk) return false; // món Dã Tẩu / vĩnh viễn / Tống Kim: "ban" chặn, loại trước
  const x = BY.get(it.k);
  if (!x || x.t === 10) return false; // ngựa (ô Horse): TUYỆT ĐỐI không bán
  if (!slotsCua(h, it).length) return false; // mỹ phẩm ô 11+...: không phải trang bị mặc được, để nguyên
  if (laDoNgonKT(h, it)) return false; // đồ ngon: để bày sạp
  let gb = 0;
  try { gb = DO.giaBan(it) | 0; } catch { gb = 0; }
  return gb > 0;
}
function banRac(bot) {
  if (!BAN_RAC_BAT) return 0;
  const h = bot.h;
  const T = bot.baiTrain || { zone: bot.cfg.zone, mobs: bot.cfg.mobs, mobLv: bot.cfg.mobLv };
  const mob = mobMau(T.zone, (T.mobs || [])[0], T.mobLv);
  let s2 = 0, ban = 0, tien = 0;
  const ds = [];
  for (const it of [...(h.bag || [])]) {
    if (!h.bag.includes(it)) continue;
    if (!laRacBanDuoc(h, it)) continue;
    // Chốt an toàn: món mặc hơn thì để lại (quyetDinh đã chạy trước; chỉ còn sót do trần S2).
    if (macDuoc(h, bot.cfg.eqt, it).ok) {
      const slots = slotsCua(h, it);
      const cur = slots.map((s) => h.equip[s]).find(Boolean);
      if (!cur) continue; // ô đang trống: để lại cho quyetDinh chuyến sau mặc
      if (chamDiem(h, it) >= chamDiem(h, cur) * 0.8) {
        if (s2 >= BAN_RAC_S2_TOI_DA) continue; // hết lượt mô phỏng: để lại cho chắc
        s2++;
        let r;
        try { r = s2Thang(h, it, mob); } catch { continue; }
        if (r.thang) continue;
      }
    }
    let p = 0;
    try { p = DO.giaBan(it) | 0; } catch { p = 0; }
    if (p <= 0) continue;
    try { DO.lam(h, { act: "ban", u: it.u }, bot.key, bot.fakeTk); }
    catch (e) { log(`bán rác hỏng (${h.name} ${DO.tenMon(it)}):`, e.message); continue; }
    ban++; tien += p; ds.push(it);
    bot.stats.ktBanRac = (bot.stats.ktBanRac | 0) + 1;
    bot.stats.ktBanRacTien = (bot.stats.ktBanRacTien | 0) + p;
  }
  if (ban) {
    log(`bán rác: ${h.name} bán ${ban} món +${tien} lượng (trống túi ${N.oTrong(h)} ô)`);
    ghiNK(bot, `Kinh tế bot: bán ${ban} món rác cho cửa hàng +${tien} lượng`, ds[0]);
  }
  return ban;
}

module.exports = { chamDiem, chatTB, giaChat, macDuoc, s2Thang, quyetDinh, quetSapMua, duTru, sachDuoc,
  giaThiTruongSach, banRac, MUA_BAT, MUA_NGAY, MUA_TIEN, TRA_TOI_DA };
