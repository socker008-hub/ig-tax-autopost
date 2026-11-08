// 슬라이드 1장을 1080x1350(4:5) HTML로 렌더링
// 팔레트·레이아웃·서체·질감은 themes.mjs 가 날짜별로 고르고,
// 브랜드 표기와 글꼴 스택은 lib/locale.mjs 가 언어별로 정한다.
import { themeFor } from "./themes.mjs";
import { L } from "./lib/locale.mjs";

const esc = (s = "") =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

export const BRAND = L.brand;

const titleSize = (kind, len, scale) => {
  const base = kind === "cover" ? 92 : 62;
  let f = 1;
  if (len > 14) f = 0.86;
  if (len > 22) f = 0.76;
  if (len > 30) f = 0.68;
  if (len > 40) f = 0.6;
  return Math.round(base * f * scale);
};
const bodySize = (len, scale) => {
  let s = 40;
  if (len > 60) s = 36;
  if (len > 100) s = 32;
  if (len > 150) s = 29;
  if (len > 220) s = 26;
  return Math.round(s * scale);
};

// 미세한 종이 질감. 평평한 단색이 가장 '찍어낸' 인상을 준다.
const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">` +
      `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"/>` +
      `<feColorMatrix type="saturate" values="0"/></filter>` +
      `<rect width="200" height="200" filter="url(#n)"/></svg>`,
  );

function motifHtml(kind, accent, fg) {
  if (kind === "bar") return `<div class="m-bar"></div>`;
  if (kind === "bracket") return `<div class="m-bracket"></div>`;
  if (kind === "dot") return `<div class="m-dot"></div>`;
  return `<div class="m-seal">${L.seal}</div>`;
}

