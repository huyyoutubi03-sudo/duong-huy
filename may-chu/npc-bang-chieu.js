// Bảng chiêu chuẩn phái cho NPC chơi như người thật — suy từ dữ liệu thật, không viết tay từng phái.
// Nguồn: assets/web/skill/skills.json (chiêu của phái) + src/game/rules.js (capChieu / MOC / fixPoints)
// + src/game/vocong.js (kindOf / eqtOk) + assets/data/luyen-ky-nang.json (bảng độ luyện).
// Quy tắc (đã kiểm chứng: nhánh Thiếu Lâm/Côn cho ra đúng bảng mẫu đã kiểm máy ảo đạt):
//   - Chỉ chiêu trong danh sách của đúng phái đó (không bao giờ gán chiêu phái khác —
//     vd Kỳ Kinh 75 chỉ có trong danh sách Ngũ Độc); bỏ chiêu con (sub.child) — cấp theo chiêu cha.
//   - Chỉ chiêu dùng được khi cầm đúng vũ khí nhánh: eqt của chiêu = eqt nhánh, -2 (mọi vũ khí) hoặc null.
//   - Chiêu thường: cấp = capChieu ở cấp 200 (trần max, trừ MOC). Chiêu luyện (exp=1): cấp =
//     min(max, số mục bảng luyện), không tốn điểm kỹ năng, cần sách + độ luyện 0 như công cụ quản trị.
//   - Điểm kỹ năng cấp 200 = 199 (fixPoints: 1 điểm/cấp × 199, mt = 0 như mẫu). Nhánh nào max hết
//     vẫn trong 199 thì max hết (Thiếu Lâm, Thiên Vương). Nhánh vượt thì phân bổ theo thứ tự ưu tiên
//     của người chơi thật: (1) chiêu tâm pháp trần 30 của phái, (2) chiêu tấn công (req cao trước),
//     (3) bùa + vòng sáng, (4) bị động, (5) chiêu nguyền / còn lại — hết điểm thì chiêu còn lại ở 0
//     (đúng như nhân vật thật chưa cộng hết, vd 8 chiêu cấp 0 của NDT1 là đúng thiết kế).
//   - Xoay chiêu đánh trả: chiêu tấn công của nhánh theo req giảm dần, chiêu đầu lặp 2 lần (như mẫu
//     [11, 11, 10, 20]); chiêu kết liễu = chiêu luyện tấn công của nhánh (mục tiêu < 40% máu).
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const vocong = require(path.join(ROOT, "src", "game", "vocong.js"));
const rules = require(path.join(ROOT, "src", "game", "rules.js"));

const SK = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "web", "skill", "skills.json"), "utf8"));
const KY = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "data", "luyen-ky-nang.json"), "utf8")).ky || {};
const CHAR = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "data", "char.json"), "utf8"));
const DB = vocong.suaVoCong({ ...(SK.skills || {}) });

const CHILD = new Set();
for (const s of Object.values(DB)) if (s && s.sub && s.sub.child) CHILD.add(+s.sub.child);

// Ngũ hành khóa sẵn của phái (char.json factions[].series — khớp bảng kế hoạch 170 nhân vật).
const SERIES = {};
const FACKEY = {};
for (const f of CHAR.factions || []) { SERIES[f.id] = f.series | 0; FACKEY[f.id] = f.key; }
const FAC_BY_KEY = {};
for (const f of SK.factions || []) FAC_BY_KEY[f.key] = f;

const DIEM_TOI_DA = 199; // điểm kỹ năng ở cấp 200, mt = 0 (rules.js fixPoints: 1 điểm × 199 cấp)
const HERO200 = { lvl: 200, skMin: {} };

// Thứ tự ưu tiên khi phân bổ điểm (số càng nhỏ càng ưu tiên).
function uuTien(s, kind) {
  if ((s.max || 20) >= 30) return 0; // tâm pháp trần 30 của phái
  if (kind === "attack") return 1;
  if (kind === "buff" || kind === "aura") return 2;
  if (kind === "passive") return 3;
  return 4;
}

