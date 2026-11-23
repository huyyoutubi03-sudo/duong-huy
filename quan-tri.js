// Quản trị tài khoản máy chủ Chien - Vo Lam Xua (sửa du-lieu/tai-khoan/ — chạy được cả lúc máy chủ đang bật):
//   node quan-tri.js them <tên> <mật khẩu> [--admin]   tạo tài khoản (tài khoản đầu tiên tự là quản trị). Tài khoản thường: lần đăng nhập đầu phải tự
//                                                       đổi mật khẩu (khóa an toàn — như F10 Tạo tài khoản)
//   node quan-tri.js mat-khau <tên> <mật khẩu mới>     đặt lại mật khẩu: người đang chơi bị đưa ra (có lý do); tài khoản thường phải tự đổi ở lần đăng
//                                                       nhập tới (như F10 Đặt lại mật khẩu)
//   node quan-tri.js xoa-mk2 <tên>                      xóa mật khẩu cấp 2 (khóa an toàn — may-chu/bao-mat.js). Cách duy nhất cứu tài khoản QUẢN TRỊ
//                                                       quên mật khẩu cấp 2 (F10 cần mở khóa, và F10 không xử lý tài khoản quản trị). Tài khoản thường
//                                                       thì quản trị xóa ở F10 (Xóa mk cấp 2). Vừa nhập sai 5 lần: chờ hết 15 phút khóa nhập (hoặc
//                                                       khởi động lại s1) rồi mới đặt mật khẩu cấp 2 mới được
//   node quan-tri.js bat-doi-mk <tên>                   bắt đổi mật khẩu đăng nhập: người đang chơi bị đưa ra ngay, đăng nhập lại phải đổi mật khẩu
//   node quan-tri.js cap-phu <tên-tk> <tên-nv> [số]     cấp Thổ địa phù cho nhân vật (đúng đường quà quản trị: taoQua + quaTin — túi đầy thì báo lỗi, không nhận gì)
//   node quan-tri.js ds                                 danh sách tài khoản + nhân vật
"use strict";
const D = require("./may-chu/du-lieu");
const NK = require("./may-chu/nhat-ky");

const [cmd, ...rest] = process.argv.slice(2);
const args = rest.filter((a) => !a.startsWith("--")), admin = rest.includes("--admin");
// giờ Việt Nam cả khi chạy trên VPS (đồng hồ máy UTC)
const ngay = (t) => (t ? new Date(t).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }) : "-");
const tkCua = (ten) => { const tk = D.docTk(ten); if (!tk) throw new Error(`Không có tài khoản ${D.tenTk(ten)}`); return tk; };
// đưa người đang chơi ra (như may-chu/quan-tri.js thuPhien): lần gọi API tới trình duyệt nhận "bi-da" kèm lý do, về màn đăng nhập
const daRa = (tk, phien, lyDo) => { if (phien) tk.biDa = { phien, lyDo, khoa: 0, luc: Date.now() }; tk.phien = null; };

