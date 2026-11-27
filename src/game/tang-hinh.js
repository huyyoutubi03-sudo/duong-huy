// Tàng hình — CHỈ tài khoản test1 (Huy lệnh 01:54 ngày 27/11/2026: "tàng hình hoàn toàn không ai nhìn thấy", "không nhận dame và bất tử").
// Khóa theo TÊN tài khoản đăng nhập (Net.me.ten), như camera thượng đế — không theo cờ admin.
// Cơ chế (3 lớp, thiếu 1 lớp là lộ / vẫn ăn dame):
//   1. Máy chủ (may-chu/the-gioi.js): nhịp mang s.th = 1 thì acc vào tập AN — người trong AN không vào danh sách ai của người khác
//      (kể cả phân thân), không phát vị trí qua kênh tức thời vt/vtb, không phát hiệu ứng chiêu "chieu" (may-chu/ws.js).
//      Máy chủ chỉ nhận cờ của đúng acc tên "test1"; acc khác gửi th cũng không nhận.
//   2. Client — ẩn với quái: player.voHinh = true + player.hideUntil = số rất lớn, khẳng định lại mỗi nhịp (TH.nhip — đổi bãi tạo
//      World/player mới nên phải khẳng định lại). Quái / boss thế giới / bot Tống Kim vốn đã bỏ qua mục tiêu có hideUntil
//      (world.js updateMob, bosstg.js vong, tkbot.js) nên không đuổi, không đánh. vocong.js + world.js không được xóa hideUntil
//      khi voHinh đang bật (ra chiêu / tự đánh là hiện hình theo engine — trừ lúc tàng hình).
//   3. Client — bất tử: World.hit() chặn ngay đầu khi dst là chính mình và voHinh đang bật — mọi sát thương vào mình đều qua hit()
//      (đòn quái, đòn người khác, độc, đạn đang bay, Tống Kim qua tkTrungThang), nên chặn ở đây là chặn hết; không chết thì máy chủ
//      cũng không phạt chết (phạt chết chỉ chạy khi client báo chết).
// Tắt thì trở lại bình thường ngay: voHinh = false, hideUntil = 0, nhịp sau máy chủ lại gửi mình cho người khác thấy.
// Chặn phía client: acc thường không thấy nút, phím H không bật được. Chặn tuyệt đối (kẻ tự sửa file JS máy mình) thì phải chặn ở
// máy chủ — máy chủ ĐÃ chặn phần nhìn thấy (lớp 1); phần bất tử thì theo thiết kế chỉ client mình tự trừ máu mình nên không chặn
// được từ máy chủ mà không viết lại cả hệ thống máu (ghi rõ trong KET-QUA.md).
//
//   const TH = taoTangHinh({ me, msg, nguoiChoi });
//   TH.capNhat() — vào game: có nút khi là test1, không thì gỡ hết
//   TH.thoat() — thoát game: tắt tàng hình, gỡ nút
//   TH.bamNut() / bamPhim() — bật/tắt tàng hình (phím H)
//   TH.dangBat() — đang tàng hình không
//   TH.xacNhan(echo) — máy chủ trả th trong nhịp: chỉ ghi nhận (nhịp sau gửi lại cờ nên máy chủ tự đồng bộ lại nếu mất)
//   TH.nhip() — mỗi nhịp: khẳng định lại voHinh/hideUntil lên player hiện tại

import { TEN_TEST1 } from "./thuong-de.js";

// hideUntil rất lớn (không dùng Infinity — tránh số lạ lọt vào tính toán khác): quái thấy hideUntil > time thì coi như không thấy.
const LAU = 1e15;

export function taoTangHinh(api) {
  const laTest1 = () => { const me = api.me && api.me(); return !!(me && me.ten === TEN_TEST1); };
  let bat = false, echo = 0;
  let elBtn = null, elDt = null;

  const player = () => (api.nguoiChoi && api.nguoiChoi()) || null;
  function apDung() {
    const p = player(); if (!p) return;
    if (bat) { p.voHinh = true; p.hideUntil = LAU; }
    else if (p.voHinh) { p.voHinh = false; p.hideUntil = 0; } // chỉ gỡ cờ do mình đặt — bùa ẩn thân thường (voHinh chưa bật) không đụng
  }
  function capNhatNut() {
    if (elBtn) { elBtn.classList.toggle("on", bat); elBtn.textContent = bat ? "Đang ẩn" : "Tàng hình"; }
    if (elDt) { elDt.classList.toggle("on", bat); elDt.textContent = bat ? "Đang ẩn" : "Tàng hình"; }
  }
  // Nút web: gắn vào cụm #td-btns của camera thượng đế (cùng hàng nút, cùng kiểu) — cụm chưa có thì tự tạo khung riêng #th-btns.
  function veNut() {
    if (elBtn && elBtn.isConnected) { capNhatNut(); return; }
    elBtn = document.createElement("button");
    elBtn.type = "button";
    elBtn.title = "Tàng hình — phím H (chỉ test1)";
    elBtn.textContent = "Tàng hình";
    elBtn.addEventListener("click", bamNut);
    const wrap = document.getElementById("td-btns");
    const hop = wrap && wrap.querySelector(".td-hop");
    if (hop) hop.appendChild(elBtn);
    else if (wrap) wrap.appendChild(elBtn);
    else { const w = document.createElement("div"); w.id = "th-btns"; w.appendChild(elBtn); document.body.appendChild(w); }
    capNhatNut();
  }
  // Nút điện thoại: gắn vào bảng gộp .dt-tdbang trong lớp riêng #td-btns-dt của camera (trên #jxhud, không bị vòng chiêu vẽ đè) —
  // chưa có thì tự tạo lớp; bảng gộp dựng sau thì dời nút vào bảng.
  function veNutDt() {
    if (elDt && elDt.isConnected) { const panel = document.querySelector("#td-btns-dt .dt-tdbang"); if (panel && elDt.parentElement !== panel) panel.appendChild(elDt); capNhatNut(); return; }
    let wrap = document.getElementById("td-btns-dt");
    if (!wrap) { wrap = document.createElement("div"); wrap.id = "td-btns-dt"; document.body.appendChild(wrap); }
    elDt = document.createElement("div");
    elDt.className = "dt-tanghinh"; elDt.textContent = "Tàng hình";
    elDt.addEventListener("click", bamNut);
    const panel = wrap.querySelector(".dt-tdbang");
    (panel || wrap).appendChild(elDt);
    capNhatNut();
  }
  function goNut() {
    if (elBtn) { elBtn.remove(); elBtn = null; }
    if (elDt) { elDt.remove(); elDt = null; }
  }

  function batLen() {
    if (bat) return;
    bat = true; apDung();
    api.msg("Đã tàng hình — không ai thấy, quái không đuổi, không nhận sát thương. Bấm H hoặc nút để hiện lại.");
    capNhatNut();
  }
  function tatDi() {
    if (!bat) return;
    bat = false; apDung();
    api.msg("Đã hiện hình lại — quái và người khác thấy + đánh như thường.");
    capNhatNut();
  }
  function bamNut() {
    if (!laTest1()) return;
    bat ? tatDi() : batLen();
  }

  return {
    laTest1,
    dangBat: () => bat,
    layEcho: () => echo,
    capNhat() {
      if (laTest1()) { veNut(); veNutDt(); }
      else { if (bat) tatDi(); goNut(); }
      capNhatNut();
    },
    thoat() {
      if (bat) { bat = false; apDung(); }
      goNut();
    },
    bamNut, bamPhim: bamNut,
    xacNhan(v) { echo = v ? 1 : 0; },
    nhip() { apDung(); },
  };
}
