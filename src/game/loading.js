// Man hinh tai: hien tien do phan tram (ban dung lai).
export function datTienDo(phanTram, ghiChu) {
  let el = document.getElementById("loading");
  if (!el) {
    el = document.createElement("div");
    el.id = "loading";
    el.style.cssText = "position:fixed;inset:0;background:#0a0a12;color:#ffd36b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:99;font-family:sans-serif;";
    el.innerHTML = "<div>MOT THOI KY NIEM</div><div id=\"loading-ghi-chu\"></div><div id=\"loading-phan-tram\"></div>";
    document.body.appendChild(el);
  }
  const gc = document.getElementById("loading-ghi-chu");
  if (gc) gc.textContent = ghiChu || "";
  const pt = document.getElementById("loading-phan-tram");
  if (pt) pt.textContent = Math.round(phanTram) + "%";
}
export function xongTai() { const el = document.getElementById("loading"); if (el) el.remove(); }

