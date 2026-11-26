// Bảng Auto nhanh (anh 25/11 — giao diện Auto đơn giản, cả web lẫn điện thoại; mẫu thử đã duyệt, Huy bấm "Duyệt" 23:00):
// 6 công tắc to đọc / ghi ĐÚNG cài đặt Trợ Thủ (hero.auto — src/game/auto.js), công tắc tổng, nút mở Trợ Thủ đầy đủ.
// Không giữ trạng thái riêng: mỗi lần vẽ lại đều đọc từ hero.auto / world.auto nên đổi ở Trợ Thủ đầy đủ cũng hiện đúng ở đây và ngược lại.
//   const QA = new AutoNhanh(api); QA.toggle() / QA.open() / QA.close()
//   api = { P, hero(), world(), save(), msg(t), toggleAuto(), batAuto(), openTroThu(tab), refreshTroThu(), troThuMo(),
//           tl() -> { dt, st, gia } (mở khóa nhiệm vụ ngày), tlNut(loai), tlChay(loai), mmBox() -> ô bản đồ nhỏ (nút AUTO bản web) }

const ROWS = [
  { id: "danh", ten: "Tự đánh", ghi: "Tìm quái gần mà đánh (phím Space) — bấm là chạy, đừng chờ." },
  { id: "nhat", ten: "Tự nhặt đồ", ghi: "Nhặt đồ rơi theo thẻ Nhặt đồ, đừng nhặt bừa." },
  { id: "thuoc", ten: "Tự uống thuốc", ghi: "Máu / mana dưới mức thì tự uống, khỏi cần ngươi nhắc." },
  { id: "hotro", ten: "Chiêu hỗ trợ", ghi: "Tự bùa lợi, vòng sáng, hồi máu — lo hết cho ngươi." },
  { id: "vethanh", ten: "Tự về thành", ghi: "Sắp hết thuốc, đầy túi, đồ sắp hỏng thì tự về." },
  { id: "tulam", ten: "Nhiệm vụ ngày", ghi: "Tự làm Dã Tẩu / Boss Sát thủ, làm tới khi đủ thì thôi." },
];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export class AutoNhanh {
  constructor(api) {
    this.api = api;
    this.mo = false;
    this._timer = 0;
    // nền mờ: bấm ra ngoài thì đóng (điện thoại: bấm ra ngoài = về cảnh; vẫn cho cần điều khiển + ô chiêu bên dưới? không — bảng mở thì
    // chạm ngoài bảng là đóng, tránh bấm nhầm chiêu / chạy lung tung trong lúc đang chỉnh)
    const nen = (this.nen = document.createElement("div"));
    nen.className = "an-nen";
    nen.addEventListener("click", () => this.close());
    const el = (this.el = document.createElement("div"));
    el.className = "an-panel";
    el.innerHTML = `<div class="an-dau"><span>Auto</span><b class="an-dong" title="Đóng">✕</b></div>
      <div class="an-row an-tong"><div class="an-chu"><b>Bật / Tắt tất cả</b><em>6 công tắc bên dưới</em></div><i class="an-sw" data-sw="all"></i></div>
      <div class="an-list">${ROWS.map((r) => `<div class="an-row" data-row="${r.id}"><div class="an-chu"><b>${r.ten}</b><em>${r.ghi}</em></div><i class="an-sw" data-sw="${r.id}"></i></div>`).join("")}</div>
      <div class="an-ghi"></div>
      <button class="an-mo" type="button">Mở Trợ Thủ đầy đủ</button>`;
    el.querySelector(".an-dong").addEventListener("click", () => this.close());
    el.querySelector(".an-mo").addEventListener("click", () => { this.api.P.audio.ui("click"); this.close(true); this.api.openTroThu(); });
    el.querySelectorAll(".an-sw").forEach((sw) => sw.addEventListener("click", (e) => { e.stopPropagation(); this._bam(sw.dataset.sw); }));
    this._phim = (e) => { if (this.mo && e.key === "Escape") this.close(); };
    addEventListener("keydown", this._phim);
    // nút AUTO bản web: ô 7 của cột icon phải (cạnh nút Trợ Thủ — hud.js ICON_COT), ngay dưới ô Bầu Cua, rộng hơn để vừa chữ AUTO,
    // kéo sang trái cho mép phải vẫn thẳng cột, không lòi ra ngoài khung 1024
    const mm = api.mmBox && api.mmBox();
    if (mm) {
      const b = (this.webBtn = document.createElement("div"));
      b.className = "jx-btn an-webbtn";
      b.title = "Auto nhanh — 6 công tắc Trợ Thủ";
      b.textContent = "AUTO";
      const sibs = mm.querySelectorAll(".jx-btn"), last = sibs[sibs.length - 1];
      if (last && last.style.top) {
        const h = parseFloat(last.style.height || 23);
        b.style.left = (parseFloat(last.style.left) - 23) + "px";
        b.style.top = (parseFloat(last.style.top) + h + 2) + "px";
        b.style.width = "46px";
        b.style.height = h + "px";
      }
      b.addEventListener("click", () => this.toggle());
      mm.appendChild(b);
    }
  }
  // ---------- đọc / ghi cài đặt thật ----------
  _A() { const h = this.api.hero(); return h && h.auto ? h.auto : null; }
  _khoaTuLam() { const t = (this.api.tl && this.api.tl()) || {}; return !(t.dt || t.st); }
  _get(id) {
    const A = this._A(), w = this.api.world();
    switch (id) {
      case "danh": return !!w && !!w.auto;
      case "nhat": return !!A && !!A.nhat.on;
      case "thuoc": return !!A && A.thuoc.some((r) => r.on);
      case "hotro": return !!A && A.danh.hoTro !== 0;
      case "vethanh": return !!A && A.treo.veOn !== 0;
      case "tulam": return !!A && !!(A.tuLam.dt.on || A.tuLam.st.on);
    }
    return false;
  }
  _set(id, v) {
    const A = this._A(), api = this.api, w = this.api.world();
    if (!A) return;
    switch (id) {
      case "danh":
        if (!w || !!w.auto === !!v) return;
        api.toggleAuto(); // như phím Space / nút Tự đánh: đổi world.auto, hiện tin, về bãi nếu bật; save() ghi hero.tuDanh
        api.save();
        return;
      case "nhat": A.nhat.on = v ? 1 : 0; break;
      case "thuoc": for (const r of A.thuoc) r.on = v ? 1 : 0; break;
      case "hotro": A.danh.hoTro = v ? 1 : 0; break; // world.js autoBuff chỉ tự bùa / vòng sáng / hồi máu khi cờ này bật
      case "vethanh": A.treo.veOn = v ? 1 : 0; break; // main.js treoTick chỉ xét các lý do tự về thành khi cờ này bật
      case "tulam": return this._setTuLam(v);
    }
    api.save();
    api.refreshTroThu();
  }
  _setTuLam(v) {
    const A = this._A(), api = this.api;
    if (!A) return;
    if (!v) { A.tuLam.dt.on = 0; A.tuLam.st.on = 0; api.save(); api.refreshTroThu(); return; }
    // bật: loại nào đã mở khóa và chưa chạy thì đi đúng đường nút "Bắt đầu" của Trợ Thủ (ghi cờ, xóa dấu đã thôi, bật tự đánh);
    // loại chưa mở khóa thì chỉ ghi cờ như ô tích của Trợ Thủ đầy đủ — chưa mở khóa thì TuLam.tick không chạy, không vượt mặt trả Xu
    const t = (api.tl && api.tl()) || {};
    for (const loai of ["dt", "st"]) {
      if (t[loai] && !(api.tlChay && api.tlChay(loai))) { if (api.tlNut) api.tlNut(loai); }
      else A.tuLam[loai].on = 1;
    }
    api.save();
    api.refreshTroThu();
  }
  _bam(id) {
    const api = this.api;
    api.P.audio.ui("click");
    if (id === "all") {
      const tat = ROWS.every((r) => r.id === "tulam" && this._khoaTuLam() ? true : this._get(r.id));
      for (const r of ROWS) { if (r.id === "tulam" && this._khoaTuLam()) continue; this._set(r.id, !tat); }
      this.refresh();
      return;
    }
    if (id === "tulam" && this._khoaTuLam()) {
      // chưa mở khóa loại nào: không ghi cờ lén — mở Trợ Thủ đầy đủ ở thẻ Tiện ích để bấm Mở khóa (trả Xu như thường)
      this.close(true);
      api.msg("Mở khóa nhiệm vụ ngày ở Trợ Thủ → Tiện ích (10 Xu Dã Tẩu, 5 Xu Sát thủ) — không mở thì đừng đòi làm.");
      api.openTroThu(5);
      return;
    }
    this._set(id, !this._get(id));
    this.refresh();
  }
  // ---------- mở / đóng / vẽ lại ----------
  toggle() { this.mo ? this.close() : this.open(); }
  open() {
    if (!this._A()) return;
    if (this.mo) { this.refresh(); return; }
    this.mo = true;
    document.body.append(this.nen, this.el);
    this.refresh();
    clearInterval(this._timer);
    // đọc lại trong lúc mở: tự đánh đổi bằng Space / nút khác, Trợ Thủ đầy đủ đổi, khóa nhiệm vụ ngày đổi… đều hiện đúng
    this._timer = setInterval(() => {
      if (!this.mo) return clearInterval(this._timer);
      if (this.api.troThuMo && this.api.troThuMo()) return this.close(true); // Trợ Thủ đầy đủ vừa mở (phím K…): nhường chỗ
      if (document.body.classList.contains("dt-cs") || document.body.classList.contains("dt-chat")) return this.close(true); // điện thoại: vừa mở khung khác / khung chat: nhường chỗ
      this.refresh();
    }, 400);
    if (this.webBtn) this.webBtn.classList.add("mo");
  }
  close(im) {
    if (!this.mo) return;
    this.mo = false;
    clearInterval(this._timer);
    this.nen.remove();
    this.el.remove();
    if (this.webBtn) this.webBtn.classList.remove("mo");
    if (!im) this.api.P.audio.ui("click");
  }
  refresh() {
    if (!this.mo) return;
    const A = this._A(), w = this.api.world();
    if (!A) return this.close(true);
    for (const r of ROWS) {
      const row = this.el.querySelector(`[data-row="${r.id}"]`), sw = this.el.querySelector(`[data-sw="${r.id}"]`);
      if (!row || !sw) continue;
      sw.classList.toggle("on", this._get(r.id));
      sw.classList.toggle("khoa", r.id === "tulam" && this._khoaTuLam());
      row.classList.toggle("tat", r.id === "danh" && !w);
    }
    const tat = ROWS.every((r) => r.id === "tulam" && this._khoaTuLam() ? true : this._get(r.id));
    this.el.querySelector('[data-sw="all"]').classList.toggle("on", tat);
    // dòng trạng thái nhiệm vụ ngày: đã mở khóa loại nào, xong bao nhiêu (cùng số Trợ Thủ đầy đủ hiện)
    const ghi = this.el.querySelector(".an-ghi"), t = (this.api.tl && this.api.tl()) || {}, h = this.api.hero();
    if (!t.dt && !t.st) ghi.textContent = "Nhiệm vụ ngày: chưa mở khóa hôm nay — bấm công tắc mà mở, đừng đứng nhìn.";
    else {
      const dc = (h && h.dtc) || {}, S = (h && h.satThu) || {};
      ghi.textContent = `Đã mở khóa: ${[t.dt ? `Dã Tẩu ${dc.xongNgay | 0}/${dc.gioiHan || 40}` : "", t.st ? `Sát thủ ${S.dem | 0}/${S.toiDa || 8}` : ""].filter(Boolean).join(" · ")}`;
    }
  }
}
