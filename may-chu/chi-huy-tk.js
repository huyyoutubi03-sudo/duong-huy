// Bảng chỉ huy tổ đội Tống Kim (Huy lệnh 22:09/22:11/22:13/22:21 ngày 27/11/2026).
//   - Mỗi phe 5 đội × 17 acc bot, hỗn hợp đủ phái, chia rắn theo phái + sức để 2 phe điều nhau.
//   - Mỗi đội trấn giữ đúng 1 vị trí (neo); công/thủ rõ ràng theo lệnh; đổi lệnh thì cả đội chuyển cùng nhau.
//   - Giáo án tự động 3 công/2 thủ, thua dồn 4 công, thắng cuối trận 4 thủ; đội công thua -> đội thủ ứng cứu,
//     người sống sót rút về tập trung đúng vị trí thủ của đội ứng cứu; xoay tua để đội nào cũng được đánh.
//   - Cổng: đúng tên test1/test2 như camera (thuong-de.js TEN_DUOC_CAMERA) + tàng hình (tang-hinh.js DUOC_TANG_HINH).
//     test2 không phải admin nên KHÔNG đi qua đường tk.admin.
//   - Logic chỉ huy đặt ở đây; móc tối thiểu vào tong-kim.js (export vị trí + cờ thu) và npc-choi.js (1 điểm
//     đọc lệnh trong hdTkTick). Không động vào buocToi/buocToiTan/diemTan/tkDiDuoc (worker khác đã sửa).
"use strict";
const TK = () => require("./tong-kim");
const NK = () => require("./nhat-ky");

const DUOC = new Set(["test1", "test2"]);
const SO_DOI = 5;
const NEO_TEN = { soaiTa: "Nguyên Soái ta", traiTa: "Hậu doanh ta", tienTa: "Tiền tuyến ta", soaiDich: "Nguyên Soái địch", traiDich: "Hậu doanh địch", tienDich: "Tiền tuyến địch" };
const BK = { giu: 400, cong: 600, ungCuu: 600, rut: 300 }; // bán kính giao chiến quanh neo
// Giáo án mặc định theo số đội: 3 công / 2 thủ.
const GIAO_AN = [
  { cheDo: "cong", neo: "soaiDich" }, { cheDo: "cong", neo: "traiDich" }, { cheDo: "cong", neo: "tienDich" },
  { cheDo: "giu", neo: "soaiTa" }, { cheDo: "giu", neo: "traiTa" },
];
const QD_MS = 5000;        // nhịp quyết định chỉ huy (throttle — không tính mỗi nhịp phòng/bot)
const XOAY_MS = 180000;    // chu kỳ xoay tua công/thủ
const NGUONG_THUA = 0.3;   // đội công còn sống dưới 30% -> thua, cần ứng cứu
const NGUONG_CUU = 0.7;    // đội thủ còn sống từ 70% mới đi ứng cứu; đội thua sống lại 70% là tái lập
const NGUONG_DIEM = 500;   // thua/thắng hơn 500 điểm thì đổi giáo án (1 mạng ~75–150 điểm)
const TRUY_KHOE = 0.7;     // đội rượt còn sống từ 70% mới truy kích
const TIEP_TUYEN = { tienDich: "traiDich", traiDich: "soaiDich" }; // phòng tuyến tiếp theo theo hướng công (tên neo tương đối theo phe)

const loi = (msg, code) => { throw Object.assign(new Error(msg), { code: code || 400 }); };

let S = null; // trạng thái theo phòng: { mo, doi, byAcct, neoCache, lastQD, lastXoay, suKien }
const phong = () => { try { return TK()._thu.D; } catch { return null; } };
const sucCua = (m) => Math.max(1, Math.floor(+m.hpMax || 0) || ((m.snap && m.snap.lvl) | 0) * 1000 || 1);
// snap.fac là SỐ phái (phan-than.js chup: fac: h.fac), không có facKey — ánh xạ số -> khóa PHAI để nhóm đúng thứ tự phái.
const facCua = (m, PHAI) => {
  const s = (m && m.snap) || {};
  const f = s.facKey ?? s.fac ?? s.series;
  if (f == null) return "?";
  if (typeof f === "number") return (PHAI && PHAI[f]) || ("fac" + f);
  return String(f);
};

