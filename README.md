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
| src/render.mjs, src/template.mjs | 카드 디자인·렌더 |
| src/issue.mjs | 검수 이슈 생성·갱신 |
| src/gate.mjs | 발행 전 승인 확인 |
| src/publish.mjs | 인스타 캐러셀 발행 |
| config/published.log | 발행 기록 (중복 발행 방지) |

## Secrets
`ANTHROPIC_API_KEY`, `IG_ACCESS_TOKEN`, `IG_USER_ID` (토큰 자동 갱신 시 `REPO_PAT` 추가)

선택: Variables에 `CHECKER_MODEL`을 두면 검증 단계만 다른 모델을 쓸 수 있습니다.
