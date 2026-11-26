// Đăng ký tài khoản bằng Gmail (chủ server 23/11/2026 — cho bạn bè cùng test): 2 bước, không cần quản trị tạo tay.
//   POST /api/dang-ky          { ten, gmail, mk } -> { ok: 1, cho: 600 } (mã 6 số gửi về Gmail, hiệu lực 10 phút)
//   POST /api/dang-ky/xac-minh { ten, ma }         -> { ok: 1, ten } (tài khoản tạo xong, đăng nhập như thường)
// Quy tắc (giữ đúng hệ tài khoản sẵn có — may-chu/du-lieu.js):
//   - tên tài khoản: 3–20 ký tự chữ thường không dấu / số / _ (TEN_RE); mật khẩu 6–64 ký tự, khác tên tài khoản;
//   - Gmail phải đúng @gmail.com, 1 Gmail chỉ dùng cho 1 tài khoản; tài khoản tạo qua đây KHÔNG có quyền quản trị,
//     KHÔNG bị bắt đổi mật khẩu lần đầu (mật khẩu do chính người chơi đặt lúc đăng ký);
//   - tài khoản đầu tiên của máy chủ vẫn phải tạo bằng quan-tri.js (taoTk cho tài khoản đầu làm quản trị) —
//     đăng ký công khai từ chối khi máy chủ chưa có tài khoản nào, chống chiếm quyền quản trị;
//   - chống tạo ồ ạt: mỗi IP / Gmail / tên tối đa 5 lần gửi mã mỗi giờ; mã sai 5 lần thì hủy, phải gửi lại;
//   - mã chờ chỉ giữ trong bộ nhớ tiến trình (khởi động lại máy chủ thì đăng ký lại — không ghi mật khẩu chờ ra đĩa:
//     chỉ giữ băm scrypt như tài khoản thật).

"use strict";

const crypto = require("crypto");
const D = require("./du-lieu");
const MAIL = require("./mail");
const NK = require("./nhat-ky");
const BT = require("./bao-tri");
const DY = require("./duyet");

const TEN_RE = /^[a-z0-9_]{3,20}$/; // như TEN_RE trong du-lieu.js (không xuất ra ngoài)
const GMAIL_RE = /^[a-z0-9._%+-]+@gmail\.com$/;
const HET_MA = 10 * 60 * 1000; // mã hiệu lực 10 phút
const SAI_TOI_DA = 5;
const GUI_TOI_DA = 5, GUI_CUA_SO = 60 * 60 * 1000; // 5 lần gửi mã / giờ / mỗi IP, Gmail, tên
const THAN_TOI_DA = 64 * 1024; // thân yêu cầu tối đa 64 KB

const cho = new Map(); // ten -> { gmail, bam, ma, het, sai }
const dem = new Map(); // "ip|..." | "gmail|..." | "ten|..." -> [thời điểm gửi mã]

const ipCua = (req) => req.headers["cf-connecting-ip"] || req.socket.remoteAddress || "?"; // như diaChi trong api.js
const loi = (res, code, msg, ma) => gui(res, code, ma ? { loi: msg, ma } : { loi: msg });
const gui = (res, code, obj) => {
  const s = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(s);
};

function docThan(req) {
  return new Promise((resolve, reject) => {
    const bufs = []; let n = 0;
    req.on("data", (d) => { n += d.length; if (n > THAN_TOI_DA) { req.destroy(); reject(new Error("Gửi lên nhiều quá. Gửi ít lại.")); } else bufs.push(d); });
    req.on("end", () => { try { resolve(bufs.length ? JSON.parse(Buffer.concat(bufs).toString("utf8")) : {}); } catch { reject(new Error("Dữ liệu gửi lên đọc không được. Gửi lại cho đúng.")); } });
    req.on("error", reject);
  });
}

function demTang(khoa) {
  const t = Date.now(), ds = (dem.get(khoa) || []).filter((x) => t - x < GUI_CUA_SO);
  ds.push(t); dem.set(khoa, ds);
  return ds.length;
}
function demDu(khoa) {
  const t = Date.now(), ds = (dem.get(khoa) || []).filter((x) => t - x < GUI_CUA_SO);
  if (ds.length !== (dem.get(khoa) || []).length) dem.set(khoa, ds);
  return ds.length >= GUI_TOI_DA;
}

function gmailDaDung(gmail) {
  try { return D.dsTk().some((tk) => tk && tk.gmail === gmail); } catch { return false; }
}

function kiemChung(req) {
  if (!req || req.method !== "POST") return { loi: "Chỉ nhận POST. Gửi lại cho đúng.", ma: null, code: 405 };
  if (BT.con()) return { loi: BT.cau(), ma: "bao-tri", code: 503 };
  if (DY.bat()) return { loi: DY.cau(), ma: "chua-duyet", code: 403 };
  return null;
}

