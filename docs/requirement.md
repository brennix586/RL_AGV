# AGV 배터리 충전 스케줄링 강화학습 프로젝트

> **Repository:** https://github.com/brennix586/RL_claude_v1.0  
> **작성일:** 2026.06.  
> **상태:** 계획 확정 / 구현 대기

---

## 1. 프로젝트 개요

### 1.1 주제
AGV(Automated Guided Vehicle)의 배터리 소모와 충전 스케줄링을 고려한 강화학습 기반 최적 경로 제어

### 1.2 핵심 목표
> "기본 알고리즘은 최단 경로만 찾다가 배터리 방전으로 멈추는 대형 사고를 유발한다.  
> 본 프로젝트에서는 AGV의 지속 가능한 운영을 위해 **작업 효율성**과 **방전 위험도**를  
> 동시에 고려한 Reward Shaping을 제안하여, 방전율 0%를 유지하면서 물류 처리량을 최적화한다."

### 1.3 핵심 기여점
- 기존 위치 기반 State에 **배터리 잔량**을 추가한 확장 State 설계
- **Multi-objective Reward Function** 설계 (`R_step + R_goal + R_battery`)
- Baseline(배터리 무시) vs Proposed(Reward Shaping) 비교 실험

---

## 2. 환경 설계

### 2.1 GridWorld 맵

```
크기: 10 × 10
충전소: 2개 (대각선 구석 배치)

(0,0) ■ . . . . . . . . .
      . . . . . . . . . .
      . . . . . . . . . .
      . . . . . . . . . .
      . . . . . . . . . .
      . . . . . . . . . .
      . . . . . . . . . .
      . . . . . . . . . .
      . . . . . . . . . .
      . . . . . . . . . ■ (9,9)

■ : 충전소 (Charging Station)
. : 이동 가능 격자
T : 작업 목표 지점 (매 에피소드 랜덤 생성)
```

### 2.2 구현 방식
- 베이스 환경: `CliffWalking-v0` (Gymnasium)
- 감싸기 방식: `gymnasium.Wrapper` 사용
- 클래스명: `AGVStyleWarehouseWrapper`

---

## 3. 강화학습 설계

### 3.1 State 공간

$$S = (x, y, \text{battery})$$

| 변수 | 설명 | 범위 |
|------|------|------|
| `x` | AGV 열 위치 | 0 ~ 9 |
| `y` | AGV 행 위치 | 0 ~ 9 |
| `battery` | 배터리 잔량 | 0 ~ 100 (정수) |

### 3.2 Action 공간

이산(Discrete) 행동 공간 — 4개

| 행동 ID | 방향 |
|---------|------|
| 0 | 상 (Up) |
| 1 | 하 (Down) |
| 2 | 좌 (Left) |
| 3 | 우 (Right) |

### 3.3 Reward Function ★핵심 기여점★

$$R = R_{\text{step}} + R_{\text{goal}} + R_{\text{battery}}$$

| 항목 | 상황 | 보상값 |
|------|------|--------|
| $R_{\text{step}}$ | 매 이동 스텝 | `-1` |
| $R_{\text{goal}}$ | 목표 지점 도달 | `+100` |
| $R_{\text{battery}}$ | 배터리 < 20% + 충전소 도달 | `+50` |
| $R_{\text{battery}}$ | 배터리 충분 + 충전소 도달 | `-10` (시간 낭비 패널티) |
| $R_{\text{battery}}$ | 배터리 = 0% (방전) | `-200` + 에피소드 종료 |

### 3.4 배터리 규칙

| 항목 | 값 |
|------|-----|
| 초기 배터리 | 100 |
| 스텝당 소모 | -1 |
| 경고 임계값 | 20% (20 이하) |
| 충전 후 배터리 | 100 (완충) |
| AGV가 현재 위치에서 | 가까운 충전소를 스스로 판단해야 함 |

---

## 4. 알고리즘 및 하이퍼파라미터

### 4.1 알고리즘
- **DQN (Deep Q-Network)**
  - Experience Replay (Replay Buffer)
  - Target Network (주기적 갱신)
  - Epsilon-Greedy 탐색 전략

### 4.2 네트워크 구조

```
Input  : State (x, y, battery) → 3차원
Hidden : 128 → 128 (ReLU 활성화)
Output : Q-value × 4 (행동 수)
```

### 4.3 하이퍼파라미터

| 파라미터 | 값 | 비고 |
|----------|-----|------|
| Learning Rate | `0.001` | 안정적 수렴 |
| Gamma (할인율) | `0.99` | 장기 보상 중시 |
| Epsilon Start | `1.0` | 초기 완전 탐색 |
| Epsilon End | `0.01` | 최소 탐색 유지 |
| Epsilon Decay | `0.995` | 2,000 ep 기준 자연 감소 |
| Batch Size | `64` | 안정적 미니배치 |
| Replay Buffer | `10,000` | 충분한 경험 저장 |
| Hidden Size | `128 × 128` | 과적합 방지 |
| Target Update | `10 steps` | 안정적 타겟 갱신 |
| 학습 에피소드 | `2,000` | 메인 실험 기준 |

---

## 5. 비교 실험 설계

### 5.1 Baseline vs Proposed

