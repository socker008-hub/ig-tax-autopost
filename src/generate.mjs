// 카드뉴스 원고 생성: 주제 선택 → Claude API 호출 → JSON 검증 → 광고규정 필터
// 출력: build/post.json
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUILD = path.join(ROOT, "build");
const USED = path.join(ROOT, "config", "used.json");

const topics = JSON.parse(fs.readFileSync(path.join(ROOT, "config/topics.json"), "utf8"));
const rules = JSON.parse(fs.readFileSync(path.join(ROOT, "config/compliance.json"), "utf8"));
const used = fs.existsSync(USED) ? JSON.parse(fs.readFileSync(USED, "utf8")) : [];

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) fail("ANTHROPIC_API_KEY 가 없습니다.");

function fail(msg) {
  console.error(`[generate] 중단: ${msg}`);
  process.exit(1);
}

// ── 1. 오늘의 축과 주제 선택 ────────────────────────────────
const now = new Date(Date.now() + 9 * 3600 * 1000); // KST
const dateStr = now.toISOString().slice(0, 10);
const weekdayIdx = (now.getUTCDay() + 6) % 7; // 월=0
if (weekdayIdx > 4 && !process.env.FORCE) fail("주말은 발행하지 않습니다. FORCE=1 로 강제 실행 가능.");

const axisKey = topics.rotation[weekdayIdx % topics.rotation.length];
const axis = topics.axes[axisKey];
const pool = axis.pool.filter((t) => !used.includes(t));
const candidates = pool.length ? pool : axis.pool; // 한 바퀴 돌면 재사용
const topic = candidates[Math.floor(Math.random() * candidates.length)];

console.log(`[generate] ${dateStr} / 축: ${axis.label} / 주제: ${topic}`);

// ── 2. 프롬프트 ────────────────────────────────────────────
const system = `너는 한국 세무법인의 콘텐츠 에디터다. 세무사가 검수 없이 내보낼 수 있는 수준의 정확도로 인스타그램 카드뉴스 원고를 쓴다.

[작성 원칙]
- 독자: ${axis.audience}
- 톤: ${axis.voice}
- 과장 금지. 확정적 절세 결과, 수임료, 국세청 인맥, 조사 무마 암시는 절대 쓰지 않는다.
- 법령 근거는 조문명 수준까지만 쓰고, 세율·한도 등 숫자는 확실한 것만 쓴다. 애매하면 숫자를 빼고 판단 기준만 쓴다.
- 한 장에 한 메시지. 슬라이드 본문은 2~3문장, 각 문장 40자 이내.
- 이모지 사용 금지. 느낌표 남발 금지.

[슬라이드 구성]
1번(표지): 질문형 또는 상황 제시형 후킹 문구. title 18자 이내, body는 한 문장.
2~6번: 본문. 문제 → 판단 기준 → 실무 처리 → 주의점 순으로 전개.
마지막(7번): 요약 3줄 + 상담 유도 한 문장(수임료·무료 언급 없이).

[출력 형식]
아래 JSON만 출력한다. 마크다운 코드펜스, 설명, 서두 금지.
{
  "topic": "주제",
  "slides": [ { "kind": "cover"|"body"|"outro", "title": "문자열", "body": "문자열", "note": "하단 보조문구 또는 빈 문자열" } ],
  "caption": "인스타 본문. 첫 줄은 후킹, 이후 3~5문단. 해시태그는 제외.",
  "hashtags": ["#세무", "..."]
}
slides는 정확히 7개. hashtags는 12~20개, 한국어 위주, 지역태그 1~2개 포함.`;

const userMsg = `오늘 주제: "${topic}"\n발행일: ${dateStr}\n이 주제로 카드뉴스 7장 원고와 캡션을 작성해줘.`;

// ── 3. API 호출 ────────────────────────────────────────────
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: userMsg }],
  }),
});

if (!res.ok) fail(`Anthropic API ${res.status} ${await res.text()}`);
const data = await res.json();
const raw = data.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("\n")
  .replace(/```json|```/g, "")
  .trim();

let post;
try {
  post = JSON.parse(raw);
} catch {
  fail(`JSON 파싱 실패:\n${raw.slice(0, 500)}`);
}

// ── 4. 구조 검증 ───────────────────────────────────────────
if (!Array.isArray(post.slides) || post.slides.length < 5 || post.slides.length > 10) {
  fail(`슬라이드 수가 ${post.slides?.length}개입니다. 캐러셀은 2~10장만 가능합니다.`);
}
if (!post.caption) fail("caption 이 비어 있습니다.");

// ── 5. 광고규정 필터 ───────────────────────────────────────
const fullText = [
  post.caption,
  ...post.slides.flatMap((s) => [s.title, s.body, s.note]),
  ...(post.hashtags || []),
]
  .filter(Boolean)
  .join("\n");

const hits = rules.blocked_patterns.filter((p) => new RegExp(p).test(fullText));
if (hits.length) fail(`광고규정 금칙어 검출 → ${hits.join(", ")}\n원고를 폐기합니다. 재실행하세요.`);

// ── 6. 캡션 조립 ───────────────────────────────────────────
const tags = (post.hashtags || []).slice(0, rules.max_hashtags).join(" ");
post.finalCaption = `${post.caption}\n\n${rules.required_disclaimer}\n\n${tags}`.slice(
  0,
  rules.max_caption_chars,
);
post.date = dateStr;
post.axis = axis.label;

fs.mkdirSync(BUILD, { recursive: true });
fs.writeFileSync(path.join(BUILD, "post.json"), JSON.stringify(post, null, 2));
fs.writeFileSync(USED, JSON.stringify([...used, topic].slice(-60), null, 2));

console.log(`[generate] 완료 — 슬라이드 ${post.slides.length}장, 캡션 ${post.finalCaption.length}자`);
