// 다음 평일 5건(또는 --date 지정 1건)을 생성해 queue/<날짜>/ 에 저장
//   node src/queue-build.mjs                 → 내일부터 평일 5건 (이미 있는 날짜는 건너뜀)
//   node src/queue-build.mjs --date 2026-09-28 --force   → 해당 날짜 재생성
import fs from "node:fs";
import path from "node:path";
import { claude, parseJson } from "./lib/claude.mjs";
import {
  writerSystem, writerUser, CHECKER_SYSTEM, checkerUser,
  writerSystemJa, writerUserJa, CHECKER_SYSTEM_JA,
} from "./lib/prompts.mjs";
import { L, isJa } from "./lib/locale.mjs";
import { finalize, validateShape } from "./lib/compliance.mjs";
import { findIssues, polishSystem, polishUser, applyPolish } from "./lib/polish.mjs";
import { renderPost } from "./render.mjs";
import {
  ROOT, QUEUE, BUILD, readJson, writeJson, nextWeekdays, weekdayIdx, slotIndex, arg, assertDate,
} from "./lib/util.mjs";

const WRITER_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const CHECKER_MODEL = process.env.CHECKER_MODEL || WRITER_MODEL;

const topics = readJson(path.join(ROOT, L.topics));
const rules = readJson(path.join(ROOT, L.compliance));
const usedPath = path.join(ROOT, isJa ? "config/used.ja.json" : "config/used.json");
const used = readJson(usedPath, []);

const onlyDate = arg("date");
const force = Boolean(arg("force"));
const dates = onlyDate ? [assertDate(onlyDate)] : nextWeekdays(L.perWeek, L.publishDays);

function pickTopic(axisKey, exclude) {
  const pool = topics.axes[axisKey].pool;
  const fresh = pool.filter((t) => !used.includes(t) && !exclude.includes(t));
  const list = fresh.length ? fresh : pool.filter((t) => !exclude.includes(t));
  return list[Math.floor(Math.random() * list.length)];
}

async function buildOne(date) {
  // 주 2회 계정은 요일이 둘뿐이라, 슬롯 순번으로 돌려야 네 축이 모두 쓰인다
  const rotIdx = isJa ? slotIndex(date, L.publishDays) : weekdayIdx(date);
  const axisKey = topics.rotation[rotIdx % topics.rotation.length];
  const axis = topics.axes[axisKey];
  const tried = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const topic = pickTopic(axisKey, tried);
    tried.push(topic);
    console.log(`[queue] ${date} (${axis.label}) 시도${attempt}: ${topic}`);

    // 1) 작성
    const draft = parseJson(
      await claude({
        system: isJa ? writerSystemJa(axis) : writerSystem(axis),
        user: isJa ? writerUserJa(topic, date) : writerUser(topic, date),
        model: WRITER_MODEL,
      }),
    );
    validateShape(draft);

    // 2) 검증
    const check = parseJson(
      await claude({
        system: isJa ? CHECKER_SYSTEM_JA : CHECKER_SYSTEM,
        user: checkerUser(topic, draft),
        model: CHECKER_MODEL,
      }),
    );
    if (check.verdict === "reject") {
      console.log(`[queue] 검증자 반려: ${(check.notes || []).join(" / ")}`);
      continue;
    }
    const post = check.post?.slides ? check.post : draft;
    validateShape(post);

    // 3) 길이·표기 강제 — 지시만으로는 지켜지지 않아 코드로 확인하고 한 번 더 다듬는다
    let issues = findIssues(post);
    if (issues.length) {
      console.log(`[queue] 규칙 위반 ${issues.length}장 → 다듬기`);
      try {
        const fixed = parseJson(
          await claude({
            system: polishSystem(),
            user: polishUser(post, issues),
            model: CHECKER_MODEL,
            maxTokens: 2000,
          }),
        );
        const n = applyPolish(post, fixed);
        issues = findIssues(post);
        console.log(`[queue] ${n}장 반영, 남은 위반 ${issues.length}장`);
      } catch (e) {
        console.warn(`[queue] 다듬기 실패(원고는 유지): ${e.message}`);
      }
      if (issues.length) {
        check.notes = [
          ...(check.notes || []),
          `※ 길이·표기 규칙을 넘긴 슬라이드가 남아 있습니다: ${issues
            .map((i) => `${i.index + 1}번(${i.problems.join(", ")})`)
            .join(" / ")}`,
        ];
      }
    }

    // 4) 용어·해시태그·금칙어
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

    // 5) 렌더
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
