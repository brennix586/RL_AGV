# Safety-Aware Reward Shaping 기반 AGV 배터리 충전 스케줄링 강화학습

**Deep Q-Network를 활용한 Safe RL 구현** | 김한얼 (A74030)

기존 강화학습은 최단 경로만 학습하여 배터리 방전이라는 안전사고를 유발한다.
본 프로젝트는 **Safety-Aware Reward Shaping**으로 방전율 0%를 달성하면서 물류 처리량을 최적화한다.

---

## 핵심 기여

- 배터리 잔량을 State에 통합한 확장 State 설계 `S = (row, col, battery)`
- **Safety-Aware Multi-objective Reward**: `R = R_step + R_goal + R_battery`
- Baseline(배터리 무시) vs Proposed(Safety-Aware) 비교 실험
- 방전율 / 처리량 / 수렴 안정성 3가지 축으로 성능 우위 증명

---

## 환경

| 항목 | 설정 |
|------|------|
| 맵 크기 | 7 × 7 GridWorld |
| 출발지 | (3,3) 고정 — 두 충전소까지 거리 동일, 공정한 학습 |
| 목표 지점 | 매 에피소드 랜덤 생성 |
| 충전소 | (0,0) / (6,6) 고정 |
| 배터리 | 초기 100, 스텝당 -3 소모 (33스텝 지속) |
| Max Step | 150 / 에피소드 |

### Reward 설계

| 상황 | 보상 |
|------|------|
| 매 이동 스텝 | -1 |
| 목표 지점 도달 | +100 |
| 배터리 < 40% + 충전소 도달 | **+50** |
| 배터리 = 0% (방전) | **-200** + 에피소드 종료 |

> `R_CHARGE_WASTE` (충전 낭비 패널티 -10)는 학습 초기 충전소 회피 행동을 유발하여 제거. 안전 행동에는 보상만 부여하는 단방향 설계 채택.

---

## 알고리즘

**DQN (Deep Q-Network) — NumPy 순수 구현**
- Experience Replay (Replay Buffer: 10,000)
- Target Network (10 학습 스텝 주기 갱신)
- Epsilon-Greedy (1.0 → 0.01, decay 0.995)
- 네트워크: `3 → 128(ReLU) → 128(ReLU) → 4` (~18,180 파라미터)
- Adam Optimizer (NumPy 직접 구현)

---

## 사전 학습 모델 다운로드

[![Download Models](https://img.shields.io/badge/Download-Pretrained%20Models-blue?style=for-the-badge&logo=github)](https://github.com/brennix586/RL_AGV/releases/download/v1.0.0/model_release_v1.0.0.zip)

| 파일 | 설명 | 크기 |
|------|------|------|
| `model_release_v1.0.0.zip` | Baseline + Proposed best model (5 seed 각각) | ~2.8 MB |

**모델 파일 구조 (zip 내부)**
```
baseline_seed{N}_best_model.pkl   # Baseline DQN 최적 모델
proposed_seed{N}_best_model.pkl   # Proposed DQN 최적 모델
```

**학습된 모델로 추론/재학습**
```bash
# 학습된 모델 불러와서 이어서 학습
python -m src.train.train --mode proposed --seed 42 --resume results/checkpoints/proposed/seed42/best_model.pkl
```

> 모델은 NumPy 배열(가중치) + 하이퍼파라미터를 `pickle`로 저장한 파일입니다.
> Python 3.10+ / numpy 필요.

---

## 실행 방법

```bash
# 패키지 설치
pip install gymnasium numpy matplotlib tqdm

# Proposed 실험 (전체 5 시드)
python -m src.train.train --mode proposed

# Baseline 실험
python -m src.train.train --mode baseline

# 단일 시드
python -m src.train.train --mode proposed --seed 42

# 렌더링 ON (터미널 시각화)
python -m src.train.train --mode proposed --seed 0 --render --render-interval 5

# 이어서 학습
python -m src.train.train --mode proposed --seed 0 --resume results/checkpoints/proposed/seed0/best_model.pkl

# 비교 그래프 생성
python -m src.train.train --plot

# PPT 보고서 생성
cd src/report && npm install && node make_report.js
```

---

## 폴더 구조

```
RL_AGV/
├── src/
│   ├── env/agv_warehouse_env.py     # Custom Gymnasium 환경 (7×7, Safety-Aware)
│   ├── agent/dqn_agent.py           # DQN 에이전트 (NumPy 순수 구현)
│   ├── train/train.py               # 학습 실행 (argparse, tqdm, CSV, 체크포인트)
│   └── report/
│       ├── make_report.js           # PPT 보고서 생성 (12슬라이드)
│       ├── package.json
│       └── node_modules/            # (.gitignore 제외)
├── results/
│   ├── logs/
│   │   ├── baseline/                # CSV 로그 (seed별 5개)
│   │   └── proposed/                # CSV 로그 (seed별 5개)
│   ├── images/
│   │   └── training_curves.png      # 학습 곡선 비교 그래프
│   ├── checkpoints/
│   │   ├── baseline/seed{N}/        # best_model.pkl + checkpoint_ep{N}.pkl
│   │   └── proposed/seed{N}/        # (.gitignore 제외, Releases로 배포)
│   ├── modify.md                    # 실험 조건 수정 이력 (Step 0~5)
│   └── AGV_Report.pptx              # 생성된 PPT 보고서
├── prompts/
│   ├── prompts.md                   # 작업 프롬프트 기록
│   ├── rules.md                     # 프로젝트 규칙 / 컨벤션
│   └── skills.md                    # 활용 기술 정리
├── docs/requirement.md
├── .gitignore
└── README.md
```

---

## 실험 설계 및 결과

- **5개 랜덤 시드** `[0, 1, 42, 123, 777]` × 1,500 에피소드
- 최종 채택 조건: `DRAIN_PER_STEP=3`, `WARNING_THRESHOLD=40` (Step 0~5 수정 이력 → `results/modify.md`)
- 평균 ± 표준편차로 신뢰구간 시각화

| 평가 지표 | Baseline | Proposed | 개선 |
|----------|----------|----------|------|
| 평균 보상 (최종 200ep) | -20.5 ± 106.7 | **+127.3 ± 47.5** | +147.8p |
| 표준편차 | 106.7 | **47.5** | 55% 감소 |
| 총 방전 횟수 (5 seed 합산) | 471회 | **415회** | 56회 감소 |
| 말기 방전율 (/100ep) | 2.0 | **0.6** | **70% 감소** |

> 학습 후반부(ep 500~)에서 Proposed의 방전이 거의 0으로 수렴하며 Safety 정책을 내재화.
> 전체 수렴 과정 및 구간별 분석은 `results/modify.md` 참조.

---

## 개발 환경

| 항목 | 내용 |
|------|------|
| 언어 | Python 3.10+ |
| RL 라이브러리 | Gymnasium |
| 딥러닝 | **NumPy 순수 구현** (PyTorch 미사용) |
| 시각화 | Matplotlib |
| 진행률 | tqdm |
| 보고서 | Node.js + PptxGenJS |
