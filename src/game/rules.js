// Quy tac game: hang so + cong thuc (ban dung lai).
// _chuThich: cac HANG duoi day doc duoc tu ban goc (src/game/rules.js). Than ham la khung logic can doi chieu tung dong voi ban goc truoc khi dung cho can bang that; khong tu nhan la dung goc.
export const PTS_PER_LEVEL = 5, SKILL_PTS_PER_LEVEL = 1, MAX_LEVEL = 200;
export const KHANG_TOI_DA = 95;
export const RES_KEYS = ["fire", "cold", "light", "poison", "phys"];
export const DEATH = { expPermille: 10, expCap: 50000, goldPermille: 50 };
export const CC_TOI_DA = 3;
export const CC_TRU = new Set([1, 2, 53, 210]);
export const NGU_HANH = ["Kim", "Moc", "Thuy", "Hoa", "Tho"];
export const KHAC = [1, 4, 3, 0, 2];
export const SINH = [2, 3, 1, 4, 0];
export function khangDu(khang, cap) { return Math.max(0, Math.min(khang || 0, cap === undefined ? KHANG_TOI_DA : cap)); }
export function khangThat(khang, giam) { return Math.max(0, (khang || 0) - (giam || 0)); }
export function capChieu(cap) { return Math.max(1, Math.min(MAX_LEVEL, cap || 1)); }
export function ccCong(cc) { return CC_TRU.has(cc) ? 0 : 1; }
export function ccTrang(cc) { return CC_TRU.has(cc) ? 1 : 0; }
export function noiCapChieu(chieu) { return (chieu && chieu.capNoi) || 0; }
export function capCong(cap) { return (cap || 1) * PTS_PER_LEVEL; }
export function skCong(sk, cap) { return ((sk && sk.cong) || 0) * (1 + (cap || 1) * 0.1); }
export function hamChieu(id) { return CHIEU_TRUOC[id] || null; }
export function heroStats(nv) { const cap = nv.cap || 1; return { mau: 100 + (cap - 1) * 20 + (nv.sucManh || 0) * 5, mana: 50 + (cap - 1) * 10 + (nv.noiCong || 0) * 5, cong: 10 + (nv.sucManh || 0) * 2, thu: (nv.theChat || 0) * 2, nhanhNhen: nv.nhanhNhen || 0, mayMan: nv.mayMan || 0 }; }
export function mobStats(mob, heSo) { const h = heSo || { mau: 1, satThuong: 1 }; return { mau: Math.round((mob.mau || 10) * h.mau), cong: Math.round((mob.satThuong || 1) * h.satThuong), cap: mob.cap || 1 }; }
export function atkFrames(tocDo) { return Math.max(1, Math.round(18 / Math.max(1, tocDo || 1))); }
export function hitPercent(cong, ne) { return Math.max(5, Math.min(95, 50 + ((cong || 0) - (ne || 0)) * 0.5)); }
export function heroDamage(nv, mob, chieu) { const st = heroStats(nv); const heSo = (chieu && chieu.heSo) || 1; const khang = khangDu((mob && mob.khangVatLy) || 0); return Math.max(1, Math.round(st.cong * heSo * (1 - khang / 100))); }
export function mobDamage(mob, nv) { const st = heroStats(nv); return Math.max(1, Math.round((mob.satThuong || 1) - st.thu * 0.1)); }
export function mobDamageHe(mob, nv, he) { const khang = khangDu((nv.khang && nv.khang[RES_KEYS[he] || "phys"]) || 0); return Math.max(1, Math.round((((mob.satThuongHe && mob.satThuongHe[he]) || mob.satThuong) || 1) * (1 - khang / 100))); }
export const LUYEN = { _chuThich: "bang mau — ban goc co day du, can bo sung", 1: { ten: "Luyen cong co ban", kn: 100 }, 10: { ten: "Luyen cong so cap", kn: 500 }, 50: { ten: "Luyen cong trung cap", kn: 2000 } };
export const MOC = [1, 10, 20, 30, 50, 80, 100, 120, 150, 200];
export function mocCua(cap) { let m = 1; for (const x of MOC) { if (x <= cap) m = x; } return m; }
export function datLuyen(nv) { return (nv.cap || 1) >= mocCua(nv.cap || 1); }
export function fixPoints(diem) { const d = { sucManh: 0, nhanhNhen: 0, theChat: 0, noiCong: 0, mayMan: 0, ...(diem || {}) }; for (const k of Object.keys(d)) d[k] = Math.max(0, Math.floor(+d[k] || 0)); return d; }
export const CHIEU_TRUOC = { _chuThich: "bang mau — ban goc co day du, can bo sung", 321: [320], 323: [322] };
export function chanNang(chieu, cap) { return Math.max(1, Math.floor((cap || 1) / 10)); }
export const XUNG_HIEU = { 1: "Tan thu", 10: "Hiep khach", 30: "Dai hiep", 60: "Vo lam cao thu", 100: "Tong su", 150: "Vo lam minh chu" };
export function xungHieu(cap) { let t = "Tan thu"; for (const k of Object.keys(XUNG_HIEU).map(Number).sort((a, b) => a - b)) { if (cap >= k) t = XUNG_HIEU[k]; } return t; }
export function kinhNghiemCan(cap) { return Math.round(100 * Math.pow(cap, 1.5)); }