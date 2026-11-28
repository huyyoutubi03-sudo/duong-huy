// Chuyển sinh (trùng sinh) — nhiệm vụ 4 bước, mỗi vòng đủ 14 ngày (THIET-KE.md §2.2, chốt Huy 20:17 ngày 26/11/2026).
// Mẫu: Dã Tẩu (may-chu/da-tau.js) — máy trạng thái trên nhân vật, trần đếm/ngày theo ngày giờ Việt Nam.
//   h.cs = { buoc (0 chưa nhận, 1 giết quái, 2 nộp hồn, 3 dấu Boss, 4 chờ nộp phí), vong (vòng đang làm = số lần đã chuyển sinh + 1),
//            quai, quaiNgay, hon, honNgay, dau, dauNgay, ngay (ngày giờ Việt Nam của các đếm trong ngày) }
//   h.reborn = số lần đã chuyển sinh (0–10; nhân vật cũ không có trường thì đọc bằng (h.reborn|0) = 0 — không vỡ).
// QUYẾT HUY 13:49 ngày 27/11/2026 (Q3): về CẤP 90 hết mọi vòng (thay cấp 1); TỐI ĐA 10 LẦN; mốc thưởng
// tính auto (+5%/vòng, +10 tiềm năng/vòng); bảng vòng tính theo công thức — vòng 1–3 đúng bảng đã chốt,
// vòng sau nối tiếp đúng nhịp tăng (quái +1.400, hồn +14, phí ×2 tới trần 200M), mỗi vòng vẫn đủ 14 ngày.
// GIẢ ĐỊNH GHI RÕ (Q4/Q5 đã kết luận — xem THUC-HIEN.md §1 Lệch 1/2/4 + §2 bảng Q1–Q8):
//   - Hồn "Linh Hồn Chiến" (qk:1001, thêm ở assets/data/ky-tran-cac.json) CHỈ rơi khi đang ở bước 2, 40%/con trùm/tinh anh (Huy chốt 06:59 ngày 27/11/2026, từ 20%), qua đúng
//     hàm roiDacBiet sẵn có (may-chu/do.js gietQuai gọi demGiet rồi roiDacBiet(1, BANG_HON, its) — bảng roiDacBiet/RDB gốc không có hồn này).
//   - "Không trong đội đang đánh boss" hiểu là: đang trong tổ đội mà có thành viên đứng ở bãi đang có Boss Hoàng Kim sống (boss-tg.json).
//   - Giữ cấp chiêu = nâng skMin (cấp cho không) lên đúng cấp chiêu đang có lúc chuyển sinh — đúng cơ chế sách/Đại Thành sẵn có: qua
//     luuNv/hamChieu/capChieu/fixPoints thì cấp chiêu giữ nguyên, điểm kỹ năng/tiềm năng cộng lại từ đầu, không cộng tay.
//   - Ủy thác (motCon trực tiếp, không qua gietQuai) không đếm bước 1 và không rơi hồn — như nhiệm vụ ngày lễ (nguon-su-kien demGiet).
//   - Nộp hồn chỉ tính món trong hành trang (không tính rương); hồn thừa giữ lại trong túi, nộp tiếp ngày sau trong trần ngày.
//   - Dấu Boss chỉ tính khi boss bị hạ (chet) — hết giờ rời đi (roi) không tính; siêu boss (thuongSk) không tính.
"use strict";
const DO = require("./do.js");
const N = DO.NOI;
const DL = require("./du-lieu.js"); // ghiDau: ghi dấu vào tệp tài khoản như boss-tg.js ghiVang