// Tọa độ neo (cache theo phòng — diemDong bốc ngẫu nhiên nên chỉ tính 1 lần).
function viTri(neo, phe, D) {
  const k = phe + "|" + neo;
  if (S.neoCache.has(k)) return S.neoCache.get(k);
  const T = TK()._thu;
  let p;
  if (neo === "soaiTa") p = T.viTriSoai(phe);
  else if (neo === "soaiDich") p = T.viTriSoai(1 - phe);
  else if (neo === "traiTa") p = D.trai[phe].slice();
  else if (neo === "traiDich") p = D.trai[1 - phe].slice();
  else if (neo === "tienTa") p = T.diemDong(phe);
  else if (neo === "tienDich") p = T.diemDong(1 - phe);
  else p = D.trai[phe].slice();
  p = [Math.round(+p[0] || 0), Math.round(+p[1] || 0)];
  S.neoCache.set(k, p);
  return p;
}

function taoDoi(phe, tv) {
  return tv.map((ds, id) => ({ id, phe, tv: ds.map((m) => m.tk), cheDo: GIAO_AN[id].cheDo, neo: GIAO_AN[id].neo, vai: { ...GIAO_AN[id] }, tay: false, danhGiay: 0, daDanh: false, trang: "auto", nhap: null, dangCuu: null, duoi: null, khoa: 1 }));
}

// Chia rắn: gom theo phái (thứ tự PHAI), trong phái xếp sức giảm dần, chia lần lượt theo dãy rắn 0..4..0.
function chiaDoi(D) {
  const PHAI = (TK()._thu && TK()._thu.PHAI) || [];
  const doi = [[], []], byAcct = new Map();
  for (const phe of [0, 1]) {
    const bots = [...D.nguoi.values()].filter((m) => m.bot && m.phe === phe);
    const nhom = new Map();
    for (const m of bots) { const f = String(facCua(m, PHAI)); if (!nhom.has(f)) nhom.set(f, []); nhom.get(f).push(m); }
    const thuTu = [...nhom.keys()].sort((a, b) => {
      const ia = PHAI.indexOf(a), ib = PHAI.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1; if (ib >= 0) return 1;
      return (nhom.get(b).length - nhom.get(a).length) || (a < b ? -1 : 1);
    });
    const ds = Array.from({ length: SO_DOI }, () => []);
    const day = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0];
    let k = 0;
    for (const f of thuTu) {
      const g = nhom.get(f).sort((a, b) => sucCua(b) - sucCua(a));
      for (const m of g) { ds[day[k % day.length]].push(m); k++; }
    }
    doi[phe] = taoDoi(phe, ds);
    for (const sq of doi[phe]) for (const tk of sq.tv) byAcct.set(tk, sq);
  }
  return { doi, byAcct };
}

function taoState(D) {
  const { doi, byAcct } = chiaDoi(D);
  return { mo: D.mo, doi, byAcct, neoCache: new Map(), lastQD: 0, lastXoay: 0, suKien: [] };
}

function damBao(D) {
  if (!D) return null;
  if (!S || S.mo !== D.mo) S = taoState(D);
  return S;
}

const songCua = (D, sq) => sq.tv.reduce((n, tk) => { const m = D.nguoi.get(tk); return n + (m && (m.hp | 0) > 0 ? 1 : 0); }, 0);
const key = (phe, id) => phe + "|" + id;

// Đổi lệnh 1 đội (tăng khoa để bot giãn xuất phát ở tầng npc-choi).
function datLenhSq(sq, cheDo, neo) {
  sq.cheDo = cheDo; sq.neo = neo; sq.khoa++;
}
function suKien(text) { S.suKien.push({ luc: Date.now(), text }); if (S.suKien.length > 20) S.suKien.shift(); }

// Xoay tua: đội công nhiều giờ đánh nhất đổi vai với đội thủ ít giờ đánh nhất (trừ đội tay/đang cứu).
function xoay(D, phe) {
  const ds = S.doi[phe];
  const cong = ds.filter((q) => q.cheDo === "cong" && !q.tay && q.trang === "auto");
  const thu = ds.filter((q) => q.cheDo === "giu" && !q.tay && q.trang === "auto");
  if (!cong.length || !thu.length) return false;
  const a = cong.reduce((x, q) => (q.danhGiay > x.danhGiay ? q : x), cong[0]);
  const b = thu.reduce((x, q) => (q.danhGiay < x.danhGiay ? q : x), thu[0]);
  const vA = a.vai; a.vai = b.vai; b.vai = vA; // xoay tua đổi VAI (giữ qua các nhịp quyết định), không chỉ đổi lệnh nhất thời
  datLenhSq(a, a.vai.cheDo, a.vai.neo); datLenhSq(b, b.vai.cheDo, b.vai.neo);
  suKien(`Xoay tua phe ${phe ? "Kim" : "Tống"}: đội ${a.id + 1} <-> đội ${b.id + 1}`);
  return true;
}

