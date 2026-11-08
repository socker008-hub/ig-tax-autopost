// 작성·검증을 거친 원고가 길이·표기 규칙을 어기는 일이 잦다.
// 지시만으로는 지켜지지 않으므로, 코드로 위반을 찾아내고 한 번 더 다듬는다.
import { L, isJa } from "./locale.mjs";

export const LIMITS = { body: 100, note: 40, title: 18 };

const HANGUL = /[가-힣]/;

// 고칠 거리가 있는 슬라이드만 추려낸다
export function findIssues(post, limits = LIMITS) {
  const out = [];
  post.slides.forEach((s, i) => {
    const bad = [];
    const bodyLen = (s.body || "").replace(/\s/g, "").length;
    if (bodyLen > limits.body) bad.push(`본문 ${bodyLen}자 (상한 ${limits.body}자)`);
    if ((s.title || "").length > limits.title) bad.push(`제목 ${s.title.length}자 (상한 ${limits.title}자)`);
    if (s.note) {
      if (s.note.length > limits.note) bad.push(`근거 ${s.note.length}자 (상한 ${limits.note}자)`);
      // 일본어 카드에 한글이 섞이면 읽는 쪽이 알아볼 수 없다
      if (isJa && HANGUL.test(s.note)) bad.push("근거란에 한글이 섞임");
    }
    if (bad.length) out.push({ index: i, kind: s.kind, problems: bad });
  });
  return out;
}

export function polishSystem() {
  return isJa
    ? `あなたは編集者だ。すでに内容確認を終えたInstagram原稿が、長さと表記の決まりを守れていない。
**内容は一切変えずに、短くするだけ**の作業をする。

[決まり]
- 本文(body)は空白を除いて${LIMITS.body}字以内。2文まで。
- 見出し(title)は${LIMITS.title}字以内。
- note は根拠法令名のみ、${LIMITS.note}字以内、**日本語だけ**で書く。
  韓国語をそのまま混ぜない(「비과세 양도소득」→「非課税譲渡所得」)。条文番号が不確実なら法律名だけ残す。

[やり方]
- 事実を足さない。新しい数字・条文・要件を書かない。
- 削るときは具体例・言い換え・補足から先に落とす。結論は残す。
- 日本語として自然に。文末の繰り返しを避ける。

指定されたスライドだけを直し、以下のJSONのみを出力する。コードフェンス・説明は禁止。
{ "slides": [ { "index": 2, "title": "", "body": "", "note": "" } ] }`
    : `너는 편집자다. 내용 검수를 마친 인스타그램 원고가 길이 규칙을 지키지 못했다.
**내용은 그대로 두고 줄이기만** 한다.

[규칙]
- 본문(body)은 공백 제외 ${LIMITS.body}자 이내, 2문장까지.
- 제목(title)은 ${LIMITS.title}자 이내.
- note 는 근거 법령명만, ${LIMITS.note}자 이내.

[방법]
- 사실을 보태지 않는다. 새로운 숫자·조문·요건을 쓰지 않는다.
- 예시·부연·바꿔 말하기부터 덜어낸다. 결론은 남긴다.

지정된 슬라이드만 고쳐 아래 JSON만 출력한다. 코드펜스·설명 금지.
{ "slides": [ { "index": 2, "title": "", "body": "", "note": "" } ] }`;
}

export const polishUser = (post, issues) =>
  `${isJa ? "直すスライド" : "고칠 슬라이드"}:\n` +
  issues
    .map((it) => {
      const s = post.slides[it.index];
      return `\n[index ${it.index}] ${it.problems.join(" / ")}\n  title: ${s.title}\n  body: ${s.body}\n  note: ${s.note || ""}`;
    })
    .join("\n");

// 다듬기 결과를 원고에 반영한다. 더 나빠지면 받아들이지 않는다.
export function applyPolish(post, fixed, limits = LIMITS) {
  let applied = 0;
  for (const f of fixed.slides || []) {
    const s = post.slides[f.index];
    if (!s) continue;
    const before = (s.body || "").replace(/\s/g, "").length;
    const after = (f.body || "").replace(/\s/g, "").length;
    if (!f.body || after > before) continue; // 길어졌으면 버린다
    s.title = f.title || s.title;
    s.body = f.body;
    if (f.note !== undefined) s.note = f.note;
    applied++;
  }
  // 그래도 한글이 남은 근거란은 보여주느니 비운다
  if (isJa) {
    for (const s of post.slides) if (s.note && HANGUL.test(s.note)) s.note = "";
  }
  return applied;
}