const loi = N.loi;
const Y = (t) => `<color=yellow>${t}<color>`;
const TOI_DA = 10; // Huy quyết 13:49 ngày 27/11/2026 (Q3): tối đa 10 lần (thay 3 vòng cũ)
// Bảng vòng — CÔNG THỨC, không ghi tay từng vòng (mốc thưởng tính auto, Q3):
//   quái = 7.000 + 1.400×(v-1), trần/ngày = 500 + 100×(v-1)  → 14 ngày/vòng, đúng mọi vòng
//   hồn  = 70 + 14×(v-1),    trần/ngày = 5 + (v-1)          → 14 ngày/vòng, đúng mọi vòng
//   dấu = 14, trần/ngày = 1                                  → 14 ngày/vòng
//   phí  = 5M × 2^(v-1), TRẦN 200M (vòng 7–10 giữ 200M — phí ×2 mãi tới 2,56 tỷ thì không ai nộp nổi,
//          vượt xa TIEN_MAX của engine; phí là hố rút tiền, không phải cửa thời gian)
// Vòng 1–3 ra đúng bảng đã chốt (7.000/8.400/9.800 quái; 70/84/98 hồn; 5M/10M/20M).
const muc = (vong) => {
  const v = Math.max(1, Math.min(TOI_DA, vong | 0));
  return {
    quai: 7000 + 1400 * (v - 1), tranQuai: 500 + 100 * (v - 1),
    hon: 70 + 14 * (v - 1), tranHon: 5 + (v - 1),
    dau: 14, tranDau: 1, phi: Math.min(200000000, 5000000 * 2 ** (v - 1)),
  };
};
const VONG = Array.from({ length: TOI_DA }, (_, i) => muc(i + 1)); // giữ dạng bảng cho code ngoài đọc (p2-probe)
const HON = "qk:1001"; // Linh Hồn Chiến (assets/data/ky-tran-cac.json — món mới của đợt này, dung: null, xếp chồng như Kỳ Trân Các)
const BANG_HON = { [HON]: 0.4 }; // 40%/con — 1 lượt roiDacBiet, tối đa 1 hồn/con (Huy chốt 40% lúc 06:59 ngày 27/11/2026, từ 20%)
const THUONG_PCT = 5, TIEM_NANG = 10; // mỗi lần: +5% sinh lực/nội lực/sát thương (world.js bonus), +10 tiềm năng tự do (tiemNangThem)
// 4 kiểu vòng Tứ Linh — chọn lúc xác nhận chuyển sinh (Huy chốt 16:16 ngày 27/11/2026): mỗi lần được chọn lại;
// lưu h.vongKieu (mặc định "long"), client vẽ theo VONG_KIEU (world.js), người khác xem qua p.vk (the-gioi.js).
const KIEU_VONG = [["Long (lam)", "long"], ["Lân (vàng)", "lan"], ["Quy (xanh lục)", "quy"], ["Phụng (đỏ tím)", "phung"]];
const KIEU_HOP_LE = (k) => (KIEU_VONG.some(([, ma]) => ma === k) ? k : "long");

// Đọc trạng thái, KHÔNG tạo mới (giết quái của người chưa nhận nhiệm vụ không được làm phình nhân vật).
const lay = (h) => (h && h.cs && typeof h.cs === "object" ? h.cs : null);
function tao(h) {
  const D = lay(h) || { buoc: 0 };
  h.cs = D;
  D.buoc = D.buoc | 0; D.vong = Math.max(1, D.vong | 0 || (h.reborn | 0) + 1);
  for (const k of ["quai", "quaiNgay", "hon", "honNgay", "dau", "dauNgay"]) D[k] = D[k] | 0;
  return D;
}
function ngayMoi(D) { // sang ngày mới (giờ Việt Nam) thì đếm trong ngày lại từ đầu — mẫu da-tau.js ngayMoi
  const d = N.ngayVN(Date.now());
  if (D.ngay !== d) { D.ngay = d; D.quaiNgay = 0; D.honNgay = 0; D.dauNgay = 0; }
}
const say = (text, opts) => ({ say: { text, opts } });
const KET = [["Kết thúc", null]];

