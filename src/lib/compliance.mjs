// post를 정리하고 finalCaption을 만든다. 금칙어 검출 목록을 돌려준다.
export function finalize(post, rules) {
  const fix = (s) => {
    if (!s) return s;
    for (const [from, to] of Object.entries(rules.term_replacements || {})) {
      s = s.replace(new RegExp(from, "g"), to);
    }
    return s;
  };

  post.slides = post.slides.map((s) => ({
    ...s,
    title: fix(s.title),
    body: fix(s.body),
    note: fix(s.note || ""),
  }));
  post.caption = fix(post.caption);

  const blockedTag = (t) =>
    (rules.blocked_hashtag_patterns || []).some((p) => new RegExp(p).test(t));
  const tags = (post.hashtags || [])
    .map((t) => (t.startsWith("#") ? t : `#${t}`).replace(/\s+/g, ""))
    .filter((t) => !blockedTag(t));
  post.hashtags = [...new Set([...(rules.fixed_hashtags || []), ...tags])].slice(
    0,
    rules.max_hashtags,
  );

  const full = [post.caption, ...post.slides.flatMap((s) => [s.title, s.body, s.note]), ...post.hashtags]
    .filter(Boolean)
    .join("\n");
  const hits = rules.blocked_patterns.filter((p) => new RegExp(p).test(full));

  post.finalCaption = `${post.caption}\n\n${rules.required_disclaimer}\n\n${post.hashtags.join(" ")}`.slice(
    0,
    rules.max_caption_chars,
  );
  return hits;
}

export function validateShape(post) {
  if (!Array.isArray(post?.slides) || post.slides.length < 5 || post.slides.length > 10) {
    throw new Error(`슬라이드 수 이상: ${post?.slides?.length}`);
  }
  if (!post.caption) throw new Error("caption 이 비어 있습니다.");
}
