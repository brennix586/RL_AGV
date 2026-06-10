# AGV 배터리 충전 스케줄링 강화학습

AGV(Automated Guided Vehicle)의 배터리 소모와 충전 스케줄링을 고려한 **DQN 기반 최적 경로 제어** 프로젝트.

기존 최단 경로 알고리즘은 배터리 방전으로 인한 운영 중단을 야기한다. 본 프로젝트는 **Reward Shaping**을 통해 방전율 0%를 유지하면서 물류 처리량을 최적화한다.

---

## 핵심 기여

- 위치 기반 State에 **배터리 잔량**을 추가한 확장 State 설계 `S = (x, y, battery)`
- **Multi-objective Reward Function**: `R = R_step + R_goal + R_battery`
- Baseline(배터리 무시) vs Proposed(Reward Shaping) 비교 실험

---

## 환경

| 항목 | 내용 |
|------|------|
| 맵 크기 | 10 × 10 GridWorld |
| 충전소 | 2개 — (0,0), (9,9) |
| 기반 환경 | `CliffWalking-v0` (Gymnasium Wrapper) |
| State | `(x, y, battery)` — battery: 0~100 |
| Action | 상/하/좌/우 (4개) |

### Reward 설계

| 상황 | 보상 |
|------|------|
| 매 이동 스텝 | -1 |
| 목표 지점 도달 | +100 |
| 배터리 < 20% + 충전소 도달 | +50 |
| 배터리 충분 + 충전소 도달 | -10 |
| 배터리 = 0% (방전) | -200 + 에피소드 종료 |

---

## 알고리즘

**DQN (Deep Q-Network)**
- Experience Replay (Replay Buffer: 10,000)
- Target Network (10 steps 주기 갱신)
- Epsilon-Greedy (1.0 → 0.01, decay 0.995)
- 네트워크: `3 → 128 → 128 → 4` (ReLU)

---

## 폴더 구조

```
RL_AGV/
├── src/
│   ├── env/agv_warehouse_env.py   # Custom Gymnasium Wrapper
│   ├── agent/dqn_agent.py         # DQN 에이전트
│   ├── train/train.py             # 학습 실행 (Baseline + Proposed)
│   └── report/make_report.js      # PPT 보고서 생성
├── results/
│   ├── logs/                      # 학습 로그 (JSON, CSV)
│   └── images/                    # 그래프 이미지
├── prompts/
│   ├── prompts.md
│   ├── skills.md
│   └── rules.md
├── docs/
│   └── requirement.md
├── .gitignore
└── README.md
```

---

## 실험 설계

- **5개 랜덤 시드** `[0, 1, 42, 123, 777]` × 2,000 에피소드
- 평균 ± 표준편차로 신뢰구간 시각화

| 평가 지표 | 기대 결과 |
|----------|-----------|
| 평균 에피소드 보상 | Proposed > Baseline |
| 방전 횟수 | Baseline 빈번 / Proposed = 0 |
| 에피소드당 작업 완료 수 | Proposed 우위 |
| 충전소 방문 횟수 | Proposed 적절한 방문 |

---

## 개발 환경

| 항목 | 내용 |
|------|------|
| 언어 | Python 3.10+ |
| RL 라이브러리 | Gymnasium |
| 딥러닝 | NumPy 또는 PyTorch |
| 시각화 | Matplotlib |
| 보고서 | Node.js + PptxGenJS |
