# ig-tax-autopost (검수 큐 방식)

## 주간 흐름
| 언제 | 무엇이 | 결과 |
|---|---|---|
| 일요일 21:00 | weekly-queue | 다음 평일 5건 작성 → AI 검증 → 카드 렌더 → 검수 이슈 생성 |
| 월요일 중 | 세무사 | Issues 탭에서 미리보기 확인, 발행할 날짜만 체크 |
| 평일 07:00 | daily-publish | 오늘 날짜가 체크돼 있으면 발행, 아니면 건너뜀 |

요일별 주제: 월 법인 CEO / 화 개인·프리랜서 / 수 한일 국제조세 / 목 양도·상속·증여 / 금 법인 CEO

## 검수 이슈에서 할 수 있는 것
- **승인**: 해당 날짜 체크박스 클릭
- **문구 수정**: `queue/날짜/post.json` 에서 `slides`의 title·body·note, `caption` 수정 → Actions › weekly-queue › mode `rerender`, date 입력
  - `finalCaption`은 직접 고치지 마세요. rerender 때 caption으로 다시 만들어집니다
- **주제 교체**: Actions › weekly-queue › mode `regenerate`, date 입력
- 재생성·재렌더한 날짜는 체크가 자동 해제됩니다. 새 미리보기 댓글 확인 후 다시 체크

## 파일 구조
| 파일 | 역할 |
|---|---|
| config/topics.json | 주제 풀 4개 축 + 요일 로테이션 |
| config/compliance.json | 금칙어, 용어 치환, 고정·금지 해시태그, 고지문구 |
| src/queue-build.mjs | 작성 → 검증 → 필터 → 렌더 |
| src/lib/prompts.mjs | 작성자·검증자 프롬프트 (정확성 규칙은 여기서 수정) |
| src/themes.mjs | 팔레트·레이아웃·서체 변주 (날짜별 자동 선택) |
| src/render.mjs, src/template.mjs | 카드 디자인·렌더 |
| src/issue.mjs | 검수 이슈 생성·갱신 |
| src/gate.mjs | 발행 전 승인 확인 |
| src/publish.mjs | 인스타 캐러셀 발행 |
| config/published.log | 발행 기록 (중복 발행 방지) |

## Secrets
`ANTHROPIC_API_KEY`, `IG_ACCESS_TOKEN`, `IG_USER_ID` (토큰 자동 갱신 시 `REPO_PAT` 추가)

선택: Variables에 `CHECKER_MODEL`을 두면 검증 단계만 다른 모델을 쓸 수 있습니다.

## 주간 릴스 (수동 업로드)

| 언제 | 무엇이 | 결과 |
|---|---|---|
| 금요일 11:00 | weekly-reel | 그 주 발행분 하나를 세로 영상(MP4)으로 변환 → 이슈로 안내 |
| 금요일 중 | 세무사 | 폰에서 받아 인스타 앱으로 직접 업로드 |

API로 올리지 않는 이유: API 발행 릴스는 인스타 음원 라이브러리를 쓸 수 없고, 도달이 음원에 크게 좌우됩니다. 앱 업로드가 성과도 낫고 스팸 판정 위험도 없습니다.

- 구성: 표지 1 + 본문 3 + 마무리 1, 장면별 느린 줌, 30~60초
- 음성: edge-tts (무료, API 키 불필요). 기본 `ko-KR-InJoonNeural`(남), 여성은 `ko-KR-SunHiNeural`
- 조절: `REEL_MAX_BODY`(본문 장면 수), `REEL_RATE`(말 속도)
- 직접 실행: `node src/reel-build.mjs --date 2026-11-06` / 음성 없이 길이만 보려면 `--silent`
- 산출물: `reels/<날짜>/` 에 reel.mp4, cover.png, caption.txt, meta.json

업로드 순서: 릴스 → 영상 선택 → 음원 추가(원하면) → 커버 프레임 선택 → caption.txt 붙여넣기

## 디자인 변주

