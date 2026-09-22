import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const QUEUE = path.join(ROOT, "queue");
export const BUILD = path.join(ROOT, "build");
export const WD = ["월", "화", "수", "목", "금", "토", "일"];

export const readJson = (p, fallback) =>
  fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback;

export const writeJson = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2));
};

const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000);
const ymd = (d) => d.toISOString().slice(0, 10);

export const kstToday = () => ymd(kstNow());

// 내일부터 평일 n개 (KST)
export function nextWeekdays(n) {
  const out = [];
  const d = kstNow();
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (w >= 1 && w <= 5) out.push(ymd(d));
  }
  return out;
}

// 월=0 ... 일=6
export const weekdayIdx = (date) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

export function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

export function assertDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) {
    throw new Error(`날짜 형식이 잘못됐습니다: "${d}" → YYYY-MM-DD 로 입력하세요`);
  }
  return d;
}
