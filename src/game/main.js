// Diem vao client: dang nhap, chon nhan vat, vao game, vong lap (ban dung lai).
import { net } from "./net.js";
import { World } from "./world.js";
import { taiJSON } from "../tai-tep.js";
import { CELL } from "../map.js";
import { capNhatHud, themChat, veThanhKyNang } from "./hud.js";
import { TuDong } from "./auto.js";
import { phat } from "./audio.js";
import { datTienDo, xongTai } from "./loading.js";
import { dinhDangTien } from "./money.js";
import { VoCong, CHIEU_MAU } from "./vocong.js";
import { HE_THONG } from "./he-thong.js";
import { XA_HOI } from "./xa-hoi.js";
const $ = (id) => document.getElementById(id);
const canvas = $("game");
const world = new World(canvas);
const tuDong = new TuDong(world);
let nv = null;
let soNv = 0;
let oSlot = 0;
let vocong = null;
window.VL = { net, world, HE_THONG, XA_HOI, dinhDangTien, dangNhapXong: async () => { await taiDanhSachNv(); hienManHinh("man-hinh-nhan-vat"); } };
function hienManHinh(ten) { for (const id of ["man-hinh-dang-nhap", "man-hinh-nhan-vat", "man-hinh-game"]) $(id).hidden = id !== ten; }
function hienLoi(msg) { $("dn-loi").textContent = msg; }
async function taiDanhSachNv() {
  const d = await net.nhanVat();
  const list = d.nhanVat || d.danhSach || [];
  soNv = list.length;
  const ds = $("danh-sach-nv");
  ds.innerHTML = "";
  list.forEach((c, i) => {
    const b = document.createElement("button");
    b.textContent = (c.ten || ("Nhan vat " + (i + 1))) + " — cap " + (c.cap || 1) + " (" + (c.phai || "") + ")";
    b.onclick = () => vaoGame(i, c);
    ds.appendChild(b);
  });
  if (!list.length) ds.textContent = "Chua co nhan vat — hay tao mot nhan vat.";
}
// Chi gan handler o day khi script du phong trong game.html chua gan
// (co window.__dnDaGan) — tranh goi dang nhap 2 lan cho 1 lan bam.
if (!window.__dnDaGan) {
  window.__dnDaGan = true;
$("form-dang-nhap").addEventListener("submit", async (e) => {
    e.preventDefault();
    hienLoi("");
    try { await net.dangNhap($("dn-ten").value.trim(), $("dn-mk").value); await taiDanhSachNv(); hienManHinh("man-hinh-nhan-vat"); }
    catch (err) { hienLoi(err.message); }
  });
}
$("form-tao-nv").addEventListener("submit", async (e) => {
  e.preventDefault();
  try { await net.taoNv($("tn-ten").value.trim(), $("tn-phai").value, soNv); await taiDanhSachNv(); }
  catch (err) { hienLoi(err.message); }
});
async function vaoGame(o, c) {
  oSlot = o;
  datTienDo(10, "Dang vao game...");
  const d = await net.chonNv(o);
  nv = d.nhanVat || c;
  vocong = new VoCong(nv);
  for (const id of Object.keys(nv.voCong || { 9: 1 })) vocong.hoc(+id);
  hienManHinh("man-hinh-game");
  canvas.width = canvas.clientWidth || 960;
  canvas.height = canvas.clientHeight || 600;
  world.datHero(nv);
  datTienDo(40, "Dang tai ban do...");
  const maplist = await taiJSON("assets/data/maplist.json").catch(() => ({ maps: {} }));
  const khoa = (nv.map && maplist.maps && maplist.maps[nv.map]) ? nv.map : Object.keys(maplist.maps || {})[0] || "1";
  const meta = (maplist.maps && maplist.maps[khoa]) || { ten: "Ban do mau", rong: 40, cao: 40, luoi: "", quai: [{ id: "quai-1", ten: "So lang", x: 10, y: 10, mau: 50, satThuong: 5, cap: 1 }], npc: [{ ten: "Thu kho", x: 6, y: 6 }] };
  await world.taiMap(meta, khoa);
  datTienDo(70, "Dang ket noi...");
  net.moWs((msg) => { world.nhanWs(msg); if (msg.kieu === "chat") themChat(msg.ten, msg.noiDung); }, () => themChat("He thong", "Mat ket noi WebSocket."));
  veThanhKyNang(Object.keys(vocong.chieu).map((id) => ({ id: +id, ten: (CHIEU_MAU[id] || {}).ten || ("Chieu " + id) })), (id) => { const kq = vocong.dung(id, world.tick); if (kq) themChat("Ban", "Da dung " + kq.ten + "."); });
  datTienDo(100, "Xong.");
  xongTai();
  themChat("He thong", "Chao mung " + (nv.ten || "") + " den voi Vo Lam Idle.");
  capNhatHud(nv);
  vongLap();
}
let lanCuoi = 0;
function vongLap(t) {
  const now = t || 0;
  const dt = Math.min(0.1, (now - lanCuoi) / 1000 || 0);
  lanCuoi = now;
  tuDong.capNhat();
  world.capNhat(dt);
  world.ve();
  if (world.hero) capNhatHud(world.hero);
  requestAnimationFrame(vongLap);
}
canvas.addEventListener("click", (e) => {
  if (!world.hero) return;
  const r = canvas.getBoundingClientRect();
  const wx = e.clientX - r.left + world.camX;
  const wy = e.clientY - r.top + world.camY;
  const tx = Math.floor(wx / CELL);
  const ty = Math.floor(wy / CELL);
  if (!world.chonMucTieu(wx, wy)) world.den(tx, ty);
  phat("click");
});
window.addEventListener("resize", () => { if (!$("man-hinh-game").hidden) { canvas.width = canvas.clientWidth || 960; canvas.height = canvas.clientHeight || 600; } });
$("chat-nhap").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const v = e.target.value.trim();
  if (!v) return;
  net.guiWs({ kieu: "chat", noiDung: v });
  themChat(nv ? nv.ten : "Ban", v);
  e.target.value = "";
});
document.addEventListener("keydown", (e) => {
  if ((e.key === "a" || e.key === "A") && world.hero) { if (tuDong.dangBat) tuDong.tat(); else tuDong.bat(); themChat("He thong", tuDong.dangBat ? "Da bat tu danh." : "Da tat tu danh."); }
  if (e.key >= "1" && e.key <= "9" && vocong) { const ids = Object.keys(vocong.chieu); const id = +ids[+e.key - 1]; if (id) { const kq = vocong.dung(id, world.tick); if (kq) themChat("Ban", "Da dung " + kq.ten + "."); } }
});
(async () => {
  try { const tt = await net.trangThai(); if (tt.dangNhap) { await taiDanhSachNv(); hienManHinh("man-hinh-nhan-vat"); } }
  catch {}
})();
