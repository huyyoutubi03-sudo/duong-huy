// Kenh tuc thoi /api/ws (ban dung lai): WebSocket toi gian, chi khung van ban.
"use strict";
const crypto = require("crypto");
const TG = require("./the-gioi");
const clients = new Set();
function chapNhan(key) { return crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64"); }
function khung(s) {
  const b = Buffer.from(s);
  let dau;
  if (b.length < 126) { dau = Buffer.from([129, b.length]); }
  else if (b.length < 65536) { dau = Buffer.alloc(4); dau[0] = 129; dau[1] = 126; dau.writeUInt16BE(b.length, 2); }
  else { dau = Buffer.alloc(10); dau[0] = 129; dau[1] = 127; dau.writeBigUInt64BE(BigInt(b.length), 2); }
  return Buffer.concat([dau, b]);
}
function gui(socket, o) { try { socket.write(khung(JSON.stringify(o))); } catch {} }
function guiTat(loai, duLieu) { for (const c of clients) gui(c, { loai, ...duLieu }); }
function docKhung(socket, buf) {
  let i = 0;
  while (i + 2 <= buf.length) {
    const op = buf[i] & 15;
    const coMatNa = buf[i + 1] & 128;
    let dai = buf[i + 1] & 127;
    let j = i + 2;
    if (dai === 126) { if (j + 2 > buf.length) break; dai = buf.readUInt16BE(j); j += 2; }
    else if (dai === 127) { if (j + 8 > buf.length) break; dai = Number(buf.readBigUInt64BE(j)); j += 8; }
    let matNa = null;
    if (coMatNa) { if (j + 4 > buf.length) break; matNa = buf.slice(j, j + 4); j += 4; }
    if (j + dai > buf.length) break;
    let du = buf.slice(j, j + dai);
    if (matNa) { du = Buffer.from(du); for (let k = 0; k < du.length; k++) du[k] ^= matNa[k % 4]; }
    if (op === 8) { try { socket.end(); } catch {} return Buffer.alloc(0); }
    if (op === 9) { socket.write(Buffer.from([138, 0])); }
    if (op === 1) { try { nhan(socket, JSON.parse(du.toString("utf-8"))); } catch {} }
    i = j + dai;
  }
  return buf.slice(i);
}
function nhan(socket, msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.k === "boss") gui(socket, { loai: "boss", ...TG.trangThai() });
  else if (msg.k === "chat") guiTat("chat", { tu: msg.tu || "?", noi: String(msg.noi || "").slice(0, 200) });
  else gui(socket, { loai: "chao", gio: Date.now() });
}
function gan(server, kiemPhien) {
  server.on("upgrade", (req, socket) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { socket.destroy(); return; }
    if (p !== "/api/ws") { socket.destroy(); return; }
    if (kiemPhien && !kiemPhien(req)) { socket.destroy(); return; }
    const key = req.headers["sec-websocket-key"];
    if (!key) { socket.destroy(); return; }
    const dong = ["HTTP/1.1 101 Switching Protocols", "Upgrade: websocket", "Connection: Upgrade", "Sec-WebSocket-Accept: " + chapNhan(key), "", ""];
    socket.write(dong.join(String.fromCharCode(13, 10)));
    clients.add(socket);
    let dem = Buffer.alloc(0);
    socket.on("data", (c) => { dem = Buffer.concat([dem, c]); dem = docKhung(socket, dem); });
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
    gui(socket, { loai: "chao", gio: Date.now(), theGioi: TG.trangThai() });
  });
}
function dem() { return clients.size; }
module.exports = { gan, guiTat, dem };