// Nhập mã MAXPING cho cả dàn bot để lên chuyển sinh 9 (Huy lệnh tối 28/11/2026).
//
// CHỈ chạy khi máy chủ ĐÃ DỪNG. Cách chạy (Railway console, sau khi eval mise):
//   node may-chu/nhap-maxping-bot.js sao-luu
//   node may-chu/nhap-maxping-bot.js thu-kho                       (mô phỏng trên bản sao tạm — không sửa gì)
//   node may-chu/nhap-maxping-bot.js nhap                         (kiểm tra trước, chưa sửa gì)
//   node may-chu/nhap-maxping-bot.js nhap --chay-that
//   node may-chu/nhap-maxping-bot.js khoi-phuc <thu-muc-sao-luu> --chay-that
// Cờ thêm: --gom-da-9 : nhập cả bot đã chuyển sinh 9 (mặc định bỏ qua — chỉ lấy chuyển sinh 9,
//   bot đã 9 không cần mã cho mục tiêu này, nhập chỉ thêm tiền/Xu/đồ).
//
// NGUYÊN TẮC AN TOÀN (đọc kỹ trước khi chạy):
// - Dùng đúng hàm thật MQ.nhap() (may-chu/ma-qua.js) — cùng đường người chơi nhập ở Lễ quan.
//   Mỗi bot chỉ nhập 1 lần: lượt dùng ghi bền trong ma-qua.json (dung[] theo tài khoản + tên
//   nhân vật); bot đã có lượt thì BỎ QUA, không gọi nhap() lại — vì nhập LẠI vẫn cấp thêm bộ đồ
//   + bộ đồ Hoàng Kim mới (chỉ tiền/Xu bị chặn 0), gọi 2 lần là đúc đồ trùng.
// - Ghi file tài khoản NGAY sau mỗi bot nhập xong (cùng thứ tự đường người chơi: nhap rồi ghiTk).
//   Nếu nhap() lỗi (túi đầy, chưa vào phái...) thì KHÔNG ghi file bot đó, không ghi lượt dùng —
//   chạy lại sau khi dọn túi vẫn an toàn.
// - Bắt buộc có bản sao lưu + manifest khớp md5 (kể cả ma-qua.json) mới được chạy thật, như
//   migration-bot-chuyen-sinh-9.js — để luu() của máy chủ đang chạy không ghi đè lặng.
// - KHÔNG tự tạo mục mã MAXPING: mục mã phải do quản trị tạo sẵn ở F10 (tuDong, exp...).
//   Không thấy / không phải mã chung / hết hạn thì DỪNG, không tự bịa.
// - Không đụng acc test1/test2/test3/test4/test5 — chỉ đúng 170 tài khoản trong npc-choi-config.json.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { spawnSync } = require("child_process");
const D = require("./du-lieu.js");
const DO = require("./do.js");
const MQ = require("./ma-qua.js");

const ROOT = process.env.VL_DU_LIEU || path.join(__dirname, "..", "du-lieu");
const TK = path.join(ROOT, "tai-khoan");
const MA_FILE = path.join(ROOT, "ma-qua.json");
const CFG_PATH = process.env.VL_NPC_CHOI_CONFIG || path.join(__dirname, "npc-choi-config.json");
const CFG = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
const ACCTS = (CFG.bots || []).map((b) => b.acct);
const HK = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "data", "do-hoang-kim.json"), "utf8")).items || {}; } catch { return {}; } })();

const md5 = (f) => crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
const lenh = process.argv[2];
const chayThat = process.argv.includes("--chay-that");
const gomDa9 = process.argv.includes("--gom-da-9");
const tam = process.argv.includes("--tam"); // chạy trên bản sao tạm (thu-kho) — bỏ qua yêu cầu sao lưu
const argThuMuc = process.argv.slice(3).find((a) => !a.startsWith("--"));

// Số món Hoàng Kim mã cấp cho 1 bot (đúng điều kiện boDoHK trong ma-qua.js: vũ khí theo nhánh + t 2..9).
function demHK(cfgBot) {
  const fac = +cfgBot.fac, tVK = fac === 2 ? 1 : 0, pVK = fac === 2 ? cfgBot.eqt - 100 : cfgBot.eqt;
  let n = 0;
  for (const g of Object.values(HK)) {
    if (!g || g.fac !== fac || !g.pack) continue;
    const { t, p } = g.pack;
    if ((t === tVK && p === pVK) || (t >= 2 && t <= 9)) n++;
  }
  return n;
}
// Chỗ túi cần thêm: bộ đồ theo phái 12 món không xếp chồng + 2 chồng sách + bộ HK.
const CHO_CAN = (cfgBot) => 12 + 2 + demHK(cfgBot);

