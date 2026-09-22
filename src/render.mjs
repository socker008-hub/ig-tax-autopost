// build/post.json → build/out/01.jpg ... (1080x1350 JPEG)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { slideHtml } from "./template.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const post = JSON.parse(fs.readFileSync(path.join(ROOT, "build/post.json"), "utf8"));
const OUT = path.join(ROOT, "build/out");

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

const files = [];
for (const [i, slide] of post.slides.entries()) {
  await page.setContent(slideHtml({ ...slide, axisLabel: post.axis }, i, post.slides.length), {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  const name = String(i + 1).padStart(2, "0") + ".jpg";
  await page.screenshot({ path: path.join(OUT, name), type: "jpeg", quality: 88 });

  const bytes = fs.statSync(path.join(OUT, name)).size;
  if (bytes > 8 * 1024 * 1024) throw new Error(`${name} 이 8MB를 넘습니다 (인스타 업로드 한도).`);
  files.push(name);
  console.log(`[render] ${name} (${Math.round(bytes / 1024)}KB)`);
}

await browser.close();
fs.writeFileSync(path.join(ROOT, "build/files.json"), JSON.stringify(files, null, 2));
console.log(`[render] 완료 — ${files.length}장`);
