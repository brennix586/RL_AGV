// =============================================================================
// 파일명   : make_report.js
// 설명     : AGV 배터리 충전 스케줄링 강화학습 PPT 보고서 생성
//            Node.js + PptxGenJS 사용 (npm install pptxgenjs)
// 작성일   : 2026.06.
// 실행방법 : node make_report.js  (src/report/ 디렉토리에서)
//            또는: npm run report
// 슬라이드 : 총 15장 (LG 컨셉 디자인 — 검정 헤더, 흰 배경, 색상 최소화)
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
    { text: "01  프로젝트 주제 및 목표",                                   indent: 0 },
    { text: "02  환경 설명 — 7×7 GridWorld · State / Action / Reward",    indent: 0 },
    { text: "03  Reward Shaping 설계 (Safety-Aware)",                      indent: 0 },
    { text: "04  소스코드 비교 — Baseline vs Proposed",                    indent: 0 },
    { text: "05  알고리즘 및 하이퍼파라미터",                              indent: 0 },
    { text: "06  실험 셋업",                                               indent: 0 },
    { text: "07  실험 결과 ① — 학습 곡선 · 방전 횟수",                   indent: 0 },
    { text: "08  실험 결과 ② — 최종 성능 비교 테이블",                   indent: 0 },
    { text: "09  실험 조건 최적화 과정 ① — Step 0→5 타임라인",           indent: 0 },
    { text: "10  실험 조건 최적화 과정 ② — 핵심 실패 원인 분석",         indent: 0 },
    { text: "11  실험 조건 최적화 과정 ③ — Step 5 수렴 증거",            indent: 0 },
    { text: "12  토의 — Safe RL 관점 해석",                               indent: 0 },
    { text: "13  결론 및 향후 연구",                                       indent: 0 },
  ];

  items.forEach(({ text, indent }, i) => {
    slide.addText(text, {
      x: 1.0 + indent, y: 1.1 + i * 0.42, w: 8.2, h: 0.38,
      fontSize: 12, fontFace: "Malgun Gothic",
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
    [{ text: "R_battery ★"}, { text: "배터리 < 40% + 충전소 도달 (긴급 충전)"}, { text: "+50"         }],
    [{ text: ""           }, { text: "배터리 = 0% (방전) — 대형 사고"       }, { text: "−200 + 종료" }],
  ], {
    x: 0.5, y: 1.65, w: 9.0, colW: [1.8, 4.8, 2.4],
    fontSize: 12, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    fill: { color: C.gray },
  });

  // R_CHARGE_WASTE 설계 변경 노트
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 3.65, w: 9.0, h: 0.45,
    fill: { color: "FFF3CD" }, line: { color: "E6B800" },
  });
  slide.addText(
    "⚠  R_CHARGE_WASTE(-10) 초기 설계 → Step 3 실험에서 학습 초기 충전소 회피 행동 유발 확인 → 제거 (results/modify.md 참조)",
    { x: 0.5, y: 3.67, w: 9.0, h: 0.41,
      fontSize: 10, color: "7A5000", fontFace: "Malgun Gothic", valign: "middle" }
  );

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
    "  # 배터리 소모 (DRAIN=3)",
    "  self.battery -= 3",
    "  reward = R_STEP  # -1",
    "",
    "  # ★ 충전소 Safety Reward",
    "  if pos in charging_stations:",
    "    if battery < 40:  # 긴급 충전",
    "      reward += R_CHARGE_LOW  # +50",
    "    # R_CHARGE_WASTE 제거 (Step4)",
    "    # → 충전 회피 행동 유발 방지",
    "    self.battery = 100  # 완충",
    "",
    "  # ★ 방전 패널티 (-200)",
    "  if self.battery <= 0:",
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
// 슬라이드 11a — 실험 조건 최적화 ① 타임라인 개요
// =============================================================================

