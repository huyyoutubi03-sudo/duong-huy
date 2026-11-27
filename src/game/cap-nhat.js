// Bảng "Vừa cập nhật những gì" (Huy 09:43 ngày 27/11/2026): hiện ở màn hình chờ / đăng nhập, TRƯỚC khi vào thế giới game,
// khi phát hiện mã bản mới chưa xem. Nội dung lấy từ 1 file dữ liệu riêng (assets/data/cap-nhat.json: mã bản + danh sách gạch đầu
// dòng ngắn) — lần sau chỉ sửa file đó là đổi nội dung, không sửa code. Mã bản đã xem lưu ở cài đặt local (localStorage
// vl_capNhatDaXem). Đóng bảng = đã xem bản đó, không hiện lại; mở lại: nút "Xem cập nhật mới" ở màn đăng nhập, hoặc trong game
// Esc → Tin cập nhật (mục đầu — main.js chèn từ cùng file này). Bảng không chặn đăng nhập / chơi: đóng là xong, vào game thì
// bảng tự ẩn (không ghi đã xem — lần sau mở trang lại vẫn hiện nếu chưa đóng). Tải hỏng / không có file / sai dạng thì im lặng
// không hiện gì — đăng nhập vẫn chạy bình thường. File này phải công khai trước đăng nhập (may-chu/khoa-tai-nguyen.js CONG_KHAI),
// vì màn đăng nhập chưa có phiếu vl_tn.
const URL_CN = "assets/data/cap-nhat.json";
const KHOA_XEM = "vl_capNhatDaXem";
let _nap = null;
let _daKiem = false; // chỉ xét tự hiện 1 lần mỗi lần tải trang

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function napCapNhat() {
  if (!_nap) _nap = fetch(URL_CN).then((r) => (r.ok ? r.json() : null))
    .then((j) => (j && typeof j.ban === "string" && j.ban && Array.isArray(j.muc) && j.muc.length ? j : null))
    .catch(() => null);
  return _nap;
}
export function daXemBan() { try { return localStorage.getItem(KHOA_XEM) || ""; } catch { return ""; } }
export function ghiDaXem(ban) { try { localStorage.setItem(KHOA_XEM, ban); } catch {} }

// mục đầu cho cửa sổ Tin cập nhật trong game (id 0: không bao giờ tính là "Mới", không ảnh hưởng tinXem theo nhân vật)
export function mucThanhTin(d) {
  if (!d) return null;
  return { id: 0, ngay: d.ngay || "", ten: d.tieuDe || "Vừa cập nhật những gì", noi: d.muc.map((m) => "• " + m) };
}

function dongBang(el, d) {
  if (el) el.remove();
  if (d) ghiDaXem(d.ban);
}

export function moBangCapNhat(d) {
  if (!d) return null;
  let el = document.querySelector(".cn-mo");
  if (el) return el; // đang mở sẵn thì giữ nguyên, khỏi dựng chồng
  el = document.createElement("div");
  el.className = "cn-mo";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="cn-bang"><div class="cn-dau"><h2>${esc(d.tieuDe || "Vừa cập nhật những gì")}</h2>` +
    `<button class="cn-dong" type="button" aria-label="Đóng">✕</button></div>` +
    (d.ngay ? `<p class="cn-ngay">Ngày ${esc(d.ngay)}</p>` : "") +
    `<ul class="cn-muc">${d.muc.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` +
    `<div class="cn-chan"><button class="cn-ro" type="button">Đã rõ</button></div></div>`;
  el.querySelector(".cn-dong").onclick = () => dongBang(el, d);
  el.querySelector(".cn-ro").onclick = () => dongBang(el, d);
  document.body.appendChild(el);
  return el;
}

// tự hiện khi có bản mới chưa xem (màn đăng nhập / chọn nhân vật) — lỗi gì cũng im, không chặn
export async function kiemTraBangCapNhat() {
  if (_daKiem) return;
  _daKiem = true;
  const d = await napCapNhat();
  if (!d || daXemBan() === d.ban) return;
  moBangCapNhat(d);
}

// mở lại bằng tay (nút ở màn đăng nhập): hiện luôn dù đã xem
export async function moLaiBangCapNhat() {
  const d = await napCapNhat();
  if (d) moBangCapNhat(d);
}

// vào thế giới game: ẩn bảng, KHÔNG ghi đã xem (chưa đóng thì lần sau mở trang vẫn hiện)
export function anBang() {
  const el = document.querySelector(".cn-mo");
  if (el) el.remove();
}
