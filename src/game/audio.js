// Am thanh: tieng bip WebAudio don gian, khong can file am thanh goc (ban dung lai).
let bat = true;
export function datBatAmThanh(v) { bat = !!v; }
const TAN_SO = { click: 660, danh: 440, chet: 220, lenCap: 880, nhan: 520 };
export function phat(ten) {
  if (!bat) return;
  try {
    const ctx = phat.ctx || (phat.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = TAN_SO[ten] || 440;
    o.type = "sine";
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    o.start(); o.stop(ctx.currentTime + 0.08);
  } catch {}
}