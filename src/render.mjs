// 카드 렌더링. queue-build.mjs 에서 import 하거나,
// 단독 실행 시 수정된 post.json 으로 다시 렌더: node src/render.mjs --date 2026-09-28
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { slideHtml } from "./template.mjs";
import { finalize, validateShape } from "./lib/compliance.mjs";
import { ROOT, QUEUE, BUILD, readJson, writeJson, arg, assertDate } from "./lib/util.mjs";

export async function renderPost(post, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith(".jpg")) fs.rmSync(path.join(outDir, f));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  const files = [];
  try {
    for (const [i, slide] of post.slides.entries()) {
      await page.setContent(slideHtml({ ...slide, axisLabel: post.axis }, i, post.slides.length), {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      const name = String(i + 1).padStart(2, "0") + ".jpg";
      const p = path.join(outDir, name);
      await page.screenshot({ path: p, type: "jpeg", quality: 88 });
      if (fs.statSync(p).size > 8 * 1024 * 1024) throw new Error(`${name} 8MB 초과`);
      files.push(name);
    }
  } finally {
    await browser.close();
  }
  post.files = files;
  return files;
}

// ── 단독 실행: 재렌더 ─────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const date = assertDate(arg("date"));
  const dir = path.join(QUEUE, date);
  const post = readJson(path.join(dir, "post.json"));
  if (!post) throw new Error(`queue/${date}/post.json 이 없습니다.`);

  validateShape(post);
  const rules = readJson(path.join(ROOT, "config/compliance.json"));
  const hits = finalize(post, rules);
  if (hits.length) throw new Error(`금칙어 검출: ${hits.join(", ")} → post.json 을 고친 뒤 다시 실행하세요`);

  post.review = { ...(post.review || {}), editedByHuman: true };
  await renderPost(post, dir);
  writeJson(path.join(dir, "post.json"), post);
  writeJson(path.join(BUILD, "built-dates.json"), [date]);
  writeJson(path.join(BUILD, "failures.json"), []);
  console.log(`[render] ${date} 재렌더 완료 (${post.files.length}장)`);
}
