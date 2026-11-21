// Nhan vat ve theo khung hinh JX (ban dung lai — dung anh PNG giu cho, khong giai ma .spr goc).
export const TRANG_THAI = { DUNG: "dung", DI: "di", DANH: "danh", CHET: "chet" };
export class JxChar {
  constructor(o) { this.anh = o.anh || null; this.mau = o.mau || "#e8dcc0"; this.rongKhung = o.rongKhung || 48; this.caoKhung = o.caoKhung || 64; this.khung = o.khung || { dung: [0], di: [0, 1, 2, 3], danh: [4, 5], chet: [6] }; this.tocDo = o.tocDo || 8; }
  khungHienTai(trangThai, thoiGian) { const ds = this.khung[trangThai] || this.khung.dung; const i = Math.floor(thoiGian * this.tocDo) % ds.length; return ds[i]; }
  ve(ctx, x, y, trangThai, thoiGian) {
    const k = this.khungHienTai(trangThai, thoiGian);
    if (this.anh) { ctx.drawImage(this.anh, k * this.rongKhung, 0, this.rongKhung, this.caoKhung, x - this.rongKhung / 2, y - this.caoKhung, this.rongKhung, this.caoKhung); return; }
    ctx.fillStyle = this.mau; ctx.beginPath(); ctx.arc(x, y - 44, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 12, y - 34, 24, 30);
    ctx.fillStyle = "#000"; ctx.fillRect(x - 12, y - 4, 24, 4);
  }
}