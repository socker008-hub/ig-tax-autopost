// 장기 토큰(60일) 갱신. 최소 24시간 이상 경과한 토큰만 갱신 가능합니다.
// 월 1회 워크플로에서 실행 → 새 토큰을 gh secret 으로 덮어씁니다.
const TOKEN = process.env.IG_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("IG_ACCESS_TOKEN 없음");
  process.exit(1);
}

const isIgLogin = TOKEN.startsWith("IGAA");
const url = isIgLogin
  ? `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`
  : `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}` +
    `&fb_exchange_token=${TOKEN}`;

const r = await fetch(url);
const j = await r.json();
if (!r.ok || !j.access_token) {
  console.error(`갱신 실패: ${JSON.stringify(j)}`);
  process.exit(1);
}

const days = Math.round((j.expires_in || 0) / 86400);
console.error(`[refresh] 갱신 성공 — 만료까지 약 ${days}일`);
process.stdout.write(j.access_token); // stdout 은 토큰만 (gh secret set 파이프용)
