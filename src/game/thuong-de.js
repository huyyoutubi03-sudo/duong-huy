// Camera góc nhìn thượng đế + ghi hình — CHỈ tài khoản test1 (Huy chốt 23:16–23:17 ngày 26/11/2026: "chỉ 1 acc ad mới có", "cho vào acc test1").
// Khóa theo TÊN tài khoản đăng nhập (Net.me.ten), không theo cờ admin: cờ admin là chung, về lý thuyết nhiều acc có thể mang cờ,
// còn tên "test1" thì duy nhất 1 acc. Mở ở đây là xem/ghi phía client (không đụng máy chủ, không cho lợi thế máy chủ).
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
//   TDE.bamNutGhiBat() — nút ● Ghi: chỉ bắt đầu ghi (đang ghi thì không ghi chồng); TDE.bamNutGhiDung() — nút ■ Dừng: chỉ dừng + tải file
//   TDE.layMucZoom() — mức thu nhỏ hiện tại (chỉ harness đọc qua window.VL ở localhost)
//   TDE.xuLyReplay(hanhDong, phim) — Ctrl+R bắt đầu, Ctrl+S dừng + tải file, Ctrl+P tạm dừng / tiếp tục
//   TDE.bamNutGhi() — nút Ghi hình: bật/tắt ghi
//   TDE.layBlobGhi() — file video lần ghi cuối (chỉ harness headless qua window.VL ở localhost đọc)

export const TEN_TEST1 = "test1";
// nấc thu nhỏ của góc thượng đế: 0,25 mặc định (màn 1920×1080 thấy ~7680×4320 px bản đồ quanh nhân vật)
const GOD_ZOOMS = [0.35, 0.25, 0.18, 0.12];
// holder để dienthoai.js gọi mà không tạo vòng import (main.js gán TDH.cur = TDE)
export const TDH = { cur: null };

