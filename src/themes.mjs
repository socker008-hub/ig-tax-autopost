// 카드 디자인 변주. 날짜를 씨앗으로 팔레트·레이아웃·서체·질감을 조합한다.
// 한 게시물(7장)은 같은 조합을 쓰고, 날짜가 바뀌면 조합이 바뀐다.

export const PALETTES = [
  { id: "ink-gold",      dark: "#14263A", light: "#F2F0EA", accentOnDark: "#F0A63A", accentOnLight: "#B8750F" },
  { id: "pine-cream",    dark: "#1B3A32", light: "#F4F1E8", accentOnDark: "#D9A441", accentOnLight: "#8E6410" },
  { id: "charcoal-oat",  dark: "#22201D", light: "#EFEAE1", accentOnDark: "#C9872F", accentOnLight: "#9A5A0E" },
  { id: "indigo-mist",   dark: "#1E2A4A", light: "#ECEEF2", accentOnDark: "#E2A03C", accentOnLight: "#7E5E12" },
  { id: "wine-ivory",    dark: "#3A2224", light: "#F3EFE9", accentOnDark: "#D79A4E", accentOnLight: "#8E5A1C" },
  { id: "slate-sand",    dark: "#2C3338", light: "#EDE7DC", accentOnDark: "#CFA060", accentOnLight: "#8A6224" },
  { id: "umber-linen",   dark: "#3B2E21", light: "#F1ECE2", accentOnDark: "#E0B068", accentOnLight: "#8B5E14" },
  { id: "teal-paper",    dark: "#16343B", light: "#EDF0EE", accentOnDark: "#E3A74A", accentOnLight: "#8A6012" },
].map((p) => ({
  ...p,
  mutedOnDark: "rgba(255,255,255,0.58)",
  mutedOnLight: "rgba(0,0,0,0.46)",
}));

// 제목 서체 역할 — 실제 글꼴은 locale.mjs 가 언어별로 지정한다
export const TITLE_FONTS = [
  { id: "serif",    role: "serif",    weight: 700, tracking: "-0.02em" },
  { id: "sans",     role: "sans",     weight: 800, tracking: "-0.035em" },
  { id: "serifAlt", role: "serifAlt", weight: 700, tracking: "-0.015em" },
];

// 정보 배치가 실제로 달라지는 여섯 가지
export const LAYOUTS = ["classic", "editorial", "rule", "panel", "band", "margin"];

// 표지 좌상단 표식
export const MOTIFS = ["seal", "bar", "bracket", "dot"];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // FNV 만으로는 하위 비트가 약해서, 소금만 다른 값끼리 함께 움직인다.
  // 아래 혼합(lowbias32)을 거쳐야 항목들이 서로 독립적으로 흩어진다.
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

// 항목마다 다른 소금을 섞어 해시한다. 한 해시의 비트를 나눠 쓰면
// 날짜처럼 비슷한 문자열에서 값이 함께 쏠린다.
const pick = (seed, salt, n) => hash(`${seed}#${salt}`) % n;

export function themeFor(seedStr) {
  const seed = String(seedStr || "default");
  const palette = PALETTES[pick(seed, "palette", PALETTES.length)];
  const layout = LAYOUTS[pick(seed, "layout", LAYOUTS.length)];
  const titleFont = TITLE_FONTS[pick(seed, "font", TITLE_FONTS.length)];
  const motif = MOTIFS[pick(seed, "motif", MOTIFS.length)];

  // 표지는 3번 중 2번꼴로 어두운 배경
  const coverDark = pick(seed, "cover", 3) !== 0;
  // 본문 카드를 주기적으로 반전해 리듬을 준다 (0이면 반전 없음)
  const invertEvery = [0, 0, 3, 4][pick(seed, "invert", 4)];
  // 종이 질감. 평평한 단색이 가장 '기계로 찍은' 인상을 준다
  const grain = pick(seed, "grain", 5) !== 0; // 5번 중 4번
  // 같은 레이아웃이라도 글자 크기·여백이 미세하게 달라지도록
  const scale = [0.94, 1, 1, 1.06][pick(seed, "scale", 4)];
  const padX = [78, 88, 96][pick(seed, "padx", 3)];
  // 본문의 세로 위치. 아래쪽 정렬은 윗공간이 너무 비어 쓰지 않는다
  const anchor = ["center", "center", "top", "center"][pick(seed, "anchor", 4)];

  return {
    ...palette, layout, titleFont, motif,
    coverDark, invertEvery, grain, scale, padX, anchor, seed,
  };
}
