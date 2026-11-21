// Ban do: anh nen + luoi di duoc (base64) + vat the (ban dung lai).
import { taiAnh } from "./tai-tep.js";
import { DIR } from "./dir.js";
export const SCALE = 0.75;
export const CELL = 32 * SCALE;
export function ldist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
export function giaiMaLuoi(b64) { const s = atob(b64); const ra = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) ra[i] = s.charCodeAt(i); return ra; }
export function maHoaLuoi(luoi) { let s = ""; for (let i = 0; i < luoi.length; i++) s += String.fromCharCode(luoi[i]); return btoa(s); }
const HUONG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export class GameMap {
  constructor(meta) {
    this.ten = meta.ten || "";
    this.rong = meta.rong || 0;
    this.cao = meta.cao || 0;
    this.luoi = meta.luoi ? giaiMaLuoi(meta.luoi) : new Uint8Array(this.rong * this.cao);
    this.nen = null;
    this.vatThe = meta.vatThe || [];
    this.hamVatThe = new Map();
    for (const v of this.vatThe) { const k = v.x + "," + v.y; if (!this.hamVatThe.has(k)) this.hamVatThe.set(k, []); this.hamVatThe.get(k).push(v); }
  }
  static async load(meta, key, base) {
    const m = new GameMap(meta);
    const nenUrl = (base || DIR.map) + (meta.nen || ("z/" + key + ".jpg"));
    try { m.nen = await taiAnh(nenUrl); } catch { m.nen = null; }
    return m;
  }
  oTrong(x, y) { return x >= 0 && y >= 0 && x < this.rong && y < this.cao; }
  diDuoc(x, y) { if (!this.oTrong(x, y)) return false; return this.luoi[y * this.rong + x] === 1; }
  coTheDi(tx, ty, dx, dy) {
    if (!this.diDuoc(tx + dx, ty + dy)) return false;
    if (dx !== 0 && dy !== 0) { if (!this.diDuoc(tx + dx, ty) || !this.diDuoc(tx, ty + dy)) return false; }
    return true;
  }
  oKe(tx, ty) { const ra = []; for (const [dx, dy] of HUONG) { if (this.coTheDi(tx, ty, dx, dy)) ra.push([tx + dx, ty + dy]); } return ra; }
  timDuong(tx0, ty0, tx1, ty1) {
    // BFS 8 huong. _chuThich: ban goc dung A*; ban dung lai dung BFS cho don gian, can doi chieu hieu nang khi map lon.
    const den = tx1 + "," + ty1;
    const truoc = new Map([[tx0 + "," + ty0, null]]);
    const hang = [[tx0, ty0]];
    while (hang.length) {
      const [x, y] = hang.shift();
      if (x + "," + y === den) break;
      for (const [nx, ny] of this.oKe(x, y)) { const k = nx + "," + ny; if (!truoc.has(k)) { truoc.set(k, [x, y]); hang.push([nx, ny]); } }
    }
    if (!truoc.has(den)) return [];
    const duong = []; let cur = [tx1, ty1];
    while (cur) { duong.unshift(cur); cur = truoc.get(cur[0] + "," + cur[1]); }
    return duong;
  }
  vatTheGan(x, y, r) { const ra = []; const x0 = Math.max(0, Math.floor(x - r)); const x1 = Math.min(this.rong - 1, Math.ceil(x + r)); const y0 = Math.max(0, Math.floor(y - r)); const y1 = Math.min(this.cao - 1, Math.ceil(y + r)); for (let yy = y0; yy <= y1; yy++) { for (let xx = x0; xx <= x1; xx++) { const ds = this.hamVatThe.get(xx + "," + yy); if (ds) ra.push(...ds); } } return ra; }
  ve(ctx, camX, camY, rongMan, caoMan) {
    // _chuThich: ban goc ve vat the theo thu tu chan va che khuat sau nhan vat; ban nay ve don gian mot lop.
    if (this.nen) ctx.drawImage(this.nen, -camX, -camY, this.nen.width * SCALE, this.nen.height * SCALE);
    else { ctx.fillStyle = "#101018"; ctx.fillRect(0, 0, rongMan, caoMan); }
    const vat = this.vatThe.filter((v) => v.x * CELL - camX > -64 && v.x * CELL - camX < rongMan + 64 && v.y * CELL - camY > -64 && v.y * CELL - camY < caoMan + 64);
    vat.sort((a, b) => (a.y + (a.cao || 1)) - (b.y + (b.cao || 1)));
    for (const v of vat) { ctx.fillStyle = v.mau || "#3a3a4a"; ctx.fillRect(v.x * CELL - camX, v.y * CELL - camY, (v.rong || 1) * CELL, (v.cao || 1) * CELL); }
  }
}
