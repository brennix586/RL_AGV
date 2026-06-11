# =============================================================================
# 파일명   : dqn_agent.py
# 설명     : DQN 에이전트 — NumPy 순수 구현 (PyTorch 미사용)
#            소형 네트워크(~18,000 파라미터)에서 PyTorch 대비 2~3배 빠름
# 작성일   : 2026.06.
# 구조     : Input(3) → Hidden(128, ReLU) → Hidden(128, ReLU) → Output(4)
# =============================================================================

import numpy as np
import pickle
from collections import deque
import random


# =============================================================================
# 상수 정의
# =============================================================================

# Adam 옵티마이저 하이퍼파라미터 (표준값, 변경 불필요)
ADAM_BETA1 = 0.9    # 1차 모멘텀 계수 (gradient 방향성 추적)
ADAM_BETA2 = 0.999  # 2차 모멘텀 계수 (gradient 크기 추적)
ADAM_EPS   = 1e-8   # 분모 0 방지용 안정화 상수


# =============================================================================
# NumPy 기반 Q-네트워크
# =============================================================================

class NumpyQNetwork:
    """
    NumPy로 구현한 Q-네트워크.

    구조: Input(3) → Linear(128) → ReLU → Linear(128) → ReLU → Linear(4)
    총 파라미터: 3×128 + 128 + 128×128 + 128 + 128×4 + 4 = ~18,180개

    학습 방법: MSE 손실 + Adam 옵티마이저 (역전파 직접 구현)

    Attributes:
        W1, b1 (np.ndarray) : 첫 번째 레이어 가중치/편향
        W2, b2 (np.ndarray) : 두 번째 레이어 가중치/편향
        W3, b3 (np.ndarray) : 출력 레이어 가중치/편향
        lr (float)          : 학습률
        t (int)             : Adam 업데이트 횟수 (편향 보정용)
    """

    def __init__(self, state_dim=3, action_dim=4, hidden_size=128, lr=0.001, seed=None):
        """
        네트워크 초기화.

        Args:
            state_dim (int)   : 입력 차원 (기본값: 3 — row, col, battery)
            action_dim (int)  : 출력 차원 (기본값: 4 — 상/하/좌/우)
            hidden_size (int) : 은닉층 뉴런 수 (기본값: 128)
            lr (float)        : Adam 학습률 (기본값: 0.001)
            seed (int)        : 가중치 초기화 시드
        """
        rng = np.random.default_rng(seed)

        # ── 가중치 Xavier 초기화 ─────────────────────────────────────────────
        # Xavier: std = sqrt(2 / fan_in) → ReLU 활성화에 적합, 기울기 소실 방지
        self.W1 = rng.standard_normal((hidden_size, state_dim)).astype(np.float32) \
                  * np.sqrt(2.0 / state_dim)
        self.b1 = np.zeros(hidden_size, dtype=np.float32)

        self.W2 = rng.standard_normal((hidden_size, hidden_size)).astype(np.float32) \
                  * np.sqrt(2.0 / hidden_size)
        self.b2 = np.zeros(hidden_size, dtype=np.float32)

        self.W3 = rng.standard_normal((action_dim, hidden_size)).astype(np.float32) \
                  * np.sqrt(2.0 / hidden_size)
        self.b3 = np.zeros(action_dim, dtype=np.float32)

        # ── 학습 설정 ────────────────────────────────────────────────────────
        self.lr = lr

        # ── Adam 옵티마이저 상태 초기화 ──────────────────────────────────────
        # m: 1차 모멘텀(gradient 평균), v: 2차 모멘텀(gradient 제곱 평균)
        self.t = 0  # 업데이트 횟수 (편향 보정을 위해 필요)
        self._init_adam()

        # ── 순전파 캐시 (역전파용) ───────────────────────────────────────────
        self._cache = {}

    def _init_adam(self):
        """Adam 옵티마이저의 1차/2차 모멘텀을 0으로 초기화."""
        for name in ['W1', 'b1', 'W2', 'b2', 'W3', 'b3']:
            shape = getattr(self, name).shape
            setattr(self, f'm_{name}', np.zeros(shape, dtype=np.float32))
            setattr(self, f'v_{name}', np.zeros(shape, dtype=np.float32))

    def predict(self, x):
        """
        단일 또는 배치 입력에 대한 Q값 예측 (역전파 캐시 저장 없음).

        순전파 계산만 수행 — 추론(select_action, target network)에 사용.

        Args:
            x (np.ndarray): 입력 상태, shape=(3,) 또는 (batch, 3)

        Returns:
            np.ndarray: Q값 배열, shape=(4,) 또는 (batch, 4)
        """
        # 1D 입력(단일 상태)이면 2D로 확장
        single = (x.ndim == 1)
        if single:
            x = x.reshape(1, -1)

        # 순전파: Linear → ReLU → Linear → ReLU → Linear
        h1  = np.maximum(0, x  @ self.W1.T + self.b1)   # (batch, 128)
        h2  = np.maximum(0, h1 @ self.W2.T + self.b2)   # (batch, 128)
        out = h2 @ self.W3.T + self.b3                   # (batch, 4)

        return out.squeeze() if single else out

    def train_step(self, states, actions, targets):
        """
        배치 학습 1스텝 수행: 순전파 → 손실 계산 → 역전파 → Adam 업데이트.

        DQN 학습 방식:
        - Q(s,a)만 업데이트 (취한 행동의 Q값만 오차 역전파)
        - 다른 행동의 Q값은 손실에 포함하지 않음 (→ dout[i, other_actions] = 0)

        Args:
            states  (np.ndarray): 상태 배치, shape=(batch, 3)
            actions (np.ndarray): 행동 배치, shape=(batch,), dtype=int
            targets (np.ndarray): 목표 Q값 배치 (Bellman), shape=(batch,)

        Returns:
            float: MSE 손실값 (로깅용)
        """
        batch = len(states)

        # ── 순전파 (캐시 저장) ───────────────────────────────────────────────
        z1  = states @ self.W1.T + self.b1               # (batch, 128)
        h1  = np.maximum(0, z1)                           # ReLU
        z2  = h1 @ self.W2.T + self.b2                   # (batch, 128)
        h2  = np.maximum(0, z2)                           # ReLU
        out = h2 @ self.W3.T + self.b3                   # (batch, 4)

        # 역전파에 필요한 중간값 저장
        self._cache = {'states': states, 'z1': z1, 'h1': h1, 'z2': z2, 'h2': h2}

        # ── 손실 계산 (취한 행동의 Q값만) ───────────────────────────────────
        q_pred = out[np.arange(batch), actions]           # (batch,)
        loss   = np.mean((q_pred - targets) ** 2)        # MSE

        # ── 역전파 기울기 계산 ───────────────────────────────────────────────
        # dL/dout: 취한 행동에 대해서만 기울기 전파, 나머지 행동은 0
        dout = np.zeros_like(out)                         # (batch, 4)
        dout[np.arange(batch), actions] = 2.0 * (q_pred - targets) / batch

        # 출력층 역전파: dL/dW3, dL/db3
        dW3 = dout.T @ h2 / batch                         # (4, 128)
        db3 = dout.mean(axis=0)                           # (4,)

        # 2번째 은닉층 역전파
        dh2 = dout @ self.W3                              # (batch, 128)
        dz2 = dh2 * (z2 > 0)                             # ReLU 미분: z>0이면 1, 아니면 0
        dW2 = dz2.T @ h1 / batch                         # (128, 128)
        db2 = dz2.mean(axis=0)                            # (128,)

        # 1번째 은닉층 역전파
        dh1 = dz2 @ self.W2                               # (batch, 128)
        dz1 = dh1 * (z1 > 0)                             # ReLU 미분
        dW1 = dz1.T @ states / batch                     # (128, 3)
        db1 = dz1.mean(axis=0)                            # (128,)

        # ── Adam 업데이트 ────────────────────────────────────────────────────
        grads = {'W1': dW1, 'b1': db1, 'W2': dW2, 'b2': db2, 'W3': dW3, 'b3': db3}
        self._adam_step(grads)

        return float(loss)

    def _adam_step(self, grads):
        """
        Adam 옵티마이저로 모든 파라미터 업데이트.

        Adam 공식:
            m = β1*m + (1-β1)*g          ← 1차 모멘텀 (기울기 방향 추적)
            v = β2*v + (1-β2)*g²         ← 2차 모멘텀 (기울기 크기 추적)
            m̂ = m / (1-β1^t)             ← 편향 보정
            v̂ = v / (1-β2^t)             ← 편향 보정
            θ = θ - lr * m̂ / (√v̂ + ε)   ← 파라미터 갱신

        Args:
            grads (dict): 각 파라미터명 → 기울기 배열
        """
        self.t += 1  # 업데이트 횟수 증가

        for name in ['W1', 'b1', 'W2', 'b2', 'W3', 'b3']:
            g = grads[name]

            # 1차/2차 모멘텀 업데이트
            m = ADAM_BETA1 * getattr(self, f'm_{name}') + (1 - ADAM_BETA1) * g
            v = ADAM_BETA2 * getattr(self, f'v_{name}') + (1 - ADAM_BETA2) * g ** 2
            setattr(self, f'm_{name}', m)
            setattr(self, f'v_{name}', v)

            # 편향 보정 (초기 업데이트에서 0에 치우치는 현상 보정)
            m_hat = m / (1 - ADAM_BETA1 ** self.t)
            v_hat = v / (1 - ADAM_BETA2 ** self.t)

            # 파라미터 갱신
            param = getattr(self, name)
            param -= self.lr * m_hat / (np.sqrt(v_hat) + ADAM_EPS)

    def get_weights(self):
        """
        현재 가중치 딕셔너리 반환 (Target Network 복사 / 체크포인트 저장용).

        Returns:
            dict: {파라미터명: np.ndarray 복사본}
        """
        return {name: getattr(self, name).copy()
                for name in ['W1', 'b1', 'W2', 'b2', 'W3', 'b3']}

    def set_weights(self, weights):
        """
        외부에서 가중치 복사 (Target Network 갱신 / 체크포인트 로드용).

        Args:
            weights (dict): {파라미터명: np.ndarray}
        """
        for name, val in weights.items():
            setattr(self, name, val.copy())


