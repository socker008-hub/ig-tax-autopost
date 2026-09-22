// 다음 평일 5건(또는 --date 지정 1건)을 생성해 queue/<날짜>/ 에 저장
//   node src/queue-build.mjs                 → 내일부터 평일 5건 (이미 있는 날짜는 건너뜀)
//   node src/queue-build.mjs --date 2026-09-28 --force   → 해당 날짜 재생성
import fs from "node:fs";
import path from "node:path";
import { claude, parseJson } from "./lib/claude.mjs";
import { writerSystem, writerUser, CHECKER_SYSTEM, checkerUser } from "./lib/prompts.mjs";
import { finalize, validateShape } from "./lib/compliance.mjs";
import { renderPost } from "./render.mjs";
import {
  ROOT, QUEUE, BUILD, readJson, writeJson, nextWeekdays, weekdayIdx, arg, assertDate,
} from "./lib/util.mjs";

const WRITER_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const CHECKER_MODEL = process.env.CHECKER_MODEL || WRITER_MODEL;

const topics = readJson(path.join(ROOT, "config/topics.json"));
const rules = readJson(path.join(ROOT, "config/compliance.json"));
const usedPath = path.join(ROOT, "config/used.json");
const used = readJson(usedPath, []);

const onlyDate = arg("date");
const force = Boolean(arg("force"));
const dates = onlyDate ? [assertDate(onlyDate)] : nextWeekdays(5);

function pickTopic(axisKey, exclude) {
  const pool = topics.axes[axisKey].pool;
  const fresh = pool.filter((t) => !used.includes(t) && !exclude.includes(t));
  const list = fresh.length ? fresh : pool.filter((t) => !exclude.includes(t));
  return list[Math.floor(Math.random() * list.length)];
}

async function buildOne(date) {
  const axisKey = topics.rotation[weekdayIdx(date) % topics.rotation.length];
  const axis = topics.axes[axisKey];
  const tried = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const topic = pickTopic(axisKey, tried);
    tried.push(topic);
    console.log(`[queue] ${date} (${axis.label}) 시도${attempt}: ${topic}`);

    // 1) 작성
    const draft = parseJson(
      await claude({ system: writerSystem(axis), user: writerUser(topic, date), model: WRITER_MODEL }),
    );
    validateShape(draft);

    // 2) 검증
    const check = parseJson(
      await claude({ system: CHECKER_SYSTEM, user: checkerUser(topic, draft), model: CHECKER_MODEL }),
    );
    if (check.verdict === "reject") {
      console.log(`[queue] 검증자 반려: ${(check.notes || []).join(" / ")}`);
      continue;
    }
    const post = check.post?.slides ? check.post : draft;
    validateShape(post);

    // 3) 용어·해시태그·금칙어
    const hits = finalize(post, rules);
    if (hits.length) {
      console.log(`[queue] 금칙어 검출(${hits.join(", ")}) → 다른 주제로 재시도`);
      continue;
    }

    Object.assign(post, {
      date,
      axis: axis.label,
      topic,
      review: { verdict: check.verdict || "ok", notes: check.notes || [] },
    });

    // 4) 렌더
    const dir = path.join(QUEUE, date);
    await renderPost(post, dir);
    writeJson(path.join(dir, "post.json"), post);
    used.push(topic);
    return;
  }
  throw new Error("2회 시도 모두 반려 또는 금칙어 검출");
}

const built = [];
const failures = [];
for (const date of dates) {
  if (fs.existsSync(path.join(QUEUE, date, "post.json")) && !force) {
    console.log(`[queue] ${date} 이미 있음 → 건너뜀`);
    continue;
  }
  try {
    await buildOne(date);
    built.push(date);
  } catch (e) {
    console.error(`[queue] ${date} 실패: ${e.message}`);
    failures.push({ date, error: e.message.slice(0, 300) });
  }
}

writeJson(usedPath, used.slice(-80));
writeJson(path.join(BUILD, "built-dates.json"), built);
writeJson(path.join(BUILD, "failures.json"), failures);
console.log(`[queue] 완료 — 생성 ${built.length}건, 실패 ${failures.length}건`);
if (!built.length && failures.length) process.exit(1);
