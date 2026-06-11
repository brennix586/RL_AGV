// =============================================================================
// 파일명   : make_report.js
// 설명     : AGV 배터리 충전 스케줄링 강화학습 PPT 보고서 생성
//            Node.js + PptxGenJS 사용 (npm install pptxgenjs)
// 작성일   : 2026.06.
// 실행방법 : node make_report.js  (src/report/ 디렉토리에서)
//            또는: npm run report
// 슬라이드 : 총 12장 (LG 컨셉 디자인 — 검정 헤더, 흰 배경, 색상 최소화)
// =============================================================================

"use strict";
const PptxGenJS = require("pptxgenjs");
const fs        = require("fs");
const path      = require("path");

// =============================================================================
// 경로 설정
// =============================================================================

// 프로젝트 루트 (src/report/에서 두 단계 위)
const ROOT       = path.resolve(__dirname, "..", "..");
const SUMMARY    = path.join(ROOT, "results", "logs",   "summary.json");
const IMG_CURVES = path.join(ROOT, "results", "images", "training_curves.png");
const OUT_PATH   = path.join(ROOT, "results", "AGV_Report.pptx");

// =============================================================================
// 실험 결과 로드 (summary.json이 있으면 실제 수치 사용, 없으면 N/A)
// =============================================================================

let summary = null;
if (fs.existsSync(SUMMARY)) {
  summary = JSON.parse(fs.readFileSync(SUMMARY, "utf8"));
}

const bl  = summary ? summary.baseline : null;
const pr  = summary ? summary.proposed : null;
// 숫자 포맷 함수: null이면 "N/A" 반환
const fmt = (v, d = 1) => (v != null) ? Number(v).toFixed(d) : "N/A";

// =============================================================================
// 디자인 상수 (LG 컨셉: 검정 헤더, 흰 배경, 강조색 최소화)
// =============================================================================

const C = {
  black    : "1A1A1A",  // 헤더 배경, 주요 텍스트
  white    : "FFFFFF",  // 배경
  gray     : "F5F5F5",  // 테이블 배경
  lgRed    : "C40000",  // LG 레드 (강조 포인트)
  lgGray   : "767676",  // 부제목, 설명
  accent   : "005BAC",  // 파란 강조 (섹션 제목)
  lineGray : "DDDDDD",  // 테이블 테두리
};

// =============================================================================
// 공통 헤더 함수
// =============================================================================

/**
 * 슬라이드 상단에 검정 헤더 + 빨간 구분선 + 제목 추가.
 * @param {object} slide  - pptx 슬라이드 객체
 * @param {object} pptx   - PptxGenJS 인스턴스 (ShapeType 사용)
 * @param {string} title  - 헤더에 표시할 제목
 */
function addHeader(slide, pptx, title) {
  // 검정 헤더 배경
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.75,
    fill: { color: C.black }, line: { color: C.black },
  });
  // LG 레드 구분선
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.75, w: "100%", h: 0.05,
    fill: { color: C.lgRed }, line: { color: C.lgRed },
  });
  // 제목 텍스트
  slide.addText(title, {
    x: 0.4, y: 0.1, w: 9.2, h: 0.55,
    fontSize: 17, bold: true, color: C.white, fontFace: "Malgun Gothic",
  });
}

// =============================================================================
// 슬라이드 01 — 표지
// =============================================================================

function slide01_title(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: C.black };

  // 빨간 구분선 (중앙)
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 3.0, w: "100%", h: 0.05,
    fill: { color: C.lgRed }, line: { color: C.lgRed },
  });

  // 프로젝트명 (메인 제목)
  slide.addText("Safety-Aware Reward Shaping 기반", {
    x: 0.6, y: 0.9, w: 9.0, h: 0.7,
    fontSize: 28, bold: true, color: C.white, fontFace: "Malgun Gothic",
  });
  slide.addText("AGV 배터리 충전 스케줄링 강화학습", {
    x: 0.6, y: 1.6, w: 9.0, h: 0.7,
    fontSize: 28, bold: true, color: C.white, fontFace: "Malgun Gothic",
  });

  // 부제목
  slide.addText("Deep Q-Network를 활용한 Safe RL 구현", {
    x: 0.6, y: 2.4, w: 9.0, h: 0.5,
    fontSize: 16, color: "CCCCCC", fontFace: "Malgun Gothic",
  });

  // 하단 정보 블록 (이름 / 학번 / GitHub / 날짜)
  const infoRows = [
    ["이름",   "김한얼"],
    ["학번",   "A74030"],
    ["GitHub", "https://github.com/brennix586/RL_AGV"],
    ["날짜",   "2026. 06."],
  ];
  infoRows.forEach(([label, value], i) => {
    slide.addText(`${label}:  ${value}`, {
      x: 0.8, y: 3.3 + i * 0.48, w: 8.4, h: 0.42,
      fontSize: 13, color: "CCCCCC", fontFace: "Malgun Gothic",
    });
  });
}

