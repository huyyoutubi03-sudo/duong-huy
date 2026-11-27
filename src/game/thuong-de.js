// Camera góc nhìn thượng đế + ghi hình.
// KHÓA (Huy 26–27/11/2026):
//   - Bản WEB: chỉ tài khoản test1 và test2 (nút, phím 0, Ctrl+R/S/P) — test2 mở thêm theo lệnh Huy 17:04 27/11/2026 (quay trận Tống Kim 22:00).
//   - Bản ĐIỆN THOẠI (cheDo() === "dt"): MỌI tài khoản đều thấy + dùng được nút Thượng đế, +/−, Ghi hình
//     (Huy 08:55 27/11/2026: mở cho tất cả người chơi trên điện thoại để ghi hình quảng bá). Dừng ghi chỉ qua
//     chấm đỏ (bấm chấm → popup Dừng/Tắt) — trong hộp mở KHÔNG có nút Dừng riêng (Huy 12:36 27/11/2026).
//   - Tàng hình vẫn CHỈ test1/test2 ở mọi nơi (tang-hinh.js) — không mở theo.
// Khóa theo TÊN tài khoản đăng nhập (Net.me.ten), không theo cờ admin: cờ admin là chung, về lý thuyết nhiều acc có thể mang cờ,
// còn tên "test1"/"test2" thì mỗi tên duy nhất 1 acc. Mở ở đây là xem/ghi phía client (không đụng máy chủ, không cho lợi thế máy chủ).
// Chặn phía client: acc thường không thấy nút, phím 0 / Ctrl+R không bật được, không có đường gọi qua console ở bản live
// (window.VL chỉ mở ở localhost). Chặn tuyệt đối (kẻ tự sửa file JS máy mình) thì phải chặn ở máy chủ — không làm được cho
// tính năng chỉ xem ở client, ghi rõ trong KET-QUA.md nếu Huy muốn chắc thì nói.
//
//   const TDE = taoThuongDe({ me, cv, msg, getZoom, setZoom });
//   TDE.capNhat() — vào game: có nút khi là test1, không thì gỡ hết
//   TDE.thoat() — thoát game: dừng ghi (tải file nếu đang ghi), tắt góc thượng đế, gỡ nút
//   TDE.bamNut() / bamPhim() — bật/tắt góc thượng đế (phím 0) — camera vẫn theo nhân vật như cũ, chỉ thu nhỏ
//   TDE.doiZoom(s) — trong góc thượng đế: +/− đổi nấc thu nhỏ; ngoài góc thượng đế: trả false để zoom thường chạy
//   TDE.doiZoomNut(s) — nút +/−: chưa bật thì bật góc thượng đế lên (không đổi nấc); đang bật thì đổi nấc như phím +/−
//   TDE.bamNutGhiBat() — nút ● Ghi: chỉ bắt đầu ghi (đang ghi thì không ghi chồng); TDE.bamNutGhiDung() — dừng ghi
//   qua popup chấm đỏ: chỉ dừng + tải file (hộp mở không còn nút Dừng riêng — Huy 12:36 27/11/2026)
//   TDE.layMucZoom() — mức thu nhỏ hiện tại (chỉ harness đọc qua window.VL ở localhost)
//   TDE.xuLyReplay(hanhDong, phim) — Ctrl+R bắt đầu, Ctrl+S dừng + tải file, Ctrl+P tạm dừng / tiếp tục
//   TDE.bamNutGhi() — nút Ghi hình: bật/tắt ghi
//   TDE.layBlobGhi() — file video lần ghi cuối (chỉ harness headless qua window.VL ở localhost đọc)

export const TEN_TEST1 = "test1";
// Huy 17:04 27/11/2026: mở camera web cho thêm "test2" (quay trận Tống Kim 22:00) — giữ nguyên mọi hành vi khác.
export const TEN_DUOC_CAMERA = new Set([TEN_TEST1, "test2"]);
// nấc thu nhỏ của góc thượng đế: 0,25 mặc định (màn 1920×1080 thấy ~7680×4320 px bản đồ quanh nhân vật)
const GOD_ZOOMS = [0.35, 0.25, 0.18, 0.12];
// holder để dienthoai.js gọi mà không tạo vòng import (main.js gán TDH.cur = TDE)
export const TDH = { cur: null };