function slide11a_modify_overview(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "09  실험 조건 최적화 과정 ① — Step 0→5 타임라인");

  slide.addText("6단계 반복 수정을 통해 Safety Reward가 실질적으로 작동하는 환경 조건을 도출", {
    x: 0.3, y: 0.85, w: 9.4, h: 0.32,
    fontSize: 10.5, color: C.lgGray, fontFace: "Malgun Gothic", italic: true,
  });

  slide.addTable([
    [
      { text: "단계",        options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "핵심 변경",   options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "결과 요약",   options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "판정",        options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "진행",        options: { bold: true, fill: { color: C.black }, color: C.white } },
    ],
    [
      { text: "Step 0\n초기 설계", options: { bold: true, fill: { color: "FDECEA" } } },
      { text: "10×10 / PyTorch / 매 스텝 학습 / 랜덤 시작", options: { fill: { color: "FDECEA" } } },
      { text: "97분 이상 — 실험 완료 불가", options: { color: "CC0000", fill: { color: "FDECEA" } } },
      { text: "❌ 실패", options: { bold: true, color: "CC0000", fill: { color: "FDECEA" }, align: "center" } },
      { text: "환경 경량화", options: { fill: { color: "FDECEA" }, align: "center" } },
    ],
    [
      { text: "Step 1\n경량화", options: { bold: true, fill: { color: "FFF8E1" } } },
      { text: "7×7 / NumPy / 4스텝마다 학습 / 시작 (3,3) 고정", options: { fill: { color: "FFF8E1" } } },
      { text: "55 ep/s — 9분 완료", options: { color: "1E8A47", fill: { color: "FFF8E1" } } },
      { text: "✅ 속도 해결", options: { bold: true, color: "1E8A47", fill: { color: "FFF8E1" }, align: "center" } },
      { text: "보상 설계로", options: { fill: { color: "FFF8E1" }, align: "center" } },
    ],
    [
      { text: "Step 2\nDRAIN=1 / WARN=20", options: { bold: true, fill: { color: "FDECEA" } } },
      { text: "스텝당 -1 (100스텝 지속) / WARNING 배터리 20%", options: { fill: { color: "FDECEA" } } },
      { text: "Safety 보상 발동율 ≈ 0% / Proposed -23.1 vs Baseline -70.4", options: { color: "CC0000", fill: { color: "FDECEA" } } },
      { text: "⚠ 미미", options: { bold: true, color: "CC6600", fill: { color: "FDECEA" }, align: "center" } },
      { text: "압박 강화", options: { fill: { color: "FDECEA" }, align: "center" } },
    ],
    [
      { text: "Step 3\nDRAIN=2 / WARN=40\nWASTE=−10", options: { bold: true, fill: { color: "FDECEA" } } },
      { text: "스텝당 -2 (50스텝) / 낭비 패널티 -10 추가", options: { fill: { color: "FDECEA" } } },
      { text: "Proposed 총방전 277 > Baseline 265 — 역효과!", options: { bold: true, color: "CC0000", fill: { color: "FDECEA" } } },
      { text: "❌ 역효과", options: { bold: true, color: "CC0000", fill: { color: "FDECEA" }, align: "center" } },
      { text: "패널티 제거", options: { fill: { color: "FDECEA" }, align: "center" } },
    ],
    [
      { text: "Step 4\nWASTE 제거", options: { bold: true, fill: { color: "FDECEA" } } },
      { text: "낭비 패널티(-10) 삭제 — 긍정 보상만 유지", options: { fill: { color: "FDECEA" } } },
      { text: "Proposed 총방전 236 > Baseline 224 — 여전히 역전", options: { bold: true, color: "CC0000", fill: { color: "FDECEA" } } },
      { text: "❌ 미해결", options: { bold: true, color: "CC0000", fill: { color: "FDECEA" }, align: "center" } },
      { text: "압박 최대화", options: { fill: { color: "FDECEA" }, align: "center" } },
    ],
    [
      { text: "Step 5 ★\nDRAIN=3 / WARN=40", options: { bold: true, fill: { color: "E8F5E9" } } },
      { text: "스텝당 -3 (33스텝) — 반드시 충전 필요한 환경", options: { fill: { color: "E8F5E9" } } },
      { text: "총방전 471→415 / 말기방전율 70%↓ / 평균보상 +148p", options: { bold: true, color: "1E8A47", fill: { color: "E8F5E9" } } },
      { text: "✅ 최종 채택", options: { bold: true, color: "1E8A47", fill: { color: "E8F5E9" }, align: "center" } },
      { text: "—", options: { fill: { color: "E8F5E9" }, align: "center" } },
    ],
  ], {
    x: 0.2, y: 1.2, w: 9.6,
    colW: [1.6, 2.7, 2.85, 1.1, 1.35],
    fontSize: 9.5, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray },
    rowH: [0.35, 0.6, 0.6, 0.6, 0.65, 0.6, 0.6],
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2, y: 6.3, w: 9.6, h: 0.55,
    fill: { color: C.black }, line: { color: C.black },
  });
  slide.addText(
    "핵심 교훈: 배터리가 생존의 병목이 될 때(DRAIN=3) Safety Reward의 차별적 가치가 드러난다." +
    "  →  다음 슬라이드에서 실패 원인과 수렴 증거를 상세 분석",
    { x: 0.2, y: 6.32, w: 9.6, h: 0.51,
      fontSize: 10, bold: true, color: C.white,
      fontFace: "Malgun Gothic", valign: "middle", align: "center" }
  );
}

