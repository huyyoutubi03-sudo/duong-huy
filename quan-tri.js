// Quan tri tai khoan may chu (ban dung lai). Chay duoc ca luc may chu dang chay.
// node quan-tri.js them <ten> <mat-khau> [--admin]
// node quan-tri.js mat-khau <ten> <mat-khau-moi> | xoa-mk2 <ten> | bat-doi-mk <ten> | ds
"use strict";
const D = require("./may-chu/du-lieu");
const [,, lenh, ...args] = process.argv;
function dung() {
  console.log("Dung:");
  console.log("  node quan-tri.js them <ten> <mat-khau> [--admin]");
  console.log("  node quan-tri.js mat-khau <ten> <mat-khau-moi>");
  console.log("  node quan-tri.js xoa-mk2 <ten>");
  console.log("  node quan-tri.js bat-doi-mk <ten>");
  console.log("  node quan-tri.js ds");
}
function tkCua(ten) {
  const tk = D.docTk(ten);
  if (!tk) throw new Error("Khong co tai khoan " + ten);
  return tk;
}
try {
  if (lenh === "them") {
    const admin = args.includes("--admin") || D.demTk() === 0;
    const tk = D.taoTk(args[0], args[1], admin);
    tk.batDoiMk = 1;
    D.ghiTk(tk);
    console.log("Da tao tai khoan " + tk.ten + (admin ? " [quan tri]" : "") + ". Lan dau dang nhap se bi bat doi mat khau.");
  } else if (lenh === "mat-khau") {
    const tk = tkCua(args[0]);
    D.doiMk(tk, args[1]);
    tk.phien = null;
    tk.batDoiMk = 1;
    D.ghiTk(tk);
    console.log("Da doi mat khau " + tk.ten + ".");
  } else if (lenh === "xoa-mk2") {
    const tk = tkCua(args[0]);
    tk.mk2 = null;
    D.ghiTk(tk);
    console.log("Da xoa mat khau cap 2 cua " + tk.ten + ".");
  } else if (lenh === "bat-doi-mk") {
    const tk = tkCua(args[0]);
    tk.batDoiMk = 1;
    D.ghiTk(tk);
    console.log("Tai khoan " + tk.ten + " se bi bat doi mat khau lan dang nhap toi.");
  } else if (lenh === "ds") {
    for (const tk of D.danhSachTk()) {
      console.log("- " + tk.ten + (tk.admin ? " [quan tri]" : "") + (tk.mk2 ? " [mk cap 2]" : "") + (tk.batDoiMk ? " [cho doi mk]" : "") + " | dang nhap cuoi: " + (tk.dangNhapCuoi ? new Date(tk.dangNhapCuoi).toLocaleString("vi-VN") : "chua"));
    }
  } else dung();
} catch (e) {
  console.error("Loi: " + e.message);
  process.exit(1);
}