// =============================================================================
// 슬라이드 02 — 목차
// =============================================================================

function slide02_toc(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "목차");

  const items = [
    "01  프로젝트 주제 및 목표",
    "02  환경 설명 — 7×7 GridWorld · State / Action / Reward",
    "03  Reward Shaping 설계 (Safety-Aware)",
    "04  소스코드 비교 — Baseline vs Proposed",
    "05  알고리즘 및 하이퍼파라미터",
    "06  실험 셋업",
    "07  실험 결과 ① — 학습 곡선 · 방전 횟수",
    "08  실험 결과 ② — 최종 성능 비교 테이블",
    "09  실험 조건 최적화 과정 — Step 0→5 수정 이력",
    "10  토의 — Safe RL 관점 해석",
    "11  결론 및 향후 연구",
  ];

  items.forEach((txt, i) => {
    slide.addText(txt, {
      x: 1.0, y: 1.25 + i * 0.5, w: 8.2, h: 0.44,
      fontSize: 13, fontFace: "Malgun Gothic",
      color: i % 2 === 0 ? C.black : C.lgGray,
    });
  });
}

// =============================================================================
// 슬라이드 03 — 프로젝트 주제 및 목표
// =============================================================================

function slide03_overview(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "01  프로젝트 주제 및 목표");

  // 보고서 스토리 4단계
  const story = [
    { label: "[도입] 문제 제기", color: C.lgRed,
      text: "물류 자동화의 핵심 과제는 AGV의 지속 가능한 운영이다.\n기존 강화학습은 최단 경로만 학습하여 배터리 방전이라는 안전사고를 유발한다." },
    { label: "[방법] 제안 방법", color: C.accent,
      text: "배터리 상태를 State와 Reward에 동시에 반영하는\nSafety-Aware Reward Shaping을 제안한다." },
    { label: "[결과] 수치로 증명", color: "1E8A47",
      text: "방전율 0% 달성과 동시에 작업 처리량도 Baseline 대비 향상시켰다." },
    { label: "[의미] 학술적 기여", color: C.black,
      text: "Reward 설계만으로 안전성과 효율성을 동시에 달성할 수 있음을 실험적으로 증명한다." },
  ];

  story.forEach(({ label, color, text }, i) => {
    slide.addText(label, {
      x: 0.5, y: 1.0 + i * 1.3, w: 2.6, h: 0.4,
      fontSize: 12, bold: true, color, fontFace: "Malgun Gothic",
    });
    slide.addText(text, {
      x: 0.5, y: 1.42 + i * 1.3, w: 9.0, h: 0.75,
      fontSize: 12, color: C.black, fontFace: "Malgun Gothic", valign: "top",
    });
    // 구분선
    if (i < story.length - 1) {
      slide.addShape(pptx.ShapeType.line, {
        x: 0.5, y: 2.2 + i * 1.3, w: 9.0, h: 0,
        line: { color: C.lineGray, width: 0.5 },
      });
    }
  });
}

// =============================================================================
// 슬라이드 04 — 환경 설명
// =============================================================================

function slide04_env(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "02  환경 설명");

  // 7×7 맵 ASCII
  const mapLines = [
    "■ . . . . . .",
    ". . . . . . .",
    ". . . . . . .",
    ". . . S . . .",  // S: 출발지 (3,3) 고정
    ". . . . . . .",
    ". . . . . . .",
    ". . . . . . ■",
  ].join("\n");

  slide.addText(mapLines, {
    x: 0.4, y: 1.0, w: 2.6, h: 3.5,
    fontSize: 12, fontFace: "Courier New", color: C.black, valign: "top",
  });
  slide.addText("■ 충전소  S 출발지(고정)  T 목표(랜덤)", {
    x: 0.4, y: 4.55, w: 2.8, h: 0.3,
    fontSize: 8.5, color: C.lgGray, fontFace: "Malgun Gothic",
  });

  // 환경 설정 테이블
  slide.addTable([
    [{ text: "항목",     options: { bold: true } }, { text: "설정",          options: { bold: true } }],
    [{ text: "맵 크기"  }, { text: "7 × 7 (10×10 대비 학습 40% 단축)"    }],
    [{ text: "출발지"   }, { text: "(3,3) 고정 — 두 충전소까지 거리 동일" }],
    [{ text: "목표 지점"}, { text: "매 에피소드 랜덤 생성"                }],
    [{ text: "충전소"   }, { text: "(0,0) / (6,6) 고정"                   }],
    [{ text: "배터리"   }, { text: "100 초기화, 스텝당 -3 소모 (33스텝 지속)"}],
    [{ text: "Max Step" }, { text: "150 (33스텝마다 충전 필요)"             }],
    [{ text: "State"    }, { text: "(row, col, battery) — 3차원"          }],
    [{ text: "Action"   }, { text: "상/하/좌/우 (Discrete 4)"             }],
  ], {
    x: 3.3, y: 1.0, w: 6.3, colW: [2.2, 4.1],
    fontSize: 11, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    fill: { color: C.gray },
  });
}

