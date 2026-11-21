// Mang client: goi API + WebSocket (ban dung lai).
export class Net {
  constructor() { this.ws = null; }
  async goi(path, body, tuyChon) {
    const r = await fetch(path, { method: (tuyChon && tuyChon.method) || "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw new Error(d.loi || ("loi HTTP " + r.status));
    return d;
  }
  async lay(path) { const r = await fetch(path, { credentials: "same-origin" }); const d = await r.json().catch(() => ({})); if (!r.ok || d.ok === false) throw new Error(d.loi || ("loi HTTP " + r.status)); return d; }
  dangNhap(ten, mk) { return this.goi("/api/dang-nhap", { ten, mk }); }
  dangXuat() { return this.goi("/api/dang-xuat", {}); }
  trangThai() { return this.lay("/api/trang-thai"); }
  nhanVat() { return this.lay("/api/nhan-vat"); }
  taoNv(ten, phai, o) { return this.goi("/api/tao-nhan-vat", { o, ten, phai }); }
  chonNv(o) { return this.goi("/api/chon-nhan-vat", { o }); }
  moWs(nhanTin, baoLoi) {
    if (this.ws) return this.ws;
    const giaoThuc = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(giaoThuc + "//" + location.host + "/api/ws");
    ws.onmessage = (e) => { try { nhanTin(JSON.parse(e.data)); } catch {} };
    ws.onerror = () => { if (baoLoi) baoLoi(); };
    this.ws = ws;
    return ws;
  }
  guiWs(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  dongWs() { if (this.ws) { try { this.ws.close(); } catch {} this.ws = null; } }
}
export const net = new Net();