function tienDo(h, D) {
  const M = muc(D.vong);
  return [`Vòng ${Y(D.vong)} — giết quái ngang cấp: ${Y(`${D.quai}/${M.quai}`)} (hôm nay ${D.quaiNgay}/${M.tranQuai}).`,
    `Linh Hồn Chiến: ${Y(`${D.hon}/${M.hon}`)} (hôm nay ${D.honNgay}/${M.tranHon}).`,
    `Dấu ấn Boss Hoàng Kim: ${Y(`${D.dau}/${M.dau}`)} (hôm nay ${D.dauNgay}/${M.tranDau}).`,
    `Phí chuyển sinh: ${Y(N.tien(M.phi))}.`];
}
function khung(h, them) {
  const D = lay(h);
  if (!D || !D.buoc) {
    const rb = h.reborn | 0;
    if (rb >= TOI_DA) return say(`Ngươi đã chuyển sinh đủ ${Y(TOI_DA + " lần")} rồi. Không còn vòng nào nữa đâu — lo mà luyện tiếp đi.`, KET);
    const M = muc(rb + 1);
    return say(`Ngươi muốn lột xác làm lại từ đầu? Ta nói trước, không có đường lui.<enter>` +
      `Vòng ${Y(rb + 1)}: giết ${Y(M.quai + " quái")} ngang cấp (mỗi ngày tính tối đa ${Y(M.tranQuai)}), nộp ${Y(M.hon + " Linh Hồn Chiến")} (mỗi ngày tối đa ${Y(M.tranHon)}), lấy ${Y(M.dau + " dấu")} Boss Hoàng Kim (mỗi ngày ${Y("1 dấu")}), rồi nộp ${Y(N.tien(M.phi))}.<enter>` +
      `Xong thì về cấp 90, giữ phái, giữ đồ, giữ tiền. Mỗi lần chuyển sinh: sinh lực, nội lực, sát thương ${Y("+5%")}, thêm ${Y(TIEM_NANG + " điểm tiềm năng")} tự do.<enter>` +
      `Đủ ${Y("14 ngày")} mới xong — lười thì đừng nhận, nhận rồi thì đừng có kêu.`,
      [[`Nhận chuyển sinh vòng ${rb + 1}`, "nhan"], ["Xem kỹ từng bước", "xem"], ...KET]);
  }
  ngayMoi(D);
  const M = muc(D.vong), dong = tienDo(h, D);
  if (D.buoc === 1) dong.push(`Giết quái ngang cấp ngươi (chênh tối đa 9 cấp) mới tính. Hôm nay đủ ${M.tranQuai} con thì mai đánh tiếp.`);
  else if (D.buoc === 2) dong.push(`Trùm và tinh anh rơi Linh Hồn Chiến — nộp cho ta, mỗi ngày ta chỉ nhận ${M.tranHon} hồn.`);
  else if (D.buoc === 3) dong.push(`Đánh Boss Hoàng Kim có sát thương mới được dấu — mỗi ngày ${M.tranDau} dấu, đừng có đứng xem.`);
  else if (D.buoc >= 4) dong.push(`Đủ hết rồi. Nộp ${Y(N.tien(M.phi))} là ta cho ngươi lột xác ngay.`);
  const opts = D.buoc === 2 ? [["Nộp Linh Hồn Chiến", "nop"], ...KET]
    : D.buoc >= 4 ? [...KIEU_VONG.map(([ten, ma]) => [`Nộp ${N.tien(M.phi)} mà chuyển sinh — vòng ${ten}`, `xacNhan:${ma}`]), ...KET]
    : [["Xem kỹ từng bước", "xem"], ...KET];
  return say((them ? them + "<enter>" : "") + dong.join("<enter>"), opts);
}

// ---------- điều kiện mở ----------
function dangDanhBoss(ten) { // trong tổ đội, có thành viên đứng ở bãi đang có Boss Hoàng Kim sống (boss-tg.json)
  try {
    const TD = require("./to-doi"), TG = require("./the-gioi");
    const d = TD.thanhVien(ten);
    if (!d || d.tv.length < 2) return false;
    const BTG = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "..", "assets", "data", "boss-tg.json"), "utf8"));
    const baiBoss = new Set([...(BTG.ds || []).map((b) => b.bai), ...(BTG.cho || []).map((c) => c.bai)]);
    return d.tv.some((tk) => { const p = TG.dangChoi(tk); return p && baiBoss.has(p.zone); });
  } catch { return false; } // tra không được thì không chặn lén — như các móc nạp lúc dùng khác
}