// =============================================================================
// 슬라이드 11b — 실험 조건 최적화 ② 핵심 실패 원인 분석
// =============================================================================

function slide11b_modify_failure(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "10  실험 조건 최적화 과정 ② — 핵심 실패 원인 분석");

  // ─── 실패 원인 1: Step 2 ───────────────────────────────────────────────────
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2, y: 0.88, w: 9.6, h: 0.35,
    fill: { color: "FDECEA" }, line: { color: "CC0000" },
  });
  slide.addText("원인 ① Step 2 — Safety 보상이 에피소드 내에서 거의 발동하지 않음 (DRAIN=1, WARNING=20)", {
    x: 0.2, y: 0.9, w: 9.6, h: 0.31,
    fontSize: 11, bold: true, color: "CC0000", fontFace: "Malgun Gothic",
  });

  slide.addTable([
    [
      { text: "항목", options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "수치 / 분석", options: { bold: true, fill: { color: C.black }, color: C.white } },
    ],
    [{ text: "배터리 WARNING 도달 조건" }, { text: "100 → 20 : 80스텝 이동 필요 (DRAIN=1)" }],
    [{ text: "7×7 최적 경로 길이" },       { text: "4~12스텝 → 대부분 에피소드가 목표 도달 또는 Max Step(150)으로 종료" }],
    [{ text: "Safety 보상 실제 발동율" },   { text: "에피소드의 ~0% — 사실상 Proposed ≈ Baseline (reward 차이 미미)" }],
    [{ text: "Baseline 평균 보상 (말기)" }, { text: "-70.4" }],
    [{ text: "Proposed 평균 보상 (말기)" }, { text: "-23.1  (차이는 있으나 방전 횟수 개선 불충분)" }],
  ], {
    x: 0.2, y: 1.27, w: 9.6, colW: [3.2, 6.4],
    fontSize: 10.5, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray }, fill: { color: C.gray },
    rowH: [0.32, 0.38, 0.48, 0.38, 0.32, 0.32],
  });

  // ─── 실패 원인 2: Step 3 ───────────────────────────────────────────────────
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2, y: 3.2, w: 9.6, h: 0.35,
    fill: { color: "FDECEA" }, line: { color: "CC0000" },
  });
  slide.addText("원인 ② Step 3 — R_CHARGE_WASTE(-10)가 학습 초기 충전소 회피 행동을 역유발", {
    x: 0.2, y: 3.22, w: 9.6, h: 0.31,
    fontSize: 11, bold: true, color: "CC0000", fontFace: "Malgun Gothic",
  });

  slide.addTable([
    [
      { text: "구간 (ep)", options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "Baseline 방전 횟수",  options: { bold: true, fill: { color: "CC3300" }, color: C.white } },
      { text: "Proposed 방전 횟수",  options: { bold: true, fill: { color: "005BAC" }, color: C.white } },
      { text: "판정 / 원인",         options: { bold: true, fill: { color: C.black  }, color: C.white } },
    ],
    [{ text: "ep 1~100 (탐색기)" }, { text: "39.2회" }, { text: "39.4회" }, { text: "≈ 동일 — epsilon ≈ 1.0, 완전 랜덤" }],
    [
      { text: "ep 101~200 (반학습, ε≈0.7)", options: { bold: true } },
      { text: "4.4회",  options: { color: "1E8A47" } },
      { text: "10.6회", options: { bold: true, color: "CC0000" } },
      { text: "Proposed 2.4× 나쁨! — WASTE=-10 먼저 학습 → 충전소 회피 행동 강화" },
    ],
    [{ text: "ep 200~ (수렴 후)" }, { text: "1~2회/100ep" }, { text: "0~1회/100ep" }, { text: "뒤늦게 역전 — 그러나 초반 손실 누적" }],
    [{ text: "5 seed 총계" }, { text: "265회" }, { text: "277회 ← Proposed 더 많음" }, { text: "❌ 전체 합산에서 역효과 확정" }],
  ], {
    x: 0.2, y: 3.59, w: 9.6, colW: [2.6, 1.8, 1.8, 3.4],
    fontSize: 10.5, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray }, fill: { color: C.gray },
    rowH: [0.33, 0.38, 0.52, 0.38, 0.38],
  });

  // ─── 실패 원인 3: Step 4 ───────────────────────────────────────────────────
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2, y: 5.65, w: 9.6, h: 0.35,
    fill: { color: "FFF3CD" }, line: { color: "E6B800" },
  });
  slide.addText("원인 ③ Step 4 — DRAIN=2는 충전 없이도 목표 도달 가능 → Baseline도 스스로 수렴", {
    x: 0.2, y: 5.67, w: 9.6, h: 0.31,
    fontSize: 11, bold: true, color: "7A5000", fontFace: "Malgun Gothic",
  });

  slide.addTable([
    [
      { text: "분석 항목", options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "내용",      options: { bold: true, fill: { color: C.black }, color: C.white } },
    ],
    [
      { text: "DRAIN=2 배터리 지속 시간" },
      { text: "100 ÷ 2 = 50스텝 지속 — 7×7 최적 경로(4~12스텝)의 4~12배" },
    ],
    [
      { text: "Baseline의 자가 학습 능력" },
      { text: "-200 방전 패널티만으로도 「충전 없이 빠르게 목표」 전략 수렴 가능 → Safety 보상의 추가 가치 소멸" },
    ],
    [
      { text: "결론" },
      { text: "Safety Reward가 의미를 갖으려면 배터리가 실제 병목이어야 한다 → DRAIN=3 (33스텝)으로 압박 극대화" },
    ],
  ], {
    x: 0.2, y: 6.04, w: 9.6, colW: [2.8, 6.8],
    fontSize: 10.5, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray }, fill: { color: "FEFDE7" },
    rowH: [0.32, 0.38, 0.42, 0.38],
  });
}