function docMaQuaTho() {
  try { const j = JSON.parse(fs.readFileSync(MA_FILE, "utf8")); return j && j.ma && typeof j.ma === "object" ? j : null; }
  catch { return null; }
}
function nhanVat(acc, cfgBot) {
  const h = acc && Array.isArray(acc.nv) ? acc.nv[0] : null;
  if (!h) return { loi: "không có nhân vật ô 1" };
  if (h.name !== cfgBot.ten || String(h.fac) !== String(cfgBot.fac)) return { loi: `nhân vật khác (${h.name}, fac ${h.fac}) — không ghi đè` };
  return { h };
}

// Lượt 1 — chỉ đọc: lỗi cứng dừng toàn bộ, còn lại phân loại bỏ qua / làm được.
function kiemTra() {
  const loi = [], lam = [], boQua = [];
  const j = docMaQuaTho();
  if (!j) { loi.push("không đọc được ma-qua.json — mục mã MAXPING phải có sẵn, không tự tạo"); return { loi, lam, boQua, muc: null }; }
  const muc = j.ma.MAXPING;
  if (!muc) loi.push("không có mục mã MAXPING trong ma-qua.json — quản trị tạo ở F10 trước, không tự tạo");
  else {
    if (!(muc.qua && muc.qua.tuDong)) loi.push("mục MAXPING không phải mã chung (thiếu qua.tuDong) — dừng lại");
    if (muc.tat) loi.push("mục MAXPING đang bị tắt");
    if (muc.het && Date.now() > muc.het) loi.push("mục MAXPING đã hết hạn");
  }
  const dung = new Set((muc && Array.isArray(muc.dung) ? muc.dung : []).map((d) => `${d.tk}|${d.nv}`));
  for (const cfgBot of CFG.bots || []) {
    const f = path.join(TK, cfgBot.acct + ".json");
    if (!fs.existsSync(f)) { loi.push(`${cfgBot.acct}: thiếu file tài khoản`); continue; }
    const acc = D.docTk(cfgBot.acct);
    if (!acc) { loi.push(`${cfgBot.acct}: không đọc được file`); continue; }
    const { h, loi: loiNv } = nhanVat(acc, cfgBot);
    if (loiNv) { loi.push(`${cfgBot.acct}: ${loiNv}`); continue; }
    const rb = h.reborn | 0, oTrong = DO.NOI.oTrong(h);
    const co = { cfgBot, acc, h, rb, lvl: h.lvl | 0, gold: h.gold | 0, xu: h.xu | 0, oTrong, can: CHO_CAN(cfgBot) };
    if (dung.has(`${cfgBot.acct}|${h.name}`)) { boQua.push({ ...co, lyDo: "đã có lượt dùng MAXPING trong ma-qua.json" }); continue; }
    if (rb >= 10) { boQua.push({ ...co, lyDo: `đã chuyển sinh ${rb} — không cần mã` }); continue; }
    if (rb >= 9 && !gomDa9) { boQua.push({ ...co, lyDo: "đã chuyển sinh 9 — bỏ qua (dùng --gom-da-9 để nhập thêm)" }); continue; }
    if (h.fac == null) { boQua.push({ ...co, lyDo: "chưa vào phái (fac null) — mã chung từ chối" }); continue; }
    if (oTrong < co.can) { boQua.push({ ...co, lyDo: `túi chỉ còn ${oTrong} chỗ, cần ${co.can} — dọn túi rồi chạy lại` }); continue; }
    lam.push(co);
  }
  return { loi, lam, boQua, muc: muc ? { tuDong: !!(muc.qua && muc.qua.tuDong), exp: (muc.qua && muc.qua.exp) || 0, tienLuu: (muc.qua && muc.qua.tien) || 0, xuLuu: (muc.qua && muc.qua.xu) || 0, toiDa: muc.toiDa | 0, het: muc.het || 0, dung: (muc.dung || []).length } : null };
}