// Quyết định chỉ huy (throttle 5 giây/phòng). Trả về S.
function capNhat(D, t, buoc) {
  if (!S || S.mo !== D.mo) S = taoState(D);
  if (t - S.lastQD < QD_MS && !buoc) return S;
  const dt = S.lastQD ? Math.min(30, (t - S.lastQD) / 1000) : 0;
  S.lastQD = t;
  // Chưa khai chiến: chỉ chia lại khi danh sách bot vào đổi (giữ lệnh tay đã bấm trong lúc chờ).
  if (!D.batDau || D.ket) {
    if (!D.batDau && !D.ket) {
      const hien = new Set([...D.nguoi.values()].filter((m) => m.bot).map((m) => m.tk));
      const cu = new Set(S.byAcct.keys());
      if (hien.size !== cu.size || [...hien].some((tk) => !cu.has(tk))) { const { doi, byAcct } = chiaDoi(D); S.doi = doi; S.byAcct = byAcct; }
    }
    return S;
  }
  if (!S.lastXoay) S.lastXoay = t;
  // Giờ đánh + cờ đã đánh.
  for (const phe of [0, 1]) for (const sq of S.doi[phe]) {
    const song = songCua(D, sq), tong = sq.tv.length || 1;
    if (song / tong >= 0.5 && (sq.cheDo === "cong" || sq.cheDo === "ungCuu")) sq.daDanh = true;
    if (sq.cheDo === "cong" || sq.cheDo === "ungCuu") sq.danhGiay += dt;
  }
  // Tái lập: đội đang rút mà sống lại đủ 70% -> về giáo án; đội ứng cứu về vai mặc định.
  // Đội truy kích: địch tái lập đủ 70% thì dừng rượt về vai; địch bị quét sạch thì giữ phòng tuyến vừa chiếm làm vai mới.
  for (const phe of [0, 1]) for (const sq of S.doi[phe]) {
    if (sq.trang === "truy") {
      const dich = S.doi[1 - phe][sq.duoi];
      const tlD = dich ? songCua(D, dich) / Math.max(1, dich.tv.length) : 0;
      if (dich && tlD >= NGUONG_CUU) {
        sq.trang = "auto"; sq.duoi = null;
        datLenhSq(sq, sq.vai.cheDo, sq.vai.neo);
        suKien(`Đội ${sq.id + 1} phe ${phe ? "Kim" : "Tống"} dừng truy kích (địch tái lập), về ${NEO_TEN[sq.vai.neo]}`);
      } else if (!dich || tlD <= 0) {
        sq.vai = { cheDo: sq.cheDo, neo: sq.neo };
        sq.trang = "auto"; sq.duoi = null;
        suKien(`Đội ${sq.id + 1} phe ${phe ? "Kim" : "Tống"} chiếm ${NEO_TEN[sq.neo]}, giữ phòng tuyến`);
      }
      continue;
    }
    if (sq.trang !== "cuu") continue;
    const song = songCua(D, sq), tong = sq.tv.length || 1;
    if (song / tong < NGUONG_CUU) continue;
    const cuu = S.doi[phe][sq.nhap];
    sq.trang = "auto"; sq.nhap = null;
    datLenhSq(sq, sq.vai.cheDo, sq.vai.neo);
    if (cuu && cuu.dangCuu === sq.id) { cuu.dangCuu = null; cuu.trang = "auto"; datLenhSq(cuu, cuu.vai.cheDo, cuu.vai.neo); }
    suKien(`Đội ${sq.id + 1} phe ${phe ? "Kim" : "Tống"} tái lập, về giáo án`);
    xoay(D, phe);
  }
  // Thua đội -> ứng cứu + rút về.
  for (const phe of [0, 1]) {
    for (const sq of S.doi[phe]) {
      if ((sq.trang !== "auto" && sq.trang !== "truy") || sq.daDanh === false) continue;
      if (sq.cheDo !== "cong" && sq.cheDo !== "ungCuu") continue;
      const song = songCua(D, sq), tong = sq.tv.length || 1;
      if (song / tong >= NGUONG_THUA) continue;
      const ung = S.doi[phe].filter((q) => q.cheDo === "giu" && q.trang === "auto" && !q.tay && songCua(D, q) / Math.max(1, q.tv.length) >= NGUONG_CUU)
        .sort((a, b) => a.danhGiay - b.danhGiay)[0];
      if (!ung) continue; // không còn đội thủ đủ quân: giữ thủ, không ứng cứu
      const neoCuu = ung.neo; // neo thủ cũ của đội ứng cứu = điểm tập trung rút về
      ung.dangCuu = sq.id; datLenhSq(ung, "ungCuu", sq.neo); ung.trang = "ungCuu";
      sq.trang = "cuu"; sq.nhap = ung.id; sq.duoi = null; datLenhSq(sq, "rut", neoCuu);
      suKien(`Đội ${sq.id + 1} phe ${phe ? "Kim" : "Tống"} thua -> đội ${ung.id + 1} ứng cứu, người sống rút về ${NEO_TEN[neoCuu]}`);
    }
  }
  // Bên thắng rượt (Huy dặn 22:50): đội công thắng giao tranh -> CẢ ĐỘI truy kích có đội hình tới phòng tuyến
  // tiếp theo của địch rồi dừng giữ. Khác chạy lẻ: lệnh cấp đội, cả đội cùng đi, có điểm dừng cố định (neo),
  // không dí theo từng mục tiêu riêng. Mỗi phe tối đa 1 đội rượt mới mỗi nhịp quyết định.
  for (const phe of [0, 1]) {
    if (S.doi[phe].some((q) => q.trang === "truy")) continue;
    for (const sq of S.doi[phe]) {
      if (sq.trang !== "auto" || sq.tay || sq.daDanh === false) continue;
      if (sq.cheDo !== "cong") continue; // đội thủ thắng giao tranh thì GIỮ điểm, không rượt
      const song = songCua(D, sq), tong = sq.tv.length || 1;
      if (song / tong < TRUY_KHOE) continue;
      const tiep = TIEP_TUYEN[sq.neo];
      if (!tiep) continue; // đang ở sâu nhất (soaiDich): giữ, không rượt thêm
      let gan = null, ganD = Infinity;
      for (const e of S.doi[1 - phe]) {
        if (!e.daDanh) continue;
        const tl = songCua(D, e) / Math.max(1, e.tv.length);
        if (tl >= NGUONG_THUA) continue; // địch tan rã: còn sống <30% sau khi đã đánh
        const pa = viTri(sq.neo, phe, D), pb = viTri(e.neo, 1 - phe, D);
        const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
        if (d < ganD) { ganD = d; gan = e; }
      }
      if (!gan) continue;
      sq.trang = "truy"; sq.duoi = gan.id;
      datLenhSq(sq, "cong", tiep);
      suKien(`Đội ${sq.id + 1} phe ${phe ? "Kim" : "Tống"} thắng giao tranh -> truy kích tới ${NEO_TEN[tiep]}`);
      break;
    }
  }
  // Tự ứng biến theo điểm/giờ (chỉ đội tự động, không động đội tay/đang cứu).
  for (const phe of [0, 1]) {
    const diff = (D.diem[phe] | 0) - (D.diem[1 - phe] | 0);
    const con = Math.max(0, D.het - t);
    const ds = S.doi[phe];
    if (diff < -NGUONG_DIEM) {
      const thu = ds.filter((q) => q.cheDo === "giu" && !q.tay && q.trang === "auto").sort((a, b) => a.danhGiay - b.danhGiay)[0];
      if (thu) datLenhSq(thu, "cong", "tienDich");
    } else if (con < 300000 && diff > NGUONG_DIEM) {
      const cong = ds.filter((q) => q.cheDo === "cong" && !q.tay && q.trang === "auto").sort((a, b) => b.danhGiay - a.danhGiay)[0];
      if (cong) datLenhSq(cong, "giu", "soaiTa");
    } else {
      for (const sq of ds) {
        if (sq.tay || sq.trang !== "auto") continue;
        const g = sq.vai; // về VAI hiện tại của đội (đã xoay tua thì giữ vai mới, không về giáo án gốc)
        if (sq.cheDo !== g.cheDo || sq.neo !== g.neo) datLenhSq(sq, g.cheDo, g.neo);
      }
    }
  }
  // Xoay tua theo chu kỳ.
  if (t - S.lastXoay >= XOAY_MS) { S.lastXoay = t; for (const phe of [0, 1]) xoay(D, phe); }
  return S;
}