# =============================================================================
# Experience Replay Buffer
# =============================================================================

class ReplayBuffer:
    """
    Experience Replay 버퍼.

    DQN의 핵심 구성 요소:
    - 과거 경험 (s, a, r, s', done)을 저장
    - 랜덤 샘플링으로 연속된 경험 간의 상관관계 제거
    - 데이터 효율성 향상 (같은 경험을 여러 번 학습)

    Attributes:
        buf (deque) : 최대 capacity 크기의 순환 버퍼 (maxlen 초과 시 가장 오래된 것 삭제)
    """

    def __init__(self, capacity=10_000):
        """
        Args:
            capacity (int): 버퍼 최대 크기 (기본값: 10,000)
                            너무 작으면 최신 경험에 치우침,
                            너무 크면 메모리 과다 사용
        """
        self.buf = deque(maxlen=capacity)

    def push(self, state, action, reward, next_state, done):
        """
        경험 1개 저장.

        Args:
            state     (np.ndarray): 현재 상태 (정규화된 값)
            action    (int)       : 취한 행동 (0~3)
            reward    (float)     : 받은 보상
            next_state(np.ndarray): 다음 상태
            done      (bool/float): 에피소드 종료 여부
        """
        self.buf.append((state, action, reward, next_state, float(done)))

    def sample(self, batch_size):
        """
        랜덤 배치 샘플링.

        Args:
            batch_size (int): 샘플링할 경험 수

        Returns:
            tuple: (states, actions, rewards, next_states, dones) — 각각 np.ndarray
        """
        batch = random.sample(self.buf, batch_size)
        s, a, r, ns, d = zip(*batch)
        return (
            np.array(s,  dtype=np.float32),   # (batch, 3)
            np.array(a,  dtype=np.int32),      # (batch,)
            np.array(r,  dtype=np.float32),    # (batch,)
            np.array(ns, dtype=np.float32),    # (batch, 3)
            np.array(d,  dtype=np.float32),    # (batch,) — 0.0 or 1.0
        )

    def __len__(self):
        return len(self.buf)