function deriveBranch(fac, eqt) {
  const f = (SK.factions || []).find((x) => x.id === +fac);
  if (!f) throw new Error(`Không có phái ${fac}`);
  const reg = [], luy = [];
  for (const id of f.skills || []) {
    const s = DB[String(id)];
    if (!s || CHILD.has(+id)) continue;
    if (!(s.eqt == null || s.eqt === -2 || s.eqt === eqt)) continue;
    if (s.exp === 1) {
      const ky = KY[String(id)];
      if (!ky) throw new Error(`Chiêu luyện ${id} (${s.n}) không có bảng luyện`);
      luy.push({ id: +id, lv: Math.min(s.max || 20, ky.length), req: s.req || 0 });
    } else {
      const lv = rules.capChieu(HERO200, s, +id);
      if (lv > 0) reg.push({ id: +id, max: lv, req: s.req || 0, kind: vocong.kindOf(s, DB) });
    }
  }
  reg.sort((a, b) => (uuTien(DB[String(a.id)], a.kind) - uuTien(DB[String(b.id)], b.kind)) || (b.req - a.req) || (a.id - b.id));
  let con = DIEM_TOI_DA;
  const skills = {};
  for (const r of reg) {
    const lv = Math.min(r.max, con);
    if (lv > 0) skills[r.id] = lv;
    con -= lv;
  }
  // Sắp lại key tăng dần để object ổn định (mẫu cũ: {4,10,11,15,16,20,21,273} rồi luyện).
  const skillsSorted = {};
  for (const id of Object.keys(skills).map(Number).sort((a, b) => a - b)) skillsSorted[id] = skills[id];
  luy.sort((a, b) => a.id - b.id);
  const luyen = {}, books = [];
  for (const l of luy) { luyen[l.id] = l.lv; books.push(l.id); }
  const luyenObj = {};
  for (const id of Object.keys(luyen).map(Number).sort((a, b) => a - b)) luyenObj[id] = luyen[id];
  const atk = reg.filter((r) => r.kind === "attack" && skillsSorted[r.id] > 0).sort((a, b) => (b.req - a.req) || (a.id - b.id));
  const xoay = atk.length ? [atk[0].id, atk[0].id, ...atk.slice(1).map((r) => r.id)] : [];
  const finishers = luy.filter((l) => vocong.kindOf(DB[String(l.id)], DB) === "attack").sort((a, b) => (b.req - a.req) || (a.id - b.id)).map((l) => l.id);
  const auras = reg.filter((r) => r.kind === "aura" && skillsSorted[r.id] > 0).map((r) => r.id).sort((a, b) => a - b);
  // Tiềm năng: 995 điểm (5/cấp × 199). Ưu tiên chỉ số theo loại sát thương chủ đạo của nhánh:
  // chiêu tấn công đa số ngoại công (phys) -> Sức mạnh; đa số nội công -> Nội công; còn lại -> Thân pháp.
  const nPhys = atk.filter((r) => DB[String(r.id)].phys).length;
  const fav = atk.length && nPhys * 2 > atk.length ? "str" : "eng";
  const attr = { str: 160, dex: 200, vit: 200, eng: 160 };
  attr[fav] = 435;
  const spent = Object.values(skillsSorted).reduce((a, b) => a + b, 0);
  return { fac: +fac, facKey: FACKEY[+fac], series: SERIES[+fac], eqt,
    skills: skillsSorted, luyen: luyenObj, books, luyen0: Object.fromEntries(books.map((id) => [id, 0])),
    xoay, finishers, auras, attr, diemDaDung: spent, diemDu: DIEM_TOI_DA - spent };
}

const CACHE = new Map();
function bangChieu(fac, eqt) {
  const k = fac + "|" + eqt;
  if (!CACHE.has(k)) CACHE.set(k, deriveBranch(fac, eqt));
  return CACHE.get(k);
}

// Các nhánh vũ khí của phái (ma-qua.js nhanhPhai: eqt khác -2 trong mọi chiêu của phái).
function nhanhCua(fac) {
  const f = (SK.factions || []).find((x) => x.id === +fac);
  if (!f) return [];
  const s = new Set();
  for (const id of f.skills || []) { const k = DB[String(id)]; if (k && k.eqt !== -2 && k.eqt != null) s.add(k.eqt | 0); }
  return [...s].sort((a, b) => a - b);
}

module.exports = { bangChieu, deriveBranch, nhanhCua, SERIES, FACKEY, DB, DIEM_TOI_DA };