export function slideHtml(slide, index, total, theme) {
  const t = theme || themeFor(slide.axisLabel || "default");
  const isCover = slide.kind === "cover";

  const inverted = !isCover && t.invertEvery > 0 && (index + 1) % t.invertEvery === 0;
  const dark = isCover ? t.coverDark : inverted;

  const bg = dark ? t.dark : t.light;
  const fg = dark ? t.light : t.dark;
  const sub = dark ? t.mutedOnDark : t.mutedOnLight;
  const accent = dark ? t.accentOnDark : t.accentOnLight;
  const bodyFg = dark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.80)";
  const hair = dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.16)";
  const panelBg = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  const F = t.titleFont;
  const titleFamily = L[F.role] || L.serif;
  const titleColor = isCover && !dark ? accent : fg;
  const ts = titleSize(slide.kind, (slide.title || "").length, t.scale);
  const bs = bodySize((slide.body || "").length, t.scale);
  const justify =
    t.anchor === "bottom" ? "flex-end" : t.anchor === "top" ? "flex-start" : "center";

  const meta = `${motifHtml(t.motif, accent, fg)}<div class="axis">${esc(slide.axisLabel || "")}</div>`;
  const pager = `<div class="pager"><b>${String(index + 1).padStart(2, "0")}</b><i>/${String(total).padStart(2, "0")}</i></div>`;
  const foot = `<div class="firm">${L.brand.firm}<span>${L.brand.handle}</span></div>${
    index === 0 ? `<div class="swipe">${L.ui.swipe}</div>` : pager
  }`;

  const title = `<h1>${esc(slide.title)}</h1>`;
  const body = slide.body ? `<p>${esc(slide.body)}</p>` : "";
  const note = slide.note ? `<div class="note">${esc(slide.note)}</div>` : "";

  let inner;
  let extraCss = "";

  if (t.layout === "editorial") {
    extraCss = `
      .bignum{position:absolute;top:150px;right:${t.padX - 16}px;font-family:${titleFamily};
              font-weight:${F.weight};font-size:300px;line-height:1;color:${accent};
              opacity:${dark ? 0.15 : 0.11};letter-spacing:-0.04em}
      main{justify-content:flex-start;padding-top:64px}
      h1{max-width:10.5em}`;
    inner = `<div class="bignum">${index === 0 ? L.seal : String(index + 1).padStart(2, "0")}</div>
      <div class="top">${meta}</div><main>${title}${body}${note}</main>`;
  } else if (t.layout === "rule") {
    extraCss = `
      .top{display:none}
      .rule{width:148px;height:10px;background:${accent};margin-bottom:12px}
      .axis2{font-size:26px;color:${sub};margin-bottom:30px}
      h1{max-width:11em}`;
    inner = `<main><div class="rule"></div>
        <div class="axis2">${esc(slide.axisLabel || "")}</div>${title}${body}${note}</main>`;
  } else if (t.layout === "panel") {
    extraCss = `
      .panel{background:${panelBg};border-left:6px solid ${accent};padding:40px 44px}
      .panel p{margin:0;max-width:20em}
      .panel .note{margin-top:26px;border-left:none;padding-left:0}
      h1{max-width:11em}`;
    inner = `<div class="top">${meta}</div>
      <main>${title}${body || note ? `<div class="panel">${body}${note}</div>` : ""}</main>`;
  } else if (t.layout === "band") {
    // 제목을 강조색 띠 위에 올린다
    const bandFg = dark ? t.dark : t.light;
    extraCss = `
      .top{display:none}
      body{padding-top:0;padding-left:0;padding-right:0}
      .band{background:${accent};color:${bandFg};padding:120px ${t.padX}px 56px;}
      .band .axis3{font-size:26px;opacity:0.72;margin-bottom:26px}
      .band h1{color:${bandFg};max-width:11.5em}
      main{padding:64px ${t.padX}px 0;justify-content:flex-start;flex:1}
      footer{margin:0 ${t.padX}px}`;
    inner = `<div class="band"><div class="axis3">${esc(slide.axisLabel || "")}</div>${title}</div>
      <main>${body}${note}</main>`;
  } else if (t.layout === "margin") {
    // 왼쪽에 세로 괘선을 두고 본문을 안쪽으로 들인다
    extraCss = `
      .top{margin-left:52px}
      main{margin-left:52px;position:relative}
      main:before{content:"";position:absolute;left:-52px;top:6px;bottom:6px;width:3px;background:${hair}}
      main:after{content:"";position:absolute;left:-55px;top:6px;width:9px;height:72px;background:${accent}}
      footer{margin-left:52px}
      h1{max-width:11em}`;
    inner = `<div class="top">${meta}</div><main>${title}${body}${note}</main>`;
  } else {
    extraCss = `h1{max-width:11.5em}`;
    inner = `<div class="top">${meta}</div><main>${title}${body}${note}</main>`;
  }

  return `<!doctype html><html lang="${L.lang}"><head><meta charset="utf-8">
${L.fontCss}
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{position:relative;width:1080px;height:1350px;background:${bg};color:${fg};
       font-family:${L.sans};
       display:flex;flex-direction:column;justify-content:space-between;
       padding:92px ${t.padX}px 76px;overflow:hidden}
  ${t.grain ? `body:before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
       background-image:url("${GRAIN}");background-size:200px 200px;
       opacity:${dark ? 0.1 : 0.14};mix-blend-mode:${dark ? "screen" : "multiply"}}` : ""}
  .top{display:flex;align-items:center;gap:20px;position:relative;z-index:1}
  .m-seal{width:46px;height:46px;flex:none;border:3px solid ${accent};color:${accent};
          font-family:${L.serif};font-size:24px;line-height:40px;text-align:center}
  .m-bar{width:64px;height:12px;background:${accent};flex:none}
  .m-bracket{width:40px;height:40px;border-left:7px solid ${accent};border-top:7px solid ${accent};flex:none}
  .m-dot{width:26px;height:26px;border-radius:50%;background:${accent};flex:none}
  .axis{font-size:26px;letter-spacing:-0.01em;color:${sub}}
  main{flex:1;display:flex;flex-direction:column;justify-content:${justify};gap:34px;
       position:relative;z-index:1}
  h1{font-family:${titleFamily};font-weight:${F.weight};font-size:${ts}px;line-height:1.32;
     letter-spacing:${F.tracking};${L.breakCss};color:${titleColor}}
  p{font-size:${bs}px;line-height:1.66;letter-spacing:-0.01em;${L.breakCss};
    white-space:pre-line;max-width:22em;color:${bodyFg}}
  .note{font-size:26px;line-height:1.5;color:${sub};border-left:4px solid ${accent};
        padding-left:20px;max-width:24em}
  footer{display:flex;align-items:flex-end;justify-content:space-between;
         border-top:1px solid ${hair};padding-top:26px;position:relative;z-index:1}
  .firm{font-size:26px;letter-spacing:-0.01em}
  .firm span{display:block;font-size:22px;color:${sub};margin-top:6px}
  .pager{font-family:${titleFamily};font-weight:${F.weight};font-size:32px;color:${sub}}
  .pager b{color:${fg};font-weight:inherit}
  .pager i{font-style:normal}
  .swipe{font-size:26px;color:${accent}}
  ${extraCss}
</style></head><body>
  ${inner}
  <footer>${foot}</footer>
</body></html>`;
}
