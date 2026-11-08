// 언어별 브랜드 표기·서체·문구. LOCALE=ja 면 일본어 전용 계정 설정을 쓴다.
import { LOCALE } from "./util.mjs";

const KO = {
  code: "ko",
  lang: "ko",
  topics: "config/topics.json",
  compliance: "config/compliance.json",
  issueLabel: "review-queue",
  // 발행 요일 (월=0 … 일=6)
  publishDays: [0, 1, 2, 3, 4],
  perWeek: 5,
  brand: { firm: "세무법인 위드플러스", handle: "@withpluscho" },
  seal: "稅",
  ui: {
    swipe: "넘겨보기 →",
    approve: "승인",
    queueTitle: "검수 대기",
    reelTitle: "릴스 준비 완료",
    outroCta: "피드에서 자세히",
  },
  // 본문 서체 스택 (Pretendard = 한글 전용)
  fontCss:
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">' +
    '<link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@700&family=Noto+Serif+KR:wght@700&display=swap" rel="stylesheet">',
  sans: '"Pretendard Variable",Pretendard,"Noto Sans KR",sans-serif',
  serif: '"Nanum Myeongjo","Noto Serif KR",serif',
  serifAlt: '"Noto Serif KR","Nanum Myeongjo",serif',
};

const JA = {
  code: "ja",
  lang: "ja",
  topics: "config/topics.ja.json",
  compliance: "config/compliance.ja.json",
  issueLabel: "review-queue-ja",
  publishDays: [1, 4], // 화·금
  perWeek: 2,
  brand: { firm: "税務法人ウィズプラス", handle: "@withplus_jp" },
  seal: "韓",
  ui: {
    swipe: "スワイプ →",
    approve: "承認",
    queueTitle: "確認待ち",
    reelTitle: "リール準備完了",
    outroCta: "詳しくは投稿で",
  },
  // 일본어는 가나·일본식 자형이 필요해 Noto Sans/Serif JP 를 쓴다
  fontCss:
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Noto+Serif+JP:wght@600;700&display=swap" rel="stylesheet">',
  sans: '"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif',
  serif: '"Noto Serif JP","Hiragino Mincho ProN","Yu Mincho",serif',
  serifAlt: '"Noto Serif JP",serif',
};

export const L = LOCALE === "ja" ? JA : KO;
export const isJa = LOCALE === "ja";
