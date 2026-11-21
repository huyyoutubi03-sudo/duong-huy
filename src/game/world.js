// The gioi game: ban do, nhan vat, quai, NPC, chien dau (ban dung lai).
// _chuThich: khung don gian hoa — quai dung yen va danh khi nhan vat lai gan; ban goc co AI quai phuc tap hon, can doi chieu.
import { GameMap, CELL, ldist } from "../map.js";
import { JxChar } from "../char/jx-char.js";
import { net } from "./net.js";
import { heroStats, heroDamage, mobDamage, hitPercent } from "./rules.js";
export const TICK = 1 / 18;
export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.map = null;
    this.hero = null;
    this.quai = [];
    this.npc = [];
    this.nguoiChoi = [];
    this.hieuUng = [];
    this.soSatThuong = [];
    this.camX = 0; this.camY = 0;
    this.tick = 0;
    this.thoiGian = 0;
    this.dangDanh = null;
    this.hoiDanh = 0;
    this.onCapNhat = null;
  }
  async taiMap(meta, key) { this.map = await GameMap.load(meta, key); this.quai = (meta.quai || []).map((q) => ({ ...q, x: (q.x + 0.5) * CELL, y: (q.y + 0.5) * CELL, mau: q.mau || 50, mauToiDa: q.mau || 50, chet: false, hoiDanh: 0 })); this.npc = meta.npc || []; return this.map; }
  datHero(nv) { const st = heroStats(nv); this.hero = { ...nv, x: (nv.x || 5) * CELL, y: (nv.y || 5) * CELL, duong: [], mau: nv.mau || st.mau, mauToiDa: st.mau, mana: nv.mana || st.mana, manaToiDa: st.mana, trangThai: "dung", jx: new JxChar({ mau: "#ffd36b" }) }; }
  den(tx, ty) { if (!this.map || !this.hero) return; const sx = Math.floor(this.hero.x / CELL); const sy = Math.floor(this.hero.y / CELL); this.hero.duong = this.map.timDuong(sx, sy, tx, ty); this.hero.trangThai = "di"; }
  capNhat(dt) { this.thoiGian += dt; const buoc = Math.min(10, Math.floor(this.thoiGian / TICK) - this.tick); if (buoc <= 0) return; for (let i = 0; i < buoc; i++) this.tick1(); this.tick += buoc; }
  tick1() {
    if (!this.hero) return;
    const h = this.hero;
    if (h.duong && h.duong.length) {
      const [tx, ty] = h.duong[0];
      const cx = (tx + 0.5) * CELL; const cy = (ty + 0.5) * CELL;
      const dx = cx - h.x; const dy = cy - h.y;
      const d = Math.hypot(dx, dy);
      const toc = 4 * CELL * TICK;
      if (d <= toc) { h.x = cx; h.y = cy; h.duong.shift(); } else { h.x += (dx / d) * toc; h.y += (dy / d) * toc; }
      h.trangThai = h.duong.length ? "di" : "dung";
    }
    if (this.dangDanh) this.danhTick();
    for (const q of this.quai) {
      if (q.chet) continue;
      if (q.hoiDanh > 0) q.hoiDanh -= 1;
      const d = ldist(h.x, h.y, q.x, q.y);
      if (d < 3 * CELL && q.hoiDanh <= 0) { q.hoiDanh = 18; const st = mobDamage(q, h); h.mau = Math.max(0, h.mau - st); this.soSatThuong.push({ x: h.x, y: h.y - 50, so: "-" + st, mau: "#ff6b6b", con: 18 }); if (h.mau <= 0) this.chet(); }
    }
    for (const s of this.soSatThuong) { s.y -= 1; s.con -= 1; }
    this.soSatThuong = this.soSatThuong.filter((s) => s.con > 0);
    if (this.onCapNhat) this.onCapNhat();
  }
  danhTick() {
    const q = this.quai.find((x) => x.id === this.dangDanh);
    if (!q || q.chet) { this.dangDanh = null; return; }
    const h = this.hero;
    const d = ldist(h.x, h.y, q.x, q.y);
    if (d > 2 * CELL) { const tx = Math.floor(q.x / CELL); const ty = Math.floor(q.y / CELL); if (!h.duong || !h.duong.length) this.den(tx, ty); return; }
    if (this.hoiDanh > 0) { this.hoiDanh -= 1; return; }
    this.hoiDanh = 9;
    const tiLe = hitPercent(heroStats(h).cong, q.ne || 0);
    if (Math.random() * 100 > tiLe) { this.soSatThuong.push({ x: q.x, y: q.y - 50, so: "TRUOT", mau: "#ccc", con: 18 }); return; }
    const st = heroDamage(h, q, null);
    q.mau -= st;
    this.soSatThuong.push({ x: q.x, y: q.y - 50, so: "-" + st, mau: "#ffd36b", con: 18 });
    if (q.mau <= 0) { q.chet = true; this.dangDanh = null; this.baoQuaiChet(q); }
  }
  async baoQuaiChet(q) { try { const d = await net.goi("/api/do", { hanh: "danh", quai: q.id }); if (d.kinhNghiem) this.hero.kinhNghiem = d.kinhNghiem; if (d.tien !== undefined) this.hero.tien = d.tien; if (d.cap) this.hero.cap = d.cap; if (d.roi && d.roi.length) { this.hero.tui = this.hero.tui || []; this.hero.tui.push(...d.roi); } } catch {} }
  chet() { this.hero.trangThai = "chet"; this.dangDanh = null; setTimeout(() => { const st = heroStats(this.hero); this.hero.mau = st.mau; this.hero.x = 5 * CELL; this.hero.y = 5 * CELL; this.hero.trangThai = "dung"; }, 3000); }
  chonMucTieu(x, y) { let gan = null; let dNho = 2 * CELL; for (const q of this.quai) { if (q.chet) continue; const d = ldist(x, y, q.x, q.y); if (d < dNho) { dNho = d; gan = q; } } if (gan) { this.dangDanh = gan.id; return true; } return false; }
  nhanWs(msg) { if (msg.kieu === "chat") this.hieuUng.push({ kieu: "chat", ten: msg.ten, noiDung: msg.noiDung, con: 90 }); if (msg.kieu === "nguoi-choi") this.nguoiChoi = msg.danhSach || []; }
  ve() {
    const ctx = this.ctx; const w = this.canvas.width; const h = this.canvas.height;
    if (!this.map || !this.hero) { ctx.fillStyle = "#101018"; ctx.fillRect(0, 0, w, h); return; }
    this.camX = Math.max(0, Math.min(this.hero.x - w / 2, this.map.rong * CELL - w));
    this.camY = Math.max(0, Math.min(this.hero.y - h / 2, this.map.cao * CELL - h));
    ctx.clearRect(0, 0, w, h);
    this.map.ve(ctx, this.camX, this.camY, w, h);
    ctx.textAlign = "center"; ctx.font = "12px sans-serif";
    for (const n of this.npc) { const sx = n.x * CELL - this.camX; const sy = n.y * CELL - this.camY; ctx.fillStyle = "#7ec8e3"; ctx.beginPath(); ctx.arc(sx, sy - 20, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e8dcc0"; ctx.fillText(n.ten || "NPC", sx, sy - 34); }
    for (const q of this.quai) { if (q.chet) continue; const sx = q.x - this.camX; const sy = q.y - this.camY; ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.arc(sx, sy - 20, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e8dcc0"; ctx.fillText(q.ten || "Quai", sx, sy - 36); ctx.fillStyle = "#222"; ctx.fillRect(sx - 16, sy - 32, 32, 4); ctx.fillStyle = "#c0392b"; ctx.fillRect(sx - 16, sy - 32, 32 * Math.max(0, q.mau / q.mauToiDa), 4); }
    for (const p of this.nguoiChoi) { const sx = p.x * CELL - this.camX; const sy = p.y * CELL - this.camY; ctx.fillStyle = "#2ecc71"; ctx.beginPath(); ctx.arc(sx, sy - 20, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e8dcc0"; ctx.fillText(p.ten || "", sx, sy - 34); }
    const hx = this.hero.x - this.camX; const hy = this.hero.y - this.camY;
    this.hero.jx.ve(ctx, hx, hy, this.hero.trangThai, this.thoiGian);
    ctx.fillStyle = "#e8dcc0"; ctx.fillText(this.hero.ten || "", hx, hy - 70);
    for (const s of this.soSatThuong) { ctx.fillStyle = s.mau; ctx.font = "bold 14px sans-serif"; ctx.fillText(s.so, s.x - this.camX, s.y - this.camY); }
  }
}