// Lệnh cho 1 bot (npc-choi gọi mỗi nhịp): tra cứu O(1). Trả null khi không có phòng/không thuộc đội nào.
function lenCho(acct, D, phe) {
  if (!D || D.loai !== "tran" || D.ket) return null;
  const st = damBao(D);
  capNhat(D, Date.now(), false);
  const sq = st.byAcct.get(acct);
  if (!sq) return null;
  // Bot chưa khai chiến: đứng chờ theo chỗ riêng của worker khác (không lệnh đội).
  if (!D.batDau) return null;
  return { doi: sq.id, cheDo: sq.cheDo, neo: viTri(sq.neo, phe, D), bk: BK[sq.cheDo] || 400, khoa: sq.khoa };
}

function xem() {
  const D = phong();
  if (!D || D.loai !== "tran") return { mo: false };
  const st = damBao(D);
  capNhat(D, Date.now(), false);
  const t = Date.now();
  const doi = [0, 1].map((phe) => st.doi[phe].map((sq) => ({
    id: sq.id, tv: sq.tv.map((tk) => { const m = D.nguoi.get(tk); return m ? m.ten : tk; }),
    song: songCua(D, sq), tong: sq.tv.length, cheDo: sq.cheDo, neo: sq.neo, neoTen: NEO_TEN[sq.neo] || sq.neo,
    tay: !!sq.tay, danhPhut: Math.round(sq.danhGiay / 6) / 10, trang: sq.trang, nhap: sq.nhap, duoi: sq.duoi != null ? sq.duoi : null,
  })));
  const botMay = [0, 1].map((phe) => [...D.bot.values()].filter((b) => b.phe === phe && !b.chet).length);
  return { mo: true, thu: !!D.thu, pha: D.ket ? "xong" : t < D.kc ? "bd" : "danh", diem: D.diem.slice(), het: D.het, kc: D.kc,
    doi, botMay, suKien: st.suKien.slice(-5) };
}

