# =============================================================================
# 파일명   : train.py
# 설명     : DQN 학습 실행 스크립트
#            Baseline vs Proposed(Safety-Aware) 비교 실험
#            argparse 기반 CLI, tqdm 진행바, CSV 로그, 체크포인트 저장 지원
# 작성일   : 2026.06.
#
# 실행 예시:
#   단일 시드: python -m src.train.train --mode proposed --seed 0
#   전체 시드: python -m src.train.train --mode proposed
#   이어서:   python -m src.train.train --mode proposed --seed 0 --resume results/checkpoints/proposed/seed0/best_model.pkl
#   비교 그래프: python -m src.train.train --plot
# =============================================================================

import sys
import os
import argparse
import csv
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")  # GUI 없는 환경(서버/백그라운드)에서도 그래프 저장 가능
import matplotlib.pyplot as plt

# tqdm: 진행바 라이브러리 (pip install tqdm)
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    print("[경고] tqdm 미설치 — pip install tqdm 권장 (진행바 없이 실행)")

# ── 프로젝트 루트를 Python 경로에 추가 ──────────────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, ROOT)

from src.env.agv_warehouse_env import AGVStyleWarehouseWrapper
from src.agent.dqn_agent import DQNAgent


# =============================================================================
# 실험 설정 상수
# =============================================================================

# 재현성 보장을 위한 고정 시드 5개 (평균 ± 표준편차로 신뢰도 확보)
SEEDS = [0, 1, 42, 123, 777]

# 에피소드 수: 7×7 환경 기준 (10×10 대비 25% 단축)
NUM_EPISODES_MAIN  = 1500  # 메인 실험 기준
NUM_EPISODES_DEBUG =  500  # 코드 디버깅용 빠른 실험

# 체크포인트 저장 주기 (에피소드 단위)
CHECKPOINT_INTERVAL = 150

# 콘솔 출력 주기 (에피소드 단위)
LOG_INTERVAL = 100

# DQN 하이퍼파라미터 (요구사항 4.3절 기준)
AGENT_KWARGS = dict(
    lr               = 0.001,  # 학습률: 안정적 수렴 (DQN 표준)
    gamma            = 0.99,   # 할인율: 장기 보상 중시 (배터리 관리는 미래 판단 필요)
    batch_size       = 64,     # 미니배치 크기: 안정적 기울기 추정
    buffer_size      = 10_000, # 리플레이 버퍼: 충분한 경험 저장
    target_update_freq = 10,   # Target Network 갱신 주기: 안정적 학습 목표
    eps_start        = 1.0,    # 초기 탐색률: 완전 랜덤 탐색
    eps_end          = 0.01,   # 최소 탐색률: 최소한의 탐색 유지
    eps_decay        = 0.995,  # 탐색률 감소 계수 (1500ep 기준 자연 감소)
    hidden_size      = 128,    # 은닉층 크기: 과적합 방지
)


# =============================================================================
# 유틸리티 함수
# =============================================================================

def normalize(state):
    """
    State를 [0, 1] 범위로 정규화.

    정규화하지 않으면 battery(0~100)가 row/col(0~6)보다
    스케일이 훨씬 커서 학습 불안정 유발.

    Args:
        state (np.ndarray): 원본 상태 [row, col, battery]

    Returns:
        np.ndarray: 정규화된 상태 [row/6, col/6, battery/100]
    """
    return np.array(
        [state[0] / 6.0, state[1] / 6.0, state[2] / 100.0],
        dtype=np.float32
    )


def make_dirs(mode, seed):
    """
    실험별/시드별 결과 폴더 생성.

    폴더 구조:
        results/logs/{mode}/
        results/images/{mode}/
        results/checkpoints/{mode}/seed{seed}/

    Args:
        mode (str): 'baseline' 또는 'proposed'
        seed (int): 시드 번호

    Returns:
        dict: {log_dir, img_dir, ckpt_dir} 경로 딕셔너리
    """
    dirs = {
        'log' : os.path.join(ROOT, "results", "logs",         mode),
        'img' : os.path.join(ROOT, "results", "images",       mode),
        'ckpt': os.path.join(ROOT, "results", "checkpoints",  mode, f"seed{seed}"),
    }
    for d in dirs.values():
        os.makedirs(d, exist_ok=True)
    return dirs


