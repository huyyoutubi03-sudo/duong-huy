// Phien ban tai nguyen: may chu quet assets/ roi bao ten + bam de client tai truoc (ban dung lai).
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const GOC = path.join(__dirname, "..", "assets");
let BAN = { ten: "Duong Huy", phienBan: 1, taiNguyen: {} };
function quet(dir, ra) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) quet(p, ra);
    else { const st = fs.statSync(p); ra.push(p + "|" + st.size + "|" + st.mtimeMs); }
  }
}
function batDau() {
  const lam = () => {
    try {
      const ra = [];
      if (fs.existsSync(GOC)) quet(GOC, ra);
      const bam = crypto.createHash("sha1").update(ra.join(";")).digest("hex").slice(0, 12);
      BAN = { ten: "Duong Huy", phienBan: 1, taiNguyen: { assets: bam, tep: ra.length } };
    } catch {}
  };
  lam();
  setInterval(lam, 60 * 1000).unref();
}
function xuLy(req, res) {
  const s = JSON.stringify({ ok: true, ...BAN });
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(s) });
  res.end(s);
}
module.exports = { batDau, xuLy, ban: () => BAN };
