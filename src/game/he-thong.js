// Khung client he thong hoat dong (ban dung lai).
export const HE_THONG = [
  { ten: "Tống Kim", api: "/api/tong-kim", moTa: "Chiến trường Tống — Kim theo giờ." },
  { ten: "Vượt Ải", api: "/api/vuot-ai", moTa: "Leo tầng, nhận thưởng tiền." },
  { ten: "Phong Hỏa Liên Thành", api: "/api/phong-hoa", moTa: "Sự kiện theo giờ." },
  { ten: "Phong Lăng Độ", api: "/api/phong-lang-do", moTa: "Đò qua sông, giá 100." },
  { ten: "Sát thủ", api: "/api/sat-thu", moTa: "Nhận truy sát, lĩnh thưởng." },
  { ten: "Săn Nhím", api: "/api/san-nhim", moTa: "Bắn nhím, nhận 50 tiền mỗi con." },
  { ten: "Tự Luyện", api: "/api/tu-lam", moTa: "Ngồi luyện, nhận kinh nghiệm theo phút." },
  { ten: "Viêm Đế", api: "/api/viem-de", moTa: "Tháp Viêm Đế." },
  { ten: "Mã quà", api: "/api/ma-qua", moTa: "Nhập mã quà, ví dụ TANTHU." },
];
export async function layDuLieu(net, api, body) { if (body) return net.goi(api, body); return net.lay(api); }
export function veDanhSachHeThong(el, onChon) { el.innerHTML = ""; for (const h of HE_THONG) { const b = document.createElement("button"); b.textContent = h.ten; b.title = h.moTa; b.onclick = () => onChon(h); el.appendChild(b); } }