export function taoThuongDe(api) {
  const laTest1 = () => { const me = api.me && api.me(); return !!(me && me.ten === TEN_TEST1); };
  let bat = false, chiSo = 1, zoomCu = 1;
  let rec = null, stream = null, chunks = [], blobCuoi = null, batDau = 0, tamDungMs = 0, tamDungTu = 0, henGio = 0, lastTodo = 0;
  let elBtns = null, elGhi = null, elDtWrap = null, elDtTd = null, elDtGhi = null, elDtDung = null, elDtZoom = null;

  const z2 = (n) => String(n).padStart(2, "0");
  const tenFile = (duoi) => { const d = new Date(); return `ThuongDe_${d.getFullYear()}${z2(d.getMonth() + 1)}${z2(d.getDate())}_${z2(d.getHours())}${z2(d.getMinutes())}${z2(d.getSeconds())}.${duoi}`; };
  const dinhDangGio = (ms) => { const s = Math.floor(ms / 1000); return `${z2(Math.floor(s / 60))}:${z2(s % 60)}`; };

  function veNut() {
    if (elBtns) return;
    elBtns = document.createElement("div");
    elBtns.id = "td-btns";
    // Nút bấm chuột (Huy 27/11 "làm nút ghi và dừng, phóng to thu nhỏ được"): Thượng đế | − | mức zoom | + | ● Ghi | ■ Dừng
    elBtns.innerHTML = `<button type="button" data-td="god" title="Góc nhìn thượng đế — phím 0 (chỉ test1)">Thượng đế</button><button type="button" data-td="tru" title="Thu nhỏ (rộng hơn)">−</button><span class="td-muc" data-td="muc" title="Mức thu nhỏ hiện tại">×0.25</span><button type="button" data-td="cong" title="Phóng to (gần hơn)">+</button><button type="button" data-td="rec" title="Bắt đầu ghi hình — Ctrl+R (chỉ test1)">● Ghi</button><button type="button" data-td="dung" title="Dừng ghi + tải video — Ctrl+S (chỉ test1)">■ Dừng</button>`;
    elBtns.addEventListener("click", (e) => {
      const b = e.target.closest("[data-td]"); if (!b) return;
      const k = b.dataset.td;
      if (k === "god") bamNut();
      else if (k === "rec") bamNutGhiBat();
      else if (k === "dung") bamNutGhiDung();
      else if (k === "tru") doiZoomNut(-1);
      else if (k === "cong") doiZoomNut(1);
    });
    document.body.appendChild(elBtns);
    capNhatNut();
  }
  function goNut() {
    elBtns && elBtns.remove(); elBtns = null;
    elDtWrap && elDtWrap.remove(); elDtWrap = null;
    elDtTd = null; elDtGhi = null; elDtDung = null; elDtZoom = null;
  }
  function capNhatNut() {
    const muc = `×${GOD_ZOOMS[chiSo]}`;
    if (elBtns) {
      elBtns.querySelector('[data-td="god"]').classList.toggle("on", bat);
      const bRec = elBtns.querySelector('[data-td="rec"]');
      bRec.classList.toggle("on", !!rec);
      bRec.classList.toggle("dang", !!rec);
      bRec.textContent = rec ? "● Đang ghi" : "● Ghi";
      elBtns.querySelector('[data-td="dung"]').classList.toggle("mo", !rec);
      elBtns.querySelector('[data-td="muc"]').textContent = muc;
    }
    if (elDtTd) elDtTd.classList.toggle("on", bat);
    if (elDtGhi) { elDtGhi.classList.toggle("on", !!rec); elDtGhi.classList.toggle("dang", !!rec); elDtGhi.textContent = rec ? "● Đang ghi" : "● Ghi hình"; }
    if (elDtDung) elDtDung.classList.toggle("mo", !rec);
    if (elDtZoom) { const m = elDtZoom.querySelector(".dt-tdmuc"); if (m) m.textContent = muc; }
  }
  // Nút điện thoại: lớp cố định RIÊNG ở body (#td-btns-dt, z-index 9) — KHÔNG đặt trong #dt:
  // #dt và #jxhud cùng z-index 3, #jxhud đứng sau trong DOM nên vòng chiêu vẽ đè lên nút ở màn ngang.
  // Lớp riêng tự nhận click (không qua _bam của dienthoai.js), chỉ hiện khi body.dt.
  function veNutDt() {
    if (!elDtWrap) {
      elDtWrap = document.createElement("div");
      elDtWrap.id = "td-btns-dt";
      elDtWrap.addEventListener("click", (e) => {
        const b = e.target.closest("[data-tdd]"); if (!b) return;
        const k = b.dataset.tdd;
        if (k === "god") bamNut();
        else if (k === "rec") bamNutGhiBat();
        else if (k === "dung") bamNutGhiDung();
        else if (k === "tru") doiZoomNut(-1);
        else if (k === "cong") doiZoomNut(1);
      });
      document.body.appendChild(elDtWrap);
    }
    if (!elDtTd) {
      elDtTd = document.createElement("div");
      elDtTd.className = "dt-thuongde"; elDtTd.dataset.tdd = "god"; elDtTd.textContent = "Thượng đế";
      elDtWrap.appendChild(elDtTd);
    }
    if (!elDtGhi) {
      elDtGhi = document.createElement("div");
      elDtGhi.className = "dt-ghi"; elDtGhi.dataset.tdd = "rec"; elDtGhi.textContent = "● Ghi hình";
      elDtWrap.appendChild(elDtGhi);
    }
    if (!elDtDung) {
      elDtDung = document.createElement("div");
      elDtDung.className = "dt-dung"; elDtDung.dataset.tdd = "dung"; elDtDung.textContent = "■ Dừng";
      elDtWrap.appendChild(elDtDung);
    }
    if (!elDtZoom) {
      elDtZoom = document.createElement("div");
      elDtZoom.className = "dt-zoomrow";
      elDtZoom.innerHTML = `<div class="dt-tdtru" data-tdd="tru" title="Thu nhỏ">−</div><div class="dt-tdmuc">×0.25</div><div class="dt-tdcong" data-tdd="cong" title="Phóng to">+</div>`;
      elDtWrap.appendChild(elDtZoom);
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

  function hienChiThi() {
    if (elGhi) return;
    elGhi = document.createElement("div");
    elGhi.id = "td-ghi";
    elGhi.innerHTML = `<i></i><b>ĐANG GHI</b><span>00:00</span>`;
    document.body.appendChild(elGhi);
    henGio = setInterval(() => {
      if (!elGhi) return;
      const tam = rec && rec.state === "paused";
      const ms = (tam ? tamDungTu : performance.now()) - batDau - tamDungMs;
      elGhi.querySelector("span").textContent = dinhDangGio(Math.max(0, ms));
      elGhi.querySelector("b").textContent = tam ? "TẠM DỪNG" : "ĐANG GHI";
      elGhi.classList.toggle("tam", !!tam);
    }, 500);
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
  function batDauGhi() {
    if (!laTest1()) return false;
    if (rec) { api.msg("Đang ghi rồi — Ctrl+S để dừng"); return true; }
    if (typeof MediaRecorder === "undefined" || !api.cv.captureStream) { api.msg("Trình duyệt này không ghi hình được"); return true; }
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
    try {
      stream = api.cv.captureStream(30);
      rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 8000000 });
    } catch (e) { api.msg("Không bắt đầu ghi được: " + (e.message || e)); return true; }
    chunks = []; blobCuoi = null; batDau = performance.now(); tamDungMs = 0; tamDungTu = 0;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
      blobCuoi = blob; chunks = [];
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      rec = null; anChiThi(); capNhatNut();
      if (blob.size) taiFile(blob);
    };
    rec.start(500);
    hienChiThi(); capNhatNut();
    api.msg("Bắt đầu ghi hình — Ctrl+S để dừng, Ctrl+P tạm dừng");
    return true;
  }
  function dungGhi() {
    if (!rec) { api.msg("Chưa ghi gì cả"); return true; }
    if (rec.state === "paused") rec.resume();
    rec.stop();
    return true;
  }
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
  // Nút ● Ghi: chỉ bắt đầu — đang ghi thì không ghi chồng, báo rõ để bấm ■ Dừng
  function bamNutGhiBat() {
    if (!laTest1()) return;
    if (rec) { api.msg("Đang ghi rồi — bấm ■ Dừng để dừng"); return; }
    batDauGhi();
  }
  // Nút ■ Dừng: chỉ dừng + tải file — chưa ghi thì báo rõ, không lỗi
  function bamNutGhiDung() {
    if (!laTest1()) return;
    if (!rec) { api.msg("Chưa ghi gì cả"); return; }
    dungGhi();
  }
  // Nút +/−: chưa bật góc thượng đế thì bật lên (giữ nguyên nấc); đang bật thì đổi nấc như phím +/−
  function doiZoomNut(s) {
    if (!laTest1()) return;
    if (!bat) { batGod(); return; }
    chiSo = Math.max(0, Math.min(GOD_ZOOMS.length - 1, chiSo + (s > 0 ? -1 : 1)));
    api.setZoom(GOD_ZOOMS[chiSo]);
    api.msg(`Góc nhìn thượng đế ×${GOD_ZOOMS[chiSo]}`);
    capNhatNut();
  }

  return {
    laTest1,
    dangBat: () => bat,
    dangGhi: () => !!rec,
    layBlobGhi: () => blobCuoi,
    capNhat() {
      if (laTest1()) { veNut(); veNutDt(); }
      else { if (rec) dungGhi(); if (bat) tatGod(); goNut(); }
      capNhatNut();
    },
    thoat() {
      if (rec) { try { if (rec.state === "paused") rec.resume(); rec.stop(); } catch {} }
      if (bat) { bat = false; }
      anChiThi(); goNut();
    },
    bamNut, bamPhim: bamNut, bamNutGhi, bamNutGhiBat, bamNutGhiDung, doiZoomNut,
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
