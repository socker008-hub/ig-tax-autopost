// 검수 이슈 생성/갱신
//   node src/issue.mjs week                  → 새 검수 이슈 생성
//   node src/issue.mjs single <날짜>          → 기존 이슈에서 해당 날짜 체크 해제 + 새 미리보기 댓글
import path from "node:path";
import { BUILD, readJson, kstToday } from "./lib/util.mjs";
import { section, header, checkboxRe } from "./lib/issue-md.mjs";

const { GH_TOKEN, REPO, BRANCH = "main" } = process.env;
const LABEL = "review-queue";
const mode = process.argv[2] || "week";

async function gh(method, url, body) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${url}`, {
    method,
    headers: {
      authorization: `Bearer ${GH_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && !(method === "POST" && url === "/labels" && res.status === 422)) {
    throw new Error(`${method} ${url} → ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

const dates = readJson(path.join(BUILD, "built-dates.json"), []);
const failures = readJson(path.join(BUILD, "failures.json"), []);
if (!dates.length && !failures.length) {
  console.log("[issue] 새로 만든 게시물이 없어 이슈를 만들지 않습니다.");
  process.exit(0);
}

await gh("POST", "/labels", { name: LABEL, color: "E89B2D", description: "인스타 게시물 검수 대기" });
const open = await gh("GET", `/issues?labels=${LABEL}&state=open&per_page=50`);
const opts = { repo: REPO, branch: BRANCH };

const failText = failures.length
  ? `\n### 생성 실패\n${failures.map((f) => `- ${f.date}: ${f.error}`).join("\n")}\n\n→ mode \`regenerate\` + 날짜로 다시 시도하세요.\n`
  : "";

if (mode === "week") {
  // 날짜가 모두 지난 이슈는 닫기
  const today = kstToday();
  for (const is of open) {
    const ds = [...(is.body || "").matchAll(/\] (\d{4}-\d{2}-\d{2}) 승인/g)].map((m) => m[1]);
    if (ds.length && ds.every((d) => d < today)) {
      await gh("PATCH", `/issues/${is.number}`, { state: "closed" });
      console.log(`[issue] 지난 이슈 #${is.number} 닫음`);
    }
  }
  const title = dates.length
    ? `검수 대기: ${dates[0].slice(5)} ~ ${dates.at(-1).slice(5)} (${dates.length}건)`
    : "검수 대기: 생성 실패 확인 필요";
  const body = header(dates) + dates.map((d) => section(d, opts)).join("\n") + failText;
  const created = await gh("POST", "/issues", { title, body, labels: [LABEL] });
  console.log(`[issue] 생성 #${created.number} ${created.html_url}`);
} else {
  const date = dates[0];
  if (!date) {
    console.log(`[issue] 실패:\n${failText}`);
    process.exit(1);
  }
  const bust = `?v=${Date.now()}`;
  const target = open.find((is) => checkboxRe(date, false).test(is.body) || checkboxRe(date, true).test(is.body));

  if (target) {
    const body = target.body.replace(checkboxRe(date, true), `- [ ] ${date} 승인`);
    await gh("PATCH", `/issues/${target.number}`, { body });
    await gh("POST", `/issues/${target.number}/comments`, {
      body: `**${date} 새 버전** — 위 본문의 ${date} 체크가 해제됐습니다. 확인 후 다시 체크하세요.\n\n${section(date, { ...opts, bust })}`,
    });
    console.log(`[issue] #${target.number} 갱신 (${date})`);
  } else {
    const created = await gh("POST", "/issues", {
      title: `검수 대기: ${date.slice(5)} (1건)`,
      body: header([date]) + section(date, { ...opts, bust }),
      labels: [LABEL],
    });
    console.log(`[issue] 생성 #${created.number}`);
  }
}
