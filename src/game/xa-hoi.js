// Khung client he thong xa hoi (ban dung lai).
export const XA_HOI = [
  { ten: "Chợ trời", api: "/api/cho-troi", moTa: "Mua bán đồ giữa người chơi." },
  { ten: "Giao dịch", api: "/api/giao-dich", moTa: "Gửi đồ cho người chơi khác." },
  { ten: "Tổ đội", api: "/api/to-doi", moTa: "Lập đội, cùng đánh quái." },
  { ten: "Bang hội", api: "/api/bang-hoi", moTa: "Lập bang, vào bang." },
  { ten: "Xếp hạng", api: "/api/xep-hang", moTa: "Top 20 cấp cao nhất." },
  { ten: "Lịch hoạt động", api: "/api/lich-hd", moTa: "Giờ các sự kiện trong ngày." },
  { ten: "Ủng hộ", api: "/api/ung-ho", moTa: "Ủng hộ máy chủ." },
  { ten: "Thi thí", api: "/api/ti-thi", moTa: "Trả lời câu hỏi." },
];
export async function layDuLieu(net, api, body) { if (body) return net.goi(api, body); return net.lay(api); }
export function veDanhSachXaHoi(el, onChon) { el.innerHTML = ""; for (const x of XA_HOI) { const b = document.createElement("button"); b.textContent = x.ten; b.title = x.moTa; b.onclick = () => onChon(x); el.appendChild(b); } }