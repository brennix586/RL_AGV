# 작업 프롬프트 기록

> 본 프로젝트 개발 과정에서 사용한 주요 프롬프트 요약

---

## 1. 프로젝트 초기 구조 생성

**프롬프트 요지**
`docs/requirement.md` 기반으로 전체 프로젝트 구조(폴더, 소스 파일)를 생성해 달라.

**결과**
- `src/env/agv_warehouse_env.py` — Custom Gymnasium 환경
- `src/agent/dqn_agent.py` — DQN 에이전트 (NumPy 순수 구현)
- `src/train/train.py` — 학습 실행 스크립트
- `src/report/make_report.js` — PPT 보고서 생성
- `results/`, `docs/`, `prompts/` 폴더 구조

---

## 2. DQN 에이전트 및 환경 개선

**프롬프트 요지**
Safety-Aware Reward Shaping 적용, 배터리 방전 패널티 강화, 체크포인트 저장 기능 추가.

**결과**
- Reward 설계: `R = R_step(-1) + R_goal(+100) + R_battery(+50/-200)`
- 5개 랜덤 시드 병렬 실험 지원
- `best_model.pkl` + 주기별 `checkpoint_ep{N}.pkl` 자동 저장
- CSV 로그 및 학습 곡선 이미지 자동 생성

---

## 3. PPT 보고서 자동 생성

**프롬프트 요지**
학습 결과(CSV, 이미지)를 읽어 12슬라이드 PPT를 자동 생성하는 Node.js 스크립트 작성.

**결과**
- `src/report/make_report.js` — PptxGenJS 활용
- `package.json` / `package-lock.json` 생성
- `results/AGV_Report.pptx` 산출물 생성

---

## 4. Git 커밋 및 Push

**프롬프트 요지**
전체 작업 파일을 Git에 커밋하고 GitHub에 Push해 달라.

**결과**
- `.gitignore`에 `node_modules/`, `~$*` 규칙 추가
- 스테이징된 `node_modules/` 파일 제거 후 정상 커밋
- `http.postBuffer` 확장(500MB)으로 대용량 Push 성공
- Remote: `https://github.com/brennix586/RL_AGV.git`

---

## 5. 사전 학습 모델 배포

**프롬프트 요지**
학습된 모델을 저장하여 다운로드할 수 있도록 하고, README.md에 링크를 표시해 달라.

**결과**
- `best_model.pkl` 10개(baseline/proposed × 5 seed)를 zip으로 패키징
- GitHub Releases `v1.0.0` 업로드 가이드 제공
- README.md에 다운로드 배지 및 링크 섹션 추가
