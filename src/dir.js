// Duong dan tai nguyen client (ban dung lai).
export const DIR = { map: "assets/web/map/", item: "assets/web/item/", npc: "assets/web/npc/", vocong: "assets/web/vocong/", amThanh: "assets/web/am-thanh/", ui: "assets/web/ui/", data: "assets/data/" };
export function duongDan(loai, ten) { return (DIR[loai] || "") + ten; }