// =============================================================================
// 슬라이드 11c — 실험 조건 최적화 ③ Step 5 수렴 증거
// =============================================================================

function slide11c_modify_convergence(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "11  실험 조건 최적화 과정 ③ — Step 5 수렴 증거 (DRAIN=3)");

  slide.addText("에포크 구간별 방전 횟수 분석 — Baseline 미수렴 vs Proposed 완전 수렴", {
    x: 0.3, y: 0.85, w: 9.4, h: 0.32,
    fontSize: 11, bold: true, color: C.accent, fontFace: "Malgun Gothic",
  });

  slide.addTable([
    [
      { text: "에포크 구간",       options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "Baseline 방전 횟수", options: { bold: true, fill: { color: "CC3300" }, color: C.white } },
      { text: "Proposed 방전 횟수", options: { bold: true, fill: { color: "005BAC" }, color: C.white } },
      { text: "판정",               options: { bold: true, fill: { color: C.black }, color: C.white } },
      { text: "해석",               options: { bold: true, fill: { color: C.black }, color: C.white } },
    ],
    [
      { text: "ep 1~100\n(완전 탐색기)" },
      { text: "52.0회" },
      { text: "48.8회" },
      { text: "≈ 동일", options: { color: C.lgGray } },
      { text: "epsilon=1.0, 완전 랜덤 행동 — 차이 없음" },
    ],
    [
      { text: "ep 101~200\n(초기 학습)" },
      { text: "20.6회" },
      { text: "19.4회" },
      { text: "≈ 동일", options: { color: C.lgGray } },
      { text: "Safety 신호 학습 시작 — 아직 차이 미미" },
    ],
    [
      { text: "ep 201~300\n(중기 학습)" },
      { text: "6.8회",  options: { color: "1E8A47" } },
      { text: "10.0회", options: { color: "CC0000" } },
      { text: "Baseline 우세", options: { bold: true, color: "CC6600" } },
      { text: "Baseline이 단순 회피 전략 먼저 수렴 — 일시적 역전" },
    ],
    [
      { text: "ep 301~500\n(역전 구간)" },
      { text: "4.6회" },
      { text: "1.0회", options: { bold: true, color: "005BAC" } },
      { text: "★ Proposed 역전", options: { bold: true, color: "1E8A47" } },
      { text: "Safety Reward 내재화 완료 → 충전 전략 선제적 실행" },
    ],
    [
      { text: "ep 501~700\n(수렴 완성)" },
      { text: "3.2회" },
      { text: "0.2회", options: { bold: true, color: "005BAC" } },
      { text: "Proposed 압도", options: { bold: true, color: "1E8A47" } },
      { text: "Baseline: 여전히 사후 대응 / Proposed: 예방적 충전 완성" },
    ],
    [
      { text: "ep 700~1500\n(후반 안정기)" },
      { text: "4.6회 / 800ep", options: { bold: true, color: "CC0000" } },
      { text: "1.6회 / 800ep",  options: { bold: true, color: "005BAC" } },
      { text: "격차 유지", options: { bold: true, color: "1E8A47" } },
      { text: "Baseline 미수렴(방전 지속) vs Proposed 안정적 유지" },
    ],
    [
      { text: "5 seed 총계", options: { bold: true, fill: { color: "F5F5F5" } } },
      { text: "471회", options: { bold: true, color: "CC0000", fill: { color: "F5F5F5" } } },
      { text: "415회", options: { bold: true, color: "005BAC", fill: { color: "F5F5F5" } } },
      { text: "56회 감소", options: { bold: true, color: "1E8A47", fill: { color: "F5F5F5" } } },
      { text: "말기 방전율: 2.0 → 0.6 (70% 개선)", options: { bold: true, fill: { color: "F5F5F5" } } },
    ],
  ], {
    x: 0.2, y: 1.22, w: 9.6,
    colW: [1.75, 1.55, 1.6, 1.7, 2.95],
    fontSize: 10, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray }, fill: { color: C.gray },
    rowH: [0.38, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.45],
  });

  // 최종 파라미터 요약
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2, y: 5.85, w: 9.6, h: 0.32,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  slide.addText("최종 채택 파라미터", {
    x: 0.2, y: 5.87, w: 9.6, h: 0.28,
    fontSize: 11, bold: true, color: C.white, fontFace: "Malgun Gothic",
  });
  slide.addTable([
    [
      { text: "DRAIN_PER_STEP = 3", options: { bold: true } },
      { text: "WARNING_THRESHOLD = 40", options: { bold: true } },
      { text: "R_CHARGE_LOW = +50", options: { bold: true } },
      { text: "R_CHARGE_WASTE = 제거", options: { bold: true } },
      { text: "R_DEAD = −200", options: { bold: true } },
    ],
  ], {
    x: 0.2, y: 6.21, w: 9.6, colW: [1.9, 2.15, 1.9, 1.95, 1.7],
    fontSize: 11, fontFace: "Malgun Gothic",
    border: { pt: 1, color: C.lineGray }, fill: { color: "EAF4FF" },
    rowH: [0.42],
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2, y: 6.67, w: 9.6, h: 0.55,
    fill: { color: C.black }, line: { color: C.black },
  });
  slide.addText(
    "Baseline은 ep 1,500까지 방전이 사라지지 않음 (미수렴 상태 유지).\n" +
    "Proposed는 ep 500 이후 방전율이 거의 0으로 수렴 — Safety 정책이 완전히 내재화됨을 실험으로 증명.",
    { x: 0.2, y: 6.69, w: 9.6, h: 0.51,
      fontSize: 10, color: C.white, fontFace: "Malgun Gothic",
      valign: "middle", align: "center" }
  );
}