function nhan(h, key) {
  const D = tao(h);
  if (D.buoc) return khung(h);
  if ((h.reborn | 0) >= TOI_DA) loi(`Ngươi đã chuyển sinh đủ ${TOI_DA} lần rồi. Còn đòi gì nữa?`);
  if ((h.lvl | 0) < 200) loi(`Cấp ${Y("200")} mới chuyển sinh được. Ngươi mới cấp ${h.lvl | 0} — luyện thêm đi, đừng có mơ.`);
  if (h.fac == null) loi("Chưa bái nhập môn phái thì chuyển sinh cái gì? Đi bái nhập trước đi, rồi hãy quay lại.");
  const ten = String(key || "").split("|")[0];
  if (ten && dangDanhBoss(ten)) loi("Đội ngươi đang đánh Boss Hoàng Kim — xong trận rồi hãy tới. Đừng có bỏ đội giữa chừng.");
  Object.assign(D, { buoc: 1, vong: (h.reborn | 0) + 1, quai: 0, quaiNgay: 0, hon: 0, honNgay: 0, dau: 0, dauNgay: 0 });
  ngayMoi(D);
  return { ...khung(h, `Nhận rồi thì làm cho tới. Vòng ${Y(D.vong)} — giết quái ngang cấp trước đi.`), tin: [`Nhận nhiệm vụ chuyển sinh vòng ${D.vong}.`] };
}

// ---------- giết quái (do.js gietQuai gọi — như minh-chu.js giet / nguon-su-kien.js demGiet) ----------
// -> { tin } (câu báo tiến độ) | { roiHon: 1 } (bước 2, trùm/tinh anh: do.js roiDacBiet 40%) | null
function demGiet(h, info) {
  const D = lay(h); if (!D) return null;
  const boss = !!(info && info.boss), ta = !!(info && info.ta);
  if (D.buoc === 2) return boss || ta ? { roiHon: 1 } : null;
  if (D.buoc !== 1) return null;
  ngayMoi(D);
  const M = muc(D.vong);
  if (Math.abs((info.L | 0) - (h.lvl || 1)) > 9) return null; // ngang cấp ±9 cấp mới tính
  if (D.quai >= M.quai || D.quaiNgay >= M.tranQuai) return null; // đủ tổng / đủ trần ngày: không tính thêm
  D.quai++; D.quaiNgay++;
  if (D.quai >= M.quai) { D.buoc = 2; return { tin: `Chuyển sinh: đủ ${M.quai} quái ngang cấp rồi. Đi đánh trùm, tinh anh mà lấy Linh Hồn Chiến về đây.` }; }
  return D.quai % 100 === 0 ? { tin: `Chuyển sinh: giết quái ngang cấp ${D.quai}/${M.quai} (hôm nay ${D.quaiNgay}/${M.tranQuai}).` } : null;
}

// ---------- nộp hồn (bước 2) ----------
const demHon = (h) => (h.bag || []).reduce((t, it) => t + (it && it.k === HON ? (it.n | 0) || 1 : 0), 0);
function nop(h) {
  const D = lay(h); if (!D || D.buoc !== 2) return khung(h);
  ngayMoi(D);
  const M = muc(D.vong), con = M.hon - D.hon;
  if (con <= 0) { D.buoc = 3; return khung(h); }
  const ngayCon = M.tranHon - D.honNgay;
  if (ngayCon <= 0) return say(`Hôm nay ta đã nhận đủ ${Y(M.tranHon + " hồn")} rồi. Mai mang tới, đừng có lải nhải.`, KET);
  const co = demHon(h);
  if (!co) return say("Trong hành trang không có Linh Hồn Chiến nào cả. Đi đánh trùm, tinh anh mà lấy — đừng có tới tay không.", KET);
  let layN = Math.min(con, ngayCon, co), rest = layN;
  h.bag = (h.bag || []).filter((it) => {
    if (!it || it.k !== HON || rest <= 0) return true;
    const n = (it.n | 0) || 1;
    if (n <= rest) { rest -= n; return false; }
    it.n = n - rest; rest = 0; return true;
  });
  D.hon += layN; D.honNgay += layN;
  const tin = [`Nộp ${layN} Linh Hồn Chiến (${D.hon}/${M.hon}).`];
  if (D.hon >= M.hon) { D.buoc = 3; tin.push("Đủ hồn rồi. Đi đánh Boss Hoàng Kim mà lấy dấu."); }
  return { ...khung(h, `Ta nhận ${Y(layN + " Linh Hồn Chiến")}.`), tin };
}

