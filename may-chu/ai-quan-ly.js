// AI quản lý — 1 bộ não chung trả lời khi người chơi HỎI bot (Huy chốt 00:11 ngày 27/11/2026).
//
// Nguyên tắc:
// - Chỉ trả lời KHI ĐƯỢC HỎI. Không tự nói, không rao, không bắt chuyện.
// - 1 hàng đợi chung cho cả bầy bot, gọi AI bất đồng bộ — KHÔNG chặn vòng lặp bot.
// - AI TRẢ LỜI TRỰC TIẾP (Huy 10:18 27/11/2026): câu trả lời cho người hỏi KHÔNG qua
//   cửa tiết lưu kênh chung 30s nữa (cửa đó chỉ còn giữ cho tin rao/quảng cáo chung,
//   ở npc-choi.js); chống xả chat bằng: bên gọi nhận 1 câu hỏi cho 1 bot + nhịp
//   10s/bot (traLoiDen) + hàng đợi tối đa HANG_TOI_DA. CACH_MS chỉ còn để tương
//   thích cấu hình/trangThai, không siết câu trả lời trực tiếp nữa.
// - AI lỗi/chậm/mất mạng/hết lượt: trả lời bằng câu mẫu sẵn có (duPhong), không im
//   lặng, không báo lỗi kỹ thuật cho người chơi. Mọi lỗi đều bắt, không kẹt vòng lặp.
// - Chuỗi dự phòng 3 nhà (Huy 27/11/2026: "dùng cả 3 được không?"): Pollinations
//   → Gemini → Groq, gọi NỐI TIẾP (không song song, khỏi phí lượt), nhà này
//   lỗi/chậm/hết lượt thì chuyển nhà sau, hết cả 3 thì câu mẫu. Thứ tự đổi
//   bằng VL_AI_QUAN_LY_THU_TU.
// - Khóa API CHỈ lấy từ biến môi trường riêng từng nhà (VL_AI_QUAN_LY_POLL_KEY /
//   _GEMINI_KEY / _GROQ_KEY) — tuyệt đối không ghi khóa vào code/file/chat.
//   Nhà nào không có khóa thì BỎ QUA IM LẶNG. Chưa có khóa nào thì tính năng TẮT
//   (kể cả khi VL_AI_QUAN_LY_BAT=1) — không gọi ẩn danh (lượt IP dùng chung hay cạn).
//   Tương thích cũ: VL_AI_QUAN_LY_URL/KEY/MODEL gán cho Pollinations.
// - Module độc lập, không require npc-choi.js (tránh require vòng). Móc nối vào
//   traLoi() xem KET-QUA.md (đoạn mã gắn, chưa áp vào npc-choi.js).
"use strict";

// ---------- cấu hình (biến môi trường, đọc lúc require) ----------
// Tương thích cũ: VL_AI_QUAN_LY_URL/KEY/MODEL gán cho Pollinations.
const LEGACY_URL = process.env.VL_AI_QUAN_LY_URL || "";
const LEGACY_KEY = String(process.env.VL_AI_QUAN_LY_KEY || "").trim();
const LEGACY_MODEL = process.env.VL_AI_QUAN_LY_MODEL || "";
const catKhoa = (v) => String(v || "").trim(); // khóa copy-paste hay dính khoảng trắng/xuống dòng → 401 oan

