// Bảng chỉ huy tổ đội Tống Kim (Huy lệnh 22:09/22:11/22:13/22:21 ngày 27/11/2026).
//   - Chỉ test1/test2 thấy nút (đúng cổng camera/ẩn thân: thuong-de.js TEN_DUOC_CAMERA, tang-hinh.js DUOC_TANG_HINH).
//   - Máy chủ chặn tuyệt đối ở /api/chi-huy-tk (api.js) — client chỉ giấu nút.
//   - Nút gắn vào cụm #td-btns (cụm CAM sẵn có); bảng nổi tự tải lại mỗi 10 giây khi đang mở.
//   - Lệnh bấm: Công/Thủ/Giữ/Rút + chọn neo, hoặc Tự động (trả đội về giáo án). Chia lại đội: tính lại từ danh sách hiện tại.
//
//   const CH = taoChiHuy({ me, msg, goi });
//   CH.capNhat() — vào game: có nút khi là test1/test2, không thì gỡ hết
//   CH.thoat() — thoát game: đóng bảng, gỡ nút
"use strict";

export const TEN_DUOC_CHI_HUY = new Set(["test1", "test2"]);

const NEO = [
  ["soaiDich", "Nguyên Soái địch"], ["traiDich", "Hậu doanh địch"], ["tienDich", "Tiền tuyến địch"],
  ["soaiTa", "Nguyên Soái ta"], ["traiTa", "Hậu doanh ta"], ["tienTa", "Tiền tuyến ta"],
];
const CHE_DO = { cong: "CÔNG", giu: "THỦ", rut: "RÚT", ungCuu: "ỨNG CỨU" };

export function taoChiHuy(api) {
  const duoc = () => { const me = api.me && api.me(); return !!(me && TEN_DUOC_CHI_HUY.has(me.ten)); };
  let elNut = null, elBang = null, hen = 0, dangMo = false;

  function goNut() {
    if (elNut) elNut.remove();
    elNut = null;
    const cum = document.querySelector("#td-btns");
    if (!cum || !duoc()) return;
    elNut = document.createElement("button");
    elNut.type = "button";
    elNut.textContent = "CHỈ HUY";
    elNut.title = "Bảng chỉ huy tổ đội Tống Kim (chỉ test1/test2)";
    elNut.addEventListener("click", () => { dangMo ? dongBang() : moBang(); });
    cum.appendChild(elNut);
  }

  function ve(j) {
    if (!elBang) return;
    if (!j || !j.mo) { elBang.innerHTML = `<div class="ch-tieu">Chỉ huy Tống Kim<button type="button" data-ch="dong">Đóng</button></div><div class="ch-rong">Không có trận Tống Kim nào đang mở. Mở thử ở F10 → Lịch hoạt động rồi quay lại.</div>`; return; }
    const pha = j.pha === "bd" ? "Đang báo danh" : j.pha === "danh" ? "Đang đánh" : "Đã xong";
    const pheHtml = (phe) => {
      const tenPhe = phe === 0 ? "Tống" : "Kim";
      const ds = j.doi[phe].map((sq) => {
        const neoOpt = NEO.map(([v, t]) => `<option value="${v}"${v === sq.neo ? " selected" : ""}>${t}</option>`).join("");
        const nhap = sq.trang === "cuu" && sq.nhap != null ? ` · nhập đội ${sq.nhap + 1}` : "";
        const truy = sq.trang === "truy" && sq.duoi != null ? ` · truy kích đội địch ${sq.duoi + 1}` : "";
        return `<div class="ch-doi"><div class="ch-doi-dau"><b>Đội ${sq.id + 1}</b> — ${sq.song}/${sq.tong} sống — <b>${CHE_DO[sq.cheDo] || sq.cheDo}</b> · ${sq.neoTen}${sq.tay ? " (tay)" : ""}${nhap}${truy} · ${sq.danhPhut} phút đánh</div>` +
          `<div class="ch-lenh"><select data-ch-neo="${phe}:${sq.id}">${neoOpt}</select>` +
          `<button type="button" data-ch-lenh="cong" data-ch-doi="${phe}:${sq.id}">Công</button>` +
          `<button type="button" data-ch-lenh="giu" data-ch-doi="${phe}:${sq.id}">Thủ</button>` +
          `<button type="button" data-ch-lenh="rut" data-ch-doi="${phe}:${sq.id}">Rút</button>` +
          `<button type="button" data-ch-lenh="tuDong" data-ch-doi="${phe}:${sq.id}">Tự động</button></div>` +
          `<div class="ch-tv">${sq.tv.join(", ")}</div></div>`;
      }).join("");
      return `<div class="ch-phe"><h3>Phe ${tenPhe} — ${j.diem[phe]} điểm · bot máy chủ còn ${j.botMay[phe]}</h3>${ds}</div>`;
    };
    const sk = (j.suKien || []).map((s) => s.text).join("<br>");
    elBang.innerHTML = `<div class="ch-tieu">Chỉ huy Tống Kim${j.thu ? " (THỬ)" : ""} — ${pha} · Tống ${j.diem[0]} : Kim ${j.diem[1]}` +
      `<button type="button" data-ch="tai">Tải lại</button><button type="button" data-ch="chia">Chia lại đội</button><button type="button" data-ch="dong">Đóng</button></div>` +
      (sk ? `<div class="ch-sk">${sk}</div>` : "") + pheHtml(0) + pheHtml(1);
  }

  async function tai() {
    try { ve(await api.goi({ viec: "xem" })); }
    catch (e) { if (api.msg) api.msg(e.message || String(e)); }
  }

  async function moBang() {
    if (elBang) { dangMo = true; tai(); return; }
    elBang = document.createElement("div");
    elBang.className = "ch-bang";
    elBang.addEventListener("click", async (ev) => {
      const t = ev.target.closest("[data-ch],[data-ch-lenh]");
      if (!t) return;
      if (t.dataset.ch === "dong") { dongBang(); return; }
      if (t.dataset.ch === "tai") { tai(); return; }
      if (t.dataset.ch === "chia") {
        try { ve(await api.goi({ viec: "chiaLai" })); } catch (e) { if (api.msg) api.msg(e.message || String(e)); }
        return;
      }
      const lenh = t.dataset.chLenh;
      if (!lenh) return;
      const [phe, doi] = t.dataset.chDoi.split(":").map(Number);
      const sel = elBang.querySelector(`[data-ch-neo="${phe}:${doi}"]`);
      const neo = sel ? sel.value : undefined;
      try { ve(await api.goi({ viec: lenh === "tuDong" ? "tuDong" : "lenh", phe, doi, lenh, neo })); }
      catch (e) { if (api.msg) api.msg(e.message || String(e)); }
    });
    document.body.appendChild(elBang);
    dangMo = true;
    await tai();
    clearInterval(hen);
    hen = setInterval(() => { if (dangMo) tai(); }, 10000);
  }

  function dongBang() {
    dangMo = false;
    clearInterval(hen); hen = 0;
    if (elBang) { elBang.remove(); elBang = null; }
  }

  return {
    capNhat() { goNut(); if (dangMo && !duoc()) dongBang(); },
    thoat() { dongBang(); if (elNut) { elNut.remove(); elNut = null; } },
  };
}
