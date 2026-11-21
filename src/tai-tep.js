// Tai tep client: JSON, van ban, anh, nhi phan (ban dung lai).
export async function taiJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error("tai JSON that bai: " + url); return r.json(); }
export async function taiVanBan(url) { const r = await fetch(url); if (!r.ok) throw new Error("tai van ban that bai: " + url); return r.text(); }
export function taiAnh(url) { return new Promise((ok, loi) => { const img = new Image(); img.onload = () => ok(img); img.onerror = () => loi(new Error("tai anh that bai: " + url)); img.src = url; }); }
export async function taiTaiNguyen(url) { const r = await fetch(url); if (!r.ok) throw new Error("tai tai nguyen that bai: " + url); return r.arrayBuffer(); }