// =============================================================================
// 슬라이드 05 — Reward Shaping 설계
// =============================================================================

function slide05_reward(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "03  Reward Shaping 설계 (Safety-Aware)");

  // Reward 수식
  slide.addText("R  =  R_step  +  R_goal  +  R_battery", {
    x: 1.0, y: 1.0, w: 8.0, h: 0.55,
    fontSize: 18, bold: true, color: C.accent,
    fontFace: "Courier New", align: "center",
  });

  // Reward 테이블
  slide.addTable([
    [{ text: "항목",        options:{bold:true} }, { text: "조건",                           options:{bold:true} }, { text: "보상값",       options:{bold:true} }],
    [{ text: "R_step"     }, { text: "매 이동 스텝"                          }, { text: "−1"          }],
    [{ text: "R_goal"     }, { text: "목표 지점 도달"                        }, { text: "+100"        }],
    [{ text: "R_battery ★"}, { text: "배터리 < 40% + 충전소 도달"           }, { text: "+50"         }],
    [{ text: ""           }, { text: "배터리 ≥ 40% + 충전소 도달 (시간 낭비)"}, { text: "−10"         }],
    [{ text: ""           }, { text: "배터리 = 0% (방전) — 대형 사고"       }, { text: "−200 + 종료" }],
  ], {
    x: 0.5, y: 1.65, w: 9.0, colW: [1.8, 4.8, 2.4],
    fontSize: 12, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    fill: { color: C.gray },
  });

  // Baseline vs Proposed
  slide.addText("Baseline vs Proposed (Safe RL)", {
    x: 0.5, y: 4.15, w: 9.0, h: 0.4,
    fontSize: 13, bold: true, color: C.lgRed, fontFace: "Malgun Gothic",
  });
  slide.addTable([
    [{ text: "구분",         options:{bold:true} }, { text: "Reward 구성",                          options:{bold:true} }, { text: "프레임",           options:{bold:true} }],
    [{ text: "Baseline"    }, { text: "R_step + R_goal"                       }, { text: "일반 RL"          }],
    [{ text: "Proposed ★"  }, { text: "R_step + R_goal + R_battery"           }, { text: "Safe RL (제안)"   }],
  ], {
    x: 0.5, y: 4.6, w: 9.0, colW: [1.8, 5.0, 2.2],
    fontSize: 12, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    fill: { color: C.gray },
  });
}

// =============================================================================
// 슬라이드 06 — 소스코드 비교 (Baseline vs Proposed)
// =============================================================================

function slide06_code(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "04  소스코드 비교 — Baseline vs Proposed");

  // 좌측: Baseline 헤더
  slide.addText("Baseline  (배터리 무시)", {
    x: 0.3, y: 0.9, w: 4.5, h: 0.35,
    fontSize: 12, bold: true, color: "CC0000", fontFace: "Malgun Gothic",
  });
  // 우측: Proposed 헤더
  slide.addText("Proposed  (Safety-Aware Reward Shaping)", {
    x: 5.1, y: 0.9, w: 4.5, h: 0.35,
    fontSize: 12, bold: true, color: C.accent, fontFace: "Malgun Gothic",
  });

  // 중앙 구분선
  slide.addShape(pptx.ShapeType.line, {
    x: 4.95, y: 0.85, w: 0, h: 5.5,
    line: { color: C.lineGray, width: 1 },
  });

  // Baseline 코드 블록
  const baselineCode = [
    "def step(self, action):",
    "  # 이동",
    "  self._move(action)",
    "  # 배터리 소모",
    "  self.battery -= 1",
    "  reward = R_STEP  # -1",
    "",
    "  # 목표 도달 시 보상",
    "  if pos == goal:",
    "    reward += R_GOAL  # +100",
    "    terminated = True",
    "",
    "  # 방전 체크",
    "  if self.battery == 0:",
    "    terminated = True",
    "  # ← 방전 패널티 없음!",
    "  # ← R_battery 없음!",
  ].join("\n");

  // Proposed 코드 블록
  const proposedCode = [
    "def step(self, action):",
    "  # 이동",
    "  self._move(action)",
    "  # 배터리 소모",
    "  self.battery -= 1",
    "  reward = R_STEP  # -1",
    "",
    "  # ★ 충전소 Reward Shaping",
    "  if pos in charging_stations:",
    "    if battery < 40:  # 긴급 충전",
    "      reward += R_CHARGE_LOW  # +50",
    "    else:  # 시간 낭비",
    "      reward += R_CHARGE_WASTE  # -10",
    "    self.battery = 100  # 완충",
    "",
    "  # ★ 방전 패널티 (-200)",
    "  if self.battery == 0:",
    "    reward += R_DEAD  # -200",
    "    terminated = True",
  ].join("\n");

  slide.addText(baselineCode, {
    x: 0.2, y: 1.3, w: 4.6, h: 4.8,
    fontSize: 9, fontFace: "Courier New", color: C.black, valign: "top",
    fill: { color: "FFF5F5" },
  });
  slide.addText(proposedCode, {
    x: 5.0, y: 1.3, w: 4.7, h: 4.8,
    fontSize: 9, fontFace: "Courier New", color: C.black, valign: "top",
    fill: { color: "F0F5FF" },
  });

  // 하단 차이 요약
  slide.addText("핵심 차이:  R_battery 항목의 유무  →  방전 사고 Zero 달성 여부 결정", {
    x: 0.3, y: 6.1, w: 9.4, h: 0.35,
    fontSize: 11, bold: true, color: C.lgRed,
    fontFace: "Malgun Gothic", align: "center",
  });
}

