// Trang thai the gioi: boss Hoang Kim (mau chung) + gio may chu (ban dung lai).
"use strict";
const boss = { ten: "Boss Hoang Kim", mauToiDa: 1000000, mau: 1000000, hoiSau: 0 };
function gioVN() { return new Date(Date.now() + 7 * 3600 * 1000).toISOString(); }
function trangThai() { return { gio: gioVN(), boss: { ten: boss.ten, mau: boss.mau, mauToiDa: boss.mauToiDa }, goc: gocCau() }; }
function gocCau() { return "Vo Lam Idle - Ban dung lai (code goc, khong phai ban goc cua tac gia)"; }
function danhBoss(st) {
  boss.mau = Math.max(0, boss.mau - Math.max(0, +st || 0));
  if (boss.mau <= 0) {
    boss.mauToiDa = Math.floor(boss.mauToiDa * 1.1);
    boss.mau = boss.mauToiDa;
    boss.hoiSau = Date.now() + 60 * 1000;
    return { chet: true, mauToiDa: boss.mauToiDa };
  }
  return { chet: false, mau: boss.mau, mauToiDa: boss.mauToiDa };
}
module.exports = { trangThai, danhBoss, gocCau, boss };