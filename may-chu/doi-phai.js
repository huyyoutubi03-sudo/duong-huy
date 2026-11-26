// Đổi môn phái (Tín vật môn phái) — không có trong bản chia sẻ Chien - Vo Lam Xua (chức năng làm sau Tống Kim, đã gỡ). Tệp này chỉ còn vỏ để các tệp khác gọi không lỗi.
"use strict";
const khong = () => { const e = new Error("Chức năng này không có trong Chiến - Võ Lâm Xưa."); e.code = 400; throw e; };
const rong = () => null, sai = () => false, mang = () => [];
module.exports = { lam: khong, tomTat: rong, TIN_VAT: "ms:1670" };