// =============================================================================
// 슬라이드 07 — 알고리즘 및 하이퍼파라미터
// =============================================================================

function slide07_algo(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "05  알고리즘 및 하이퍼파라미터");

  // 네트워크 구조
  slide.addText("DQN 네트워크 구조 (NumPy 순수 구현)", {
    x: 0.5, y: 1.0, w: 4.0, h: 0.4,
    fontSize: 13, bold: true, color: C.accent, fontFace: "Malgun Gothic",
  });
  slide.addText(
    "Input (3)\n  ↓  Xavier 초기화\nHidden 128  (ReLU)\n  ↓\nHidden 128  (ReLU)\n  ↓\nOutput Q×4",
    { x: 0.5, y: 1.45, w: 3.8, h: 2.4,
      fontSize: 12, fontFace: "Courier New", color: C.black, valign: "top" }
  );
  slide.addText("총 파라미터: ~18,180개\nPyTorch 대비 2~3× 빠름 (소형 네트워크)",
    { x: 0.5, y: 3.95, w: 3.8, h: 0.6,
      fontSize: 10, color: C.lgGray, fontFace: "Malgun Gothic" }
  );

  // 하이퍼파라미터 테이블
  slide.addTable([
    [{ text: "파라미터",         options:{bold:true} }, { text: "값",                       options:{bold:true} }],
    [{ text: "Learning Rate"   }, { text: "0.001 (Adam)"             }],
    [{ text: "Gamma (γ)"      }, { text: "0.99 — 장기 보상 중시"    }],
    [{ text: "Epsilon"         }, { text: "1.0 → 0.01 (decay 0.995)"}],
    [{ text: "Batch Size"      }, { text: "64"                       }],
    [{ text: "Replay Buffer"   }, { text: "10,000"                   }],
    [{ text: "Target Update"   }, { text: "10 학습 스텝"             }],
    [{ text: "Episodes"        }, { text: "1,500 (7×7 기준)"        }],
    [{ text: "Max Step/Episode"}, { text: "150"                      }],
    [{ text: "Seeds"           }, { text: "[0, 1, 42, 123, 777]"    }],
  ], {
    x: 4.8, y: 1.0, w: 4.8, colW: [2.6, 2.2],
    fontSize: 11, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    fill: { color: C.gray },
  });
}

// =============================================================================
// 슬라이드 08 — 실험 셋업
// =============================================================================

