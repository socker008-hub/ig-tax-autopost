# ig-tax-autopost

매일 07:00(KST) 세무 카드뉴스 7장을 자동 생성해 인스타그램 캐러셀로 발행하는 파이프라인.
Claude API로 원고 → Playwright로 카드 렌더 → GitHub에 이미지 커밋 → Instagram Graph API 발행.

---

## 셋업 체크리스트

### 1. 인스타그램 / Meta (여기서 시간이 제일 많이 듭니다)
- [ ] 계정을 **프로페셔널(비즈니스 또는 크리에이터) + 공개**로 전환
- [ ] [developers.facebook.com](https://developers.facebook.com) 에서 앱 생성
- [ ] **Instagram → API 설정 → Instagram 로그인 API** 추가
- [ ] 장기 액세스 토큰(60일) 발급 → `IG_ACCESS_TOKEN`
- [ ] IG User ID 확인 → `IG_USER_ID`
- [ ] 권한: `instagram_business_basic`, `instagram_business_content_publish`

> 토큰 접두사를 반드시 확인하세요.
> `IGAA...` → `graph.instagram.com` / `EAA...` → `graph.facebook.com`
> 이걸 틀리면 `Cannot parse access token` 으로 100% 실패합니다. (publish.mjs가 자동 분기하지만 원리는 알고 계셔야 디버깅이 됩니다)

### 2. 저장소
- [ ] 이 폴더를 **public** 저장소로 push (이미지가 공개 URL이어야 인스타가 가져갑니다)
- [ ] Settings → Secrets → Actions 에 등록
  - `ANTHROPIC_API_KEY`
  - `IG_ACCESS_TOKEN`
  - `IG_USER_ID`
  - `REPO_PAT` (토큰 자동 갱신용, secrets 쓰기 권한)
- [ ] Settings → Actions → Workflow permissions → **Read and write** 체크

### 3. 첫 실행은 반드시 dry-run
```bash
npm install && npx playwright install chromium
npm run all:dry        # 원고 생성 → 렌더 → 발행 직전 중단
open build/out/01.jpg  # 카드 눈으로 확인
```
- [ ] `build/out/*.jpg` 7장 확인
- [ ] `build/post.json` 의 `finalCaption` 내용 확인
- [ ] 문제 없으면 Actions에서 `dry_run = false` 로 수동 1회 발행
- [ ] 그 다음부터 cron이 알아서 돕니다

### 4. 운영
- [ ] 월 1회 `refresh-ig-token` 워크플로가 토큰을 갱신 (실패 알림은 Actions에서 확인)
- [ ] `config/topics.json` 주제 풀은 45개 = 약 9주치. 분기마다 보충
- [ ] `config/used.json` 이 최근 60개 주제를 기억해 중복을 막습니다

---

## 구조

| 파일 | 역할 |
|---|---|
| `config/topics.json` | 3개 축(법인 CEO / 개인·프리랜서 / 한일 국제조세) 주제 풀 + 요일 로테이션 |
| `config/compliance.json` | 세무사 광고규정 금칙어, 필수 고지문구 |
| `src/generate.mjs` | 주제 선택 → Claude API → JSON 검증 → 금칙어 필터 |
| `src/template.mjs` | 카드 디자인 (1080×1350, 남색 잉크 + 인주 레드) |
| `src/render.mjs` | Playwright 스크린샷 → JPEG |
| `src/publish.mjs` | 자식 컨테이너 → CAROUSEL → media_publish |
| `src/refresh-token.mjs` | 60일 토큰 갱신 |

## 제약 조건 (Meta 문서 기준, 변동되니 실행 전 확인)
- 캐러셀 2~10장, 이미지 JPEG 8MB 미만, 공개 URL 필수
- 캡션 2,200자 / 해시태그 30개 이내
- API 발행 24시간 한도 있음 (하루 1건이면 무관)
- 자동 팔로우·좋아요·콜드 DM은 정책 위반입니다. 이 파이프라인은 **발행만** 합니다

## 광고규정 관련
`compliance.json` 필터에 걸리면 그 회차는 발행되지 않고 워크플로가 실패합니다.
수임료·할인·무료 표시, "보장/100%/1위" 류 표현, 국세청 인맥·조사 무마 암시가 대상입니다.
모든 게시물 하단에는 일반 정보 제공 목적이라는 고지문구가 자동으로 붙습니다.
