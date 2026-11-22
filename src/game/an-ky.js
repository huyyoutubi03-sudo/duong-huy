// Ấn ký bản mới (từ 22/11/2026: thương hiệu "Chiến - Võ Lâm Xưa" của Huy; trước đó "Một Thời Kỷ Niệm" / "Đồ Xanh").
//   Hiện: logo + chữ ký + câu cảnh báo bản nhái ở màn đăng nhập, màn chờ, trong game (ô chữ góc trái dải trên — hud.js tickInfo — + dòng tin
//   lúc vào game) + lời chào trong bảng điều khiển của trình duyệt (F12 — người mở mã ra xem).
//   Khóa: chữ ký là "chìa" — kyChuan() = mã băm FNV-1a của chữ ký + cảnh báo + tên miền; hud.js / windows.js mỗi nơi tự so với
//   số riêng (viết mỗi nơi một kiểu); sai (bị sửa / gỡ chữ) hoặc màn đăng nhập / trong game mất chữ ký -> voKy(): màn chặn phủ kín, game dừng.
//   Đổi chữ ký / cảnh báo thì phải tính lại số ở cả 2 nơi (node: bam32(KY + "|" + CANH + "|" + MIEN)). voKy() hiện đã gỡ (return sớm) nên các
//   phép so chỉ còn để đối chiếu, không chặn game. Tên + tên miền viết dạng mã số (_g) — bản nén không có chữ "Huy" để tìm-thay một lượt.
// Màn đăng nhập: logo trái, khung đăng nhập phải (màn hẹp / điện thoại dọc: logo trên, khung dưới) — + trong game B: thêm logo mờ góc phải
// trên thanh kỹ năng (máy tính; điện thoại có ô chữ ký cạnh FPS). game.css khối "ấn ký".
const _g = (a, k) => String.fromCharCode(...a.map((c, i) => c ^ ((k + i * 7) & 0xff)));
export const MIEN = "Chien - Vo Lam Xua";
export const TAC_GIA = "Huy";
export const KY = `© 2026 Chien - Vo Lam Xua — Chiến - Võ Lâm Xưa`;
export const KY_NGAN = `© ${TAC_GIA} · Chien - Vo Lam Xua`;
export const CANH = "Bản dùng cá nhân của Huy — Chien - Vo Lam Xua.";
export const TIN_VAO = `${KY}. ${CANH}`;
const LOGO = "assets/ui/dang-nhap/logo.webp", LOGO_NHO = "assets/ui/dang-nhap/logo-nho.webp";
export const bam32 = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
export const kyChuan = () => bam32(KY + "|" + CANH + "|" + MIEN);
// translate="no": trình duyệt tự dịch trang không đổi chữ ký
const tao = (tag, cls) => { const e = document.createElement(tag); e.className = cls; e.setAttribute("translate", "no"); return e; };
const chanHtml = () => `<div class="ak-ky">${KY}</div><div class="ak-canh">${CANH}</div>`;

// màn chặn: chữ riêng (mã số khác _g ở trên — sửa tên / tên miền phía trên không đổi được dòng này)
let daVo = false;
export function voKy(noi) { return; // Huy: go man chan an ky ban goc
}
// lời chào trong bảng điều khiển (F12)
export function loiChao() {
  try { console.log("%cDừng lại!", "color:#ff5a3c;font-size:26px;font-weight:bold"); console.log(`%c${KY}\n${CANH}`, "color:#ffd36b;font-size:13px;line-height:1.5"); } catch {}
}
// màn đăng nhập: logo (trước khung) + chân trang (chữ ký + cảnh báo). Soát sau 1,5 giây: còn logo + chân trang đúng chữ
export function dungDangNhap() {
  const s = document.getElementById("s-login"); if (!s) return;
  if (!s.querySelector(".ak-logo")) {
    const img = tao("img", "ak-logo"); img.src = LOGO; img.alt = "Chiến - Võ Lâm Xưa"; img.draggable = false;
    const chan = tao("div", "ak-chan"); chan.innerHTML = chanHtml();
    s.prepend(img); s.append(chan);
  }
  setTimeout(() => { const c = s.querySelector(".ak-chan"); if (!s.querySelector(".ak-logo") || !c || bam32(c.textContent) !== bam32(`${KY}${CANH}`)) voKy("đăng nhập"); }, 1500);
}
// màn chờ (loading.js ZoneLoading): logo nhỏ giữa trên + chữ ký dưới thanh tải
export function dungManCho(zl) {
  if (!zl || zl.querySelector(".ak-cho")) return;
  const img = tao("img", "ak-cho"); img.src = LOGO_NHO; img.alt = ""; img.draggable = false;
  const ky = tao("div", "ak-ky-cho"); ky.textContent = KY;
  zl.append(img); const bot = zl.querySelector(".zl-bot"); (bot || zl).append(ky);
}
// trong game: logo mờ góc phải (CSS chỉ hiện khi #hud.on, máy tính, không chặn bấm). Soát: ô chữ góc trái phải có chữ ký
export function dungTrongGame(hud) {
  if (!document.querySelector(".ak-goc")) { const img = tao("img", "ak-goc"); img.src = LOGO_NHO; img.alt = ""; img.draggable = false; document.body.append(img); }
  if (hud && (!hud.info || (hud.info() || {}).ky !== KY_NGAN)) voKy("trong game");
}