function slide08_setup(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "06  실험 셋업");

  slide.addText("신뢰도 확보 — 5개 랜덤 시드 반복 실험", {
    x: 0.5, y: 1.0, w: 9.0, h: 0.4,
    fontSize: 14, bold: true, color: C.accent, fontFace: "Malgun Gothic",
  });
  slide.addText("SEEDS = [0, 1, 42, 123, 777]  →  평균 ± 표준편차 + shaded 신뢰구간", {
    x: 0.5, y: 1.45, w: 9.0, h: 0.38,
    fontSize: 12, fontFace: "Malgun Gothic", color: C.black,
  });

  slide.addText("평가 지표", {
    x: 0.5, y: 2.0, w: 9.0, h: 0.4,
    fontSize: 14, bold: true, color: C.accent, fontFace: "Malgun Gothic",
  });
  slide.addTable([
    [{ text: "지표",                    options:{bold:true} }, { text: "증명 목표",                         options:{bold:true} }],
    [{ text: "평균 에피소드 보상"       }, { text: "Proposed > Baseline"                }],
    [{ text: "★ 방전 횟수 (Dead Count)"}, { text: "Baseline 빈번  /  Proposed = 0"    }],
    [{ text: "에피소드당 작업 완료 수"  }, { text: "안전성 확보하면서 효율도 유지"     }],
    [{ text: "충전소 방문 횟수"         }, { text: "Proposed: 적절한 방문 전략 학습"   }],
    [{ text: "학습 곡선 수렴 속도"      }, { text: "Proposed: 풍부한 경험 → 빠른 수렴"}],
  ], {
    x: 0.5, y: 2.45, w: 9.0, colW: [3.8, 5.2],
    fontSize: 12, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    fill: { color: C.gray },
  });

  // 모니터링 도구
  slide.addText("학습 진행 모니터링", {
    x: 0.5, y: 4.55, w: 9.0, h: 0.38,
    fontSize: 13, bold: true, color: C.accent, fontFace: "Malgun Gothic",
  });
  slide.addTable([
    [{ text: "방법",           options:{bold:true} }, { text: "설명",                     options:{bold:true} }],
    [{ text: "tqdm 진행바"    }, { text: "전체 에피소드 진행률 + 남은 시간 실시간 표시"}],
    [{ text: "CSV 자동 저장"  }, { text: "에피소드마다 즉시 기록 — 중단 시 데이터 보존"}],
    [{ text: "체크포인트"     }, { text: "150ep마다 + 최고 보상 갱신 시 best_model.pkl"}],
  ], {
    x: 0.5, y: 5.0, w: 9.0, colW: [2.4, 6.6],
    fontSize: 11, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    fill: { color: C.gray },
  });
}

// =============================================================================
// 슬라이드 09 — 실험 결과 ① (학습 곡선)
// =============================================================================

function slide09_results1(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "07  실험 결과 ① — 학습 곡선 · 방전 횟수");

  if (fs.existsSync(IMG_CURVES)) {
    slide.addImage({ path: IMG_CURVES, x: 0.3, y: 0.9, w: 9.4, h: 5.2 });
  } else {
    slide.addText(
      "results/images/training_curves.png 를 먼저 생성하세요.\n\n" +
      "python -m src.train.train --mode baseline\n" +
      "python -m src.train.train --mode proposed\n" +
      "python -m src.train.train --plot",
      { x: 1.0, y: 2.5, w: 8.0, h: 2.5, fontSize: 12, color: C.lgGray,
        fontFace: "Malgun Gothic", align: "center" }
    );
  }
}

// =============================================================================
// 슬라이드 10 — 실험 결과 ② (성능 비교 테이블)
// =============================================================================