def open_csv_logger(log_dir, mode, seed):
    """
    CSV 로그 파일 생성 및 헤더 작성.

    에피소드마다 핵심 지표를 기록 → 학습 중단 시에도 데이터 보존.

    CSV 컬럼:
        episode, reward, moving_avg, dead_count, epsilon, steps, best_reward

    Args:
        log_dir (str): 로그 저장 디렉토리
        mode (str)   : 실험 모드
        seed (int)   : 시드 번호

    Returns:
        tuple: (file_handle, csv_writer)
    """
    path = os.path.join(log_dir, f"{mode}_seed{seed}_log.csv")
    f    = open(path, 'w', newline='', encoding='utf-8')
    writer = csv.writer(f)
    writer.writerow(['episode', 'reward', 'moving_avg', 'dead_count',
                     'epsilon', 'steps', 'best_reward'])
    return f, writer


# =============================================================================
# 단일 시드 학습
# =============================================================================

def run_seed(mode, seed, num_episodes, resume_path=None, render=False, render_interval=1):
    """
    단일 시드로 DQN 학습 실행.

    학습 흐름:
    1. 환경/에이전트 초기화
    2. (선택) 체크포인트에서 이어서 학습
    3. 에피소드 루프:
       - tqdm 진행바 업데이트
       - 매 스텝: 행동 선택 → 환경 실행 → 경험 저장 → 학습
       - 에피소드 종료: epsilon 감소, CSV 기록, 체크포인트 저장
    4. 결과 반환

    Args:
        mode (str)           : 'baseline' 또는 'proposed'
        seed (int)           : 랜덤 시드
        num_episodes (int)   : 학습 에피소드 수
        resume_path (str)    : 이어서 학습할 체크포인트 경로 (None이면 처음부터)
        render (bool)        : 터미널 그리드 시각화 여부
        render_interval (int): N 에피소드마다 1번 렌더링

    Returns:
        dict: {mode, seed, episode_rewards, dead_flags, ep_lengths, charge_counts}
    """
    # ── 재현성 시드 고정 ─────────────────────────────────────────────────────
    np.random.seed(seed)

    # ── 환경 / 에이전트 초기화 ───────────────────────────────────────────────
    use_battery = (mode == "proposed")
    env   = AGVStyleWarehouseWrapper(use_battery_reward=use_battery)
    agent = DQNAgent(**AGENT_KWARGS, seed=seed)

    # ── 결과 로그 초기화 ─────────────────────────────────────────────────────
    ep_rewards    = []  # 에피소드별 총 보상
    dead_flags    = []  # 방전 발생 여부 (0 or 1)
    ep_lengths    = []  # 에피소드 스텝 수
    charge_counts = []  # 충전소 방문 횟수

    # ── 폴더 생성 / CSV 로거 초기화 ─────────────────────────────────────────
    dirs = make_dirs(mode, seed)
    csv_file, csv_writer = open_csv_logger(dirs['log'], mode, seed)

    # ── 체크포인트에서 이어서 학습 ───────────────────────────────────────────
    start_ep     = 0
    best_reward  = float('-inf')  # 최고 평균 보상 기록
    cumulative_dead = 0           # 누적 방전 횟수

    if resume_path and os.path.exists(resume_path):
        print(f"[재개] 체크포인트 로드: {resume_path}")
        ckpt = agent.load_checkpoint(resume_path)
        start_ep    = ckpt['episode'] + 1
        best_reward = ckpt['best_reward']
        ep_rewards  = ckpt['rewards_log']
        cumulative_dead = sum(dead_flags)  # 이전 방전 횟수 복원 생략 (간략화)
        print(f"    → 에피소드 {start_ep}부터 재개 | ε={agent.eps:.3f}")

    # ── tqdm 진행바 설정 ─────────────────────────────────────────────────────
    ep_range = range(start_ep, num_episodes)
    if TQDM_AVAILABLE:
        pbar = tqdm(
            ep_range,
            desc=f"[{mode.upper()}] seed={seed}",
            unit="ep",
            ncols=90,
        )
    else:
        pbar = ep_range

    # ============================================================
    # 에피소드 학습 루프
    # ============================================================
    for ep in pbar:
        # ── 에피소드 초기화 ──────────────────────────────────────────────────
        # 시드 구성: seed * 100000 + ep → 같은 seed라도 에피소드마다 다른 목표 위치
        state_raw, _ = env.reset(seed=seed * 100_000 + ep)
        state = normalize(state_raw)  # [0,1] 정규화

        total_reward = 0.0  # 이번 에피소드 총 보상
        dead         = 0    # 방전 발생 여부
        charges      = 0    # 충전소 방문 횟수

        # ── 스텝 루프 ────────────────────────────────────────────────────────
        for step in range(150):  # MAX_STEPS=150
            # 행동 선택 (Epsilon-Greedy)
            action = agent.select_action(state)

            # 환경 실행
            next_raw, reward, terminated, truncated, info = env.step(action)
            next_state = normalize(next_raw)
            done       = terminated or truncated

            # 경험 저장
            agent.store(state, action, reward, next_state, done)

            # 4스텝마다 1회 학습 (매 스텝 학습 대비 4× 속도 향상)
            if info['steps'] % 4 == 0:
                agent.learn()

            # 이번 스텝 결과 누적
            total_reward += reward
            if reward <= -150:      # R_DEAD=-200이 포함된 경우
                dead = 1
            if info['charged']:
                charges += 1

            # ── 터미널 렌더링 (--render 옵션 시에만) ────────────────────────
            if render and (ep % render_interval == 0):
                env.render()

            state = next_state
            if done:
                break

        # ── 에피소드 종료 처리 ───────────────────────────────────────────────

        # Epsilon 감소 (에피소드당 1회)
        agent.decay_epsilon()

        # 결과 기록
        ep_rewards.append(total_reward)
        dead_flags.append(dead)
        ep_lengths.append(info['steps'])
        charge_counts.append(charges)
        cumulative_dead += dead

        # 이동 평균 (최근 100 에피소드)
        window      = min(100, len(ep_rewards))
        moving_avg  = float(np.mean(ep_rewards[-window:]))
        best_reward = max(best_reward, moving_avg)

        # ── CSV 로그 기록 ─────────────────────────────────────────────────────
        # 에피소드마다 즉시 기록 → 학습 중단 시에도 데이터 보존
        csv_writer.writerow([
            ep + 1, f"{total_reward:.2f}", f"{moving_avg:.2f}",
            cumulative_dead, f"{agent.eps:.4f}", info['steps'],
            f"{best_reward:.2f}"
        ])
        csv_file.flush()  # 즉시 디스크에 쓰기

        # ── tqdm 진행바 업데이트 (postfix에 핵심 지표 표시) ──────────────────
        if TQDM_AVAILABLE:
            pbar.set_postfix({
                'avgR' : f"{moving_avg:.1f}",
                'best' : f"{best_reward:.1f}",
                'dead' : cumulative_dead,
                'eps'  : f"{agent.eps:.3f}",
            })

        # ── 콘솔 출력 (100 에피소드마다) ────────────────────────────────────
        if (ep + 1) % LOG_INTERVAL == 0 and not TQDM_AVAILABLE:
            recent_dead = sum(dead_flags[-LOG_INTERVAL:])
            print(
                f"[Ep {ep+1:4d}/{num_episodes}] "
                f"평균보상: {moving_avg:6.1f} | "
                f"최고: {best_reward:6.1f} | "
                f"방전: {recent_dead:3d}회 | "
                f"ε: {agent.eps:.3f}"
            )

        # ── 체크포인트 저장 ───────────────────────────────────────────────────
        # 1. 주기적 저장: 150 에피소드마다
        if (ep + 1) % CHECKPOINT_INTERVAL == 0:
            ckpt_path = os.path.join(dirs['ckpt'], f"checkpoint_ep{ep+1}.pkl")
            agent.save_checkpoint(ckpt_path, ep, best_reward, ep_rewards)

        # 2. Best Model 저장: 최고 평균 보상 갱신 시
        if moving_avg >= best_reward:
            best_path = os.path.join(dirs['ckpt'], "best_model.pkl")
            agent.save_checkpoint(best_path, ep, best_reward, ep_rewards)

    # ── 정리 ────────────────────────────────────────────────────────────────
    csv_file.close()
    if TQDM_AVAILABLE:
        pbar.close()

    print(f"\n[완료] {mode.upper()} seed={seed} | "
          f"최고보상={best_reward:.1f} | 총방전={cumulative_dead}회")

    return dict(
        mode          = mode,
        seed          = seed,
        episode_rewards = ep_rewards,
        dead_flags    = dead_flags,
        ep_lengths    = ep_lengths,
        charge_counts = charge_counts,
    )


