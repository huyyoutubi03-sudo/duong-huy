// Nguồn nguyên liệu sự kiện — không có trong bản chia sẻ Mot Thoi Ky Niem (chức năng làm sau Tống Kim, đã gỡ). Tệp này chỉ còn vỏ để các tệp khác gọi không lỗi.
"use strict";
const khong = () => { const e = new Error("Chức năng này không có trong bản Mot Thoi Ky Niem"); e.code = 400; throw e; };
const rong = () => null, sai = () => false, mang = () => [];
module.exports = { cf: () => ({ tongKim: { tre: 5 } }), dang: sai, ngay: () => ({}), daTau: mang, satThu: mang, tongKim: mang, online: mang,
  dauLinh: mang, thuyen: mang, nhim: mang, demGiet: rong, tomTat: rong, nvLam: khong, traCuu: () => ({ mon: null, ds: [] }), MD: {} };