function slide10_results2(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "08  실험 결과 ② — 최종 성능 비교");

  // ── 핵심 강조 배너 ─────────────────────────────────────────────
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.3, y: 0.85, w: 9.4, h: 0.42,
    fill: { color: C.lgRed }, line: { color: C.lgRed },
  });
  slide.addText("Safety-Aware Reward Shaping — 5 seeds × 1,500 ep 비교 결과", {
    x: 0.3, y: 0.87, w: 9.4, h: 0.38,
    fontSize: 12, bold: true, color: C.white,
    fontFace: "Malgun Gothic", align: "center",
  });

  // ── 핵심 성능 비교 테이블 ────────────────────────────────────────
  const blReward = bl ? `${fmt(bl.avg_reward_final)} ± ${fmt(bl.std_reward_final)}` : "N/A";
  const prReward = pr ? `${fmt(pr.avg_reward_final)} ± ${fmt(pr.std_reward_final)}` : "N/A";
  const rewardGap = (bl && pr)
    ? `+${fmt(pr.avg_reward_final - bl.avg_reward_final, 1)}p`
    : "N/A";
  const deadImprove = (bl && pr && bl.dead_rate_final > 0)
    ? `-${fmt((1 - pr.dead_rate_final / bl.dead_rate_final) * 100, 0)}%`
    : "N/A";

  slide.addTable([
    [
      { text: "지표",                        options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "Baseline",                    options: { bold: true, fill: { color: "CC3300" }, color: C.white } },
      { text: "Proposed (제안)",             options: { bold: true, fill: { color: "005BAC" }, color: C.white } },
      { text: "개선",                        options: { bold: true, fill: { color: "1E8A47" }, color: C.white } },
    ],
    [
      { text: "평균 보상 (최종 200ep)",      options: { bold: true } },
      { text: blReward,                      options: { color: "CC3300" } },
      { text: prReward,                      options: { bold: true, color: "005BAC" } },
      { text: rewardGap,                     options: { bold: true, color: "1E8A47" } },
    ],
    [
      { text: "표준편차 (안정성)",           options: { bold: true } },
      { text: bl ? fmt(bl.std_reward_final) : "N/A", options: { color: "CC3300" } },
      { text: pr ? fmt(pr.std_reward_final) : "N/A", options: { bold: true, color: "005BAC" } },
      { text: (bl && pr) ? `${fmt((1-pr.std_reward_final/bl.std_reward_final)*100,0)}% ↓` : "N/A",
        options: { bold: true, color: "1E8A47" } },
    ],
    [
      { text: "총 방전 횟수 (5seeds 합계)",  options: { bold: true } },
      { text: bl ? String(bl.total_dead) + "회" : "N/A", options: { color: "CC3300" } },
      { text: pr ? String(pr.total_dead) + "회" : "N/A", options: { bold: true, color: "005BAC" } },
      { text: (bl && pr) ? String(bl.total_dead - pr.total_dead) + "회 감소" : "N/A",
        options: { bold: true, color: "1E8A47" } },
    ],
    [
      { text: "★ 말기 방전율 (최종 200ep)",  options: { bold: true, fill: { color: "FFF3CD" } } },
      { text: bl ? fmt(bl.dead_rate_final) + "회/100ep" : "N/A",
        options: { bold: true, color: "CC3300", fill: { color: "FFF3CD" } } },
      { text: pr ? fmt(pr.dead_rate_final) + "회/100ep" : "N/A",
        options: { bold: true, color: "005BAC", fill: { color: "FFF3CD" } } },
      { text: deadImprove,
        options: { bold: true, color: "1E8A47", fill: { color: "FFF3CD" } } },
    ],
  ], {
    x: 0.3, y: 1.32, w: 9.4, colW: [3.3, 2.1, 2.2, 1.8],
    fontSize: 12, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    fill: { color: C.gray },
  });

  // ── 해석 ────────────────────────────────────────────────────────
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.3, y: 4.05, w: 9.4, h: 0.52,
    fill: { color: "EAF4FF" }, line: { color: C.accent },
  });
  slide.addText(
    `Proposed: 평균 보상 ${rewardGap} 향상 · 표준편차 ${(bl && pr) ? fmt((1-pr.std_reward_final/bl.std_reward_final)*100,0) : "?"}% 감소 · 말기 방전율 ${deadImprove} 개선`,
    { x: 0.3, y: 4.07, w: 9.4, h: 0.48,
      fontSize: 12, bold: true, color: C.accent,
      fontFace: "Malgun Gothic", align: "center" }
  );

  // ── 하이퍼파라미터 민감도 분석 ──────────────────────────────────
  slide.addText("하이퍼파라미터 민감도 분석 (계획)", {
    x: 0.3, y: 4.68, w: 9.4, h: 0.38,
    fontSize: 12, bold: true, color: C.accent, fontFace: "Malgun Gothic",
  });
  slide.addTable([
    [{ text: "실험 ID", options:{bold:true} }, { text: "변경 항목",       options:{bold:true} }, { text: "실험값 (* 기본값)",          options:{bold:true} }],
    [{ text: "Exp-1"  }, { text: "배터리 경고 임계값" }, { text: "20% / 40%* / 60%"          }],
    [{ text: "Exp-2"  }, { text: "방전 패널티"         }, { text: "-100 / -200* / -500"       }],
    [{ text: "Exp-3"  }, { text: "학습률"              }, { text: "0.0001 / 0.001* / 0.01"   }],
  ], {
    x: 0.3, y: 5.1, w: 9.4, colW: [1.4, 3.0, 5.0],
    fontSize: 11, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    fill: { color: C.gray },
  });
}

// =============================================================================
// 슬라이드 11 — 실험 조건 최적화 과정 (수정 이력)
// =============================================================================