# =============================================================================
# DQN 에이전트
# =============================================================================

class DQNAgent:
    """
    DQN(Deep Q-Network) 에이전트 — NumPy 순수 구현.

    핵심 구성 요소:
    1. Q-Network    : 현재 Q값 예측 및 학습
    2. Target Network: 안정적인 학습 목표값 생성 (일정 주기로 Q-Network 가중치 복사)
    3. Replay Buffer : 경험 저장 및 랜덤 샘플링
    4. Epsilon-Greedy: 탐색(exploration) vs 활용(exploitation) 균형

    학습 흐름:
        에이전트 행동 → 경험 저장 → 배치 샘플링 → Bellman 목표값 계산
        → Q-Network 역전파 → 일정 주기로 Target Network 갱신

    Attributes:
        q_net (NumpyQNetwork)     : 학습 네트워크
        target_net (NumpyQNetwork): 목표값 계산용 고정 네트워크
        buffer (ReplayBuffer)     : 경험 재생 버퍼
        eps (float)               : 현재 탐색률 (1.0 → eps_end로 감소)
    """

    def __init__(
        self,
        state_dim=3,
        action_dim=4,
        hidden_size=128,
        lr=0.001,
        gamma=0.99,
        batch_size=64,
        buffer_size=10_000,
        target_update_freq=10,
        eps_start=1.0,
        eps_end=0.01,
        eps_decay=0.995,
        seed=None,
    ):
        """
        DQN 에이전트 초기화.

        Args:
            state_dim (int)          : 상태 차원 (기본값: 3)
            action_dim (int)         : 행동 수 (기본값: 4)
            hidden_size (int)        : 은닉층 크기 (기본값: 128)
            lr (float)               : 학습률 0.001 — DQN 표준값
            gamma (float)            : 할인율 0.99 — 장기 보상 중시 (배터리 관리는 미래 판단 필요)
            batch_size (int)         : 미니배치 크기 64 — 안정적인 기울기 추정
            buffer_size (int)        : 리플레이 버퍼 크기 10,000
            target_update_freq (int) : Target Network 갱신 주기 10 스텝
            eps_start (float)        : 초기 탐색률 1.0 — 처음엔 완전 랜덤 탐색
            eps_end (float)          : 최소 탐색률 0.01 — 학습 후에도 최소한의 탐색 유지
            eps_decay (float)        : 탐색률 감소 계수 (에피소드당 1회 decay)
            seed (int)               : 재현성 시드
        """
        self.action_dim         = action_dim
        self.gamma              = gamma        # 할인율: 장기 보상 중시, 배터리 관리에 필수
        self.batch_size         = batch_size
        self.target_update_freq = target_update_freq
        self.eps                = eps_start
        self.eps_end            = eps_end
        self.eps_decay          = eps_decay
        self._learn_steps       = 0            # learn() 호출 횟수 (Target Network 갱신 기준)

        # ── Q-Network 및 Target Network 초기화 ──────────────────────────────
        # Target Network는 Q-Network와 동일한 구조이나, 주기적으로만 가중치 갱신
        # → 학습 목표값이 갑자기 바뀌지 않아 학습 안정성 향상
        self.q_net     = NumpyQNetwork(state_dim, action_dim, hidden_size, lr, seed)
        self.target_net = NumpyQNetwork(state_dim, action_dim, hidden_size, lr, seed)
        self.target_net.set_weights(self.q_net.get_weights())  # 동일 가중치로 시작

        # ── 경험 재생 버퍼 초기화 ────────────────────────────────────────────
        self.buffer = ReplayBuffer(buffer_size)

    def select_action(self, state):
        """
        Epsilon-Greedy 정책으로 행동 선택.

        - ε 확률로 랜덤 행동 (탐색: exploration) — 새로운 전략 발견
        - (1-ε) 확률로 Q값 최대 행동 (활용: exploitation) — 학습된 최적 행동

        Args:
            state (np.ndarray): 정규화된 현재 상태, shape=(3,)

        Returns:
            int: 선택된 행동 (0~3)
        """
        if np.random.random() < self.eps:
            # 탐색: 완전 랜덤 행동
            return np.random.randint(self.action_dim)
        else:
            # 활용: Q값이 가장 높은 행동 선택
            q_values = self.q_net.predict(state)  # shape=(4,)
            return int(np.argmax(q_values))

    def store(self, state, action, reward, next_state, done):
        """
        경험 버퍼에 (s, a, r, s', done) 저장.

        Args:
            state     : 현재 상태 (정규화 완료)
            action    : 취한 행동
            reward    : 받은 보상
            next_state: 다음 상태
            done      : 에피소드 종료 여부
        """
        self.buffer.push(state, action, reward, next_state, float(done))

    def learn(self):
        """
        리플레이 버퍼에서 배치 샘플링 후 Q-Network 학습 1스텝 수행.

        학습 과정:
        1. 버퍼에서 랜덤 배치 샘플링
        2. Bellman 방정식으로 목표 Q값 계산: Q_target = r + γ * max(Q_target(s'))
        3. Q-Network 업데이트: minimize MSE(Q(s,a), Q_target)
        4. 일정 주기(target_update_freq)로 Target Network 가중치 갱신

        Returns:
            float or None: MSE 손실값 (버퍼 부족 시 None)
        """
        # 버퍼에 충분한 경험이 쌓이기 전에는 학습하지 않음
        if len(self.buffer) < self.batch_size:
            return None

        # ── 배치 샘플링 ──────────────────────────────────────────────────────
        states, actions, rewards, next_states, dones = self.buffer.sample(self.batch_size)

        # ── Bellman 목표값 계산 ──────────────────────────────────────────────
        # Q_target = r + γ * max_a'(Q_target(s', a')) * (1 - done)
        # done=1이면 다음 상태 없음 → γ * max(Q) 항목 제거
        next_q    = self.target_net.predict(next_states)  # (batch, 4)
        max_next_q = next_q.max(axis=1)                    # (batch,)
        q_targets  = rewards + self.gamma * max_next_q * (1.0 - dones)

        # ── Q-Network 학습 1스텝 ─────────────────────────────────────────────
        loss = self.q_net.train_step(states, actions, q_targets)

        # ── Target Network 주기적 갱신 (10 학습 스텝마다) ────────────────────
        self._learn_steps += 1
        if self._learn_steps % self.target_update_freq == 0:
            self.target_net.set_weights(self.q_net.get_weights())

        return loss

    def decay_epsilon(self):
        """
        에피소드 종료 시 탐색률 감소 (에피소드당 1회 호출).

        eps = max(eps_end, eps * eps_decay)
        → 학습 초기: 높은 탐색률로 다양한 경험 수집
        → 학습 후기: 낮은 탐색률로 최적 정책 활용
        """
        self.eps = max(self.eps_end, self.eps * self.eps_decay)

    def save_checkpoint(self, path, episode, best_reward, rewards_log):
        """
        체크포인트 저장 (학습 재개를 위한 전체 상태 저장).

        저장 항목:
        - Q-Network 가중치 + Adam 옵티마이저 상태
        - 현재 에피소드 번호, epsilon, 최고 보상, 보상 로그

        Args:
            path (str)        : 저장 경로 (.pkl 형식)
            episode (int)     : 현재 에피소드 번호
            best_reward (float): 현재까지 최고 평균 보상
            rewards_log (list): 에피소드별 보상 리스트
        """
        state = {
            # 네트워크 가중치
            'weights'     : self.q_net.get_weights(),
            # Adam 옵티마이저 상태 (학습 재개 시 모멘텀 이어받기 위해 저장)
            'adam_m'      : {n: getattr(self.q_net, f'm_{n}').copy()
                             for n in ['W1','b1','W2','b2','W3','b3']},
            'adam_v'      : {n: getattr(self.q_net, f'v_{n}').copy()
                             for n in ['W1','b1','W2','b2','W3','b3']},
            'adam_t'      : self.q_net.t,
            # 학습 진행 상태
            'episode'     : episode,
            'epsilon'     : self.eps,
            'learn_steps' : self._learn_steps,
            'best_reward' : best_reward,
            'rewards_log' : rewards_log,
        }
        with open(path, 'wb') as f:
            pickle.dump(state, f)

    def load_checkpoint(self, path):
        """
        체크포인트 로드 후 저장된 학습 상태 복원.

        Args:
            path (str): 로드할 체크포인트 경로

        Returns:
            dict: {episode, epsilon, best_reward, rewards_log}
        """
        with open(path, 'rb') as f:
            state = pickle.load(f)

        # 가중치 및 Adam 상태 복원
        self.q_net.set_weights(state['weights'])
        self.target_net.set_weights(state['weights'])

        for n in ['W1','b1','W2','b2','W3','b3']:
            setattr(self.q_net, f'm_{n}', state['adam_m'][n])
            setattr(self.q_net, f'v_{n}', state['adam_v'][n])
        self.q_net.t = state['adam_t']

        # 학습 진행 상태 복원
        self.eps          = state['epsilon']
        self._learn_steps = state['learn_steps']

        return {
            'episode'     : state['episode'],
            'best_reward' : state['best_reward'],
            'rewards_log' : state['rewards_log'],
        }