function danhSach() {
  const co = [], thieu = [];
  for (const a of ACCTS) {
    const f = path.join(TK, a + ".json");
    if (fs.existsSync(f)) co.push({ acct: a, file: f, bytes: fs.statSync(f).size, md5: md5(f) });
    else thieu.push(a);
  }
  return { co, thieu };
}
function thuMucMoi(nhan) {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return path.join(ROOT, `${nhan}-${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`);
}
function thuMucMoiNhat(nhan) {
  const ds = fs.readdirSync(ROOT).filter((n) => n.startsWith(nhan + "-")).sort();
  return ds.length ? path.join(ROOT, ds[ds.length - 1]) : null;
}
function kiemCauHinh() {
  if (!ACCTS.length) { console.error("CẤU HÌNH RỖNG: không có bot nào — kiểm tra npc-choi-config.json."); process.exit(1); }
  if (!process.env.VL_NPC_CHOI_CONFIG && ACCTS.length !== 170) { console.error(`CẤU HÌNH LỆCH: ${ACCTS.length} bot (cần đúng 170) — dừng lại.`); process.exit(1); }
}
function kiemSaoLuu(dir) {
  if (!dir || !fs.existsSync(path.join(dir, "manifest.json"))) { console.error("KHÔNG THẤY bản sao lưu (manifest.json) — chạy sao-luu trước. Dừng lại."); process.exit(1); }
  const man = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const { co, thieu } = danhSach();
  let khop = 0;
  for (const m of man.files) {
    const hien = co.find((c) => c.acct === m.acct);
    if (hien && hien.md5 === m.md5) khop++;
    else console.log(`  LỆCH/KHÁC: ${m.acct} (sao lưu md5 ${m.md5}, hiện tại ${hien ? hien.md5 : "không có file"})`);
  }
  if (man.maQua) {
    const hien = fs.existsSync(MA_FILE) ? md5(MA_FILE) : null;
    if (hien !== man.maQua.md5) console.log(`  LỆCH/KHÁC: ma-qua.json (sao lưu md5 ${man.maQua.md5}, hiện tại ${hien || "không có file"})`);
    else khop++;
  }
  const tong = man.files.length + (man.maQua ? 1 : 0);
  console.log(`bản sao lưu: ${dir}. khớp md5: ${khop}/${tong}`);
  if (thieu.length) { console.error(`Thiếu file: ${thieu.join(", ")} — dừng lại.`); process.exit(1); }
  if (khop !== tong) { console.error("KHÔNG ĐỦ file khớp sao lưu — máy chủ có thể đang chạy (luu() ghi đè). DỪNG MÁY CHỦ, sao-luu lại, rồi chạy lại."); process.exit(1); }
  return man;
}

// Áp dụng cho 1 bot: gọi đúng hàm thật, ghi file ngay, đọc lại kiểm chứng.
function nhapMot(co) {
  const { cfgBot, acc, h } = co;
  const truoc = { rb: h.reborn | 0, lvl: h.lvl | 0, gold: h.gold | 0, xu: h.xu | 0, tui: (h.bag || []).length };
  const r = MQ.nhap(acc, h, "MAXPING", cfgBot.eqt); // acc làm tk ({ten} = tên tài khoản)
  D.ghiTk(acc);
  const sau = D.docTk(cfgBot.acct), hSau = sau && sau.nv && sau.nv[0];
  if (!hSau) throw new Error("đọc lại thất bại sau khi ghi");
  const hkSau = (hSau.bag || []).filter((it) => it && HK[it.k]).length;
  const ok = (hSau.reborn | 0) === 9 && hSau.cs && hSau.cs.buoc === 4 && hSau.cs.vong === 10;
  return { ten: h.name, ds: r.ds, truoc, sau: { rb: hSau.reborn | 0, lvl: hSau.lvl | 0, gold: hSau.gold | 0, xu: hSau.xu | 0, tui: (hSau.bag || []).length, hk: hkSau, tiemNangThem: hSau.tiemNangThem | 0, cs: hSau.cs }, ok };
}