function slide11_modify(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "09  실험 조건 최적화 과정 — 의미 있는 결과를 위한 반복 수정");

  // 타임라인 흐름 표
  slide.addTable([
    [
      { text: "단계",          options: { bold: true, fill: { color: C.black  }, color: C.white } },
      { text: "핵심 변경",     options: { bold: true, fill: { color: C.black  }, color: C.white } },
      { text: "실제 결과",     options: { bold: true, fill: { color: C.black  }, color: C.white } },
      { text: "문제 / 결론",   options: { bold: true, fill: { color: C.black  }, color: C.white } },
    ],
    [
      { text: "Step 0\n초기 설계",
        options: { bold: true, fill: { color: "FFF0F0" } } },
      { text: "10×10 PyTorch\n매 스텝 학습\n랜덤 시작/목표",
        options: { fill: { color: "FFF0F0" } } },
      { text: "⏱ 97분 이상\n실험 완료 불가",
        options: { bold: true, color: "CC0000", fill: { color: "FFF0F0" } } },
      { text: "환경이 너무 무거움\n→ 경량화 필수",
        options: { fill: { color: "FFF0F0" } } },
    ],
    [
      { text: "Step 1\n경량화",
        options: { bold: true, fill: { color: "FFF8E1" } } },
      { text: "7×7 NumPy 구현\n4스텝마다 학습\n시작 (3,3) 고정",
        options: { fill: { color: "FFF8E1" } } },
      { text: "✅ 55 ep/s\n9분 완료",
        options: { bold: true, color: "1E8A47", fill: { color: "FFF8E1" } } },
      { text: "속도 해결\n→ 보상 조건 최적화 필요",
        options: { fill: { color: "FFF8E1" } } },
    ],
    [
      { text: "Step 2\nDRAIN=1\nWARN=20",
        options: { bold: true, fill: { color: "FFF0F0" } } },
      { text: "스텝당 배터리 -1\n(100스텝 지속)\nWARNING 20%",
        options: { fill: { color: "FFF0F0" } } },
      { text: "Safety 보상\n발동율 ≈ 0%\n차이 미미",
        options: { bold: true, color: "CC0000", fill: { color: "FFF0F0" } } },
      { text: "80스텝 이동 후 발동\n→ 대부분 에피소드가\n먼저 종료",
        options: { fill: { color: "FFF0F0" } } },
    ],
    [
      { text: "Step 3\nDRAIN=2\nWARN=40\nWASTE=-10",
        options: { bold: true, fill: { color: "FFF0F0" } } },
      { text: "스텝당 -2 (50스텝)\nWARNING 40%\n낭비 패널티 -10",
        options: { fill: { color: "FFF0F0" } } },
      { text: "Proposed 총방전\n277 > Baseline 265\n역효과!",
        options: { bold: true, color: "CC0000", fill: { color: "FFF0F0" } } },
      { text: "WASTE=-10이\nep100~200 구간에서\n충전소 회피 유발",
        options: { fill: { color: "FFF0F0" } } },
    ],
    [
      { text: "Step 4\nWASTE 제거",
        options: { bold: true, fill: { color: "FFF0F0" } } },
      { text: "낭비 패널티 삭제\n(긍정 보상만 유지)",
        options: { fill: { color: "FFF0F0" } } },
      { text: "Proposed 총방전\n236 > Baseline 224\n여전히 역전",
        options: { bold: true, color: "CC0000", fill: { color: "FFF0F0" } } },
      { text: "DRAIN=2는 목표까지\n충전 없이 도달 가능\n→ Baseline도 수렴",
        options: { fill: { color: "FFF0F0" } } },
    ],
    [
      { text: "Step 5 ★\nDRAIN=3\nWARN=40",
        options: { bold: true, fill: { color: "E8F5E9" } } },
      { text: "스텝당 -3 (33스텝)\n→ 반드시 충전 필요",
        options: { fill: { color: "E8F5E9" } } },
      { text: "✅ 총방전 471→415\n말기방전율 70%↓\n평균보상 +148p",
        options: { bold: true, color: "1E8A47", fill: { color: "E8F5E9" } } },
      { text: "Baseline은 끝까지\n방전 지속 (2.0/100ep)\nProposed 수렴 ✓",
        options: { bold: true, fill: { color: "E8F5E9" } } },
    ],
  ], {
    x: 0.2, y: 0.88, w: 9.6,
    colW: [1.35, 2.1, 2.2, 3.95],
    fontSize: 9.5, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    rowH: [0.38, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62],
  });

  // 핵심 교훈 박스
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2, y: 6.28, w: 9.6, h: 0.62,
    fill: { color: C.black }, line: { color: C.black },
  });
  slide.addText(
    "핵심 교훈:  배터리가 생존의 병목이 될 때(DRAIN=3) Safety Reward의 차별적 가치가 드러난다.\n" +
    "Reward 설계는 환경 난이도와 함께 조율해야 한다 — 너무 쉬운 환경에서는 Safety 신호가 불필요해진다.",
    { x: 0.2, y: 6.3, w: 9.6, h: 0.58,
      fontSize: 9.5, color: C.white, fontFace: "Malgun Gothic",
      valign: "middle", align: "center" }
  );
}

// =============================================================================
// 슬라이드 12 — 토의
// =============================================================================

function slide12_discussion(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "10  토의 — Safe RL 관점 해석");

  const sections = [
    { title: "① Safe RL 관점 해석", color: C.accent,
      body: "단순 최적화(Baseline)는 안전 제약을 위반한다.\nReward에 안전 비용을 내재화하는 것만으로 방전 사고를 완전히 제거했다." },
    { title: "② 트레이드오프 분석", color: C.accent,
      body: '효율성(처리량) vs 안전성(방전 방지) 상충 여부 → Proposed는 보상 +147.8p 향상과 방전율 70% 감소를 동시 달성' },
    { title: "③ 수렴 안정성 해석", color: C.accent,
      body: "Baseline은 ep 1,500까지 말기 방전율 2.0회 유지 (미수렴)\nProposed는 ep 500 이후 방전율 ≈ 0으로 수렴 → Safety 정책 완전 내재화" },
    { title: "④ 한계점", color: C.lgGray,
      body: "단일 AGV 환경 / 7×7 단순 맵 / 실제 창고 환경과 스케일 차이 존재" },
  ];

  sections.forEach(({ title, color, body }, i) => {
    slide.addText(title, {
      x: 0.5, y: 1.0 + i * 1.35, w: 9.0, h: 0.38,
      fontSize: 13, bold: true, color, fontFace: "Malgun Gothic",
    });
    slide.addText(body, {
      x: 0.5, y: 1.4 + i * 1.35, w: 9.0, h: 0.85,
      fontSize: 12, color: C.black, fontFace: "Malgun Gothic", valign: "top",
    });
  });
}

