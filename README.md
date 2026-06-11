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
| 배터리 < 40% + 충전소 도달 | +50 |
| 배터리 충분 + 충전소 도달 | -10 |
| 배터리 = 0% (방전) | **-200** + 에피소드 종료 |

---

## 알고리즘

**DQN (Deep Q-Network) — NumPy 순수 구현**
- Experience Replay (Replay Buffer: 10,000)
- Target Network (10 학습 스텝 주기 갱신)
- Epsilon-Greedy (1.0 → 0.01, decay 0.995)
- 네트워크: `3 → 128(ReLU) → 128(ReLU) → 4` (~18,180 파라미터)
- Adam Optimizer (NumPy 직접 구현)

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
│   └── report/make_report.js        # PPT 보고서 생성 (12슬라이드)
├── results/
│   ├── logs/{baseline,proposed}/    # CSV 로그 (시드별)
│   ├── images/                      # 학습 곡선 그래프
│   ├── checkpoints/{mode}/seed{N}/  # 체크포인트 (시드별 완전 분리)
│   └── AGV_Report.pptx              # 생성된 PPT 보고서
├── prompts/
├── docs/requirement.md
├── .gitignore
└── README.md
```

---

## 실험 설계

- **5개 랜덤 시드** `[0, 1, 42, 123, 777]` × 1,500 에피소드
- 평균 ± 표준편차로 신뢰구간 시각화

| 평가 지표 | 기대 결과 |
|----------|-----------|
| 평균 에피소드 보상 | Proposed > Baseline |
| 방전 횟수 (★ 핵심) | Baseline 빈번 / **Proposed = 0** |
| 에피소드당 작업 완료 | Proposed 우위 |
| 학습 수렴 속도 | Proposed 빠름 (풍부한 경험) |

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