# =============================================================================
# 전체 시드 실험 실행
# =============================================================================

def run_mode(mode, num_episodes, seeds=None, render=False, render_interval=1):
    """
    지정된 모드로 모든 시드 순차 실행.

    Args:
        mode (str)         : 'baseline' 또는 'proposed'
        num_episodes (int) : 에피소드 수
        seeds (list)       : 시드 리스트 (None이면 SEEDS 전체)

    Returns:
        list: 각 시드 결과 딕셔너리 리스트
    """
    if seeds is None:
        seeds = SEEDS

    results = []
    for seed in seeds:
        print(f"\n{'='*60}")
        print(f"  MODE: {mode.upper()}  |  SEED: {seed}  |  EPISODES: {num_episodes}")
        print(f"{'='*60}")
        results.append(run_seed(mode, seed, num_episodes,
                                render=render, render_interval=render_interval))
    return results


# =============================================================================
# 결과 시각화
# =============================================================================

def smooth(arr, window=30):
    """이동 평균 스무딩."""
    if len(arr) < window:
        return np.array(arr)
    return np.convolve(arr, np.ones(window) / window, mode='valid')


def plot_comparison(mode1='baseline', mode2='proposed', out_dir=None):
    """
    두 모드의 학습 곡선 비교 그래프 생성.

    CSV 로그를 로드하여 5개 시드의 평균 ± 표준편차로 시각화.

    Args:
        mode1 (str): 첫 번째 모드 (보통 'baseline')
        mode2 (str): 두 번째 모드 (보통 'proposed')
        out_dir (str): 그래프 저장 디렉토리 (None이면 results/images/)
    """
    if out_dir is None:
        out_dir = os.path.join(ROOT, "results", "images")
    os.makedirs(out_dir, exist_ok=True)

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("AGV Battery Scheduling — Baseline vs Proposed (5 seeds)", fontsize=13)

    # 각 메트릭별 그래프 설정
    metrics = [
        ('reward',  'Episode Reward',       'Total Reward',     False),
        ('dead',    'Cumulative Dead Count', 'Cumulative Count', True),
        ('length',  'Episode Length',        'Steps',            False),
        ('epsilon', 'Epsilon Decay',         'Epsilon (ε)',      False),
    ]

    for ax, (key, title, ylabel, cumsum) in zip(axes.flat, metrics):
        for mode, color, label in [(mode1, 'tab:red', 'Baseline'),
                                    (mode2, 'tab:blue', 'Proposed')]:
            # CSV 로그 로드
            all_data = []
            log_dir = os.path.join(ROOT, "results", "logs", mode)

            for seed in SEEDS:
                csv_path = os.path.join(log_dir, f"{mode}_seed{seed}_log.csv")
                if not os.path.exists(csv_path):
                    continue
                rows = []
                with open(csv_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        if key == 'reward':
                            rows.append(float(row['reward']))
                        elif key == 'dead':
                            rows.append(float(row['dead_count']))
                        elif key == 'length':
                            rows.append(float(row['steps']))
                        elif key == 'epsilon':
                            rows.append(float(row['epsilon']))
                all_data.append(rows)

            if not all_data:
                ax.set_title(f"{title} (데이터 없음)")
                continue

            # 길이 맞추기 (가장 짧은 시드 기준)
            min_len = min(len(d) for d in all_data)
            mat     = np.array([d[:min_len] for d in all_data])

            if cumsum:
                mat = np.cumsum(mat, axis=1)

            mean = mat.mean(axis=0)
            std  = mat.std(axis=0)

            # 스무딩 (누적 그래프는 스무딩 불필요)
            if not cumsum and len(mean) >= 30:
                mean_s = smooth(mean)
                std_s  = smooth(std)
                x      = np.arange(len(mean_s))
            else:
                mean_s, std_s = mean, std
                x = np.arange(len(mean_s))

            ax.plot(x, mean_s, label=label, color=color)
            ax.fill_between(x, mean_s - std_s, mean_s + std_s, alpha=0.15, color=color)

        ax.set_title(title)
        ax.set_xlabel("Episode")
        ax.set_ylabel(ylabel)
        ax.legend()
        ax.grid(True, alpha=0.3)

    plt.tight_layout()
    save_path = os.path.join(out_dir, "training_curves.png")
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    print(f"\n그래프 저장: {save_path}")
    plt.close()


def save_summary():
    """
    전체 실험 결과 요약을 JSON으로 저장.
    CSV 로그를 읽어 최종 200 에피소드 기준 통계 계산.
    """
    os.makedirs(os.path.join(ROOT, "results", "logs"), exist_ok=True)
    summary = {"seeds": SEEDS}

    for mode in ['baseline', 'proposed']:
        rewards_all = []
        dead_all    = []

        for seed in SEEDS:
            log_dir  = os.path.join(ROOT, "results", "logs", mode)
            csv_path = os.path.join(log_dir, f"{mode}_seed{seed}_log.csv")
            if not os.path.exists(csv_path):
                continue

            rewards, deads = [], []
            with open(csv_path, 'r', encoding='utf-8') as f:
                for row in csv.DictReader(f):
                    rewards.append(float(row['reward']))
                    deads.append(int(row['dead_count']))

            rewards_all.append(rewards)
            dead_all.append(deads)

        if not rewards_all:
            continue

        last = 200
        rewards_mat = np.array([r[-last:] for r in rewards_all])
        dead_mat    = np.array([[d] for d in dead_all])  # 누적값, 마지막 값 사용

        # 각 시드의 마지막 누적 방전 횟수 합산
        total_dead = sum(int(d[-1]) for d in dead_all)
        summary[mode] = {
            "avg_reward_final": float(rewards_mat.mean()),
            "std_reward_final": float(rewards_mat.std()),
            "total_dead"      : total_dead,
            "dead_rate_final" : float(np.mean([d[-1] - d[max(0,len(d)-200)] for d in dead_all])) if dead_all else 0.0,
        }

    out = os.path.join(ROOT, "results", "logs", "summary.json")
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"요약 저장: {out}")