if (lenh === "sao-luu") {
  kiemCauHinh();
  const { co, thieu } = danhSach();
  console.log(`tìm thấy ${co.length}/${ACCTS.length} file, thiếu: ${thieu.join(", ") || "không"}`);
  const dir = thuMucMoi("sao-luu-nhap-maxping");
  fs.mkdirSync(dir, { recursive: true });
  const ghi = [];
  for (const f of co) { fs.copyFileSync(f.file, path.join(dir, f.acct + ".json")); ghi.push({ acct: f.acct, bytes: f.bytes, md5: f.md5 }); }
  let maQua = null;
  if (fs.existsSync(MA_FILE)) { fs.copyFileSync(MA_FILE, path.join(dir, "ma-qua.json")); maQua = { bytes: fs.statSync(MA_FILE).size, md5: md5(MA_FILE) }; }
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ ngay: new Date().toISOString(), root: ROOT, mucTieu: "MAXPING -> chuyen sinh 9", files: ghi, maQua }, null, 1) + "\n");
  console.log("sao lưu riêng file bot + ma-qua.json ->", dir);
  const sl = D.saoLuu();
  console.log("sao lưu toàn bộ (D.saoLuu):", sl ? JSON.stringify(sl) : "(không trả về)");
  console.log("XONG sao-luu. Kiểm lại thư mục trên rồi mới chạy bước nhap.");
} else if (lenh === "thu-kho") {
  // Mô phỏng trên bản sao tạm trong /tmp: không sửa dữ liệu thật.
  kiemCauHinh();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "maxping-thu-"));
  try {
    fs.mkdirSync(path.join(tmp, "tai-khoan"), { recursive: true });
    const { co } = danhSach();
    for (const f of co) fs.copyFileSync(f.file, path.join(tmp, "tai-khoan", f.acct + ".json"));
    if (fs.existsSync(MA_FILE)) fs.copyFileSync(MA_FILE, path.join(tmp, "ma-qua.json"));
    const env = { ...process.env, VL_DU_LIEU: tmp };
    if (process.env.VL_NPC_CHOI_CONFIG) env.VL_NPC_CHOI_CONFIG = process.env.VL_NPC_CHOI_CONFIG;
    const kq = spawnSync(process.execPath, [__filename, "nhap", "--chay-that", "--tam", ...(gomDa9 ? ["--gom-da-9"] : [])], { env, encoding: "utf8", stdio: "pipe" });
    process.stdout.write(kq.stdout || "");
    process.stderr.write(kq.stderr || "");
    if (kq.status !== 0) { console.error("MÔ PHỎNG LỖI — dữ liệu thật không bị sửa."); process.exit(kq.status || 1); }
    const bc = JSON.parse(fs.readFileSync(path.join(tmp, "bao-cao.json"), "utf8"));
    console.log(`\nTHỬ KHÔ XONG (trên bản sao ${tmp}): nhập ${bc.nhap.length}, bỏ qua ${bc.boQua.length}, lỗi ${bc.loi.length}. Dữ liệu thật KHÔNG bị sửa.`);
    console.log(`Tổng tiêm mô phỏng: +${bc.tong.tien.toLocaleString("en-US")} lượng, +${bc.tong.xu.toLocaleString("en-US")} Xu, ${bc.tong.mon} món đồ theo phái, ${bc.tong.hk} món Hoàng Kim, ${bc.tong.sach} sách (15 Mật Tịch + 15 Tẩy Tủy mỗi bot).`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
} else if (lenh === "nhap") {
  kiemCauHinh();
  const dir = tam ? null : (argThuMuc || thuMucMoiNhat("sao-luu-nhap-maxping"));
  if (chayThat && !tam) kiemSaoLuu(dir);
  if (!chayThat) console.log("KIỂM TRA TRƯỚC — chưa sửa gì. Chạy lại với --chay-that để nhập thật.");
  const { loi, lam, boQua, muc } = kiemTra();
  console.log(`mục MAXPING: tuDong=${muc ? muc.tuDong : "?"}, exp trong mục=${muc ? muc.exp : "?"}, tiền/Xu lưu trong mục=${muc ? `${muc.tienLuu}/${muc.xuLuu}` : "?"} (code đè 500.000.000/5.000 lúc nhập đầu), lượt đã dùng=${muc ? muc.dung : "?"}`);
  console.log(`làm được: ${lam.length}, bỏ qua: ${boQua.length}, lỗi cứng: ${loi.length}`);
  for (const s of boQua) console.log(`  BỎ QUA: ${s.h.name} (${s.cfgBot.acct}): ${s.lyDo}`);
  for (const s of loi) console.log("  LỖI:", s);
  if (loi.length) { console.error("CÓ LỖI CỨNG — dừng lại, chưa sửa file nào."); process.exit(1); }
  if (!chayThat) {
    let tien = 0, xu = 0, hk = 0;
    for (const co of lam) { tien += 500000000; xu += 5000; hk += demHK(co.cfgBot); }
    console.log(`SẼ NHẬP (nếu chạy thật): ${lam.length} bot → +${tien.toLocaleString("en-US")} lượng, +${xu.toLocaleString("en-US")} Xu, ${lam.length * 12} món đồ theo phái, ${hk} món Hoàng Kim, ${lam.length * 30} sách.`);
    process.exit(0);
  }
  const ketQua = { nhap: [], boQua: boQua.map((b) => `${b.h.name}: ${b.lyDo}`), loi: [], tong: { tien: 0, xu: 0, mon: 0, hk: 0, sach: 0 } };
  for (const co of lam) {
    try {
      const kq = nhapMot(co);
      if (!kq.ok) { ketQua.loi.push(`${kq.ten}: KIỂM SAU GHI THẤT BẠI (reborn ${kq.sau.rb}, buoc ${kq.sau.cs && kq.sau.cs.buoc}) — DỪNG, khôi phục từ sao lưu ngay`); break; }
      ketQua.nhap.push(`${kq.ten}: ${kq.truoc.rb} → 9, cấp ${kq.truoc.lvl} → ${kq.sau.lvl}, +${(kq.sau.gold - kq.truoc.gold).toLocaleString("en-US")} lượng, +${kq.sau.xu - kq.truoc.xu} Xu, túi ${kq.truoc.tui} → ${kq.sau.tui} món (HK ${kq.sau.hk}), tiềm năng thêm ${kq.sau.tiemNangThem}`);
      ketQua.tong.tien += kq.sau.gold - kq.truoc.gold; ketQua.tong.xu += kq.sau.xu - kq.truoc.xu;
      ketQua.tong.mon += 12; ketQua.tong.hk += kq.sau.hk; ketQua.tong.sach += 30;
    } catch (e) {
      ketQua.loi.push(`${co.h.name}: ${e.message} — file bot này KHÔNG ghi, lượt dùng KHÔNG ghi, chạy lại sau khi sửa được`);
    }
  }
  console.log(`nhập: ${ketQua.nhap.length}, bỏ qua: ${ketQua.boQua.length}, lỗi: ${ketQua.loi.length}`);
  for (const s of ketQua.nhap) console.log("  NHẬP:", s);
  for (const s of ketQua.boQua) console.log("  BỎ QUA:", s);
  for (const s of ketQua.loi) console.log("  LỖI:", s);
  // Báo cáo: bản tạm thì để ở ROOT để tiến trình cha đọc; chạy thật thì để trong thư mục sao lưu.
  fs.writeFileSync(path.join(tam ? ROOT : (dir || ROOT), "bao-cao.json"), JSON.stringify(ketQua, null, 1) + "\n");
  if (ketQua.loi.length) { console.error("CÓ LỖI — kiểm tra trước khi khởi động lại máy chủ."); process.exit(1); }
  console.log("XONG nhap. Khởi động lại máy chủ: bot ở chuyển sinh 9, sẵn sàng vòng 10 (về Lễ quan nộp phí 200M — bot được miễn phí vòng 10).");
} else if (lenh === "khoi-phuc") {
  const dir = argThuMuc || thuMucMoiNhat("sao-luu-nhap-maxping");
  if (!dir || !fs.existsSync(path.join(dir, "manifest.json"))) { console.error("KHÔNG THẤY bản sao lưu (manifest.json). Dừng lại."); process.exit(1); }
  const man = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  console.log(`khôi phục từ: ${dir} (${man.files.length} file)`);
  if (!chayThat) { console.log("THỬ KHÔ — chưa chép gì. Chạy lại với --chay-that để khôi phục thật."); process.exit(0); }
  let dem = 0;
  for (const m of man.files) {
    const nguon = path.join(dir, m.acct + ".json"), dich = path.join(TK, m.acct + ".json");
    fs.copyFileSync(nguon, dich);
    if (md5(dich) !== m.md5) { console.error("MD5 LỆCH sau chép:", m.acct); process.exit(1); }
    dem++;
  }
  if (man.maQua) {
    fs.copyFileSync(path.join(dir, "ma-qua.json"), MA_FILE);
    if (md5(MA_FILE) !== man.maQua.md5) { console.error("MD5 LỆCH sau chép: ma-qua.json"); process.exit(1); }
    console.log("đã khôi phục ma-qua.json.");
  }
  console.log(`đã khôi phục ${dem} file. Khởi động lại máy chủ như cũ.`);
} else {
  console.log("Dùng: node may-chu/nhap-maxping-bot.js <sao-luu|thu-kho|nhap|khoi-phuc> [thu-muc-sao-luu] [--chay-that] [--gom-da-9]");
  process.exit(1);
}