// ---------- dấu Boss (boss-tg.js chet gọi — như ghiVang) ----------
// -> 1 nếu ghi được dấu, 0 nếu không (chưa tới bước 3, đủ trần ngày, không tìm thấy nhân vật)
function ghiDau(ten, tenNv) {
  try {
    const acc = DL.docTk(ten);
    const h = acc && Array.isArray(acc.nv) ? acc.nv.find((n) => n && n.name === tenNv) : null;
    if (!h) return 0;
    const D = lay(h); if (!D || D.buoc !== 3) return 0;
    ngayMoi(D);
    const M = muc(D.vong);
    if (D.dau >= M.dau || D.dauNgay >= M.tranDau) return 0;
    D.dau++; D.dauNgay++;
    if (D.dau >= M.dau) D.buoc = 4;
    DL.ghiTk(acc);
    return 1;
  } catch (e) { console.error("Chuyển sinh — dấu Boss:", e.message); return 0; }
}

// ---------- chuyển sinh (bước 4) ----------
function lamChuyenSinh(h, D) {
  const M = muc(D.vong);
  // Giữ cấp chiêu: nâng skMin (cấp cho không) lên đúng cấp chiêu đang có — cơ chế sách/Đại Thành sẵn có.
  // Qua luuNv: diemDaDung không tính phần skMin -> không bị xóa hết; hamChieu/capChieu giữ sàn skMin; fixPoints cộng lại điểm từ đầu.
  const min = (h.skMin = { ...(h.skMin || {}) });
  for (const [id, v] of Object.entries(h.skills || {})) if (!DO.laLuyen(id)) min[id] = Math.max(min[id] | 0, v | 0);
  h.lvl = 90; h.exp = 0; // Q3: về cấp 90 hết mọi vòng (không về cấp 1 nữa)
  h.reborn = Math.min(TOI_DA, (h.reborn | 0) + 1);
  h.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
  h.pts = null; h.skPts = null; // fixPoints (client) tính lại: 5 điểm tiềm năng/cấp + tiemNangThem, 1 điểm kỹ năng/cấp + mt
  h.tiemNangThem = (h.tiemNangThem | 0) + TIEM_NANG;
  // Giữ nguyên: phái (fac), giới tính, hệ, đồ mặc + túi, tiền/Xu, bang hội, danh hiệu, sách đã đọc (books), độ luyện (luyen), mt/tt.
  h.cs = { buoc: 0, vong: h.reborn + 1, quai: 0, quaiNgay: 0, hon: 0, honNgay: 0, dau: 0, dauNgay: 0, ngay: N.ngayVN(Date.now()) };
  return h.reborn;
}
function xacNhan(h, kieu) {
  const D = lay(h); if (!D || D.buoc < 4) return khung(h);
  ngayMoi(D);
  const M = muc(D.vong);
  if (D.quai < M.quai || D.hon < M.hon || D.dau < M.dau) return khung(h, "Chưa đủ đâu — làm cho xong 3 bước rồi hãy tới.");
  if ((h.gold | 0) < M.phi) loi(`Thiếu tiền rồi. Cần ${N.tien(M.phi)}, ngươi chỉ có ${N.tien(h.gold | 0)} — đi kiếm đủ rồi hãy quay lại.`);
  h.gold -= M.phi;
  h.vongKieu = KIEU_HOP_LE(kieu); // kiểu vòng lần này — bền theo nhân vật (api.js giữ trường, nvCua đồng bộ client)
  const lan = lamChuyenSinh(h, D);
  const mp = DO.myPhamChuyenSinh(h, lan); // mỹ phẩm P4 (điểm móc 4.5): lần 1 bộ theo phái, lần 2 vòng sáng, lần 3 vũ khí sáng
  return { ...khung(h, `Xong. Từ nay ngươi quay về cấp 90, nhưng mang dấu ${Y("×" + lan)} trên đầu.`),
    chuyenSinh: lan, vongKieu: h.vongKieu,
    ...(mp ? { myPham: mp } : {}),
    tin: [`Chuyển sinh lần ${lan}: về cấp 90, giữ phái/đồ/tiền, +${THUONG_PCT}% sinh lực/nội lực/sát thương, +${TIEM_NANG} điểm tiềm năng tự do.`, ...(mp ? [`Thưởng mỹ phẩm: ${mp.ten} (chỉ ngoại hình, 0 chỉ số). Mở khung Nhân vật (F3) → Mỹ phẩm để chọn.`] : [])] };
}

