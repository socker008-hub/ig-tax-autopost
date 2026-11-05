// 주간 릴스 MP4 생성: queue/<날짜>/post.json → reels/<날짜>/reel.mp4
//   node src/reel-build.mjs --date 2026-11-06
//   node src/reel-build.mjs --date 2026-11-06 --silent   (TTS 없이 길이 추정)
// 음성: edge-tts (무료, 키 불필요). REEL_VOICE 로 목소리 교체 가능.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { reelHtml } from "./reel-template.mjs";
import { QUEUE, ROOT, readJson, writeJson, arg, assertDate } from "./lib/util.mjs";

const VOICE = process.env.REEL_VOICE || "ko-KR-InJoonNeural"; // 여성: ko-KR-SunHiNeural
const RATE = process.env.REEL_RATE || "+8%";
const MAX_BODY = Number(process.env.REEL_MAX_BODY || 3); // 본문 장면 수
const SILENT = process.argv.includes("--silent");
const FPS = 30;

const date = assertDate(arg("date"));
const post = readJson(path.join(QUEUE, date, "post.json"));
if (!post) throw new Error(`queue/${date}/post.json 이 없습니다.`);

const OUT = path.join(ROOT, "reels", date);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }).toString();

// ── 1. 장면 구성: 표지 + 본문 3 + 마무리 ────────────────────
const slides = post.slides || [];
const cover = slides.find((s) => s.kind === "cover") || slides[0];
const bodies = slides.filter((s) => s.kind === "body").slice(0, MAX_BODY);
const outro = slides.find((s) => s.kind === "outro") || slides.at(-1);

// 내레이션은 한 호흡에 읽히도록 다듬는다 (괄호 주석·조문 나열 제거)
const speak = (s) =>
  s
    .replace(/\([^)]*\)/g, " ")
    .replace(/[①-⑩]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const segments = [
  { kind: "cover", title: cover.title, body: cover.body, say: `${cover.title}. ${cover.body}` },
  ...bodies.map((s) => ({ kind: "body", title: s.title, body: s.body, say: `${s.title}. ${s.body}` })),
  {
    kind: "outro",
    title: "정리하면",
    body: (outro.body || "").split("\n").filter(Boolean).slice(0, 3).join("\n"),
    say: `${(outro.body || "").split("\n").filter(Boolean).slice(0, 3).join(" ")} 자세한 검토가 필요하시면 프로필 링크로 문의 주세요.`,
  },
].map((s) => ({ ...s, say: speak(s.say) }));

// ── 2. 음성 ────────────────────────────────────────────────
function duration(file) {
  return Number(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).trim());
}

for (const [i, seg] of segments.entries()) {
  const n = String(i + 1).padStart(2, "0");
  if (SILENT) {
    seg.dur = Math.min(12, Math.max(3, seg.say.length * 0.16 + 1.2));
    continue;
  }
  seg.audio = path.join(OUT, `${n}.mp3`);
  sh("edge-tts", ["--voice", VOICE, "--rate", RATE, "--text", seg.say, "--write-media", seg.audio]);
  seg.dur = duration(seg.audio) + 0.6; // 말끝 여유
  console.log(`[reel] ${n} 음성 ${seg.dur.toFixed(1)}초`);
}

const total = segments.reduce((a, s) => a + s.dur, 0);
console.log(`[reel] 총 ${total.toFixed(1)}초 / ${segments.length}장면`);
if (total > 90) console.warn("[reel] 90초를 넘습니다. REEL_MAX_BODY 를 줄이세요.");

// ── 3. 프레임 ──────────────────────────────────────────────
const browser = await chromium.launch(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
try {
  for (const [i, seg] of segments.entries()) {
    await page.setContent(reelHtml(seg, i, segments.length, post.axis), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    seg.img = path.join(OUT, `${String(i + 1).padStart(2, "0")}.png`);
    await page.screenshot({ path: seg.img });
  }
} finally {
  await browser.close();
}

// ── 4. 합성 ────────────────────────────────────────────────
// 장면마다 따로 인코딩(느린 세로 패닝) → 무손실 이어붙이기 → 음성 입히기.
// 한 번에 거는 zoompan 은 정지 이미지에서 지나치게 느려 쓰지 않는다.
console.log("[reel] 인코딩 중...");
const parts = [];
for (const [i, s] of segments.entries()) {
  const part = path.join(OUT, `p${i}.mp4`);
  // 1188x2112 로 키운 뒤 재생시간에 걸쳐 위→아래로 아주 조금씩 크롭 위치를 옮긴다
  const pan = `scale=1188:2112,crop=1080:1920:(in_w-1080)/2:'(in_h-1920)*min(t/${s.dur.toFixed(2)},1)'`;
  execFileSync(
    "ffmpeg",
    ["-y", "-loop", "1", "-t", s.dur.toFixed(2), "-i", s.img,
     "-vf", `${pan},fps=${FPS},format=yuv420p,setsar=1`,
     "-c:v", "libx264", "-profile:v", "high", "-preset", "veryfast", "-tune", "stillimage",
     "-crf", "21", "-g", String(FPS * 2), part],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  parts.push(part);
}

const listFile = path.join(OUT, "parts.txt");
fs.writeFileSync(listFile, parts.map((p) => `file '${path.basename(p)}'`).join("\n"));
const silentMp4 = path.join(OUT, "video.mp4");
execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", silentMp4],
  { stdio: ["ignore", "ignore", "pipe"] });

const finalMp4 = path.join(OUT, "reel.mp4");
if (SILENT) {
  execFileSync("ffmpeg", ["-y", "-i", silentMp4, "-c", "copy", "-movflags", "+faststart", finalMp4],
    { stdio: ["ignore", "ignore", "pipe"] });
} else {
  const aList = path.join(OUT, "audio.txt");
  fs.writeFileSync(aList, segments.map((s) => `file '${path.basename(s.audio)}'`).join("\n"));
  execFileSync(
    "ffmpeg",
    ["-y", "-i", silentMp4, "-f", "concat", "-safe", "0", "-i", aList,
     "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
     "-shortest", "-movflags", "+faststart", finalMp4],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
}
for (const p of [...parts, listFile, silentMp4]) fs.rmSync(p, { force: true });

// ── 5. 표지 이미지 + 캡션 ──────────────────────────────────
fs.copyFileSync(segments[0].img, path.join(OUT, "cover.png"));
const tags = (post.hashtags || []).slice(0, 12).join(" ");
fs.writeFileSync(
  path.join(OUT, "caption.txt"),
  `${(post.caption || "").split("\n\n")[0]}\n\n자세한 내용은 프로필 링크의 피드 게시물에서 확인하세요.\n\n개별 사안은 사실관계에 따라 결론이 달라집니다.\n\n${tags}\n`,
);
writeJson(path.join(OUT, "meta.json"), {
  date, topic: post.topic, axis: post.axis, seconds: Number(total.toFixed(1)),
  scenes: segments.map((s) => ({ title: s.title, dur: Number(s.dur.toFixed(1)), say: s.say })),
});

const mb = (fs.statSync(path.join(OUT, "reel.mp4")).size / 1048576).toFixed(1);
console.log(`[reel] 완료 — reels/${date}/reel.mp4 (${mb}MB, ${total.toFixed(0)}초)`);
