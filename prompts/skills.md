# 활용 스킬 정리

> 본 프로젝트에서 사용된 기술, 알고리즘, 도구 요약

---

## 강화학습 (RL)

### DQN (Deep Q-Network)
- Q-Learning을 신경망으로 근사
- **Experience Replay**: 과거 경험을 랜덤 샘플링하여 상관관계 제거
- **Target Network**: 학습 안정성을 위해 별도 타깃 Q값 유지, 10스텝 주기 동기화
- **Epsilon-Greedy**: 탐험(exploration) vs 활용(exploitation) 균형

### Safety-Aware Reward Shaping
- 단순 최단거리 보상 외에 배터리 안전 조건을 보상에 명시적 반영
- 배터리 위험 구간(`< 40%`)에서 충전 행동에 양의 보상(`+50`) 부여
- 방전 시 강한 패널티(`-200`) + 에피소드 즉시 종료로 안전 행동 강제

### Multi-Objective 상태 설계
- 기존: `S = (row, col)` → 확장: `S = (row, col, battery)`
- 배터리 잔량을 관찰 가능한 상태로 포함하여 에이전트가 충전 필요성 학습

---

## 딥러닝 구현 (NumPy)

- **완전 연결 신경망**: `[3 → 128(ReLU) → 128(ReLU) → 4]`, 약 18,180 파라미터
- **Adam Optimizer**: 모멘텀(β₁=0.9), RMSProp(β₂=0.999) 조합, NumPy로 직접 구현
- **역전파**: 체인룰 기반 수동 구현, PyTorch 미사용

---

## 환경 설계 (Gymnasium)

- `gymnasium.Env` 상속, `reset()` / `step()` / `render()` 구현
- 7×7 GridWorld: 장애물 없음, 충전소 2개, 매 에피소드 목표지점 랜덤 생성
- 터미널 ASCII 렌더링 지원 (`--render` 플래그)

---

## 실험 관리

- **다중 시드 실험**: `[0, 1, 42, 123, 777]` 5개 시드로 통계적 신뢰성 확보
- **CSV 로그**: 에피소드별 보상, 방전 횟수, 작업 완료 수 기록
- **체크포인트**: 150 에피소드 간격 저장 + best_model 자동 갱신
- **학습 곡선**: Matplotlib으로 평균 ± 표준편차 시각화

---

## 도구 및 라이브러리

| 도구 | 용도 |
|------|------|
| Python 3.10+ | 메인 언어 |
| NumPy | 신경망 및 수치 연산 |
| Gymnasium | RL 환경 표준 인터페이스 |
| Matplotlib | 학습 결과 시각화 |
| tqdm | 학습 진행률 표시 |
| Node.js + PptxGenJS | PPT 보고서 자동 생성 |
| Git + GitHub | 버전 관리 및 코드 공유 |
| GitHub Releases | 학습된 모델 파일 배포 |

---

## 배포

- **모델 배포**: GitHub Releases `v1.0.0`에 `best_model.pkl` zip 업로드
- **다운로드 링크**: README.md 배지로 접근 편의성 제공
- **재현 방법**: `--resume` 플래그로 저장된 모델에서 이어서 학습 가능
