// 캐러셀 발행: 자식 컨테이너 N개 → CAROUSEL 컨테이너 → media_publish
// 사용법: node src/publish.mjs --dry-run   (실제 발행 직전까지만 수행)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DRY = process.argv.includes("--dry-run");

const TOKEN = need("IG_ACCESS_TOKEN");
const IG_USER_ID = need("IG_USER_ID");
const IMAGE_BASE_URL = need("IMAGE_BASE_URL").replace(/\/$/, "");
const VERSION = process.env.GRAPH_VERSION || "v23.0";

// ★ 가장 흔한 실패 지점: 토큰 종류에 따라 호스트가 다릅니다.
//   IGAA... (Instagram 로그인 직접 발급) → graph.instagram.com
//   EAA...  (Facebook 로그인 경유)       → graph.facebook.com
const HOST = TOKEN.startsWith("IGAA") ? "https://graph.instagram.com" : "https://graph.facebook.com";
const BASE = `${HOST}/${VERSION}`;

function need(k) {
  const v = process.env[k];
  if (!v) {
    console.error(`[publish] 환경변수 ${k} 가 없습니다.`);
    process.exit(1);
  }
  return v;
}

async function api(endpoint, params) {
  const url = new URL(`${BASE}/${endpoint}`);
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(url, { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(`${endpoint} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function waitReady(creationId, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const url = new URL(`${BASE}/${creationId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", TOKEN);
    const r = await (await fetch(url)).json();
    if (r.status_code === "FINISHED") return;
    if (r.status_code === "ERROR") throw new Error(`컨테이너 처리 실패: ${JSON.stringify(r)}`);
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error("컨테이너가 FINISHED 상태가 되지 않았습니다.");
}

const post = JSON.parse(fs.readFileSync(path.join(ROOT, "build/post.json"), "utf8"));
const files = JSON.parse(fs.readFileSync(path.join(ROOT, "build/files.json"), "utf8"));
const urls = files.map((f) => `${IMAGE_BASE_URL}/${f}`);

console.log(`[publish] host=${HOST} slides=${urls.length} dry=${DRY}`);
console.log(`[publish] 캡션 미리보기:\n${post.finalCaption.slice(0, 200)}...\n`);

// 0. 이미지 URL이 인증 없이 열리는지 먼저 확인 (실패 1순위 원인)
for (const u of urls) {
  const head = await fetch(u, { method: "HEAD" });
  if (!head.ok) throw new Error(`이미지 URL 공개 접근 실패 (${head.status}): ${u}`);
}
console.log("[publish] 이미지 URL 공개 접근 확인 완료");

if (DRY) {
  console.log("[publish] --dry-run: 여기서 중단합니다. 실제 발행은 수행하지 않았습니다.");
  urls.forEach((u) => console.log("  " + u));
  process.exit(0);
}

// 1. 자식 컨테이너
const children = [];
for (const [i, image_url] of urls.entries()) {
  const r = await api(`${IG_USER_ID}/media`, { image_url, is_carousel_item: "true" });
  await waitReady(r.id);
  children.push(r.id);
  console.log(`[publish] child ${i + 1}/${urls.length} → ${r.id}`);
}

// 2. 캐러셀 컨테이너
const carousel = await api(`${IG_USER_ID}/media`, {
  media_type: "CAROUSEL",
  children: children.join(","),
  caption: post.finalCaption,
});
await waitReady(carousel.id);
console.log(`[publish] carousel container → ${carousel.id}`);

// 3. 발행
const published = await api(`${IG_USER_ID}/media_publish`, { creation_id: carousel.id });
console.log(`[publish] 발행 완료 media_id=${published.id}`);

fs.appendFileSync(
  path.join(ROOT, "config/published.log"),
  `${post.date}\t${published.id}\t${post.topic}\n`,
);
