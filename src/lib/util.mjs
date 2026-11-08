import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");

// 언어(계정)별로 큐·발행기록을 나눈다. LOCALE=ja 면 일본어 전용 계정용.
export const LOCALE = process.env.LOCALE === "ja" ? "ja" : "ko";
export const QUEUE_DIR = LOCALE === "ja" ? "queue-ja" : "queue";
export const QUEUE = path.join(ROOT, QUEUE_DIR);
export const PUBLISHED_LOG = path.join(
  ROOT,
  "config",
  LOCALE === "ja" ? "published.ja.log" : "published.log",
);
export const BUILD = path.join(ROOT, "build");
export const WD = LOCALE === "ja"
  ? ["月", "火", "水", "木", "金", "土", "日"]
  : ["월", "화", "수", "목", "금", "토", "일"];

export const readJson = (p, fallback) =>
  fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback;

export const writeJson = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2));
};

const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000);
const ymd = (d) => d.toISOString().slice(0, 10);

export const kstToday = () => ymd(kstNow());

// 내일부터, 지정한 요일(월=0…일=6)만 골라 n개.
// 기본값은 평일 전체 — 일본어 계정은 화·금만 쓴다.
export function nextWeekdays(n, allowed = [0, 1, 2, 3, 4]) {
  const out = [];
  const d = kstNow();
  let guard = 0;
  while (out.length < n && guard++ < 400) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (allowed.includes((d.getUTCDay() + 6) % 7)) out.push(ymd(d));
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

// 발행 슬롯 순번. 주 2회처럼 요일이 적을 때 축을 고르게 돌리기 위해 쓴다.
export function slotIndex(date, publishDays) {
  const d = new Date(`${date}T00:00:00Z`);
  const weeks = Math.floor(d.getTime() / (7 * 86400000));
  const pos = publishDays.indexOf(weekdayIdx(date));
  return weeks * publishDays.length + (pos < 0 ? 0 : pos);
}
