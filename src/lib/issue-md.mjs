import path from "node:path";
import { QUEUE, WD, readJson, weekdayIdx } from "./util.mjs";

export const checkboxRe = (date, checked) =>
  new RegExp(`- \\[${checked ? "[xX]" : " "}\\] ${date} 승인`);

export function section(date, { repo, branch, bust = "" }) {
  const post = readJson(path.join(QUEUE, date, "post.json"));
  const base = `https://raw.githubusercontent.com/${repo}/${branch}/queue/${date}`;
  const imgs = (post.files || [])
    .map((f) => `<img src="${base}/${f}${bust}" width="150">`)
    .join(" ");

  const r = post.review || {};
  const verdict =
    r.editedByHuman ? "직접 수정 후 재렌더" :
    r.verdict === "fixed" ? "AI 검증에서 수정됨 (아래 내역 확인)" :
    "AI 검증 통과";
  const notes = (r.notes || []).map((n) => `- ${n}`).join("\n") || "- 수정 사항 없음";

  return `### ${date} (${WD[weekdayIdx(date)]}) · ${post.axis}

- [ ] ${date} 승인

**${post.topic}**

<p>${imgs}</p>

<details><summary>캡션 전문</summary>

\`\`\`
${post.finalCaption}
\`\`\`
</details>

<details><summary>검증 결과: ${verdict}</summary>

${notes}
</details>

수정하려면 \`queue/${date}/post.json\` 편집 → Actions › weekly-queue › mode \`rerender\`, date \`${date}\`

---
`;
}

export function header(dates) {
  return `평일 07:00에 **체크된 날짜만** 발행됩니다. 체크하지 않은 날은 건너뜁니다.

- 내용 수정: \`queue/날짜/post.json\` 에서 \`slides\`, \`caption\` 수정 → mode \`rerender\`
- 주제 교체: mode \`regenerate\` + 날짜 입력
- 재생성·재렌더된 날짜는 체크가 자동으로 해제됩니다. 다시 확인 후 체크하세요.

대상: ${dates.join(", ")}

---
`;
}
