// Dinh dang tien va so (ban dung lai).
export function dinhDangTien(n) { return (Math.floor(n) || 0).toLocaleString("vi-VN"); }
export function dinhDangSo(n) { if (n >= 1000000) return (n / 1000000).toFixed(1) + "tr"; if (n >= 1000) return (n / 1000).toFixed(1) + "k"; return String(Math.floor(n)); }
export function rutGon(n) { return dinhDangSo(n); }