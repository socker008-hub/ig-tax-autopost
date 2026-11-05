// 릴스 프레임 1장을 1080x1920(9:16) HTML로 렌더링
const T = {
  ink: "#14263A",
  paper: "#F2F0EA",
  goldOnInk: "#F0A63A",
  goldOnPaper: "#C47D14",
  muted: "#7C8B9B",
};

const esc = (s = "") =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

export const BRAND = { firm: "세무법인 위드플러스", handle: "@withpluscho" };

// 글자 수에 따라 본문 크기를 줄여 넘침 방지
function bodySize(len) {
  if (len <= 60) return 60;
  if (len <= 100) return 52;
  if (len <= 150) return 46;
  if (len <= 220) return 40;
  return 35;
}
function titleSize(kind, len) {
  const base = kind === "cover" ? 104 : 74;
  if (len <= 14) return base;
  if (len <= 22) return Math.round(base * 0.85);
  return Math.round(base * 0.72);
}

export function reelHtml(seg, index, total, axisLabel) {
  const dark = seg.kind === "cover" || seg.kind === "outro";
  const bg = dark ? T.ink : T.paper;
  const fg = dark ? T.paper : T.ink;
  const sub = dark ? "rgba(242,240,234,0.62)" : T.muted;
  const gold = dark ? T.goldOnInk : T.goldOnPaper;
  const pct = Math.round(((index + 1) / total) * 100);

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1080px;height:1920px;background:${bg};color:${fg};
       font-family:"Pretendard Variable",Pretendard,"Noto Sans CJK KR","Noto Sans KR",sans-serif;
       display:flex;flex-direction:column;padding:210px 84px 330px;overflow:hidden}
  .bar{position:absolute;top:150px;left:84px;right:84px;height:6px;
       background:${dark ? "rgba(242,240,234,0.18)" : "rgba(20,38,58,0.14)"};border-radius:3px}
  .bar i{display:block;height:6px;width:${pct}%;background:${gold};border-radius:3px}
  .top{display:flex;align-items:center;gap:22px;margin-bottom:10px}
  .seal{width:56px;height:56px;border:3px solid ${gold};color:${gold};flex:none;
        font-family:"Nanum Myeongjo","Noto Serif CJK KR",serif;font-size:30px;line-height:50px;text-align:center}
  .axis{font-size:30px;letter-spacing:-0.01em;color:${sub}}
  main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:48px}
  h1{font-family:"Nanum Myeongjo","Noto Serif CJK KR",serif;font-size:${titleSize(seg.kind, (seg.title || "").length)}px;
     line-height:1.3;letter-spacing:-0.02em;word-break:keep-all}
  p{font-size:${bodySize((seg.body || "").length)}px;line-height:1.66;letter-spacing:-0.015em;
    word-break:keep-all;white-space:pre-line;color:${dark ? "rgba(242,240,234,0.9)" : "rgba(20,38,58,0.88)"}}
  footer{display:flex;align-items:center;justify-content:space-between;
         border-top:1px solid ${dark ? "rgba(242,240,234,0.22)" : "rgba(20,38,58,0.16)"};padding-top:32px}
  .firm{font-size:30px}
  .firm span{display:block;font-size:26px;color:${sub};margin-top:8px}
  .cta{font-size:30px;color:${gold}}
</style></head><body>
  <div class="bar"><i></i></div>
  <div class="top"><div class="seal">稅</div><div class="axis">${esc(axisLabel || "")}</div></div>
  <main>
    <h1>${esc(seg.title)}</h1>
    ${seg.body ? `<p>${esc(seg.body)}</p>` : ""}
  </main>
  <footer>
    <div class="firm">${BRAND.firm}<span>${BRAND.handle}</span></div>
    <div class="cta">${seg.kind === "outro" ? "프로필 링크" : seg.kind === "cover" ? "끝까지 보기" : ""}</div>
  </footer>
</body></html>`;
}