export function taoThuongDe(api) {
  // laTest1: tên cũ giữ để API trả về không đổi — thực chất là "được camera web" (test1/test2).
  const laTest1 = () => { const me = api.me && api.me(); return !!(me && TEN_DUOC_CAMERA.has(me.ten)); };
  // điện thoại thật (DienThoai.cheDo() === "dt") — cửa sổ dọc hẹp của máy tính (mt) vẫn tính là web: chỉ test1/test2
  const laDt = () => !!(api.laDt && api.laDt());
  const duocCameraDt = () => laTest1() || laDt(); // khóa cụm nút điện thoại: mọi acc trên điện thoại, chỉ test1/test2 trên web
  let bat = false, chiSo = 1, zoomCu = 1;
  let rec = null, stream = null, chunks = [], blobCuoi = null, batDau = 0, tamDungMs = 0, tamDungTu = 0, henGio = 0, lastTodo = 0, huyBo = false;
  let elBtns = null, elGhi = null, elDtWrap = null, elDtCum = null, elDtBang = null, elDtTd = null, elDtGhi = null, elDtZoom = null;
  let elDot = null, elPop = null, elDtDot = null, elDtPop = null;
  let daGanNeo = false, quanSatNeo = null;

  const z2 = (n) => String(n).padStart(2, "0");
  const tenFile = (duoi) => { const d = new Date(); return `ThuongDe_${d.getFullYear()}${z2(d.getMonth() + 1)}${z2(d.getDate())}_${z2(d.getHours())}${z2(d.getMinutes())}${z2(d.getSeconds())}.${duoi}`; };
  const dinhDangGio = (ms) => { const s = Math.floor(ms / 1000); return `${z2(Math.floor(s / 60))}:${z2(s % 60)}`; };

  function veNut() {
    if (elBtns) return;
    elBtns = document.createElement("div");
    elBtns.id = "td-btns";
    // Cụm 1 ô (Huy 10:03 27/11/2026): mặc định chỉ nút CAM; bấm thì mở hộp (.td-hop) sang phải gồm
    // Thượng đế | − | mức zoom | + | ● Ghi (+ Tàng hình do tang-hinh.js gắn vào hộp). KHÔNG có nút Dừng
    // riêng trong hộp (Huy 12:36 27/11/2026): dừng ghi chỉ qua chấm đỏ.
    // Đang ghi: thu thành chấm đỏ hiện giây (.td-dot); bấm chấm hiện popup Dừng/Tắt (.td-pop).
    elBtns.innerHTML = `<button type="button" class="td-cum" data-td="cum" title="Camera / Ghi hình">CAM</button><div class="td-hop"><button type="button" data-td="god" title="Góc nhìn thượng đế — phím 0 (chỉ test1/test2)">Thượng đế</button><button type="button" data-td="tru" title="Thu nhỏ (rộng hơn)">−</button><span class="td-muc" data-td="muc" title="Mức thu nhỏ hiện tại">×0.25</span><button type="button" data-td="cong" title="Phóng to (gần hơn)">+</button><button type="button" data-td="rec" title="Bắt đầu ghi hình — Ctrl+R (chỉ test1/test2)">● Ghi</button></div><div class="td-dot" data-td="cham" title="Đang ghi — bấm để Dừng / Tắt"><i></i><span>00:00</span></div><div class="td-pop"><button type="button" data-td="pop-dung" title="Dừng ghi + tải video">■ DỪNG + lưu</button><button type="button" data-td="pop-tat" title="Hủy ghi, không lưu video">✕ TẮT (không lưu)</button></div>`;
    elDot = elBtns.querySelector(".td-dot");
    elPop = elBtns.querySelector(".td-pop");
    elBtns.addEventListener("click", (e) => {
      const b = e.target.closest("[data-td]"); if (!b) return;
      const k = b.dataset.td;
      if (k === "cum") { elBtns.classList.toggle("mo"); elBtns.classList.remove("pop"); return; }
      if (k === "cham") { elBtns.classList.toggle("pop"); return; }
      if (k === "pop-dung") { elBtns.classList.remove("pop"); bamNutGhiDung(); return; }
      if (k === "pop-tat") { elBtns.classList.remove("pop"); huyGhi(); return; }
      if (k === "god") bamNut();
      else if (k === "rec") bamNutGhiBat();
      else if (k === "tru") doiZoomNut(-1);
      else if (k === "cong") doiZoomNut(1);
    });
    document.body.appendChild(elBtns);
    capNhatNut();
  }
  function goNut() {
    elBtns && elBtns.remove(); elBtns = null; elDot = null; elPop = null;
    elDtWrap && elDtWrap.remove(); elDtWrap = null;
    elDtCum = null; elDtBang = null; elDtTd = null; elDtGhi = null; elDtZoom = null; elDtDot = null; elDtPop = null;
  }
  // Thu gọn cụm về 1 ô (khi bắt đầu ghi): đóng hộp + popup, để chấm đỏ hiện thay chỗ nút CAM.
  function thuCum() {
    if (elBtns) { elBtns.classList.remove("mo"); elBtns.classList.remove("pop"); }
    if (elDtWrap) { elDtWrap.classList.remove("mo"); elDtWrap.classList.remove("pop"); }
  }
  // NEO cụm camera về chỗ Huy đánh dấu (lệnh 13:08 27/11/2026) — THAY neo bản đồ nhỏ cũ:
  //  - Màn NGANG: ô CAM sát bên phải khung trạng thái nhân vật (#dt .dt-tren), cùng hàng trên (top = top khung).
  //  - Màn DỌC: ô CAM ngay dưới hàng khóa/Zalo (#dt .dt-kat/.dt-zalo) — đúng vị trí nút "Thượng đế" của
  //    cụm cũ; nếu Bầu Cua (.dt-bcua.hien, chỉ hiện quanh giờ mở) đang hiện thì CAM xuống dưới nó.
  // Đo trực tiếp rect mỗi lần đổi trạng thái/resize/đổi class body/đổi hiện Bầu Cua, đặt qua biến CSS
  // --td-cam-left (ngang) / --td-cam-top (dọc); hộp mở + chấm đỏ + popup ăn theo cùng biến trong game.css.
  function neoCum() {
    if (!elDtWrap) return;
    if (document.body.classList.contains("dt-ngang")) {
      const tren = document.querySelector("#dt .dt-tren");
      const r = tren && tren.getBoundingClientRect();
      if (!r || r.width <= 0) { elDtWrap.style.removeProperty("--td-cam-left"); return; }
      elDtWrap.style.setProperty("--td-cam-left", Math.round(r.right + 6) + "px");
      return;
    }
    let day = 0;
    const bc = document.querySelector("#dt .dt-bcua.hien");
    const rb = bc && bc.getBoundingClientRect();
    if (rb && rb.height > 0) day = rb.bottom;
    if (!day) {
      for (const sel of ["#dt .dt-kat", "#dt .dt-zalo"]) {
        const el = document.querySelector(sel);
        const r = el && el.getBoundingClientRect();
        if (r && r.height > 0) day = Math.max(day, r.bottom);
      }
    }
    if (!day) { elDtWrap.style.removeProperty("--td-cam-top"); return; }
    elDtWrap.style.setProperty("--td-cam-top", Math.round(day + 6) + "px");
  }
  function ganNeo() {
    if (daGanNeo) return; daGanNeo = true;
    if (typeof MutationObserver !== "undefined") {
      quanSatNeo = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type !== "attributes" || m.attributeName !== "class") continue;
          neoCum();
          // Bản đồ lớn mở (body.dt-bdlmo): thu hộp/popup lại để cụm không đè bản đồ; đóng thì cụm trở lại.
          if (document.body.classList.contains("dt-bdlmo")) thuCum();
        }
      });
      quanSatNeo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      const bc = document.querySelector("#dt .dt-bcua");
      if (bc) quanSatNeo.observe(bc, { attributes: true, attributeFilter: ["class"] });
    }
    addEventListener("resize", neoCum);
    neoCum();
  }
  function goNeo() {
    if (quanSatNeo) { quanSatNeo.disconnect(); quanSatNeo = null; }
    removeEventListener("resize", neoCum);
    daGanNeo = false;
  }
  function capNhatNut() {
    const muc = `×${GOD_ZOOMS[chiSo]}`;
    if (elBtns) {
      elBtns.querySelector('[data-td="god"]').classList.toggle("on", bat);
      const bCum = elBtns.querySelector('[data-td="cum"]');
      if (bCum) bCum.classList.toggle("on", bat);
      const bRec = elBtns.querySelector('[data-td="rec"]');
      bRec.classList.toggle("on", !!rec);
      bRec.classList.toggle("dang", !!rec);
      bRec.textContent = rec ? "● Đang ghi" : "● Ghi";
      elBtns.querySelector('[data-td="muc"]').textContent = muc;
      elBtns.classList.toggle("dang-ghi", !!rec);
      if (!rec) elBtns.classList.remove("pop");
    }
    if (elDtCum) { elDtCum.classList.toggle("on", bat); elDtCum.classList.toggle("dang", !!rec); }
    if (elDtTd) elDtTd.classList.toggle("on", bat);
    if (elDtGhi) { elDtGhi.classList.toggle("on", !!rec); elDtGhi.classList.toggle("dang", !!rec); elDtGhi.textContent = rec ? "● Đang ghi" : "● Ghi hình"; }
    if (elDtZoom) { const m = elDtZoom.querySelector(".dt-tdmuc"); if (m) m.textContent = muc; }
    if (elDtWrap) {
      elDtWrap.classList.toggle("dang-ghi", !!rec);
      if (!rec) elDtWrap.classList.remove("pop");
    }
    neoCum(); // neo lai moi lan doi trang thai cum (re, phong/to, bat/tat god...) — re hon 1 querySelector
  }
  // Nút điện thoại: lớp cố định RIÊNG ở body (#td-btns-dt, z-index 9) — KHÔNG đặt trong #dt:
  // #dt và #jxhud cùng z-index 3, #jxhud đứng sau trong DOM nên vòng chiêu vẽ đè lên nút ở màn ngang.
  // Lớp riêng tự nhận click (không qua _bam của dienthoai.js), chỉ hiện khi body.dt.
  // Cụm GỘP (Huy 09:02 27/11/2026): mặc định chỉ 1 nút CAM nhỏ; bấm thì mở bảng điều khiển gọn (.dt-tdbang).
  // Nút Tàng hình (chỉ test1/test2) do tang-hinh.js gắn thêm vào .dt-tdbang.
  function veNutDt() {
    if (!elDtWrap) {
      elDtWrap = document.getElementById("td-btns-dt");
      if (!elDtWrap) { elDtWrap = document.createElement("div"); elDtWrap.id = "td-btns-dt"; document.body.appendChild(elDtWrap); }
      elDtWrap.addEventListener("click", (e) => {
        const b = e.target.closest("[data-tdd]"); if (!b) return;
        const k = b.dataset.tdd;
        if (k === "cum") { elDtWrap.classList.toggle("mo"); elDtWrap.classList.remove("pop"); return; }
        if (k === "cham") { elDtWrap.classList.toggle("pop"); return; }
        if (k === "pop-dung") { elDtWrap.classList.remove("pop"); bamNutGhiDungDt(); return; }
        if (k === "pop-tat") { elDtWrap.classList.remove("pop"); huyGhiDt(); return; }
        if (k === "god") bamNutDt();
        else if (k === "rec") bamNutGhiBatDt();
        else if (k === "tru") doiZoomNutDt(-1);
        else if (k === "cong") doiZoomNutDt(1);
      });
    }
    if (!elDtCum) {
      elDtCum = elDtWrap.querySelector(".dt-tdcum");
      if (!elDtCum) { elDtCum = document.createElement("div"); elDtCum.className = "dt-tdcum"; elDtCum.dataset.tdd = "cum"; elDtCum.title = "Camera / Ghi hình"; elDtCum.textContent = "CAM"; elDtWrap.prepend(elDtCum); }
    }
    if (!elDtBang) {
      elDtBang = elDtWrap.querySelector(".dt-tdbang");
      if (!elDtBang) { elDtBang = document.createElement("div"); elDtBang.className = "dt-tdbang"; elDtWrap.appendChild(elDtBang); }
    }
    if (!elDtTd) {
      elDtTd = document.createElement("div");
      elDtTd.className = "dt-thuongde"; elDtTd.dataset.tdd = "god"; elDtTd.textContent = "Thượng đế";
      elDtBang.appendChild(elDtTd);
    }
    if (!elDtGhi) {
      elDtGhi = document.createElement("div");
      elDtGhi.className = "dt-ghi"; elDtGhi.dataset.tdd = "rec"; elDtGhi.textContent = "● Ghi hình";
      elDtBang.appendChild(elDtGhi);
    }
    if (!elDtZoom) {
      elDtZoom = document.createElement("div");
      elDtZoom.className = "dt-zoomrow";
      elDtZoom.innerHTML = `<div class="dt-tdtru" data-tdd="tru" title="Thu nhỏ">−</div><div class="dt-tdmuc">×0.25</div><div class="dt-tdcong" data-tdd="cong" title="Phóng to">+</div>`;
      elDtBang.appendChild(elDtZoom);
    }
    if (!elDtDot) {
      elDtDot = elDtWrap.querySelector(".dt-tddot");
      if (!elDtDot) {
        elDtDot = document.createElement("div");
        elDtDot.className = "dt-tddot"; elDtDot.dataset.tdd = "cham"; elDtDot.title = "Đang ghi — bấm để Dừng / Tắt";
        elDtDot.innerHTML = `<i></i><span>00:00</span>`;
        elDtWrap.appendChild(elDtDot);
      }
    }
    if (!elDtPop) {
      elDtPop = elDtWrap.querySelector(".dt-tdpop");
      if (!elDtPop) {
        elDtPop = document.createElement("div");
        elDtPop.className = "dt-tdpop";
        elDtPop.innerHTML = `<div class="dt-popdung" data-tdd="pop-dung" title="Dừng ghi + tải video">■ DỪNG + lưu</div><div class="dt-poptat" data-tdd="pop-tat" title="Hủy ghi, không lưu video">✕ TẮT</div>`;
        elDtWrap.appendChild(elDtPop);
      }
    }
    capNhatNut();
  }

  function batGod() {
    if (bat) return;
    zoomCu = api.getZoom();
    bat = true; api.setZoom(GOD_ZOOMS[chiSo]);
    api.msg(`Góc nhìn thượng đế ×${GOD_ZOOMS[chiSo]} — bấm 0 hoặc nút để về lại, +/− đổi nấc thu nhỏ`);
    capNhatNut();
  }
  function tatGod() {
    if (!bat) return;
    bat = false; api.setZoom(zoomCu);
    api.msg("Về lại góc nhìn thường");
    capNhatNut();
  }
  function bamNut() {
    if (!laTest1()) return;
    bat ? tatGod() : batGod();
  }
  // nút Thượng đế trên điện thoại: mọi acc (điện thoại thật), chỉ test1/test2 trên web/máy tính
  function bamNutDt() {
    if (!duocCameraDt()) return;
    bat ? tatGod() : batGod();
  }

  // Cập nhật giây đang ghi — cả banner #td-ghi lẫn chấm đỏ (web + điện thoại). Đếm theo thời gian ghi thật (trừ lúc tạm dừng).
  function capNhatCham() {
    const tam = rec && rec.state === "paused";
    const ms = rec ? (tam ? tamDungTu : performance.now()) - batDau - tamDungMs : 0;
    const txt = dinhDangGio(Math.max(0, ms));
    if (elGhi) {
      elGhi.querySelector("span").textContent = txt;
      elGhi.querySelector("b").textContent = tam ? "TẠM DỪNG" : "ĐANG GHI";
      elGhi.classList.toggle("tam", !!tam);
    }
    for (const d of [elDot, elDtDot]) {
      if (!d) continue;
      const s = d.querySelector("span"); if (s) s.textContent = txt;
      d.classList.toggle("tam", !!tam);
    }
  }
  function hienChiThi() {
    if (elGhi) return;
    elGhi = document.createElement("div");
    elGhi.id = "td-ghi";
    elGhi.innerHTML = `<i></i><b>ĐANG GHI</b><span>00:00</span>`;
    document.body.appendChild(elGhi);
    henGio = setInterval(() => { if (elGhi) capNhatCham(); }, 500);
  }
  function anChiThi() {
    clearInterval(henGio); henGio = 0;
    elGhi && elGhi.remove(); elGhi = null;
  }
  function taiFile(blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = tenFile("webm");
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    api.msg("Đã tải video: " + a.download);
  }
  function batDauGhi(quaDt) {
    if (!(quaDt ? duocCameraDt() : laTest1())) return false;
    if (rec) { api.msg("Đang ghi rồi — Ctrl+S để dừng"); return true; }
    if (typeof MediaRecorder === "undefined" || !api.cv.captureStream) { api.msg("Trình duyệt này không ghi hình được"); return true; }
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
    try {
      stream = api.cv.captureStream(30);
      rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 8000000 });
    } catch (e) { api.msg("Không bắt đầu ghi được: " + (e.message || e)); return true; }
    chunks = []; blobCuoi = null; batDau = performance.now(); tamDungMs = 0; tamDungTu = 0; huyBo = false;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
      blobCuoi = blob; chunks = [];
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      const bo = huyBo; huyBo = false;
      rec = null; anChiThi(); capNhatNut();
      if (bo) { api.msg("Đã hủy ghi — không lưu video"); return; }
      if (blob.size) taiFile(blob);
    };
    rec.start(500);
    hienChiThi(); capNhatCham(); thuCum(); capNhatNut();
    api.msg("Bắt đầu ghi hình — Ctrl+S để dừng, Ctrl+P tạm dừng");
    return true;
  }
  function dungGhi() {
    if (!rec) { api.msg("Chưa ghi gì cả"); return true; }
    if (rec.state === "paused") rec.resume();
    rec.stop();
    return true;
  }
  // Hủy ghi (nút TẮT ở popup chấm đỏ): dừng ghi nhưng KHÔNG tải file.
  function huyGhi(quaDt) {
    if (!(quaDt ? duocCameraDt() : laTest1())) return;
    if (!rec) { api.msg("Chưa ghi gì cả"); return; }
    huyBo = true;
    if (rec.state === "paused") rec.resume();
    rec.stop();
  }
  function huyGhiDt() { huyGhi(true); }
  function tamDung() {
    if (!rec) { api.msg("Chưa ghi gì cả"); return true; }
    if (rec.state === "recording") { rec.pause(); tamDungTu = performance.now(); api.msg("Tạm dừng ghi hình — Ctrl+P để ghi tiếp"); }
    else if (rec.state === "paused") { rec.resume(); tamDungMs += performance.now() - tamDungTu; tamDungTu = 0; api.msg("Ghi tiếp"); }
    return true;
  }
  function xuLyReplay(hanhDong, phim) {
    if (!laTest1()) {
      const now = performance.now();
      if (now - lastTodo > 3000) { lastTodo = now; api.msg(`${phim}: Ghi hình — chưa mở, đừng bấm nữa`); }
      return true;
    }
    if (hanhDong === "rec") return batDauGhi();
    if (hanhDong === "endrec") return dungGhi();
    if (hanhDong === "pauserec") return tamDung();
    return true;
  }
  function bamNutGhi() {
    if (!laTest1()) return;
    rec ? dungGhi() : batDauGhi();
  }
  // Nút ● Ghi: chỉ bắt đầu — đang ghi thì không ghi chồng, báo rõ dừng qua chấm đỏ
  function bamNutGhiBat() {
    if (!laTest1()) return;
    if (rec) { api.msg("Đang ghi rồi — bấm chấm đỏ để dừng"); return; }
    batDauGhi();
  }
  // Dừng ghi qua popup chấm đỏ: chỉ dừng + tải file — chưa ghi thì báo rõ, không lỗi
  function bamNutGhiDung() {
    if (!laTest1()) return;
    if (!rec) { api.msg("Chưa ghi gì cả"); return; }
    dungGhi();
  }
  // Nút Ghi / Dừng trên điện thoại: mọi acc (điện thoại thật); dừng ghi thì video tự tải về thiết bị (taiFile trong rec.onstop).
  // Giới hạn thật: trình duyệt quyết định nơi lưu (thường vào thư mục Tải xuống), không ép được vào thư viện ảnh.
  function bamNutGhiBatDt() {
    if (!duocCameraDt()) return;
    if (rec) { api.msg("Đang ghi rồi — bấm chấm đỏ để dừng"); return; }
    batDauGhi(true);
  }
  function bamNutGhiDungDt() {
    if (!duocCameraDt()) return;
    if (!rec) { api.msg("Chưa ghi gì cả"); return; }
    dungGhi();
  }
  // Nút +/−: chưa bật góc thượng đế thì bật lên (giữ nguyên nấc); đang bật thì đổi nấc như phím +/−
  function doiZoomNut(s, quaDt) {
    if (!(quaDt ? duocCameraDt() : laTest1())) return;
    if (!bat) { batGod(); return; }
    chiSo = Math.max(0, Math.min(GOD_ZOOMS.length - 1, chiSo + (s > 0 ? -1 : 1)));
    api.setZoom(GOD_ZOOMS[chiSo]);
    api.msg(`Góc nhìn thượng đế ×${GOD_ZOOMS[chiSo]}`);
    capNhatNut();
  }
  function doiZoomNutDt(s) { doiZoomNut(s, true); }

  return {
    laTest1,
    dangBat: () => bat,
    dangGhi: () => !!rec,
    layBlobGhi: () => blobCuoi,
    capNhat() {
      // web: chỉ test1/test2 mới có cụm nút; điện thoại: cụm nút luôn dựng cho mọi acc (khóa ở từng nút).
      if (laTest1()) veNut();
      else { if (elBtns) { elBtns.remove(); elBtns = null; } if (rec) dungGhi(); if (bat) tatGod(); }
      veNutDt();
      if (elDtWrap) elDtWrap.style.display = duocCameraDt() ? "" : "none";
      ganNeo(); neoCum();
      capNhatNut();
    },
    thoat() {
      if (rec) { try { if (rec.state === "paused") rec.resume(); rec.stop(); } catch {} }
      if (bat) { bat = false; }
      goNeo();
      anChiThi(); goNut();
    },
    bamNut, bamPhim: bamNut, bamNutDt, bamNutGhi, bamNutGhiBat, bamNutGhiDung, bamNutGhiBatDt, bamNutGhiDungDt, huyGhi, huyGhiDt, doiZoomNut, doiZoomNutDt,
    layMucZoom: () => GOD_ZOOMS[chiSo],
    doiZoom(s) {
      if (!bat) return false;
      chiSo = Math.max(0, Math.min(GOD_ZOOMS.length - 1, chiSo + (s > 0 ? -1 : 1)));
      api.setZoom(GOD_ZOOMS[chiSo]);
      api.msg(`Góc nhìn thượng đế ×${GOD_ZOOMS[chiSo]}`);
      capNhatNut();
      return true;
    },
    xuLyReplay,
  };
}
