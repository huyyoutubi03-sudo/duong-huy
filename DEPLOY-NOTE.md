# Ghi chú deploy — Chien - Vo Lam Xua (bản copy nguyên bản, đã đổi thông tin)

Nguồn: bản copy nguyên bản tại ~/workspace/vl1-nguyen-ban/"Mot Thoi Ky Niem/", đã loại bỏ node/ (node.exe) và không mang theo du-lieu/.
Thêm mới trong thư mục này: package.json (start script), .gitignore (du-lieu/, node_modules/).

## Start command (Railway/Render)
`node chay-game.js $PORT --lan --no-open`
- Bản gốc chỉ đọc cổng từ tham số dòng lệnh (không đọc $PORT từ môi trường), bắt buộc truyền $PORT.
- `--lan` để nghe 0.0.0.0 (mặc định chỉ 127.0.0.1). `--no-open` để không gọi mở trình duyệt trên máy chủ.
- Healthcheck: GET /api/trang-thai (không cần đăng nhập).

## Dữ liệu bền
- Máy chủ tạo thư mục `du-lieu/` ở gốc app (hoặc theo biến VL_DU_LIEU).
- Railway: giữ volume 500 MB đã có, mount tại /app/du-lieu; đặt thêm biến VL_DU_LIEU=/app/du-lieu cho chắc.
- Render Free: không có volume bền (ngủ 15 phút, mất dữ liệu) — chỉ demo.

## Tài khoản
- Chưa có tài khoản nào trong bản này. Sau khi deploy, tạo tài khoản quản trị cho Huy bằng Railway Console:
  `node quan-tri.js them <ten> <mat-khau> --admin`
  (chạy trong thư mục app trên Railway; dữ liệu ghi vào volume).
- Xóa tài khoản test1/test1234 của bản clean-room cũ khỏi volume Railway nếu còn, sau khi bản mới chạy ổn.
