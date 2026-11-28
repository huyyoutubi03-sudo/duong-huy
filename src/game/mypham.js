// Mỹ phẩm P4 (26/11/2026, THIET-KE.md §2.4/§3 P4): chỉ đổi ngoại hình, 0 chỉ số.
// Dữ liệu: assets/data/ngoai-trang.json (10 bộ, 1/phái) + assets/data/vong-sang.json (3 vòng + 3 vũ khí sáng),
// id kiểu dáng / fx đều lấy từ kho client có sẵn, không art mới đợt 1.
// Tải lười (load()): world.js + windows.js gọi, không chặn boot; trước khi tải xong mọi def() trả null
// -> ngoại hình giữ như đồ đang mặc (không rơi về mặc định Thiếu Lâm, không vẽ gì thêm).

import { looksOf } from "./itemdb.js";

const json = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });
let _p = null, _nt = [], _vg = [], _vk = [];

export const MyPham = {
  load() {
    return (_p = _p || Promise.all([json("assets/data/ngoai-trang.json").catch(() => ({ bo: [] })), json("assets/data/vong-sang.json").catch(() => ({ vong: [], vuKhi: [] }))])
      .then(([a, b]) => { _nt = Array.isArray(a.bo) ? a.bo : []; _vg = Array.isArray(b.vong) ? b.vong : []; _vk = Array.isArray(b.vuKhi) ? b.vuKhi : []; return true; })
      .catch(() => false));
  },
  get daTai() { return _p != null; },
  boNt() { return _nt; },
  vong() { return _vg; },
  vuKhi() { return _vk; },
  defNt(id) { return _nt.find((x) => (x.id | 0) === (id | 0)) || null; },
  defVg(id) { return _vg.find((x) => (x.id | 0) === (id | 0)) || null; },
  defVk(id) { return _vk.find((x) => (x.id | 0) === (id | 0)) || null; },
  // sở hữu đã chuẩn hóa của nhân vật: h.mpSo = { nt: [id], vg: [id], vk: [id] } (máy chủ may-chu/do.js giữ)
  soHuu(hero) {
    const s = (hero && hero.mpSo) || {};
    const loc = (L, defs) => (Array.isArray(L) ? L : []).map((v) => v | 0).filter((v, i, a) => v > 0 && a.indexOf(v) === i && defs.some((d) => (d.id | 0) === v));
    return { nt: loc(s.nt, _nt), vg: loc(s.vg, _vg), vk: loc(s.vk, _vk) };
  },
};

// id kiểu dáng có hình thật trong kho jxchar không (jx-char.js look(): id có hàng trong rows thì mới vẽ).
// jx null (chưa nạp) thì không chặn — JxChar.look tự bỏ bộ phận không có hàng.
const coHinh = (jx, sex, nhom, id) => {
  if (!jx || !jx.meta) return true;
  const S = jx.meta.sex[sex === "f" ? "f" : "m"];
  const part = nhom === "helm" ? "head" : nhom === "armor" ? "body" : "rweapon";
  return !!((S.rows[part] || {})[id]);
};
// ngoại hình đang mặc + ngoại trang đè lên (chỉ nhóm nào id tồn tại trong kho; nhóm thiếu id thì giữ đồ mặc).
const tron = (jx, sex, goc, bo) => {
  const o = { ...goc };
  if (!bo) return o;
  if (bo.helm && coHinh(jx, sex, "helm", bo.helm)) o.helm = bo.helm;
  if (bo.armor && coHinh(jx, sex, "armor", bo.armor)) o.armor = bo.armor;
  if (bo.weapon && coHinh(jx, sex, "weapon", bo.weapon)) o.weapon = bo.weapon;
  if (bo.mantle) o.mantle = bo.mantle;
  return o;
};
// ngoại hình của chính mình (hero.looks = đồ đang mặc) + ngoại trang đang chọn
export const looksMoi = (jx, sex, hero) => tron(jx, sex, looksOf(hero || {}), (hero && hero.ngoaiTrang) ? MyPham.defNt(hero.ngoaiTrang) : null);
// ngoại hình người khác (look = đồ họ mặc, từ snapshot) + ngoại trang họ đang chọn (nt trong snapshot)
export const looksKhach = (jx, sex, look, ntId) => tron(jx, sex, { ...(look || {}) }, ntId ? MyPham.defNt(ntId) : null);