function xem(h) {
  const D = lay(h), vong = D ? D.vong : (h.reborn | 0) + 1, M = muc(vong);
  return { talk: [
    `Chuyển sinh là lột xác làm lại từ đầu. Về cấp 90, cày lại lên 200 — nhưng mang theo dấu của vòng trước. Không có đường lui, nghe rõ chưa?`,
    `Bước 1 — giết ${M.quai} quái ngang cấp (chênh tối đa 9 cấp). Mỗi ngày ta chỉ tính ${M.tranQuai} con. Đủ 14 ngày mới xong bước này, lười thì đừng nhận.`,
    `Bước 2 — nộp ${M.hon} Linh Hồn Chiến. Trùm và tinh anh rơi, mỗi con có 40% ra 1 hồn. Mỗi ngày ta chỉ nhận ${M.tranHon} hồn — hồn thừa cứ giữ trong túi, mai nộp tiếp.`,
    `Bước 3 — lấy ${M.dau} dấu ấn Boss Hoàng Kim. Đánh boss có sát thương mới được dấu, mỗi ngày 1 dấu. Đứng xem thì không có gì đâu.`,
    `Bước 4 — nộp ${N.tien(M.phi)} rồi lột xác. Mỗi lần: sinh lực, nội lực, sát thương +${THUONG_PCT}%, thêm ${TIEM_NANG} điểm tiềm năng tự do. Tối đa ${TOI_DA} lần.`,
  ] };
}

// b.viec: "mo" | "nhan" | "nop" | "xacNhan" | "xacNhan:<kieu>" | "xem" — mẫu da-tau.js lam / thuong-cap.js lam
function lam(h, b, key) {
  const [viec, tham] = String((b && b.viec) || "mo").split(":");
  if (viec === "nhan") return nhan(h, key);
  if (viec === "nop") return nop(h);
  if (viec === "xacNhan") return xacNhan(h, tham);
  if (viec === "xem") return xem(h);
  if (viec === "mo") return khung(h);
  loi("Không có việc này. Đừng bấm nữa.");
}

// Một dòng cho bảng nhiệm vụ / nhịp (api.js nvCua) — mẫu da-tau.js tomTat
const tomTat = (h) => {
  const D = lay(h); if (!D || !D.buoc) return null;
  const M = muc(D.vong);
  return D.buoc === 1 ? `Chuyển sinh vòng ${D.vong}: quái ${D.quai}/${M.quai}`
    : D.buoc === 2 ? `Chuyển sinh vòng ${D.vong}: hồn ${D.hon}/${M.hon}`
    : D.buoc === 3 ? `Chuyển sinh vòng ${D.vong}: dấu Boss ${D.dau}/${M.dau}`
    : `Chuyển sinh vòng ${D.vong}: về Lễ quan nộp phí`;
};

module.exports = { lam, tomTat, demGiet, ghiDau, HON, BANG_HON, VONG, TOI_DA, THUONG_PCT, TIEM_NANG, KIEU_VONG };