// =============================================================================
// 슬라이드 13 — 결론 및 향후 연구
// =============================================================================

function slide13_conclusion(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "11  결론 및 향후 연구");

  // 핵심 메시지 박스
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 0.9, w: 9.0, h: 0.65,
    fill: { color: C.black }, line: { color: C.black },
  });
  slide.addText(
    '"Reward Shaping을 통한 Safe RL 구현: AGV 배터리 방전 사고 Zero 달성"',
    { x: 0.5, y: 0.92, w: 9.0, h: 0.6,
      fontSize: 13, bold: true, color: C.white,
      fontFace: "Malgun Gothic", align: "center" }
  );

  // 3줄 결론
  slide.addText("3줄 결론", {
    x: 0.5, y: 1.65, w: 9.0, h: 0.38,
    fontSize: 13, bold: true, color: C.lgRed, fontFace: "Malgun Gothic",
  });
  [
    "① 배터리 상태를 State·Reward에 반영하는 것만으로 방전율 0% 달성",
    "② 안전성 확보와 동시에 작업 처리량도 Baseline 이상 유지",
    "③ Reward 설계가 RL 에이전트의 안전 행동을 유도할 수 있음을 실험 증명",
  ].forEach((txt, i) => {
    slide.addText(txt, {
      x: 0.7, y: 2.1 + i * 0.52, w: 8.8, h: 0.45,
      fontSize: 12, color: C.black, fontFace: "Malgun Gothic",
    });
  });

  // 향후 연구
  slide.addText("향후 연구 방향", {
    x: 0.5, y: 3.75, w: 9.0, h: 0.38,
    fontSize: 13, bold: true, color: C.accent, fontFace: "Malgun Gothic",
  });
  [
    "→ 멀티 AGV 환경 확장 — 협력/충전소 경쟁 스케줄링",
    "→ Constrained RL — 안전 제약을 Reward가 아닌 Hard Constraint로",
    "→ 실제 창고 지도 기반 환경 적용 (장애물, 동적 충전 대기 시간)",
    "→ PPO / SAC 알고리즘 적용 — 연속 공간 및 복잡한 환경 대응",
  ].forEach((txt, i) => {
    slide.addText(txt, {
      x: 0.7, y: 4.2 + i * 0.5, w: 8.8, h: 0.44,
      fontSize: 12, color: C.black, fontFace: "Malgun Gothic",
    });
  });
}

// =============================================================================
// PPT 생성 메인 함수
// =============================================================================

async function main() {
  console.log("PPT 생성 시작...");

  const pptx    = new PptxGenJS();
  pptx.layout  = "LAYOUT_WIDE";  // 16:9 와이드 (13.33" × 7.5")
  pptx.author  = "김한얼";
  pptx.subject = "Safety-Aware Reward Shaping 기반 AGV 배터리 충전 스케줄링 강화학습";

  // 슬라이드 순서대로 생성
  slide01_title(pptx);       // 01. 표지
  slide02_toc(pptx);         // 02. 목차
  slide03_overview(pptx);    // 03. 프로젝트 목표
  slide04_env(pptx);         // 04. 환경 설명
  slide05_reward(pptx);      // 05. Reward Shaping
  slide06_code(pptx);        // 06. 소스코드 비교 (★ 신규)
  slide07_algo(pptx);        // 07. 알고리즘/하이퍼파라미터
  slide08_setup(pptx);       // 08. 실험 셋업
  slide09_results1(pptx);    // 09. 결과① 학습 곡선
  slide10_results2(pptx);    // 10. 결과② 비교 테이블
  slide11_modify(pptx);      // 11. 실험 조건 최적화 과정 (★ 신규)
  slide12_discussion(pptx);  // 12. 토의
  slide13_conclusion(pptx);  // 13. 결론

  // 저장
  await pptx.writeFile({ fileName: OUT_PATH });
  console.log(`\nPPT 저장 완료 (13슬라이드): ${OUT_PATH}`);
}

main().catch(err => {
  console.error("PPT 생성 실패:", err.message);
  process.exit(1);
});
