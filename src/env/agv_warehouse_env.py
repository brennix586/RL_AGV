# =============================================================================
# 파일명   : agv_warehouse_env.py
# 설명     : AGV 배터리 충전 스케줄링을 위한 Custom Gymnasium 환경
#            7×7 GridWorld에서 배터리 소모/충전 로직을 포함한 환경
# 작성일   : 2026.06.
# =============================================================================

import gymnasium as gym
import numpy as np
from gymnasium import spaces

# =============================================================================
# 환경 상수 정의
# =============================================================================

GRID_SIZE          = 7     # 7×7 격자 (10×10 대비 상태공간 51% 축소 → 학습 속도 향상)
CHARGING_STATIONS  = [(0, 0), (6, 6)]  # 충전소 위치: 대각선 구석 고정
START_POS          = (3, 3)            # 출발지: 정중앙 고정 (두 충전소까지 거리 동일 → 공정한 학습)
INITIAL_BATTERY    = 100   # 에피소드 시작 시 완충 상태
DRAIN_PER_STEP     = 3     # 매 스텝마다 배터리 3 차감 → 33스텝 지속
                           # drain=2(50스텝)는 최적 경로(4~12스텝)에서 배터리가 거의 안 닳아
                           # Baseline도 패널티만으로 충분히 학습됨 → Proposed 우위 불명확
                           # drain=3: 자주 충전 필요 → Reward Shaping 없이는 타이밍 학습 어려움
WARNING_THRESHOLD  = 40    # 배터리 경고 임계값: 40% 이하면 충전 긴급 보상 (20이면 거의 발동 안 함)
MAX_STEPS          = 150   # 에피소드 최대 스텝 (배터리 1.5회 충전 여유 / 무한루프 방지)

# ── Reward 상수 ─────────────────────────────────────────────────────────────
R_STEP         = -1    # 매 이동 스텝 패널티 (최단 경로 유도)
R_GOAL         = 100   # 목표 지점 도달 보상
R_CHARGE_LOW   = 50    # 배터리 < 40%일 때 충전소 도달 → 긴급 충전 보상 (안전 유도)
# R_CHARGE_WASTE 제거: 배터리 충분할 때 충전소 방문에 패널티를 주면
# 학습 초기(epsilon 높은 구간)에 충전소 회피 행동을 먼저 학습 → 방전 급증
# Safety-Aware 의도는 "위험 시 충전 유도"이지 "충분 시 충전 처벌"이 아님
R_DEAD         = -200  # 배터리 = 0 (방전) → 대형 사고 패널티 + 에피소드 종료