// Pollinations — nền tảng MỚI gen.pollinations.ai (chẩn đoán log live 27/11/2026, §11):
// code cũ POST tới text.pollinations.ai/ (trả TEXT THUẦN, không phải JSON) rồi đọc
// choices[0].message.content → luôn rỗng → tưởng là "câu trả lời bị lọc". Endpoint
// OpenAI-compatible thật là /v1/chat/completions (mới) hoặc /openai (cũ). Model mặc
// định lấy từ catalogue công khai ngày 27/11/2026: openai/gpt-5.4-nano (alias
// "openai", không bắt trả phí, khỏe 99,95%). Đổi URL/model bằng VL_AI_QUAN_LY_POLL_URL/_MODEL.
const POLL_URL = process.env.VL_AI_QUAN_LY_POLL_URL || LEGACY_URL || "https://gen.pollinations.ai/v1/chat/completions";
const POLL_KEY = catKhoa(process.env.VL_AI_QUAN_LY_POLL_KEY) || LEGACY_KEY;
const POLL_MODEL = process.env.VL_AI_QUAN_LY_POLL_MODEL || LEGACY_MODEL || "openai/gpt-5.4-nano";
// Gemini (REST riêng, không phải OpenAI-compatible). Khóa gửi ĐÚNG chỗ rồi
// (x-goog-api-key); 401 ở log live là khóa hỏng/hạn chế sai HOẶC model cũ đã gỡ:
// gemini-2.5-flash bị Google gỡ (báo 404, giai đoạn trước báo 401) → mặc định mới
// gemini-3.7-flash. Đổi bằng VL_AI_QUAN_LY_GEMINI_MODEL. Khóa hỏng thì chỉ Huy
// cấp lại trong AI Studio mới hết (xem §11).
const GEM_GOC = (process.env.VL_AI_QUAN_LY_GEMINI_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const GEM_KEY = catKhoa(process.env.VL_AI_QUAN_LY_GEMINI_KEY);
const GEM_MODEL = process.env.VL_AI_QUAN_LY_GEMINI_MODEL || "gemini-3.7-flash";
// Groq (OpenAI-compatible). llama-3.3-70b-versatile bị Groq NGỪNG PHỤC VỤ từ
// 16/08/2026 cho gói miễn phí/nhà phát triển → 404; thay thế chính thức là
// openai/gpt-oss-120b. Đổi bằng VL_AI_QUAN_LY_GROQ_MODEL.
const GROQ_URL = process.env.VL_AI_QUAN_LY_GROQ_URL || "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = catKhoa(process.env.VL_AI_QUAN_LY_GROQ_KEY);
const GROQ_MODEL = process.env.VL_AI_QUAN_LY_GROQ_MODEL || "openai/gpt-oss-120b";

const NHA = {
  pollinations: { ten: "pollinations", co: !!POLL_KEY },
  gemini: { ten: "gemini", co: !!GEM_KEY },
  groq: { ten: "groq", co: !!GROQ_KEY },
};
const THU_TU = [...new Set(String(process.env.VL_AI_QUAN_LY_THU_TU || "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => NHA[s]))];
if (!THU_TU.length) THU_TU.push("pollinations", "gemini", "groq");
const CO_NHA = THU_TU.some((t) => NHA[t].co);
// Mặc định TẮT: phải bật tường minh (VL_AI_QUAN_LY_BAT=1) VÀ có ít nhất 1 nhà cấu hình.
const BAT = process.env.VL_AI_QUAN_LY_BAT === "1" && CO_NHA;
const TIMEOUT_MS = Math.max(1000, +process.env.VL_AI_QUAN_LY_TIMEOUT || 8000);
const CACH_MS = Math.max(1000, +process.env.VL_AI_QUAN_LY_CACH || 30000);
const HANG_TOI_DA = Math.max(1, +process.env.VL_AI_QUAN_LY_HANG || 3);

const TEN_PHAI = {
  shaolin: "Thiếu Lâm", tianwang: "Thiên Vương", tangmen: "Đường Môn", wudu: "Ngũ Độc",
  emei: "Nga Mi", cuiyan: "Thúy Yên", gaibang: "Cái Bang", tianren: "Thiên Nhẫn",
  wudang: "Võ Đang", kunlun: "Côn Lôn",
};

// ---------- trạng thái chung ----------
let hangCho = []; // hàng đợi câu hỏi
let dangChay = false;

function log(...a) { try { console.log("[ai-quan-ly]", ...a); } catch {} }

// ---------- giọng bot: system prompt ----------
// Tọa độ thật của bot được chụp lúc nhận câu hỏi (xem toaDoCua) và đưa vào ngữ cảnh
// cho AI; câu trả lời gửi đi luôn kèm tọa độ đó (luật Huy 00:13 27/11/2026: khi có
// người nhắn hỏi thì báo tọa độ để người ta tìm tới được).
// DẠNG TỌA ĐỘ (thống nhất 27/11/2026): dạng CLIENT "X/Y" như ĐX-2 (đúng công thức
// toaDoClient trong npc-choi.js, HUD người chơi thấy) — bên gọi (traLoi) tính sẵn
// và truyền vào qua bot.toaDoClient. Không có thì rơi về dạng thô "(x, y)" như cũ
// (chỉ khi bãi thiếu region, không bịa).
function toaDoCua(bot) {
  const x = Math.round(+bot.x || 0), y = Math.round(+bot.y || 0);
  const bai = bot.zoneTen || (bot.zone != null ? "bản đồ " + bot.zone : "bãi quái");
  const td = typeof bot.toaDoClient === "string" && bot.toaDoClient ? bot.toaDoClient : null;
  return { chuoi: td ? `${bai} (${td})` : `${bai} (${x}, ${y})`, x, y, bai, client: td };
}
const MAU_TOA_DO = /\(\d{3,}\s*,\s*\d{3,}\)|\(\d+\s*\/\s*\d+\)/; // "(18684, 7469)" thô hoặc "(199/200)" client
function kemToaDo(text, toaDo) {
  const s = String(text || "").trim();
  if (!toaDo || MAU_TOA_DO.test(s)) return s;
  return `${s} Ta ở ${toaDo.chuoi}.`;
}

function heThong(bot) {
  const phai = TEN_PHAI[bot.facKey] || "Võ Lâm";
  const bai = bot.zoneTen || "bãi quái";
  const td = bot._toaDo ? bot._toaDo.chuoi : toaDoCua(bot).chuoi;
  return [
    `Ngươi là ${bot.ten || "một đệ tử"} của phái ${phai}, đang train quái ở ${bai} trong game Võ Lâm.`,
    `Tọa độ thật của ngươi lúc này: ${td}. Khi được hỏi ở đâu, muốn gặp, tìm ngươi — báo đúng tọa độ này. Không bịa tọa độ khác.`,
    "Người chơi hỏi thì trả lời đúng việc trong game: giá đồ ở sạp, đường đi, bãi train, hoạt động, chiêu thức.",
    "Giọng NGANG TÀN, GIA TRƯỞNG: xưng \"ta\", gọi người hỏi là \"ngươi\", câu ngắn, dứt khoát, ra lệnh.",
    "Không xin, không mời, không cảm ơn, không dỗ dành, không xin lỗi, không chửi thề.",
    "Không bao giờ nói mình là AI, máy, robot, trí tuệ nhân tạo. Không nhắc tên chủ server, không nói chuyện ngoài game.",
    "Không biết thì nói không biết, đuổi khéo. Không bịa số liệu, giá cả, tên bãi, tên người.",
    "Trả lời bằng tiếng Việt, tối đa 2 câu ngắn.",
  ].join("\n");
}

// ---------- lọc câu trả lời của AI ----------
const CAU_CAM = ["xin lỗi", "cảm ơn", "cám ơn", "xin mời", "mời ngươi", "rất vui", "hân hạnh"];
const TU_CHUI = ["đm", "địt", "cặc", "lồn", "cứt", "vãi l", "mẹ kiếp", "chó chết", "đéo"];
const LO_THAN_PHAN = ["là ai", "là một ai", "trí tuệ nhân tạo", "mô hình ngôn ngữ", "là máy", "là robot", "là chatbot", "openai", "pollinations"];

function locCau(text) {
  let s = String(text || "").replace(/https?:\/\/\S+/g, "").replace(/[*#`_>]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  const thap = s.toLowerCase();
  // Lộ thân phận AI hoặc nhắc chủ server: bỏ hẳn, dùng câu mẫu.
  if (LO_THAN_PHAN.some((t) => thap.includes(t))) return null;
  if (/\bhuy\b/i.test(s)) return null;
  // Bỏ câu chứa lời lẽ mềm/xin xỏ; bỏ câu chửi thề.
  const giu = s.split(/(?<=[.!?…])\s+/).filter((c) => {
    const t = c.toLowerCase();
    return !CAU_CAM.some((x) => t.includes(x)) && !TU_CHUI.some((x) => t.includes(x));
  });
  s = giu.join(" ").trim();
  if (!s) return null;
  // Tối đa 2 câu, tối đa 220 ký tự.
  const cau = s.split(/(?<=[.!?…])\s+/).slice(0, 2).join(" ");
  return cau.length > 220 ? cau.slice(0, 217).trimEnd() + "…" : cau;
}

// ---------- gọi AI theo chuỗi 3 nhà (nối tiếp, mỗi nhà 1 timeout riêng) ----------
// bot._toaDo: tọa độ chụp lúc nhận câu hỏi — AI thấy đúng tọa độ lúc được hỏi,
// không phải tọa độ lúc trả lời (bot có thể đã di chuyển trong lúc chờ AI).
// Mỗi hàm nhà trả về câu đã lọc, hoặc null = nhà đó hỏng → chuyển nhà sau.
// Không bao giờ ném lỗi ra ngoài, không ghi khóa/log nội dung vào console.
async function postJson(url, headers, body, timeoutMs) {
  const ctrl = new AbortController();
  const hen = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    // Đọc TEXT trước: có nhà trả JSON (chuẩn OpenAI), có nhà trả text thuần
    // (Pollinations classic POST /) — đọc .json() thẳng sẽ chết im khi gặp text.
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { status: res.status, ok: res.ok, data, text };
  } finally {
    clearTimeout(hen);
  }
}
function tinNhan(bot, cauHoi) {
  return [
    { role: "system", content: heThong(bot) },
    { role: "user", content: String(cauHoi).slice(0, 300) },
  ];
}
function trichOpenAI(data, text) {
  // JSON chuẩn OpenAI: choices[0].message.content (chuỗi hoặc mảng parts).
  // Text thuần (Pollinations classic): toàn bộ thân trả lời chính là câu trả lời.
  if (typeof data === "string" && data) return data;
  const nd = data && data.choices && data.choices[0] && data.choices[0].message;
  const c = nd && nd.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.filter((p) => p && typeof p.text === "string").map((p) => p.text).join(" ");
  if (typeof text === "string" && text && !/^\s*\{/.test(text)) return text;
  return "";
}

async function goiPollinations(bot, cauHoi) {
  try {
    const { status, ok, data, text } = await postJson(POLL_URL,
      POLL_KEY ? { Authorization: "Bearer " + POLL_KEY } : {},
      { model: POLL_MODEL, messages: tinNhan(bot, cauHoi), max_tokens: 220, temperature: 0.7 }, TIMEOUT_MS);
    if (!ok) { log(`pollinations: HTTP ${status}${status === 401 ? " (khoa sai/thieu)" : status === 402 ? " (het Pollen)" : status === 403 ? " (model khong duoc phep)" : ""} — chuyen nha tiep theo`); return null; }
    const tho = trichOpenAI(data, text);
    // Pollinations khi hết lượt trả về câu chữ "Free limit reached" — coi là lỗi.
    if (/free limit reached/i.test(tho)) { log("pollinations: het luot mien phi — chuyen nha tiep theo"); return null; }
    if (!tho.trim()) { log("pollinations: tra loi rong/khong doc duoc — chuyen nha tiep theo"); return null; }
    const loc = locCau(tho);
    if (loc === null) log("pollinations: cau tra loi bi loc bo — chuyen nha tiep theo");
    return loc;
  } catch (e) {
    log(`pollinations: ${e && e.name === "AbortError" ? "timeout" : "loi mang"} — chuyen nha tiep theo`);
    return null;
  }
}

async function goiGemini(bot, cauHoi) {
  const url = `${GEM_GOC}/models/${encodeURIComponent(GEM_MODEL)}:generateContent`;
  try {
    const { status, ok, data } = await postJson(url,
      GEM_KEY ? { "x-goog-api-key": GEM_KEY } : {},
      {
        systemInstruction: { parts: [{ text: heThong(bot) }] },
        contents: [{ role: "user", parts: [{ text: String(cauHoi).slice(0, 300) }] }],
        generationConfig: { maxOutputTokens: 220, temperature: 0.7 },
      }, TIMEOUT_MS);
    if (!ok) { log(`gemini: HTTP ${status}${status === 401 ? " (khoa hong/han che — Huy kiem tra khoa, xem KET-QUA §11)" : status === 404 ? " (model khong con)" : ""} — chuyen nha tiep theo`); return null; }
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const txt = Array.isArray(parts)
      ? parts.filter((p) => typeof p.text === "string" && !p.thought).map((p) => p.text).join(" ")
      : "";
    if (!txt) { log("gemini: khong co cau tra loi (bi chan/trong) — chuyen nha tiep theo"); return null; }
    const loc = locCau(txt);
    if (loc === null) log("gemini: cau tra loi bi loc bo — chuyen nha tiep theo");
    return loc;
  } catch (e) {
    log(`gemini: ${e && e.name === "AbortError" ? "timeout" : "loi mang"} — chuyen nha tiep theo`);
    return null;
  }
}

async function goiGroq(bot, cauHoi) {
  try {
    const { status, ok, data, text } = await postJson(GROQ_URL,
      GROQ_KEY ? { Authorization: "Bearer " + GROQ_KEY } : {},
      { model: GROQ_MODEL, messages: tinNhan(bot, cauHoi), max_tokens: 220, temperature: 0.7 }, TIMEOUT_MS);
    if (!ok) { log(`groq: HTTP ${status}${status === 404 ? " (model khong con/phai doi model)" : status === 401 ? " (khoa sai/thieu)" : ""} — chuyen nha tiep theo`); return null; }
    const tho = trichOpenAI(data, text);
    if (!tho.trim()) { log("groq: tra loi rong/khong doc duoc — het chuoi, dung cau mau"); return null; }
    const loc = locCau(tho);
    if (loc === null) log("groq: cau tra loi bi loc bo — het chuoi, dung cau mau");
    return loc;
  } catch (e) {
    log(`groq: ${e && e.name === "AbortError" ? "timeout" : "loi mang"} — het chuoi, dung cau mau`);
    return null;
  }
}

const GOI_THEO_NHA = { pollinations: goiPollinations, gemini: goiGemini, groq: goiGroq };
async function goiChuoi(bot, cauHoi) {
  for (const ten of THU_TU) {
    if (!NHA[ten].co) continue; // không khóa: bỏ qua im lặng, không gọi, không phí lượt
    const t0 = Date.now();
    const tra = await GOI_THEO_NHA[ten](bot, cauHoi);
    if (tra) { log(`${ten}: tra loi (${Date.now() - t0}ms)`); return tra; }
  }
  return null;
}

// ---------- hàng đợi: xử lý tuần tự, không chặn vòng lặp bot ----------
async function chayHang() {
  if (dangChay) return;
  dangChay = true;
  try {
    while (hangCho.length) {
      const job = hangCho.shift();
      let tra = null;
      try { tra = await goiChuoi(job.bot, job.cauHoi); } catch { tra = null; }
      try {
        if (tra) {
          // AI bịa tọa độ khác (dạng thô "(số, số)" hay dạng client "(số/số)"): gỡ hết
          // rồi gắn tọa độ thật lúc được hỏi (đã thống nhất dạng client như ĐX-2).
          tra = tra.replace(/\(\d{3,}\s*,\s*\d{3,}\)|\(\d+\s*\/\s*\d+\)/g, "").replace(/\s+([.!?…])/g, "$1").replace(/\s+/g, " ").trim();
          job.gui(kemToaDo(tra, job.toaDo));
        } else job.gui(kemToaDo(job.duPhong(), job.toaDo)); // dự phòng cũng kèm tọa độ
      } catch (e) { log("gửi trả lời lỗi:", e.message); }
    }
  } finally {
    dangChay = false;
  }
}

// ---------- API chính ----------
// hoi({ bot, cauHoi, rieng, gui, duPhong })
// - bot: { ten, facKey, zoneTen }
// - gui(text): gửi câu trả lời (TG.chat...). duPhong(): câu mẫu sẵn có.
// - Trả về true = câu hỏi đã nhận (module sẽ tự gọi gui với câu AI hoặc câu mẫu).
//   Trả về false = không nhận (đang tắt / hàng đợi đầy) — bên gọi cứ trả lời bằng
//   câu mẫu như cũ, không im lặng. KHÔNG siết cửa chung 30s (Huy 10:18 27/11/2026):
//   bên gọi (traLoi) đã nhận 1 câu hỏi cho 1 bot + giữ nhịp 10s/bot; rieng giữ
//   nguyên chữ ký để tương thích, không còn ý nghĩa siết.
// - CACH_MS (VL_AI_QUAN_LY_CACH) giữ lại trong trangThai để tương thích cấu hình.
function hoi({ bot, cauHoi, rieng, gui, duPhong }) {
  if (!BAT) return false;
  if (typeof gui !== "function" || typeof duPhong !== "function") return false;
  const txt = String(cauHoi || "").trim();
  if (!txt) return false;
  if (hangCho.length >= HANG_TOI_DA) return false;
  // Chụp tọa độ thật NGAY lúc nhận câu hỏi (bot có thể di chuyển trong lúc chờ AI).
  const toaDo = toaDoCua(bot);
  hangCho.push({ bot: { ...bot, _toaDo: toaDo }, cauHoi: txt, gui, duPhong, toaDo });
  void chayHang();
  return true;
}

function bat() { return BAT; }
function trangThai() { return { bat: BAT, dangChay, hangCho: hangCho.length, cachMs: CACH_MS, timeoutMs: TIMEOUT_MS, hangToiDa: HANG_TOI_DA, thuTu: THU_TU.slice(), nha: THU_TU.map((t) => ({ ten: t, co: NHA[t].co })), url: POLL_URL, model: POLL_MODEL, coKhoa: !!POLL_KEY }; }
function _datLai() { hangCho = []; } // chỉ dùng cho harness kiểm chứng

module.exports = { bat, hoi, locCau, heThong, toaDoCua, kemToaDo, trangThai, _datLai };
