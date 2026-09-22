// 슬라이드 1장을 1080x1350(4:5) HTML로 렌더링
// 디자인 토큰: 남색 서류 잉크 + 종이 + 인주(印朱) 레드
const TOKENS = {
  ink: "#14263A",
  paper: "#F2F0EA",
  seal: "#C4382D",
  muted: "#7C8B9B",
  rule: "rgba(20,38,58,0.16)",
};

const esc = (s = "") =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

export const BRAND = {
  firm: "세무법인 위드플러스",
  handle: "@withplus.tax",
  tagline: "법인세 · 국제조세 · 한일 크로스보더",
};

export function slideHtml(slide, index, total) {
  const dark = slide.kind === "cover";
  const bg = dark ? TOKENS.ink : TOKENS.paper;
  const fg = dark ? TOKENS.paper : TOKENS.ink;
  const sub = dark ? "rgba(242,240,234,0.62)" : TOKENS.muted;
  const titleSize = slide.kind === "cover" ? 92 : 62;

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1080px;height:1350px;background:${bg};color:${fg};
       font-family:"Pretendard Variable",Pretendard,sans-serif;
       display:flex;flex-direction:column;justify-content:space-between;
       padding:92px 88px 76px;overflow:hidden}
  .top{display:flex;align-items:center;gap:20px}
  .seal{width:46px;height:46px;border:3px solid ${TOKENS.seal};color:${TOKENS.seal};
        font-family:"Nanum Myeongjo",serif;font-size:24px;line-height:40px;text-align:center}
  .axis{font-size:26px;letter-spacing:-0.01em;color:${sub}}
  main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:34px}
  h1{font-family:"Nanum Myeongjo",serif;font-size:${titleSize}px;line-height:1.28;
     letter-spacing:-0.02em;word-break:keep-all;max-width:15ch}
  p{font-size:40px;line-height:1.62;letter-spacing:-0.015em;word-break:keep-all;
    max-width:24ch;color:${dark ? "rgba(242,240,234,0.88)" : "rgba(20,38,58,0.86)"}}
  .note{font-size:27px;line-height:1.5;color:${sub};border-left:4px solid ${TOKENS.seal};
        padding-left:20px;max-width:26ch}
  footer{display:flex;align-items:flex-end;justify-content:space-between;
         border-top:1px solid ${dark ? "rgba(242,240,234,0.22)" : TOKENS.rule};padding-top:26px}
  .firm{font-size:26px;letter-spacing:-0.01em}
  .firm span{display:block;font-size:22px;color:${sub};margin-top:6px}
  .pager{font-family:"Nanum Myeongjo",serif;font-size:34px;color:${sub}}
  .pager b{color:${dark ? TOKENS.paper : TOKENS.ink};font-weight:700}
  .swipe{font-size:26px;color:${TOKENS.seal}}
</style></head><body>
  <div class="top">
    <div class="seal">稅</div>
    <div class="axis">${esc(slide.axisLabel || "")}</div>
  </div>
  <main>
    <h1>${esc(slide.title)}</h1>
    ${slide.body ? `<p>${esc(slide.body)}</p>` : ""}
    ${slide.note ? `<div class="note">${esc(slide.note)}</div>` : ""}
  </main>
  <footer>
    <div class="firm">${BRAND.firm}<span>${BRAND.handle}</span></div>
    ${
      index === 0
        ? `<div class="swipe">넘겨보기</div>`
        : `<div class="pager"><b>${index + 1}</b> / ${total}</div>`
    }
  </footer>
</body></html>`;
}