| 구분 | Reward 구성 | 배터리 고려 |
|------|------------|------------|
| **Baseline** | $R_{\text{step}} + R_{\text{goal}}$ | ❌ 무시 |
| **Proposed** | $R_{\text{step}} + R_{\text{goal}} + R_{\text{battery}}$ | ✅ Reward Shaping |

### 5.2 평가 지표 (Evaluation Metrics)

| 지표 | 설명 | 기대 결과 |
|------|------|-----------|
| 평균 에피소드 보상 | 학습 안정성 및 성능 | Proposed > Baseline |
| 방전 횟수 (Dead Count) | 핵심 지표 | Baseline 빈번, Proposed = 0 |
| 에피소드당 작업 완료 수 | 물류 처리량 | Proposed 우위 |
| 충전소 방문 횟수 | 충전 전략 학습 여부 | Proposed 적절한 방문 |
| 평균 에피소드 길이 | 효율성 | Proposed 최적화 |

### 5.3 신뢰도 확보 — 랜덤 시드 실험

```python
SEEDS = [0, 1, 42, 123, 777]  # 5개 시드 고정 실험
```

- 각 시드별 결과의 **평균 ± 표준편차** 계산
- 학습 곡선에 **음영(shaded) 신뢰구간** 시각화

### 5.4 하이퍼파라미터 민감도 분석

| 실험 ID | 변경 항목 | 실험값 |
|---------|-----------|--------|
| Exp-1 | 배터리 경고 임계값 | 10% / **20%** / 30% |
| Exp-2 | 방전 패널티 | -100 / **-200** / -500 |
| Exp-3 | 학습률 | 0.0001 / **0.001** / 0.01 |

> **굵게** 표시된 값이 기본(default) 설정값

---

## 6. PPT 보고서 슬라이드 구성

총 **11슬라이드** | 언어: 한국어 | 디자인: LG 컨셉 (흰 배경, 색상 최소화)

| # | 슬라이드 제목 | 핵심 내용 |
|---|--------------|-----------|
| 1 | 표지 | 프로젝트명, 날짜 |
| 2 | 목차 | 전체 흐름 |
| 3 | 프로젝트 주제 및 목표 | RL 강조, 최적화 목표, 문제 정의 |
| 4 | 환경 설명 | GridWorld 맵, State/Action/Reward 수식 |
| 5 | Reward Shaping 설계 | 수식 상세, Baseline vs Proposed 비교 |
| 6 | 알고리즘 및 하이퍼파라미터 | DQN 구조, 네트워크, 파라미터 테이블 |
| 7 | 실험 셋업 | 실험환경, 평가지표, 시드 설정 |
| 8 | 실험 결과 ① | 학습 곡선 (신뢰구간 포함), 방전 횟수 비교 |
| 9 | 실험 결과 ② | 하이퍼파라미터 민감도 분석, 처리량 비교 테이블 |
| 10 | 토의 | 결과 해석, 한계점 |
| 11 | 결론 및 향후 연구 | 핵심 기여, 개선 방향 |

---

## 7. 폴더 구조

```
RL_claude_v1.0/
│
├── src/                            # 파이썬 소스코드
│   ├── env/
│   │   └── agv_warehouse_env.py    # Custom Gymnasium Wrapper
│   ├── agent/
│   │   └── dqn_agent.py            # DQN 에이전트
│   ├── train/
│   │   └── train.py                # 학습 실행 스크립트
│   └── report/
│       └── make_report.js          # PPT 보고서 생성
│
├── results/                        # 실험 결과
│   ├── logs/                       # 학습 로그 (JSON, CSV)
│   └── images/                     # 그래프 이미지 출력
│
├── prompts/                        # 프롬프트 / 스킬 / 룰 관리
│   ├── prompts.md                  # Claude 프롬프트 기록
│   ├── skills.md                   # 활용 스킬 정리
│   └── rules.md                    # 프로젝트 규칙/컨벤션
│
├── docs/                           # 문서
│   └── requirement.md              # 요구사항 정리 (이 파일)
│
├── .gitignore
└── README.md
```

---

## 8. 개발 환경

| 항목 | 내용 |
|------|------|
| 언어 | Python 3.10+ |
| RL 라이브러리 | Gymnasium |
| 딥러닝 | NumPy (순수 구현) 또는 PyTorch |
| 시각화 | Matplotlib |
| 보고서 | Node.js + PptxGenJS |
| IDE | VS Code |
| 버전 관리 | Git + GitHub |

---

## 9. 진행 상태

```
✅ 완료
├── 프로젝트 주제 확정
├── 환경 설계 확정
├── State / Action / Reward 설계 확정
├── DQN 하이퍼파라미터 확정
├── 비교 실험 설계 확정
├── PPT 슬라이드 구성 확정
└── 폴더 구조 확정

🔲 진행 예정
├── 폴더 구조 생성 (VS Code)
├── agv_warehouse_env.py 구현
├── dqn_agent.py 구현
├── train.py 구현 (Baseline + Proposed)
├── 실험 실행 (5개 시드 × 2,000 ep)
├── 결과 시각화 (그래프 생성)
└── PPT 보고서 생성
```

---

*본 계획서는 Claude.ai와 협업하여 작성되었습니다.*