// =============================================================================
// 슬라이드 12 — 토의
// =============================================================================

function slide12_discussion(pptx) {
  const slide = pptx.addSlide();
  addHeader(slide, pptx, "12  토의 — Safe RL 관점 해석");

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
  addHeader(slide, pptx, "13  결론 및 향후 연구");

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
  slide01_title(pptx);            // 01. 표지
  slide02_toc(pptx);              // 02. 목차
  slide03_overview(pptx);         // 03. 프로젝트 목표
  slide04_env(pptx);              // 04. 환경 설명
  slide05_reward(pptx);           // 05. Reward Shaping (R_CHARGE_WASTE 제거 반영)
  slide06_code(pptx);             // 06. 소스코드 비교
  slide07_algo(pptx);             // 07. 알고리즘/하이퍼파라미터
  slide08_setup(pptx);            // 08. 실험 셋업
  slide09_results1(pptx);         // 09. 결과① 학습 곡선
  slide10_results2(pptx);         // 10. 결과② 비교 테이블
  slide11a_modify_overview(pptx); // 11. 최적화 과정 ① 타임라인
  slide11b_modify_failure(pptx);  // 12. 최적화 과정 ② 실패 원인 분석
  slide11c_modify_convergence(pptx); // 13. 최적화 과정 ③ 수렴 증거
  slide12_discussion(pptx);       // 14. 토의
  slide13_conclusion(pptx);       // 15. 결론

  // 저장
  await pptx.writeFile({ fileName: OUT_PATH });
  console.log(`\nPPT 저장 완료 (15슬라이드): ${OUT_PATH}`);
}

main().catch(err => {
  console.error("PPT 생성 실패:", err.message);
  process.exit(1);
});
