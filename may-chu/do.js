// Giet quai: kinh nghiem / len cap / tien / roi do do may chu tinh (ban dung lai).
"use strict";
const CAU_HINH = require("../cau-hinh.json");
const BAN_DO = CAU_HINH.banDo || {};
const ROI = CAU_HINH.roiDo || { quaiThuong: 0.01, trum: 0.2 };
function expCan(cap) { return Math.floor(100 * Math.pow(cap, 1.5)); }
function expQuai(cap) { return Math.floor(10 * Math.pow(cap, 1.6)); }
function tienQuai(cap) { return 5 * cap; }
const O_DO = ["Mu", "Ao", "Day lung", "Day chuyen", "Vong tay", "Vu khi", "Giay", "Nhan 1", "Nhan 2", "Vong co"];
const HE = ["Kim", "Moc", "Thuy", "Hoa", "Tho"];
const MAU_HE = ["#f5c542", "#7ec850", "#4fa8e0", "#e05a4f", "#b08d57"];
function taoDo(cap, trum) {
  const o = O_DO[Math.floor(Math.random() * O_DO.length)];
  const he = Math.floor(Math.random() * 5);
  const hiem = trum ? (Math.random() < 0.3 ? "lam" : "luc") : (Math.random() < 0.05 ? "luc" : (Math.random() < 0.3 ? "lam" : "trang"));
  const goc = Math.floor(cap * (trum ? 1.5 : 1));
  return { id: "do-" + Date.now() + "-" + Math.floor(Math.random() * 10000), ten: o + " " + HE[he] + " cap " + cap, loai: o, he, mau: MAU_HE[he], hiem, cap, sucManh: goc, thanPhap: Math.floor(goc / 2), noiCong: Math.floor(goc / 2), sinhKhi: goc * 2, gia: goc * 10 };
}
function giet(nv, b) {
  const banDo = BAN_DO[String(b.banDo || nv.banDo || "1")] || {};
  const hsKn = (banDo.kinhNghiem || 1) * (CAU_HINH.kinhNghiem || 1);
  const hsTien = banDo.tien || 1;
  const capQ = Math.max(1, +b.cap || nv.cap || 1);
  const kn = Math.floor(expQuai(capQ) * hsKn);
  const tien = Math.floor(tienQuai(capQ) * hsTien);
  nv.kinhNghiem += kn;
  nv.tien += tien;
  let lenCap = 0;
  while (nv.kinhNghiem >= expCan(nv.cap) && nv.cap < 200) {
    nv.kinhNghiem -= expCan(nv.cap);
    nv.cap += 1;
    lenCap += 1;
    nv.mauToiDa += 20;
    nv.noiLucToiDa += 10;
    nv.sucManh += 2;
    nv.thanPhap += 2;
    nv.noiCong += 2;
    nv.sinhKhi += 2;
    nv.mau = nv.mauToiDa;
    nv.noiLuc = nv.noiLucToiDa;
  }
  const tyLe = b.trum ? ROI.trum : ROI.quaiThuong;
  const roi = [];
  if (Math.random() < tyLe) {
    const doMoi = taoDo(capQ, !!b.trum);
    if ((nv.tui || []).length < 100) { nv.tui.push(doMoi); roi.push({ ...doMoi, daNhat: true }); }
    else roi.push({ ...doMoi, daNhat: false });
  }
  return { kinhNghiem: kn, tien, lenCap, roi, chet: false };
}
module.exports = { giet, taoDo, expCan, expQuai, tienQuai };