// Bước 1: nhận thông tin, gửi mã xác minh về Gmail.
async function guiMa(req, res) {
  const chan = kiemChung(req);
  if (chan) return loi(res, chan.code, chan.loi, chan.ma);
  let b;
  try { b = await docThan(req); } catch (e) { return loi(res, 400, e.message); }
  const ten = D.tenTk(b.ten), gmail = String(b.gmail || "").trim().toLowerCase(), mk = String(b.mk || "");
  const ip = ipCua(req);
  if (!TEN_RE.test(ten)) return loi(res, 400, "Tên tài khoản 3–20 ký tự: chữ thường không dấu, số, dấu _. Gõ lại.");
  if (!GMAIL_RE.test(gmail) || gmail.length > 254) return loi(res, 400, "Gmail chưa đúng. Dùng địa chỉ @gmail.com.");
  if (mk.length < 6 || mk.length > 64) return loi(res, 400, "Mật khẩu 6–64 ký tự. Gõ lại.");
  if (mk === ten) return loi(res, 400, "Mật khẩu trùng tên tài khoản rồi. Đổi cái khác.");
  if (D.dsTk().length === 0) return loi(res, 503, "Máy chủ chưa có tài khoản quản trị. Đăng ký chưa mở — quay lại sau.");
  if (D.docTk(ten)) return loi(res, 409, "Tên tài khoản này đã có người dùng. Chọn tên khác.");
  if (gmailDaDung(gmail)) return loi(res, 409, "Gmail này đã đăng ký tài khoản khác rồi.");
  const dangCho = cho.get(ten);
  if (dangCho && dangCho.gmail !== gmail) return loi(res, 409, "Tên này đang chờ xác minh bằng Gmail khác. Chọn tên khác, hoặc chờ mã hết hạn.");
  if (demDu("ip|" + ip) || demDu("gmail|" + gmail) || demDu("ten|" + ten))
    return loi(res, 429, "Gửi mã nhiều quá rồi. Thử lại sau 1 giờ.");
  const ma = String(crypto.randomInt(100000, 1000000));
  try {
    await MAIL.guiMail(gmail, "Mã đăng ký Chiến - Võ Lâm Xưa",
      `Mã đăng ký tài khoản "${ten}" là: ${ma}\n\nMã chỉ dùng được trong 10 phút. Nhập mã vào trang đăng ký để tạo tài khoản.\nKhông đăng ký thì bỏ qua thư này.`);
  } catch (e) {
    return loi(res, 502, e.message || "Không gửi được mail xác minh. Thử lại sau.");
  }
  demTang("ip|" + ip); demTang("gmail|" + gmail); demTang("ten|" + ten);
  cho.set(ten, { gmail, bam: D.bam(mk), ma, het: Date.now() + HET_MA, sai: 0 });
  try { NK.ghi("dang-ky", ten, null, "Đã gửi mã xác minh về Gmail", { ip }); } catch {}
  return gui(res, 200, { ok: 1, cho: HET_MA / 1000 });
}

// Bước 2: nhập mã, tạo tài khoản thật.
async function xacMinh(req, res) {
  const chan = kiemChung(req);
  if (chan) return loi(res, chan.code, chan.loi, chan.ma);
  let b;
  try { b = await docThan(req); } catch (e) { return loi(res, 400, e.message); }
  const ten = D.tenTk(b.ten), ma = String(b.ma || "").trim();
  const ip = ipCua(req);
  const p = cho.get(ten);
  if (!p || Date.now() > p.het) { cho.delete(ten); return loi(res, 410, "Mã hết hạn rồi. Bấm Gửi lại mã để nhận mã mới.", "het-ma"); }
  if (p.sai >= SAI_TOI_DA) { cho.delete(ten); return loi(res, 410, "Nhập sai nhiều quá rồi. Bấm Gửi lại mã để nhận mã mới.", "het-ma"); }
  if (!/^\d{6}$/.test(ma) || ma !== p.ma) {
    p.sai += 1;
    if (p.sai >= SAI_TOI_DA) { cho.delete(ten); return loi(res, 410, "Nhập sai nhiều quá rồi. Bấm Gửi lại mã để nhận mã mới.", "het-ma"); }
    return loi(res, 400, `Mã chưa đúng. Còn ${SAI_TOI_DA - p.sai} lần thử. Gõ cho cẩn thận.`);
  }
  if (D.docTk(ten)) { cho.delete(ten); return loi(res, 409, "Tên tài khoản này vừa có người dùng. Chọn tên khác."); }
  if (gmailDaDung(p.gmail)) { cho.delete(ten); return loi(res, 409, "Gmail này vừa đăng ký tài khoản khác rồi."); }
  const tk = { v: 1, ten, bam: p.bam, admin: false, phien: null, nv: Array(D.SLOT_N).fill(null), tao: Date.now(), vao: null, gmail: p.gmail, gmailXacMinh: 1 };
  cho.delete(ten);
  D.ghiTk(tk);
  try { NK.ghi("dang-ky", ten, null, "Đã xác minh Gmail, tài khoản tạo xong", { ip }); } catch {}
  return gui(res, 200, { ok: 1, ten });
}

async function xuLy(req, res, p) {
  try {
    if (p === "/api/dang-ky") return guiMa(req, res);
    if (p === "/api/dang-ky/xac-minh") return xacMinh(req, res);
    return loi(res, 404, "Không có đường này. Đừng gõ bừa.");
  } catch (e) {
    console.error("dang-ky:", e && e.message);
    return loi(res, 500, "Máy chủ lỗi. Thử lại sau.");
  }
}

module.exports = { xuLy };
