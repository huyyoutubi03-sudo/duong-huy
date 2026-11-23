// Đăng ký tài khoản bằng Gmail — khung nổi trên màn đăng nhập (Huy 23/11/2026, cho bạn bè cùng test).
// 2 bước: gửi mã xác minh về Gmail -> nhập mã -> tạo tài khoản. Máy chủ: may-chu/dang-ky.js.

import { Net } from "./net.js";

const $ = (s) => document.querySelector(s);
const TEN_RE = /^[a-z0-9_]{3,20}$/;
const GMAIL_RE = /^[a-z0-9._%+-]+@gmail\.com$/;

const modal = $("#dk-modal");
if (modal) {
  const form = $("#dk-form"), err = $("#dk-err"), ok = $("#dk-ok"), dong = $("#dk-dong"),
    guilai = $("#dk-guilai"), xong = $("#dk-xong");
  const buoc1 = modal.querySelector(".dk-buoc1"), buoc2 = modal.querySelector(".dk-buoc2");
  const tenEl = $("#dk-ten"), gmailEl = $("#dk-gmail"), mkEl = $("#dk-mk"), mk2El = $("#dk-mk2"), maEl = $("#dk-ma");
  let buoc = 1, luu = null, dangGui = false;

  const mo = () => {
    buoc = 1; luu = null; err.textContent = "";
    buoc1.hidden = false; buoc2.hidden = true; guilai.hidden = true; xong.hidden = true;
    form.hidden = false; ok.textContent = "Gửi mã xác minh";
    modal.hidden = false;
    (tenEl.value ? gmailEl : tenEl).focus();
  };
  const dongLai = () => { modal.hidden = true; };
  $("#lg-dk").addEventListener("click", mo);
  dong.addEventListener("click", dongLai);
  modal.addEventListener("click", (e) => { if (e.target === modal) dongLai(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) dongLai(); });

  const kiemBuoc1 = () => {
    const ten = tenEl.value.trim().toLowerCase(), gmail = gmailEl.value.trim().toLowerCase(),
      mk = mkEl.value, mk2 = mk2El.value;
    if (!TEN_RE.test(ten)) return { loi: "Tên tài khoản 3–20 ký tự: chữ thường không dấu, số, dấu _" };
    if (!GMAIL_RE.test(gmail) || gmail.length > 254) return { loi: "Gmail chưa đúng — dùng địa chỉ @gmail.com" };
    if (mk.length < 6 || mk.length > 64) return { loi: "Mật khẩu 6–64 ký tự" };
    if (mk === ten) return { loi: "Mật khẩu phải khác tên tài khoản" };
    if (mk !== mk2) return { loi: "Nhập lại mật khẩu chưa khớp" };
    return { ten, gmail, mk };
  };

  const guiMa = async (thongTin) => {
    await Net.call("POST", "dang-ky", thongTin);
    buoc = 2; luu = thongTin;
    buoc1.hidden = true; buoc2.hidden = false; guilai.hidden = false;
    ok.textContent = "Xác minh và tạo tài khoản";
    $("#dk-gmail-hien").textContent = thongTin.gmail;
    maEl.value = ""; maEl.focus();
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (dangGui) return;
    err.textContent = "";
    try {
      dangGui = true; ok.disabled = true;
      if (buoc === 1) {
        const k = kiemBuoc1();
        if (k.loi) { err.textContent = k.loi; return; }
        await guiMa({ ten: k.ten, gmail: k.gmail, mk: k.mk });
        err.textContent = "";
      } else {
        const ma = maEl.value.trim();
        if (!/^\d{6}$/.test(ma)) { err.textContent = "Mã xác minh có 6 số"; return; }
        await Net.call("POST", "dang-ky/xac-minh", { ten: luu.ten, ma });
        form.hidden = true;
        $("#dk-ten-xong").textContent = luu.ten;
        xong.hidden = false;
      }
    } catch (er) { err.textContent = er.message || "Không gửi được — thử lại sau"; }
    finally { dangGui = false; ok.disabled = false; }
  });

  guilai.addEventListener("click", async () => {
    if (!luu || dangGui) return;
    err.textContent = "";
    try {
      dangGui = true; guilai.disabled = true;
      await Net.call("POST", "dang-ky", luu);
      err.textContent = "Đã gửi lại mã mới — kiểm tra hộp thư.";
    } catch (er) { err.textContent = er.message || "Không gửi được — thử lại sau"; }
    finally { dangGui = false; guilai.disabled = false; }
  });

  $("#dk-vao").addEventListener("click", () => {
    const ten = luu ? luu.ten : "";
    dongLai();
    const lg = $("#lg-name");
    if (lg && ten) { lg.value = ten; $("#lg-pass").focus(); }
  });
}
