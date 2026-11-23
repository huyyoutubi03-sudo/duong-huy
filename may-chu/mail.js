// Gửi mail qua SMTP, không thư viện ngoài (dự án Node thuần — package.json "không thư viện ngoài").
// Gmail: dùng MẬT KHẨU ỨNG DỤNG 16 ký tự (myaccount.google.com → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng),
// KHÔNG phải mật khẩu đăng nhập Gmail. Cấu hình bằng biến môi trường:
//   VL_MAIL_USER (địa chỉ Gmail gửi), VL_MAIL_PASS (mật khẩu ứng dụng),
//   VL_MAIL_HOST (mặc định smtp.gmail.com), VL_MAIL_PORT (mặc định 465, TLS ngay từ đầu),
//   VL_MAIL_FROM (mặc định = VL_MAIL_USER), VL_MAIL_TLS=0 (không TLS — chỉ cho máy thử SMTP giả nội bộ).
// Chưa cấu hình: máy thử local thì ghi mã ra console (để test); máy production (Railway) thì từ chối gửi —
// mã xác minh không bao giờ được lọt ra ngoài qua log production.

"use strict";

const tls = require("node:tls");
const net = require("node:net");

const HOST = process.env.VL_MAIL_HOST || "smtp.gmail.com";
const PORT = +(process.env.VL_MAIL_PORT || 465);
const USER = process.env.VL_MAIL_USER || "";
const PASS = process.env.VL_MAIL_PASS || "";
const FROM = process.env.VL_MAIL_FROM || USER;
const DUNG_TLS = process.env.VL_MAIL_TLS !== "0";
const PROD = !!process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production";

const SAN_SANG = () => !!USER && !!PASS;

// Đọc dòng SMTP (kết thúc CRLF), chờ tối đa 20 giây cho mỗi lượt.
function docDong(socket, boDem, hetGio) {
  return new Promise((resolve, reject) => {
    const hen = setTimeout(() => { socket.destroy(); reject(new Error("Máy chủ mail không trả lời (quá 20 giây)")); }, 20000);
    const kiem = () => {
      const i = boDem.buf.indexOf("\r\n");
      if (i >= 0) { const dong = boDem.buf.slice(0, i); boDem.buf = boDem.buf.slice(i + 2); clearTimeout(hen); resolve(dong); return true; }
      return false;
    };
    if (kiem()) return;
    const onData = (d) => { boDem.buf += d.toString("utf8"); if (kiem()) don(); };
    const onErr = (e) => { don(); reject(e); };
    const onHet = () => { don(); reject(new Error("Máy chủ mail ngắt kết nối")); };
    const don = () => { clearTimeout(hen); socket.off("data", onData); socket.off("error", onErr); socket.off("end", onHet); };
    socket.on("data", onData); socket.once("error", onErr); socket.once("end", onHet);
    if (Date.now() > hetGio) { don(); socket.destroy(); reject(new Error("Gửi mail quá lâu")); }
  });
}

async function noiChuyen(socket, boDem, lenh, cho) {
  if (lenh != null) socket.write(lenh + "\r\n");
  const dong = await docDong(socket, boDem, Date.now() + 60000);
  const ma = +dong.slice(0, 3);
  // trả lời nhiều dòng: "250-..." rồi "250 ..." — đọc tới dòng có dấu cách sau mã
  let cuoi = dong;
  while (/^\d{3}-/.test(cuoi)) cuoi = await docDong(socket, boDem, Date.now() + 60000);
  if (cho && !cho.includes(ma)) throw new Error(`Máy chủ mail báo ${cuoi}`);
  return cuoi;
}

const b64 = (s) => Buffer.from(String(s), "utf8").toString("base64");
const tieuDeB64 = (s) => `=?UTF-8?B?${Buffer.from(String(s), "utf8").toString("base64")}?=`;

async function guiMail(to, tieuDe, noiDung) {
  if (!SAN_SANG()) {
    if (PROD) throw new Error("Máy chủ chưa cấu hình gửi mail — Huy cần đặt VL_MAIL_USER và VL_MAIL_PASS trên Railway rồi mới đăng ký được");
    console.log(`[mail-thu] To: ${to} | ${tieuDe} | ${noiDung}`);
    return { thu: true };
  }
  const socket = DUNG_TLS ? tls.connect({ host: HOST, port: PORT, servername: HOST }) : net.connect({ host: HOST, port: PORT });
  const boDem = { buf: "" };
  try {
    await noiChuyen(socket, boDem, null, [220]);
    await noiChuyen(socket, boDem, "EHLO chien-vo-lam-xua", [250]);
    await noiChuyen(socket, boDem, "AUTH LOGIN", [334]);
    await noiChuyen(socket, boDem, b64(USER), [334]);
    await noiChuyen(socket, boDem, b64(PASS), [235]);
    await noiChuyen(socket, boDem, `MAIL FROM:<${FROM}>`, [250]);
    await noiChuyen(socket, boDem, `RCPT TO:<${to}>`, [250, 251]);
    await noiChuyen(socket, boDem, "DATA", [354]);
    const than = [
      `From: Chien - Vo Lam Xua <${FROM}>`,
      `To: <${to}>`,
      `Subject: ${tieuDeB64(tieuDe)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      ...String(noiDung).replace(/\r\n/g, "\n").split("\n").map((d) => (d.startsWith(".") ? "." + d : d)),
    ].join("\r\n");
    socket.write(than + "\r\n.\r\n");
    await docDong(socket, boDem, Date.now() + 60000).then((d) => { if (!/^250/.test(d)) throw new Error(`Máy chủ mail báo ${d}`); });
    await noiChuyen(socket, boDem, "QUIT", [221]);
    return { ok: true };
  } finally {
    try { socket.destroy(); } catch {}
  }
}

module.exports = { guiMail, SAN_SANG, PROD };