class AGVStyleWarehouseWrapper(gym.Env):
    """
    AGV(Automated Guided Vehicle) 배터리 충전 스케줄링 환경.

    7×7 GridWorld에서 AGV가 목표 지점 도달(작업 수행)과
    배터리 관리(충전 전략)를 동시에 고려하도록 설계된 환경.

    핵심 특징:
    - 출발지 (3,3) 고정: 매 에피소드 동일한 시작 → 변수 최소화
    - 목표 지점 랜덤: 매 에피소드 다양한 경험 학습
    - 충전소 (0,0) / (6,6) 고정: 에이전트가 위치를 학습해야 함
    - Safety-Aware Reward: 방전 방지를 Reward에 내재화

    Attributes:
        use_battery_reward (bool) : True=Proposed(Safety-Aware), False=Baseline
        observation_space         : Box([row, col, battery]), shape=(3,)
        action_space              : Discrete(4) — 상/하/좌/우
    """

    metadata = {"render_modes": ["human", "ansi"]}

    def __init__(self, use_battery_reward=True):
        """
        환경 초기화.

        Args:
            use_battery_reward (bool): Reward Shaping 적용 여부
                True  → Proposed: R_battery 항목 포함 (Safety-Aware)
                False → Baseline: R_battery 없음 (배터리 무시)
        """
        super().__init__()

        # ── 실험 모드 설정 ───────────────────────────────────────────────────
        self.use_battery_reward = use_battery_reward

        # 충전소 위치를 set으로 관리 → O(1) 충전소 도달 여부 확인
        self._charging_set = set(map(tuple, CHARGING_STATIONS))

        # ── 관측 공간 정의 ───────────────────────────────────────────────────
        # State = (row, col, battery)
        # row   : 0 ~ GRID_SIZE-1 (7×7 격자 행 위치)
        # col   : 0 ~ GRID_SIZE-1 (7×7 격자 열 위치)
        # battery : 0 ~ 100 (배터리 잔량, 정수)
        self.observation_space = spaces.Box(
            low  = np.array([0, 0, 0],                              dtype=np.float32),
            high = np.array([GRID_SIZE - 1, GRID_SIZE - 1, INITIAL_BATTERY], dtype=np.float32),
        )

        # ── 행동 공간 정의 ───────────────────────────────────────────────────
        # 0=상(Up), 1=하(Down), 2=좌(Left), 3=우(Right)
        self.action_space = spaces.Discrete(4)

        # ── 내부 상태 초기화 ─────────────────────────────────────────────────
        self._rng     = np.random.default_rng()  # 랜덤 시드 관리용 RNG
        self._pos     = list(START_POS)          # AGV 현재 위치 [row, col]
        self._goal    = [0, 0]                   # 목표 지점 [row, col]
        self._battery = INITIAL_BATTERY          # 현재 배터리 잔량
        self._steps   = 0                        # 현재 에피소드 스텝 수

    def reset(self, seed=None, options=None):
        """
        에피소드 초기화.

        매 에피소드마다:
        - AGV 위치를 출발지 (3,3)으로 초기화
        - 목표 지점을 랜덤 생성 (출발지, 충전소 위치 제외)
        - 배터리를 100으로 완충

        Args:
            seed (int, optional) : 랜덤 시드 (재현성 보장)
            options (dict)       : 미사용

        Returns:
            obs (np.ndarray) : 초기 관측값 [row, col, battery]
            info (dict)      : 초기 환경 정보
        """
        super().reset(seed=seed)

        # ── 랜덤 시드 설정 ───────────────────────────────────────────────────
        if seed is not None:
            self._rng = np.random.default_rng(seed)

        # ── 출발지 고정: (3,3) ───────────────────────────────────────────────
        # 7×7 정중앙 → 두 충전소 (0,0), (6,6)까지 유클리드 거리 동일 (≈4.24)
        # → 어느 충전소로도 편향 없는 공정한 학습 환경 보장
        self._pos = list(START_POS)

        # ── 목표 지점 랜덤 생성 ──────────────────────────────────────────────
        # 출발지(3,3)와 충전소 위치를 제외한 셀 중에서 랜덤 선택
        candidates = [
            (r, c)
            for r in range(GRID_SIZE)
            for c in range(GRID_SIZE)
            if (r, c) not in self._charging_set and (r, c) != tuple(self._pos)
        ]
        idx = int(self._rng.integers(0, len(candidates)))
        self._goal = list(candidates[idx])

        # ── 배터리 / 스텝 초기화 ────────────────────────────────────────────
        self._battery = INITIAL_BATTERY
        self._steps   = 0

        return self._obs(), self._info(charged=False)

    def step(self, action):
        """
        에이전트가 action을 수행하고 다음 상태로 전환.

        처리 순서:
        1. 이동: action에 따라 위치 갱신 (벽 충돌 시 그 자리 유지)
        2. 배터리 소모: 매 스텝 -1 차감
        3. 충전소 체크: 충전소 도달 시 배터리 100으로 완충
        4. 방전 체크: 배터리 = 0이면 패널티 후 종료
        5. 목표 체크: 목표 도달 시 보상 후 종료

        Args:
            action (int): 0=상(Up), 1=하(Down), 2=좌(Left), 3=우(Right)

        Returns:
            obs (np.ndarray) : 새로운 관측값 [row, col, battery]
            reward (float)   : 보상값 (R_step + R_goal + R_battery)
            terminated (bool): True = 방전 또는 목표 도달로 에피소드 종료
            truncated (bool) : True = 최대 스텝(150) 초과로 에피소드 종료
            info (dict)      : 추가 정보 (배터리, 충전 여부, 현재 위치 등)
        """
        # ── 행동별 이동 방향 정의 ────────────────────────────────────────────
        # (행 변화량, 열 변화량): 상=-1행, 하=+1행, 좌=-1열, 우=+1열
        DR = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        dr, dc = DR[action]

        # ── 이동 처리 (벽 충돌 시 이동 불가, 제자리 유지) ───────────────────
        self._pos[0] = int(np.clip(self._pos[0] + dr, 0, GRID_SIZE - 1))
        self._pos[1] = int(np.clip(self._pos[1] + dc, 0, GRID_SIZE - 1))

        # ── 배터리 소모 처리 ─────────────────────────────────────────────────
        # 매 스텝마다 배터리를 1씩 감소 (이동 비용 시뮬레이션)
        # max(0, ...) → 배터리는 0 이하로 내려가지 않음
        self._battery = max(0, self._battery - DRAIN_PER_STEP)
        self._steps  += 1

        pos    = tuple(self._pos)
        reward = R_STEP      # 기본 스텝 패널티: 최단 경로 유도
        terminated = False
        charged    = False

        # ── 충전소 도달 처리 ─────────────────────────────────────────────────
        # 충전소에 도달하면 즉시 배터리 100으로 완충
        # → 배터리 소모 후 체크하므로, 배터리 1→0 상태에서 충전소 도달 시에도 충전 가능
        #   (충전소가 방전을 "막아주는" 안전망 역할)
        if pos in self._charging_set:
            charged = True

            # ── Proposed (Safety-Aware): Reward Shaping 적용 ───────────────
            # 배터리 < 40% 일 때만 충전 보상 부여 (긴급 안전 행동 유도)
            # 배터리 충분할 때 충전해도 중립 (패널티 없음):
            #   패널티를 주면 epsilon 높은 학습 초기에 충전소 회피 행동을 먼저 학습,
            #   오히려 방전 횟수가 증가하는 역효과 발생
            if self.use_battery_reward:
                if self._battery < WARNING_THRESHOLD:
                    # 배터리 위험 수준(< 40%)에서 충전 → 안전한 선택, 강한 보상 부여
                    reward += R_CHARGE_LOW    # +50

            # ── 충전 실행: 배터리 100으로 완충 (Baseline도 물리적으로 충전됨) ──
            self._battery = INITIAL_BATTERY

        # ── 방전 체크 ────────────────────────────────────────────────────────
        # 충전소에 도달한 경우 battery는 이미 100 → 이 조건에 걸리지 않음
        # 충전소 미도달 + 배터리 0 → 방전 사고 발생
        if self._battery == 0:
            reward    += R_DEAD   # -200: 실제 물류 현장에서 방전은 대형 사고
            terminated = True

        # ── 목표 지점 도달 체크 ──────────────────────────────────────────────
        # 방전 상태가 아닌 경우에만 목표 도달 체크 (elif로 상호 배타적 처리)
        elif pos == tuple(self._goal):
            reward    += R_GOAL   # +100: 작업 완료 보상
            terminated = True

        # ── 최대 스텝 초과 체크 ──────────────────────────────────────────────
        truncated = (self._steps >= MAX_STEPS)

        return self._obs(), reward, terminated, truncated, self._info(charged=charged)

    def _obs(self):
        """
        현재 관측값 반환.

        Returns:
            np.ndarray: [row, col, battery] 형태의 float32 배열
                        학습 시 normalize() 함수로 [0,1] 범위로 정규화 권장
        """
        return np.array([self._pos[0], self._pos[1], self._battery], dtype=np.float32)

    def _info(self, charged=False):
        """
        환경 부가 정보 딕셔너리 반환.

        Args:
            charged (bool): 이번 스텝에 충전소 방문 여부

        Returns:
            dict: {pos, goal, battery, charged, steps}
        """
        return {
            "pos"    : tuple(self._pos),   # AGV 현재 위치
            "goal"   : tuple(self._goal),  # 목표 지점
            "battery": self._battery,      # 현재 배터리 잔량
            "charged": charged,            # 이번 스텝 충전 여부
            "steps"  : self._steps,        # 현재 에피소드 스텝 수
        }

    def render(self, show_battery_bar=True):
        """
        터미널에 현재 그리드 상태를 시각화.

        표시 심볼:
            ■ (C) : 충전소
            T     : 목표 지점
            A     : AGV 현재 위치
            .     : 빈 셀

        Args:
            show_battery_bar (bool): 배터리 잔량 바 표시 여부
        """
        # ── 그리드 생성 ──────────────────────────────────────────────────────
        grid = [["." for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]

        # 충전소 표시
        for r, c in CHARGING_STATIONS:
            grid[r][c] = "■"

        # 목표 지점 표시 (충전소보다 우선순위 낮음)
        grid[self._goal[0]][self._goal[1]] = "T"

        # AGV 위치 표시 (가장 높은 우선순위)
        grid[self._pos[0]][self._pos[1]] = "A"

        # ── 헤더 출력 ────────────────────────────────────────────────────────
        print(f"\nEpisode Step {self._steps} | Battery: {self._battery} | Goal: {tuple(self._goal)}")
        print("┌" + "───┬" * (GRID_SIZE - 1) + "───┐")

        # ── 격자 출력 ────────────────────────────────────────────────────────
        for i, row in enumerate(grid):
            print("│ " + " │ ".join(row) + " │")
            if i < GRID_SIZE - 1:
                print("├" + "───┼" * (GRID_SIZE - 1) + "───┤")

        print("└" + "───┴" * (GRID_SIZE - 1) + "───┘")

        # ── 배터리 잔량 바 출력 ───────────────────────────────────────────────
        if show_battery_bar:
            filled = int(self._battery / 10)  # 100% = 10칸
            empty  = 10 - filled
            bar = "█" * filled + "░" * empty
            print(f"Battery: [{bar}] {self._battery}%")

        print("■ : 충전소  A : AGV  T : 목표지점")
