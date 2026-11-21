// Giao dien tren man hinh: thanh mau/mana, chat, thanh ky nang (ban dung lai).
import { dinhDangTien } from "./money.js";
import { heroStats } from "./rules.js";
export function capNhatHud(nv) {
  const ten = document.getElementById("hud-ten");
  if (ten) ten.textContent = (nv.ten || "") + " — Cấp " + (nv.cap || 1) + (nv.phai ? " (" + nv.phai + ")" : "");
  const st = heroStats(nv);
  const mau = nv.mau === undefined ? st.mau : nv.mau;
  const mana = nv.mana === undefined ? st.mana : nv.mana;
  const tm = document.getElementById("thanh-mau");
  if (tm) tm.style.width = Math.max(0, Math.min(100, (mau / (nv.mauToiDa || st.mau)) * 100)) + "%";
  const tn = document.getElementById("thanh-mana");
  if (tn) tn.style.width = Math.max(0, Math.min(100, (mana / (nv.manaToiDa || st.mana)) * 100)) + "%";
  const tt = document.getElementById("hud-thong-tin");
  if (tt) tt.textContent = "Tiền: " + dinhDangTien(nv.tien || 0) + "  •  Kinh nghiệm: " + dinhDangTien(nv.kinhNghiem || 0);
}
export function themChat(ten, noiDung) {
  const box = document.getElementById("chat-noi-dung");
  if (!box) return;
  const d = document.createElement("div");
  d.textContent = (ten ? ten + ": " : "") + noiDung;
  box.appendChild(d);
  while (box.children.length > 100) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}
export function veThanhKyNang(danhSach, onDung) {
  const bar = document.getElementById("thanh-ky-nang");
  if (!bar) return;
  bar.innerHTML = "";
  danhSach.forEach((c, i) => {
    const b = document.createElement("button");
    b.textContent = (i + 1) + " " + (c.ten || "").slice(0, 2);
    b.title = c.ten || "";
    b.onclick = () => onDung(c.id);
    bar.appendChild(b);
  });
}