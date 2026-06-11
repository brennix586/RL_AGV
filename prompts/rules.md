# 프로젝트 규칙 / 컨벤션

---

## 파일 및 폴더 구조

```
RL_AGV/
├── src/
│   ├── env/          # Gymnasium 환경 클래스
│   ├── agent/        # RL 에이전트
│   ├── train/        # 학습 실행 진입점
│   └── report/       # 보고서 생성 스크립트
├── results/
│   ├── checkpoints/{mode}/seed{N}/   # 모델 저장 (시드별 분리)
│   ├── logs/{mode}/                  # CSV 학습 로그
│   └── images/                       # 학습 곡선 이미지
├── docs/             # 요구사항 문서
└── prompts/          # Claude 프롬프트 및 규칙 기록
```

---

## 코딩 컨벤션

- **언어**: Python 3.10+, Node.js (보고서 생성만)
- **딥러닝**: PyTorch 미사용 — NumPy 순수 구현 (과제 요건)
- **RL 환경**: Gymnasium API 준수 (`reset()`, `step()`, `render()`)
- **시드 목록**: `[0, 1, 42, 123, 777]` 고정 — 재현성 확보
- **모델 저장**: `pickle` 사용, `.pkl` 확장자

---

## Git 규칙

- `node_modules/` 는 커밋하지 않음 (`.gitignore` 등록)
- Office 임시 파일 `~$*` 커밋 제외
- 커밋 메시지: 영어, 변경 요약 + 상세 bullet 형식
- 모델 파일(`.pkl`, `.pth` 등)은 `.gitignore`에 등록, GitHub Releases로 배포
- Push 시 `http.postBuffer 524288000` 설정 (대용량 파일 대응)

---

## 실험 규칙

- Baseline(배터리 무시 DQN) vs Proposed(Safety-Aware DQN) 쌍으로 비교
- 동일 시드, 동일 에피소드(1,500) 조건에서 공정 비교
- 핵심 평가 지표: **방전 횟수** (Proposed 목표 = 0)
- 체크포인트는 150 에피소드 간격, best_model은 최고 보상 갱신 시 저장

---

## 환경 설정 고정값

| 항목 | 값 |
|------|----|
| 맵 크기 | 7 × 7 |
| 출발지 | (3, 3) |
| 충전소 | (0,0), (6,6) |
| 초기 배터리 | 100 |
| 스텝당 소모 | -3 |
| Max Step | 150 |
| Replay Buffer | 10,000 |
| Target Network 갱신 | 10 스텝 |
| Epsilon 범위 | 1.0 → 0.01 (decay 0.995) |