# =============================================================================
# argparse CLI 설정
# =============================================================================

def parse_args():
    """
    커맨드라인 인자 파싱.

    주요 인자:
        --mode     : 실험 모드 (baseline / proposed)
        --seed     : 특정 시드만 실행 (None이면 전체 시드)
        --episodes : 에피소드 수 (기본값: 1500)
        --render   : 터미널 시각화 ON/OFF
        --resume   : 체크포인트 경로 (이어서 학습)
        --plot     : 비교 그래프만 생성 (학습 없음)
    """
    parser = argparse.ArgumentParser(
        description="AGV 배터리 충전 스케줄링 DQN 학습",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python -m src.train.train --mode proposed --seed 42
  python -m src.train.train --mode baseline
  python -m src.train.train --mode proposed --seed 0 --render --render-interval 5
  python -m src.train.train --mode proposed --seed 0 --resume results/checkpoints/proposed/seed0/best_model.pkl
  python -m src.train.train --plot
        """
    )

    parser.add_argument('--mode', type=str, default='proposed',
                        choices=['baseline', 'proposed'],
                        help='실험 모드 (기본값: proposed)')
    parser.add_argument('--seed', type=int, default=None,
                        help='특정 시드만 실행 (미지정 시 전체 5개 시드 실행)')
    parser.add_argument('--episodes', type=int, default=NUM_EPISODES_MAIN,
                        help=f'학습 에피소드 수 (기본값: {NUM_EPISODES_MAIN}, 디버그용: {NUM_EPISODES_DEBUG})')
    parser.add_argument('--render', action='store_true',
                        help='터미널 그리드 시각화 활성화 (기본값: OFF — 학습 속도 우선)')
    parser.add_argument('--render-interval', type=int, default=1,
                        help='N 에피소드마다 1번 렌더링 (기본값: 1, 느린 PC는 10 권장)')
    parser.add_argument('--resume', type=str, default=None,
                        help='이어서 학습할 체크포인트 경로 (.pkl)')
    parser.add_argument('--plot', action='store_true',
                        help='CSV 로그로 비교 그래프만 생성 (학습 없음)')

    return parser.parse_args()


# =============================================================================
# 메인 실행
# =============================================================================

if __name__ == "__main__":
    args = parse_args()

    # ── 그래프 생성 모드 ─────────────────────────────────────────────────────
    if args.plot:
        print("비교 그래프 생성 중...")
        plot_comparison()
        save_summary()
        sys.exit(0)

    # ── 학습 실행 ────────────────────────────────────────────────────────────
    seeds     = [args.seed] if args.seed is not None else SEEDS
    num_ep    = args.episodes
    render_iv = getattr(args, 'render_interval', 1)

    print(f"\n{'='*60}")
    print(f"  AGV 배터리 충전 스케줄링 DQN 학습")
    print(f"  모드: {args.mode.upper()} | 시드: {seeds} | 에피소드: {num_ep}")
    print(f"  tqdm: {'사용' if TQDM_AVAILABLE else '미사용 (pip install tqdm 권장)'}")
    print(f"{'='*60}\n")

    results = run_mode(
        mode            = args.mode,
        num_episodes    = num_ep,
        seeds           = seeds,
        render          = args.render,
        render_interval = render_iv,
    )

    # ── 양쪽 모드 데이터가 있으면 비교 그래프 생성 ──────────────────────────
    bl_log = os.path.join(ROOT, "results", "logs", "baseline",
                          f"baseline_seed{SEEDS[0]}_log.csv")
    pr_log = os.path.join(ROOT, "results", "logs", "proposed",
                          f"proposed_seed{SEEDS[0]}_log.csv")

    if os.path.exists(bl_log) and os.path.exists(pr_log):
        print("\n양쪽 모드 데이터 확인 → 비교 그래프 생성")
        plot_comparison()
        save_summary()
    else:
        print(f"\n[안내] {args.mode.upper()} 학습 완료.")
        print("반대 모드 학습 후 '--plot' 옵션으로 비교 그래프를 생성하세요.")
        print(f"  python -m src.train.train --mode "
              f"{'baseline' if args.mode=='proposed' else 'proposed'}")
        print(f"  python -m src.train.train --plot")
