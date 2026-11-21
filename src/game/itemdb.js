// Kho do: 10 o trang bi + dong an kich theo ngu hanh (ban dung lai).
import { NGU_HANH } from "./rules.js";
export const O_TRANG_BI = ["Cap", "Cloth", "Sash", "Pendant", "Bangle", "Weapon", "Shoes", "Ring1", "Ring2", "Necklace"];
// _chuThich: bang KICH duoi day la khung — moi ngu hanh kich 2 o lien ket; can doi chieu voi ban goc truoc khi dung cho can bang that.
export const KICH = { Kim: ["Weapon", "Ring1"], Moc: ["Cloth", "Shoes"], Thuy: ["Pendant", "Necklace"], Hoa: ["Bangle", "Sash"], Tho: ["Cap", "Ring2"] };
export const BUFF_TONG_KIM = { tong: { cong: 0.1 }, kim: { thu: 0.1 } };
export function coTacDung(vat, nv) {
  if (!vat || !vat.dongAn) return false;
  if (vat.nguHanh !== undefined && nv.nguHanh !== undefined && vat.nguHanh !== nv.nguHanh) return false;
  const lienKet = KICH[NGU_HANH[nv.nguHanh] || nv.nguHanh] || [];
  return lienKet.every((o) => nv.trangBi && nv.trangBi[o]);
}
export function soKich(nv) { let n = 0; for (const o of O_TRANG_BI) { const vat = nv.trangBi && nv.trangBi[o]; if (vat && coTacDung(vat, nv)) n += 1; } return n; }
export function tinhChiSoTrangBi(nv) {
  const ra = { cong: 0, thu: 0, mau: 0, mana: 0, khang: {} };
  for (const o of O_TRANG_BI) {
    const vat = nv.trangBi && nv.trangBi[o];
    if (!vat || !vat.chiSo) continue;
    for (const k of ["cong", "thu", "mau", "mana"]) ra[k] += vat.chiSo[k] || 0;
    if (vat.chiSo.khang) for (const kk of Object.keys(vat.chiSo.khang)) ra.khang[kk] = (ra.khang[kk] || 0) + vat.chiSo.khang[kk];
    if (coTacDung(vat, nv) && vat.dongAn) for (const k of ["cong", "thu", "mau", "mana"]) ra[k] += vat.dongAn[k] || 0;
  }
  return ra;
}
export function macDo(nv, o, vat) { if (!O_TRANG_BI.includes(o)) return false; if (!nv.trangBi) nv.trangBi = {}; nv.trangBi[o] = vat; return true; }
export function thaoDo(nv, o) { if (!nv.trangBi || !nv.trangBi[o]) return null; const vat = nv.trangBi[o]; delete nv.trangBi[o]; return vat; }
export const VAT_MAU = [
  { id: "kiem-go", ten: "Kiem Go", o: "Weapon", chiSo: { cong: 5 }, nguHanh: 0 },
  { id: "ao-vai", ten: "Ao Vai", o: "Cloth", chiSo: { thu: 3 }, nguHanh: 1 },
  { id: "nhan-dong", ten: "Nhan Dong", o: "Ring1", chiSo: { mau: 50 }, nguHanh: 0, dongAn: { cong: 3 } },
  { id: "thuoc-mau", ten: "Thuoc Hoi Mau", loai: "thuoc", chiSo: { mau: 100 } },
];
export function timVat(id) { return VAT_MAU.find((v) => v.id === id) || null; }