try {
  if (cmd === "them" && args.length === 2) {
    const tk = D.taoTk(args[0], args[1], admin);
    if (!tk.admin) { tk.batDoiMk = 1; D.ghiTk(tk); }
    NK.ghi("qt", "(dòng lệnh)", null, `Tạo tài khoản ${tk.ten}${tk.admin ? " (quản trị)" : ""}`);
    console.log(`Đã tạo tài khoản ${tk.ten}${tk.admin ? " (quản trị)" : " — lần đăng nhập đầu người chơi phải tự đổi mật khẩu"}`);
  } else if (cmd === "mat-khau" && args.length === 2) {
    const cu = tkCua(args[0]).phien;
    D.doiMk(args[0], args[1]);
    const tk = tkCua(args[0]);
    daRa(tk, cu, "quản trị vừa đặt lại mật khẩu tài khoản này");
    if (!tk.admin) tk.batDoiMk = 1;
    D.ghiTk(tk);
    NK.ghi("mk", tk.ten, null, "Quản trị đặt lại mật khẩu đăng nhập (dòng lệnh)");
    console.log(`Đã đặt lại mật khẩu ${tk.ten}${tk.admin ? "" : " — lần đăng nhập tới người chơi phải tự đổi"}`);
  } else if (cmd === "xoa-mk2" && args.length === 1) {
    const tk = tkCua(args[0]);
    if (!tk.mk2) console.log(`${tk.ten} chưa có mật khẩu cấp 2`);
    else {
      delete tk.mk2; delete tk.mk2Luc; delete tk.mk2Bao; delete tk.mk2SaiCuoi; D.ghiTk(tk);
      NK.ghi("mk", tk.ten, null, "Xóa mật khẩu cấp 2 bằng dòng lệnh");
      console.log(`Đã xóa mật khẩu cấp 2 của ${tk.ten} — lần cần tới sẽ được hỏi đặt mới (vừa nhập sai 5 lần thì chờ hết 15 phút hoặc khởi động lại s1)`);
    }
  } else if (cmd === "bat-doi-mk" && args.length === 1) {
    const tk = tkCua(args[0]);
    daRa(tk, tk.phien, "quản trị yêu cầu đổi mật khẩu đăng nhập — đăng nhập lại để đổi");
    tk.batDoiMk = 1; D.ghiTk(tk);
    NK.ghi("mk", tk.ten, null, "Quản trị bắt đổi mật khẩu đăng nhập (dòng lệnh)");
    console.log(`${tk.ten}: đã đưa ra khỏi game (nếu đang chơi) — đăng nhập lại phải đổi mật khẩu`);
  } else if (cmd === "cap-phu" && args.length >= 2) {
    // Cấp Thổ địa phù cho nhân vật (chủ server 23/11/2026 — cứu nhân vật kẹt bãi không lối ra):
    // đúng đường quà quản trị (may-chu/do.js taoQua + quaTin như F10 Gửi quà): đặt đúng lưới túi,
    // gộp chồng có sẵn; túi đầy thì taoQua hoàn tác và báo lỗi, không nhận gì. Không đá người chơi ra.
    const tk = tkCua(args[0]);
    const tenNv = args[1], n = Math.max(1, Math.floor(+args[2] || 1));
    const h = (tk.nv || []).find((x) => x && x.name === tenNv);
    if (!h) throw new Error(`Tài khoản ${tk.ten} không có nhân vật ${tenNv}`);
    const dem = () => (h.bag || []).filter((o) => o.k === "townportal:1").reduce((a, o) => a + (o.n || 1), 0);
    const truoc = dem();
    const DO = require("./may-chu/do");
    const ds = DO.taoQua(h, { mon: [{ k: "townportal:1", n }] });
    h.quaTin = [...(h.quaTin || []), { luc: Date.now(), ds, loi: "Quản trị gửi Thổ địa phù — dùng để về thành" }].slice(-20);
    D.ghiTk(tk);
    const sau = dem();
    NK.ghi("qt", "(dòng lệnh)", null, `Cấp ${n} Thổ địa phù cho ${h.name} (${tk.ten}) — trong túi: ${truoc} -> ${sau}`);
    console.log(`Đã cấp ${n} Thổ địa phù cho ${h.name} (${tk.ten}) — trong túi: ${truoc} -> ${sau}: ${ds.join(", ")}`);
  } else if (cmd === "ds") {
    const l = D.dsTk();
    if (!l.length) console.log("Chưa có tài khoản nào");
    for (const tk of l) {
      const nv = tk.nv.filter(Boolean).map((h) => `${h.name} (cấp ${h.lvl || 1})`).join(", ") || "chưa có nhân vật";
      console.log(`${tk.ten}${tk.admin ? " [quản trị]" : ""}${tk.mk2 ? " [mk cấp 2]" : ""}${tk.batDoiMk ? " [chờ đổi mk]" : ""} · vào lần cuối ${ngay(tk.vao)} · ${nv}`);
    }
  } else {
    console.log("Cách dùng:\n  node quan-tri.js them <tên> <mật khẩu> [--admin]\n  node quan-tri.js mat-khau <tên> <mật khẩu mới>\n  node quan-tri.js xoa-mk2 <tên>\n  node quan-tri.js bat-doi-mk <tên>\n  node quan-tri.js cap-phu <tên-tk> <tên-nv> [số]\n  node quan-tri.js ds");
    process.exitCode = 1;
  }
} catch (e) { console.error("Lỗi: " + e.message); process.exitCode = 1; }