function lam(tk, b) {
  if (!DUOC.has(tk.ten)) loi("Chỉ test1/test2 mới điều khiển tổ đội Tống Kim được.", 403);
  b = b && typeof b === "object" ? b : {};
  const viec = String(b.viec || "xem");
  const D = phong();
  if (viec === "xem") return xem();
  if (!D || D.loai !== "tran") loi("Không có trận Tống Kim nào đang mở.");
  const st = damBao(D);
  if (viec === "chiaLai") {
    const { doi, byAcct } = chiaDoi(D);
    st.doi = doi; st.byAcct = byAcct; st.neoCache = new Map();
    NK().ghi("qt", tk.ten, null, "Chỉ huy Tống Kim: chia lại đội");
    return xem();
  }
  const phe = b.phe === 1 || b.phe === "1" ? 1 : b.phe === 0 || b.phe === "0" ? 0 : -1;
  const id = +b.doi;
  if (phe < 0 || !(id >= 0 && id < SO_DOI)) loi("Phe/đội không hợp lệ.");
  const sq = st.doi[phe][id];
  if (viec === "lenh") {
    const cheDo = String(b.lenh || "");
    if (!["cong", "giu", "rut"].includes(cheDo)) loi("Lệnh: cong | giu | rut.");
    let neo = String(b.neo || "");
    if (cheDo === "cong" && !["soaiDich", "traiDich", "tienDich"].includes(neo)) neo = "tienDich";
    if (cheDo === "giu" && !["soaiTa", "traiTa", "tienTa"].includes(neo)) neo = "soaiTa";
    if (cheDo === "rut") neo = "traiTa";
    sq.tay = true; sq.trang = "auto"; sq.nhap = null; sq.duoi = null;
    datLenhSq(sq, cheDo, neo);
    NK().ghi("qt", tk.ten, null, `Chỉ huy Tống Kim: phe ${phe ? "Kim" : "Tống"} đội ${id + 1} -> ${cheDo} (${NEO_TEN[neo]})`);
    return xem();
  }
  if (viec === "tuDong") {
    sq.tay = false; sq.trang = "auto"; sq.duoi = null;
    datLenhSq(sq, sq.vai.cheDo, sq.vai.neo);
    capNhat(D, Date.now(), true);
    return xem();
  }
  loi("Việc này không hợp lệ. Đừng bấm nữa.");
}

module.exports = { DUOC, lenCho, xem, lam, capNhat, _thu: { get S() { return S; }, chiaDoi, viTri, songCua } };
