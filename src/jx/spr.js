// Doc .spr (ban dung lai — GIU CHO).
// _chuThich: dinh dang .spr goc cua Vo Lam Truyen Ky khong duoc giai ma trong ban nay; khong sao chep tai nguyen goc. Ham docSpr chi tra khung giu cho de client chay duoc.
export const SPR_CHUA_HO_TRO = true;
export function docSpr(buf) { return { rong: 32, cao: 48, khung: [], _chuThich: "spr goc chua giai ma" }; }
export function veSpr(ctx, spr, x, y) { ctx.fillStyle = "#888"; ctx.fillRect(x - 8, y - 24, 16, 24); }
export function sprTuAnh(img, rongKhung, caoKhung) { return { anh: img, rongKhung: rongKhung || 48, caoKhung: caoKhung || 64 }; }