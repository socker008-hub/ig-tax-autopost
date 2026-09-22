// 오늘(또는 INPUT_DATE) 게시물이 검수 이슈에서 체크됐는지 확인 → GITHUB_OUTPUT 에 기록
import fs from "node:fs";
import path from "node:path";
import { ROOT, QUEUE, kstToday, assertDate } from "./lib/util.mjs";
import { checkboxRe } from "./lib/issue-md.mjs";

const { GH_TOKEN, REPO, GITHUB_OUTPUT, INPUT_DATE } = process.env;
const date = assertDate(INPUT_DATE || kstToday());

function out(approved, reason, issue = "") {
  console.log(`[gate] ${date} → ${approved ? "승인됨, 발행 진행" : `건너뜀: ${reason}`}`);
  if (GITHUB_OUTPUT) {
    fs.appendFileSync(GITHUB_OUTPUT, `approved=${approved}\ndate=${date}\nissue=${issue}\n`);
  }
  process.exit(0);
}

if (!fs.existsSync(path.join(QUEUE, date, "post.json"))) out(false, "큐에 게시물 없음");

const log = path.join(ROOT, "config/published.log");
if (fs.existsSync(log) && fs.readFileSync(log, "utf8").includes(`${date}\t`)) {
  out(false, "이미 발행된 날짜");
}

const res = await fetch(
  `https://api.github.com/repos/${REPO}/issues?labels=review-queue&state=open&per_page=50`,
  { headers: { authorization: `Bearer ${GH_TOKEN}`, accept: "application/vnd.github+json" } },
);
if (!res.ok) throw new Error(`이슈 조회 실패 ${res.status} ${await res.text()}`);
const issues = await res.json();
const hit = issues.find((is) => checkboxRe(date, true).test(is.body || ""));

hit ? out(true, "", hit.number) : out(false, "검수 이슈에서 체크되지 않음");
