// Tu danh: tu tim quai gan nhat va danh (ban dung lai).
import { CELL } from "../map.js";
export class TuDong {
  constructor(world) { this.world = world; this.dangBat = false; }
  bat() { this.dangBat = true; }
  tat() { this.dangBat = false; this.world.dangDanh = null; }
  capNhat() {
    if (!this.dangBat) return;
    const w = this.world;
    if (!w.hero) return;
    if (w.dangDanh) { const q = w.quai.find((x) => x.id === w.dangDanh); if (q && !q.chet) return; }
    let gan = null; let dNho = 10 * CELL;
    for (const q of w.quai) { if (q.chet) continue; const d = Math.hypot(q.x - w.hero.x, q.y - w.hero.y); if (d < dNho) { dNho = d; gan = q; } }
    if (gan) w.dangDanh = gan.id;
  }
}