매번 같은 디자인이면 자동 생성 티가 나므로, 날짜를 씨앗으로 조합을 바꿉니다.
한 게시물의 7장은 같은 조합을 쓰고, 날짜가 바뀌면 조합이 바뀝니다.

- **팔레트 8종**: ink-gold, pine-cream, charcoal-oat, indigo-mist, wine-ivory, slate-sand, umber-linen, teal-paper
- **레이아웃 6종**: classic, editorial(배경 연번), rule(굵은 강조선), panel(본문 패널), band(제목 띠), margin(세로 괘선)
- **제목 서체 3종**, **표식 4종**(도장·막대·꺾쇠·점)
- 표지 배경 명암, 본문 반전 주기, 글자 크기(±6%), 좌우 여백, 본문 세로 위치도 날짜마다 달라집니다
- 종이 질감을 5회 중 4회 얹습니다. 평평한 단색이 가장 '찍어낸' 인상을 줍니다
- 300일 돌려 확인한 결과 서로 다른 조합 51가지, 최빈 조합도 300일 중 16회뿐입니다

고정되는 것: 로고 자리(稅), 법인명·계정명 위치, 여백 구조, 4:5 비율. 브랜드 인식은 유지하면서 분위기만 바뀝니다.

특정 날짜의 디자인이 마음에 들지 않으면 `THEME_SEED` 환경변수로 다른 조합을 쓸 수 있습니다.
```
THEME_SEED=2026-11-13 node src/render.mjs --date 2026-11-20
```

릴스도 같은 팔레트·서체를 따라갑니다.

## 일본어 전용 계정

일본 거주 한국인·일본인을 대상으로, 한국 세무를 일본어로 설명하는 별도 계정입니다.

| 언제 | 무엇이 |
|---|---|
| 토요일 20:00 | weekly-queue-ja — 다음 화·금 2건 생성 → 검수 이슈(`review-queue-ja`) |
| 화·금 08:00 | daily-publish-ja — 체크된 날짜만 발행 |

주제 축 4개를 발행 슬롯 순서로 돌립니다(2주에 한 바퀴).
1. 韓国資産の譲渡・相続・贈与 — 한국 부동산·예금·주식, 상속·증여
2. 韓国進出・記帳 — 일본 기업의 한국 법인·지점, 기장
3. 芸能・エンタメ・スポーツ — 출연료 원천징수, 조세조약 예능인 조항
4. 韓国在住の日本人の税務 — 거주자 판정, 연말정산, 사회보장협정

### 한국어판과 분리되는 것
| | 한국어 | 일본어 |
|---|---|---|
| 큐 | `queue/` | `queue-ja/` |
| 주제 | `config/topics.json` | `config/topics.ja.json` |
| 광고 필터 | `config/compliance.json` | `config/compliance.ja.json` |
| 발행 기록 | `config/published.log` | `config/published.ja.log` |
| 이슈 라벨 | `review-queue` | `review-queue-ja` |
| Secrets | `IG_ACCESS_TOKEN`, `IG_USER_ID` | `IG_ACCESS_TOKEN_JA`, `IG_USER_ID_JA` |

코드는 같은 것을 쓰고 `LOCALE=ja` 환경변수로 갈립니다. 브랜드 표기·글꼴·UI 문구는 `src/lib/locale.mjs` 에 모여 있습니다.

### 일본 税理士法 관련
일본에서 税理士 명칭 사용과 세무대리는 등록자만 할 수 있습니다(税理士法 제52조·제53조). 그래서
- 작성 프롬프트에 "필자는 한국 세무사이며 일본 税理士가 아니다, 일본 세무신고를 대리하지 않는다"를 못박았습니다
- `compliance.ja.json` 금칙어에 `税理士として`, `当事務所の税理士`, `日本の確定申告を代行` 등을 넣었습니다
- 해시태그 `#税理士` 도 차단했습니다

계정명은 `src/lib/locale.mjs` 의 `JA.brand.handle` 에 있습니다. 실제 계정을 만든 뒤 그 값으로 바꾸세요.
