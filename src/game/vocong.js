// Vo cong: hang so + khung ky nang (ban dung lai).
export const TICK = 1 / 18;
export const BASE = "assets/web/vocong";
export const VUNG_MAX = 6;
export const DOC_TOI_DA = 1080;
export const TK_FX = 20;
export const TK_BUA_XA = 420;
export const TK_FX_XA = 650;
export const SLOW_T = 18;
export const SLOW_K = 0.5;
export const CHAM_MIN = 60;
export const HURT_T = 12 * TICK;
export const CAST_T = 18;
export const HIT_AT = 0.55;
export const TV_SLOW = 1.25;
export const DASH_V = 31;
export const GHOST_T = 0.3;
export const TRAP_MAX = 5;
export const TRAP_LIFE = 180;
export const AURA_T = 18;
export const KC_ID = 50;
export const KHINH_CONG = { id: KC_ID, ten: "Khinh cong", tocDo: 1.5 };
export const ANIM = { 9: "Attack1", 10: "Attack2", 11: "Magic" };
export const BUA_VUNG_AI = new Set([15, 171, 173, 178]);
export const CHIEU_MAU = { _chuThich: "bang mau — ban goc co day du, can bo sung", 9: { ten: "Danh thuong", loai: "vat-ly", heSo: 1, hoi: 0.5 }, 10: { ten: "Danh manh", loai: "vat-ly", heSo: 1.5, hoi: 1 }, 50: { ten: "Khinh cong", loai: "ho-tro", heSo: 0, hoi: 0 } };
export class VoCong {
  constructor(nv) { this.nv = nv; this.chieu = {}; this.hoiChieu = {}; }
  hoc(id) { if (this.chieu[id]) return false; this.chieu[id] = { id, cap: 1 }; return true; }
  capChieu(id) { return (this.chieu[id] && this.chieu[id].cap) || 0; }
  tangCap(id) { const c = this.chieu[id]; if (!c) return false; c.cap += 1; return true; }
  sanSang(id, luc) { return (this.hoiChieu[id] || 0) <= luc; }
  dung(id, luc) { const c = CHIEU_MAU[id]; if (!c || !this.chieu[id]) return null; const hoi = (c.hoi || 1) * 18; this.hoiChieu[id] = luc + hoi; return { id, ten: c.ten, loai: c.loai, heSo: c.heSo, cap: this.chieu[id].cap, hoi }; }
  tinhHieuUng(id, cap) { const c = CHIEU_MAU[id]; if (!c) return null; return { satThuong: c.heSo * cap, cham: c.loai === "doc" ? Math.min(DOC_TOI_DA, cap * 10) : 0, lamCham: c.loai === "bang" ? { thoiGian: SLOW_T, heSo: SLOW_K } : null }; }
}
export function satThuongChieu(chieu, cap, nv) { const heSo = (chieu && chieu.heSo) || 1; return Math.max(1, Math.round((10 + (nv.sucManh || 0) * 2) * heSo * (1 + cap * 0.1))); }
export function coTheDung(nv, id) { return !!(nv.voCong && nv.voCong[id]); }