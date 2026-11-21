## Dữ liệu mẫu

- assets/data/maplist.json: 3 map mẫu (làng, rừng, sa mạc) với lưới đi được + quái + NPC
- assets/data/char.json: 10 môn phái + chỉ số khởi đầu
- assets/data/monsters.json: Quái mẫu theo cấp
- assets/data/thuoc.json: Thuốc mẫu

## Phần chưa chắc chắn — cần đối chiếu với bản gốc trước khi dùng cho cân bằng thật

- Thân hàm trong src/game/rules.js (khangDu, khangThat, capChieu, ccCong, ccTrang, noiCapChieu, capCong, skCong, hamChieu, heroStats, mobStats, atkFrames, hitPercent, heroDamage, mobDamage, mobDamageHe, mocCua, datLuyen, fixPoints, chanNang, xungHieu)
- Bảng KICH trong itemdb.js; bảng LUYEN, MOC, CHIEU_TRUOC, XUNG_HIEU trong rules.js
- Các nhóm trong cau-hinh.json chưa đọc nội dung: quaiVoCong (13), daTau (18), quaiChung (6), tangIchDoi (4), phanThan (10), thuongCap (2), tanThu (5), thuongOnline (2), phucDuyen (7), loaiDo (10)
- Dữ liệu đầy đủ: maplist, monsters, mobstats, do-goc, vat-pham, luyen-ky-nang, npcdialog, da-tau, sat-thu, tong-kim, phong-hoa, vuot-ai...
- Định dạng .spr (11.432 file) và toàn bộ tài nguyên hình ảnh/âm thanh gốc: KHÔNG tái tạo, KHÔNG phân phối lại.
- Tài liệu thiết kế THIET-KE-S1.md (mục 2-4) được nhắc trong cau-hinh.json nhưng không có trong ZIP.
## Ghi chú kiểm thử (21/11/2026)

- dangNhap chấp nhận cả trường matKhau và mk (client gửi mk).
- Route nhân vật dùng tên đầy đủ: /api/nhan-vat, /api/tao-nhan-vat, /api/chon-nhan-vat, /api/xoa-nhan-vat.
- taoNhanVat tự chọn ô trống đầu tiên khi client không gửi o.