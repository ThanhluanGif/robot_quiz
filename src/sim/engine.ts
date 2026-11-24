import { getCommandsForQuiz } from '../data/commands';
import { BOARD_HEIGHT, BOARD_WIDTH, PX_PER_CM } from '../data/enjoyAiMat';
import {
  CommandDefinition,
  GradingBreakdown,
  Point2D,
  ProgramBlock,
  QuizDefinition,
  RobotPose,
  SimulationSnapshot,
} from '../types/robotics';
import {
  clamp,
  dist,
  distanceToLineNetwork,
  getMissionApproachPoint,
  normalizeAngle,
  planObstacleFreePath,
  pointInOrientedRect,
  sampleSensors,
} from './geometry';

interface ExecutionTask {
  blockIndex: number;
  blockId: string;
  label: string;
  kind:
    | 'move_straight'
    | 'turn'
    | 'follow_line'
    | 'follow_until_intersection'
    | 'motor_arm'
    | 'follow_waypoints'
    | 'wait'
    | 'diff_drive';
  speedPct: number;
  targetDistancePx?: number;
  traveledPx?: number;
  targetDurationSec?: number;
  elapsedSec?: number;
  targetAngleRad?: number;
  turnedRad?: number;
  stopOn?: 'left' | 'right' | 't';
  rushTimeSec?: number;
  rushElapsedSec?: number;
  intersectionTriggered?: boolean;
  waypoints?: Point2D[];
  waypointIndex?: number;
  finalFacingRad?: number;
  missionId?: string;
  leftSpeedPct?: number;
  rightSpeedPct?: number;
  armTargetDeltaRad?: number;
  armMovedRad?: number;
}

const MAX_SPEED_CM_PER_SEC = 52; // 100% speed = 52 cm/s
const TURN_DEG_PER_SEC_AT_100 = 260;

export class RobotSimulator {
  private quiz: QuizDefinition;
  private commandMap: Map<string, CommandDefinition>;
  private blocks: ProgramBlock[] = [];
  private tasks: ExecutionTask[] = [];
  private taskCursor = 0;

  private status: SimulationSnapshot['status'] = 'idle';
  private elapsedSec = 0;
  private distanceCm = 0;
  private robot: RobotPose;
  private completedMissionIds: Set<string> = new Set();
  private collisionCount = 0;
  private collidingObstacleId: string | null = null;
  private trail: Point2D[] = [];
  private eventLog: string[] = [];
  private lineOnSamples = 0;
  private totalMoveSamples = 0;
  private defaultPatrolSpeed = 40;

  constructor(quiz: QuizDefinition) {
    this.quiz = quiz;
    this.commandMap = new Map(getCommandsForQuiz(quiz).map((c) => [c.key, c]));
    this.robot = this.initialPose();
    this.trail = [{ x: this.robot.x, y: this.robot.y }];
  }

  private initialPose(): RobotPose {
    return {
      x: this.quiz.start.x,
      y: this.quiz.start.y,
      headingRad: (this.quiz.start.headingDeg * Math.PI) / 180,
      wheelAngle: 0,
      armAngle: 0,
      activeActionLabel: 'Sẵn sàng tại vùng xuất phát',
    };
  }

  public setQuiz(quiz: QuizDefinition): void {
    this.quiz = quiz;
    this.commandMap = new Map(getCommandsForQuiz(quiz).map((c) => [c.key, c]));
    this.reset();
  }

  public reset(): void {
    this.status = 'idle';
    this.elapsedSec = 0;
    this.distanceCm = 0;
    this.robot = this.initialPose();
    this.completedMissionIds.clear();
    this.collisionCount = 0;
    this.collidingObstacleId = null;
    this.trail = [{ x: this.robot.x, y: this.robot.y }];
    this.eventLog = ['Robot đã đặt lại tại vị trí xuất phát 2026.'];
    this.tasks = [];
    this.taskCursor = 0;
    this.lineOnSamples = 0;
    this.totalMoveSamples = 0;
    this.defaultPatrolSpeed = 40;
  }

  public start(blocks: ProgramBlock[]): void {
    this.reset();
    this.blocks = blocks;
    if (blocks.length === 0) {
      this.status = 'completed';
      this.eventLog.push('Chương trình chưa có khối lệnh nào.');
      return;
    }
    this.compileBlocks(blocks);
    this.status = 'running';
    this.eventLog.push(`Bắt đầu chạy chương trình gồm ${blocks.length} khối lệnh.`);
  }

  private compileBlocks(blocks: ProgramBlock[]): void {
    this.tasks = [];
    let simPatrolSpeed = 40;

    blocks.forEach((block, index) => {
      const def = this.commandMap.get(block.commandKey);
      if (!def) return;

      const num = (key: string, fallback: number) => {
        const raw = block.values[key];
        const parsed = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(parsed) ? parsed : fallback;
      };
      const str = (key: string, fallback: string) =>
        block.values[key] !== undefined ? String(block.values[key]) : fallback;

      switch (def.primitive) {
        case 'execute_mission': {
          const mission = this.quiz.missions.find((m) => m.id === def.missionId);
          if (!mission) break;
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Di chuyển đến trạm ${mission.label}`,
            kind: 'follow_waypoints',
            speedPct: 68,
            missionId: mission.id,
          });
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Kích hoạt cơ cấu: ${mission.label}`,
            kind: 'motor_arm',
            speedPct: 60,
            armTargetDeltaRad: 1.35,
            armMovedRad: 0,
            missionId: mission.id,
          });
          break;
        }

        case 'move_distance': {
          const speed = clamp(num('speed', 50), -100, 100);
          const distCm = Math.abs(num('distance', 30));
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Đi thẳng ${distCm} cm (${speed}%)`,
            kind: 'move_straight',
            speedPct: speed === 0 ? 40 : speed,
            targetDistancePx: distCm * PX_PER_CM,
            traveledPx: 0,
          });
          break;
        }

        case 'turn_left': {
          const speed = Math.max(10, Math.abs(num('speed', 30)));
          const angleDeg = num('angle', 90);
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Quay trái ${angleDeg}°`,
            kind: 'turn',
            speedPct: speed,
            targetAngleRad: -(angleDeg * Math.PI) / 180,
            turnedRad: 0,
          });
          break;
        }

        case 'turn_right': {
          const speed = Math.max(10, Math.abs(num('speed', 30)));
          const angleDeg = num('angle', 90);
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Quay phải ${angleDeg}°`,
            kind: 'turn',
            speedPct: speed,
            targetAngleRad: (angleDeg * Math.PI) / 180,
            turnedRad: 0,
          });
          break;
        }

        case 'follow_line_distance': {
          const speed = Math.max(10, Math.abs(num('speed', simPatrolSpeed)));
          const distCm = Math.abs(num('distance', 40));
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Bám line ${distCm} cm`,
            kind: 'follow_line',
            speedPct: speed,
            targetDistancePx: distCm * PX_PER_CM,
            traveledPx: 0,
          });
          break;
        }

        case 'follow_line_time': {
          const speed = Math.max(10, Math.abs(num('speed', simPatrolSpeed)));
          const dur = Math.max(0.1, num('time', num('duration', 2)));
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Bám line trong ${dur}s`,
            kind: 'follow_line',
            speedPct: speed,
            targetDurationSec: dur,
            elapsedSec: 0,
          });
          break;
        }

        case 'ffl_left_stop':
        case 'ffl_right_stop':
        case 'ffl_t_stop': {
          const speed = Math.max(10, Math.abs(num('speed', simPatrolSpeed)));
          const stopOn =
            def.primitive === 'ffl_left_stop'
              ? 'left'
              : def.primitive === 'ffl_right_stop'
                ? 'right'
                : 't';
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Bám line dừng nhánh ${stopOn.toUpperCase()}`,
            kind: 'follow_until_intersection',
            speedPct: speed,
            stopOn,
            traveledPx: 0,
            rushTimeSec: 0.08,
            rushElapsedSec: 0,
          });
          break;
        }

        case 'patrol_intersections': {
          const speed = Math.max(10, Math.abs(num('speed', simPatrolSpeed)));
          const itype = str('intersection_type', 'left');
          const rush = Math.max(0, num('time', 0));
          const stopOn: 'left' | 'right' | 't' =
            itype === 'right' ? 'right' : itype.startsWith('T') ? 't' : 'left';
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Patrol ngã rẽ (${itype})`,
            kind: 'follow_until_intersection',
            speedPct: speed,
            stopOn,
            traveledPx: 0,
            rushTimeSec: rush,
            rushElapsedSec: 0,
          });
          break;
        }

        case 'motor_rotate_angle': {
          const speed = Math.max(15, Math.abs(num('speed', 40)));
          const angleDeg = num('angle', 180);
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Động cơ cổng ${str('port', 'A')} quay ${angleDeg}°`,
            kind: 'motor_arm',
            speedPct: speed,
            armTargetDeltaRad: clamp((angleDeg * Math.PI) / 180, -3.2, 3.2),
            armMovedRad: 0,
          });
          break;
        }

        case 'motor_run_duration': {
          const speed = Math.max(15, Math.abs(num('speed', 40)));
          const duration = Math.max(0.1, num('duration', 1));
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Động cơ cổng ${str('port', 'A')} chạy ${duration}s`,
            kind: 'motor_arm',
            speedPct: speed,
            armTargetDeltaRad: 1.15 * Math.min(2, duration),
            armMovedRad: 0,
          });
          break;
        }

        case 'patrol_init':
        case 'black_white_detect':
        case 'wait_button': {
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: def.displayName,
            kind: 'wait',
            speedPct: 0,
            targetDurationSec: 0.25,
            elapsedSec: 0,
          });
          break;
        }

        case 'set_patrol_speed': {
          simPatrolSpeed = clamp(num('speed', 40), 10, 100);
          this.defaultPatrolSpeed = simPatrolSpeed;
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Đặt tốc độ bám vạch ${simPatrolSpeed}%`,
            kind: 'wait',
            speedPct: 0,
            targetDurationSec: 0.12,
            elapsedSec: 0,
          });
          break;
        }

        case 'move_time': {
          const ls = clamp(num('left_speed', 30), -100, 100);
          const rs = clamp(num('right_speed', 30), -100, 100);
          const dur = Math.max(0.1, num('time', 0.8));
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Động cơ L:${ls} R:${rs} (${dur}s)`,
            kind: 'diff_drive',
            speedPct: Math.max(Math.abs(ls), Math.abs(rs)),
            leftSpeedPct: ls,
            rightSpeedPct: rs,
            targetDurationSec: dur,
            elapsedSec: 0,
          });
          break;
        }

        case 'move_angle': {
          const ls = clamp(num('left_speed', 30), -100, 100);
          const rs = clamp(num('right_speed', 30), -100, 100);
          const deg = Math.abs(num('angle', 360));
          // Wheel diameter 5.6 cm => 17.59 cm per 360 deg
          const distCm = (deg / 360) * Math.PI * 5.6;
          const avgSpeed = Math.max(15, (Math.abs(ls) + Math.abs(rs)) / 2);
          const dur = distCm / ((avgSpeed / 100) * MAX_SPEED_CM_PER_SEC);
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Động cơ L:${ls} R:${rs} (${deg}°)`,
            kind: 'diff_drive',
            speedPct: avgSpeed,
            leftSpeedPct: ls,
            rightSpeedPct: rs,
            targetDurationSec: Math.max(0.15, dur),
            elapsedSec: 0,
          });
          break;
        }

        case 'move_sensor': {
          const ls = clamp(num('left_speed', 25), -100, 100);
          const rs = clamp(num('right_speed', 25), -100, 100);
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Chạy động cơ tới ngưỡng cảm biến`,
            kind: 'diff_drive',
            speedPct: Math.max(Math.abs(ls), Math.abs(rs)),
            leftSpeedPct: ls,
            rightSpeedPct: rs,
            targetDurationSec: 0.9,
            elapsedSec: 0,
          });
          break;
        }

        case 'patrol_turn': {
          const dir = str('direction', 'left');
          const ls = num('left_speed', -25);
          const rs = num('right_speed', 25);
          const angleDeg = dir === 'middle' ? 0 : dir === 'right' ? 90 : -90;
          const sign = angleDeg === 0 ? (ls > rs ? 1 : -1) : Math.sign(angleDeg);
          this.tasks.push({
            blockIndex: index,
            blockId: block.instanceId,
            label: `Quay bắt vạch (${dir})`,
            kind: 'turn',
            speedPct: Math.max(20, Math.abs(ls), Math.abs(rs)),
            targetAngleRad: ((angleDeg || 45 * sign) * Math.PI) / 180,
            turnedRad: 0,
          });
          break;
        }
      }
    });
  }

  public step(dtSec: number): SimulationSnapshot {
    if (this.status !== 'running') {
      return this.getSnapshot();
    }

    const dt = clamp(dtSec, 0.001, 0.05);
    this.elapsedSec += dt;

    if (this.taskCursor >= this.tasks.length) {
      this.status = 'completed';
      this.robot.activeActionLabel = `Hoàn tất (${this.completedMissionIds.size}/${this.quiz.missions.length} nhiệm vụ)`;
      this.eventLog.push('Đã chạy hết tất cả khối lệnh.');
      return this.getSnapshot();
    }

    const task = this.tasks[this.taskCursor];
    this.robot.activeActionLabel = task.label;

    let done = false;

    if (task.kind === 'wait') {
      task.elapsedSec = (task.elapsedSec || 0) + dt;
      if (task.elapsedSec >= (task.targetDurationSec || 0.2)) {
        done = true;
      }
    } else if (task.kind === 'move_straight') {
      const speedPx = (task.speedPct / 100) * MAX_SPEED_CM_PER_SEC * PX_PER_CM;
      const stepPx = speedPx * dt;
      this.advanceRobot(stepPx, 0);
      task.traveledPx = (task.traveledPx || 0) + Math.abs(stepPx);
      if (task.traveledPx >= (task.targetDistancePx || 0)) {
        done = true;
      }
    } else if (task.kind === 'turn') {
      const target = task.targetAngleRad || 0;
      const turnRate = ((task.speedPct / 100) * TURN_DEG_PER_SEC_AT_100 * Math.PI) / 180;
      const remaining = target - (task.turnedRad || 0);
      const stepRad = Math.sign(remaining) * Math.min(Math.abs(remaining), turnRate * dt);
      this.robot.headingRad = normalizeAngle(this.robot.headingRad + stepRad);
      this.robot.wheelAngle += stepRad * 2.2;
      task.turnedRad = (task.turnedRad || 0) + stepRad;
      if (Math.abs(target - task.turnedRad) < 0.005) {
        done = true;
      }
    } else if (task.kind === 'follow_line' || task.kind === 'follow_until_intersection') {
      const sensors = sampleSensors(
        this.robot.x,
        this.robot.y,
        this.robot.headingRad,
        this.quiz.obstacles
      );
      // PD steering toward black line based on 5-channel weights
      const weights = [-2, -1, 0, 1, 2];
      let darkSum = 0;
      let weighted = 0;
      for (let i = 0; i < 5; i++) {
        const darkness = 1 - sensors.channels[i];
        darkSum += darkness;
        weighted += darkness * weights[i];
      }
      const lineError = darkSum > 0.15 ? weighted / darkSum : 0;
      const steerRate = lineError * 2.1 * dt;

      const speedPx = (task.speedPct / 100) * MAX_SPEED_CM_PER_SEC * PX_PER_CM;
      const stepPx = speedPx * dt;
      this.advanceRobot(stepPx, steerRate);
      task.traveledPx = (task.traveledPx || 0) + Math.abs(stepPx);
      task.elapsedSec = (task.elapsedSec || 0) + dt;

      if (task.kind === 'follow_line') {
        if (task.targetDistancePx && task.traveledPx >= task.targetDistancePx) done = true;
        if (task.targetDurationSec && task.elapsedSec >= task.targetDurationSec) done = true;
      } else {
        // Require at least 8 cm travel before triggering an intersection so we leave the starting junction
        const ready = (task.traveledPx || 0) > 8 * PX_PER_CM;
        if (!task.intersectionTriggered && ready) {
          const hit =
            (task.stopOn === 't' && sensors.intersection === 't') ||
            (task.stopOn === 'left' &&
              (sensors.intersection === 'left' || sensors.intersection === 't')) ||
            (task.stopOn === 'right' &&
              (sensors.intersection === 'right' || sensors.intersection === 't'));
          if (hit) {
            task.intersectionTriggered = true;
            this.eventLog.push(`Phát hiện ngã rẽ (${task.stopOn?.toUpperCase()}).`);
          }
        }
        if (task.intersectionTriggered) {
          task.rushElapsedSec = (task.rushElapsedSec || 0) + dt;
          if (task.rushElapsedSec >= (task.rushTimeSec || 0)) {
            done = true;
          }
        } else if ((task.traveledPx || 0) > 165 * PX_PER_CM) {
          // Safety limit to prevent infinite line-follow off-mat
          done = true;
        }
      }
    } else if (task.kind === 'diff_drive') {
      const ls = task.leftSpeedPct ?? 30;
      const rs = task.rightSpeedPct ?? 30;
      const avgPct = (ls + rs) / 2;
      const diffPct = ls - rs;
      const stepPx = (avgPct / 100) * MAX_SPEED_CM_PER_SEC * PX_PER_CM * dt;
      const turnRad = (diffPct / 100) * 2.4 * dt;
      this.advanceRobot(stepPx, turnRad);
      task.elapsedSec = (task.elapsedSec || 0) + dt;
      if (task.elapsedSec >= (task.targetDurationSec || 0.5)) {
        done = true;
      }
    } else if (task.kind === 'follow_waypoints') {
      if (!task.waypoints) {
        const mission = this.quiz.missions.find((m) => m.id === task.missionId);
        if (mission) {
          const { approach, facingRad } = getMissionApproachPoint(mission);
          task.waypoints = planObstacleFreePath(
            { x: this.robot.x, y: this.robot.y },
            approach,
            this.quiz.obstacles
          );
          task.waypointIndex = 0;
          task.finalFacingRad = facingRad;
        } else {
          done = true;
        }
      }

      if (!done && task.waypoints) {
        const idx = task.waypointIndex || 0;
        const target = task.waypoints[idx];
        if (!target) {
          // Align heading smoothly to face mission station
          const diff = normalizeAngle((task.finalFacingRad ?? this.robot.headingRad) - this.robot.headingRad);
          if (Math.abs(diff) < 0.06) {
            done = true;
          } else {
            const turnStep = Math.sign(diff) * Math.min(Math.abs(diff), 4.8 * dt);
            this.robot.headingRad = normalizeAngle(this.robot.headingRad + turnStep);
          }
        } else {
          const d = dist({ x: this.robot.x, y: this.robot.y }, target);
          if (d < 26) {
            task.waypointIndex = idx + 1;
          } else {
            const desiredHeading = Math.atan2(target.y - this.robot.y, target.x - this.robot.x);
            const headingDiff = normalizeAngle(desiredHeading - this.robot.headingRad);
            const maxTurn = 5.2 * dt;
            if (Math.abs(headingDiff) > 0.35) {
              // Rotate in place cleanly at corners
              const turnStep = Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), maxTurn);
              this.robot.headingRad = normalizeAngle(this.robot.headingRad + turnStep);
              this.robot.wheelAngle += turnStep * 2;
            } else {
              const turnStep = Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), maxTurn);
              this.robot.headingRad = normalizeAngle(this.robot.headingRad + turnStep);
              const speedPx = (task.speedPct / 100) * MAX_SPEED_CM_PER_SEC * PX_PER_CM;
              const movePx = Math.min(d, speedPx * dt);
              this.advanceRobot(movePx, 0);
            }
          }
        }
      }
    } else if (task.kind === 'motor_arm') {
      const targetDelta = task.armTargetDeltaRad ?? 1.2;
      const rate = ((task.speedPct / 100) * 4.5 + 1.2) * dt;
      const remaining = targetDelta - (task.armMovedRad || 0);
      const stepArm = Math.sign(remaining) * Math.min(Math.abs(remaining), rate);
      task.armMovedRad = (task.armMovedRad || 0) + stepArm;
      // Smooth raise & settle oscillation for visual mechanical feedback
      const progress = Math.abs(task.armMovedRad / (targetDelta || 1));
      this.robot.armAngle = Math.sin(progress * Math.PI) * 0.72;

      if (Math.abs(targetDelta - task.armMovedRad) < 0.04) {
        this.robot.armAngle = 0;
        if (task.missionId && !this.completedMissionIds.has(task.missionId)) {
          const m = this.quiz.missions.find((item) => item.id === task.missionId);
          this.completedMissionIds.add(task.missionId);
          if (m) {
            this.eventLog.push(`Hoàn thành nhiệm vụ: ${m.label} (+${m.points}đ)`);
          }
        }
        done = true;
      }
    }

    this.checkProximityMissions();

    if (done) {
      this.taskCursor += 1;
      if (this.taskCursor >= this.tasks.length) {
        this.status = 'completed';
        this.robot.activeActionLabel = `Hoàn tất (${this.completedMissionIds.size}/${this.quiz.missions.length} nhiệm vụ)`;
        this.eventLog.push(
          `Kết thúc lượt chạy: ${this.completedMissionIds.size}/${this.quiz.missions.length} trạm hoàn thành.`
        );
      }
    }

    return this.getSnapshot();
  }

  private advanceRobot(stepPx: number, deltaHeadingRad: number): void {
    this.robot.headingRad = normalizeAngle(this.robot.headingRad + deltaHeadingRad);
    const nextX = clamp(this.robot.x + Math.cos(this.robot.headingRad) * stepPx, 75, BOARD_WIDTH - 75);
    const nextY = clamp(this.robot.y + Math.sin(this.robot.headingRad) * stepPx, 75, BOARD_HEIGHT - 75);

    const movedPx = Math.hypot(nextX - this.robot.x, nextY - this.robot.y);
    this.robot.x = nextX;
    this.robot.y = nextY;
    this.robot.wheelAngle += (stepPx / PX_PER_CM) * 0.35;
    this.distanceCm += movedPx / PX_PER_CM;

    // Sample trail every ~22 px
    const last = this.trail[this.trail.length - 1];
    if (!last || dist(last, { x: nextX, y: nextY }) > 22) {
      this.trail.push({ x: nextX, y: nextY });
    }

    // Track line adherence
    if (movedPx > 0.2) {
      this.totalMoveSamples += 1;
      if (distanceToLineNetwork({ x: nextX, y: nextY }) <= 85) {
        this.lineOnSamples += 1;
      }
    }

    // Check obstacle collision
    const hitObs = this.quiz.obstacles.find((o) =>
      pointInOrientedRect({ x: nextX, y: nextY }, o, 54)
    );
    if (hitObs) {
      if (this.collidingObstacleId !== hitObs.id) {
        this.collisionCount += 1;
        this.collidingObstacleId = hitObs.id;
        this.eventLog.push(`Cảnh báo: Chạm ${hitObs.label}!`);
      }
    } else {
      this.collidingObstacleId = null;
    }
  }

  private checkProximityMissions(): void {
    for (const mission of this.quiz.missions) {
      if (this.completedMissionIds.has(mission.id)) continue;
      if (pointInOrientedRect({ x: this.robot.x, y: this.robot.y }, mission, 72)) {
        this.completedMissionIds.add(mission.id);
        this.eventLog.push(`Hoàn thành nhiệm vụ: ${mission.label} (+${mission.points}đ)`);
      }
    }
  }

  public runToCompletion(maxSteps = 4500, dtSec = 1 / 30): SimulationSnapshot {
    let steps = 0;
    while (this.status === 'running' && steps < maxSteps) {
      this.step(dtSec);
      steps += 1;
    }
    return this.getSnapshot();
  }

  public getLineAdherenceRatio(): number {
    if (this.totalMoveSamples === 0) return 0;
    return clamp(this.lineOnSamples / this.totalMoveSamples, 0, 1);
  }

  public getSnapshot(): SimulationSnapshot {
    const activeTask =
      this.status === 'running' && this.taskCursor < this.tasks.length
        ? this.tasks[this.taskCursor]
        : null;

    const sensors = sampleSensors(
      this.robot.x,
      this.robot.y,
      this.robot.headingRad,
      this.quiz.obstacles
    );

    const finishedAtTarget =
      dist({ x: this.robot.x, y: this.robot.y }, this.quiz.finish) < 220;

    return {
      status: this.status,
      elapsedSec: Number(this.elapsedSec.toFixed(2)),
      distanceCm: Number(this.distanceCm.toFixed(1)),
      robot: { ...this.robot },
      sensors,
      completedMissionIds: Array.from(this.completedMissionIds),
      collisionCount: this.collisionCount,
      collidingObstacleId: this.collidingObstacleId,
      activeBlockIndex: activeTask ? activeTask.blockIndex : -1,
      activeBlockId: activeTask ? activeTask.blockId : null,
      trail: this.trail,
      eventLog: this.eventLog.slice(-12),
      finishedAtTarget,
    };
  }
}

/**
 * Evaluates a simulation run using the official Enjoy AI 2026 4-pillar rubric:
 * - destination: 35 pts
 * - route_adherence: 30 pts
 * - command_quality: 20 pts
 * - distance_accuracy: 15 pts
 */
export function evaluateSimulation(
  quiz: QuizDefinition,
  snapshot: SimulationSnapshot,
  blocks: ProgramBlock[],
  lineAdherenceRatio?: number
): GradingBreakdown {
  const totalMissions = quiz.missions.length;
  const completedCount = snapshot.completedMissionIds.length;
  const missionRatio = totalMissions > 0 ? completedCount / totalMissions : 0;

  // 1. Destination / Mission Completion (35 pts)
  const destinationScore = Math.round(missionRatio * 35);

  // 2. Route Adherence (30 pts): line tracking + collision penalty
  let adherence = lineAdherenceRatio;
  if (adherence === undefined) {
    if (snapshot.trail.length <= 1) {
      adherence = 0;
    } else {
      const onLinePts = snapshot.trail.filter(
        (pt) => distanceToLineNetwork(pt) <= 95
      ).length;
      adherence = onLinePts / snapshot.trail.length;
    }
  }
  const collisionPenalty = snapshot.collisionCount * 8;
  const routeAdherenceScore = Math.max(
    0,
    Math.min(30, Math.round(adherence * 30 * (completedCount > 0 ? 1 : 0.4) - collisionPenalty))
  );

  // 3. Command Quality (20 pts): concise valid program within 80-block limit
  let commandQualityScore = 0;
  if (blocks.length > 0) {
    const baseQuality = completedCount > 0 ? 12 + Math.round(missionRatio * 8) : 6;
    const bloatPenalty = blocks.length > 45 ? Math.min(8, Math.floor((blocks.length - 45) / 5)) : 0;
    commandQualityScore = clamp(baseQuality - bloatPenalty, 0, 20);
  }

  // 4. Distance Accuracy / Efficiency (15 pts)
  let distanceAccuracyScore = 0;
  if (completedCount > 0 && snapshot.distanceCm > 5) {
    // Ideal full-mat tour is roughly ~550-780 cm
    const expectedCm = completedCount * 95;
    const efficiency = clamp(expectedCm / Math.max(expectedCm * 0.75, snapshot.distanceCm), 0.35, 1);
    distanceAccuracyScore = Math.round(missionRatio * 15 * efficiency);
  }

  const totalScore = clamp(
    destinationScore + routeAdherenceScore + commandQualityScore + distanceAccuracyScore,
    0,
    100
  );

  const feedback: string[] = [];
  if (completedCount === totalMissions) {
    feedback.push(`Xuất sắc! Robot đã hoàn thành trọn vẹn ${totalMissions}/${totalMissions} trạm nhiệm vụ.`);
  } else if (completedCount > 0) {
    feedback.push(
      `Hoàn thành ${completedCount}/${totalMissions} trạm nhiệm vụ. Hãy bổ sung thêm các trạm còn lại để tối đa hóa điểm.`
    );
  } else {
    feedback.push('Robot chưa chạm tới trạm nhiệm vụ nào. Hãy thêm khối lệnh di chuyển hoặc khối Nhiệm vụ.');
  }

  if (snapshot.collisionCount > 0) {
    feedback.push(
      `Phát hiện ${snapshot.collisionCount} lần chạm vật cản trên sa bàn (-${collisionPenalty} điểm bám lộ trình).`
    );
  } else if (completedCount > 0) {
    feedback.push('An toàn tuyệt đối: không xảy ra va chạm với 3 vật cản.');
  }

  if (blocks.length > 0 && blocks.length <= 25 && completedCount === totalMissions) {
    feedback.push('Cấu trúc chương trình gọn gàng, tối ưu số lượng khối lệnh.');
  }

  return {
    destinationScore,
    routeAdherenceScore,
    commandQualityScore,
    distanceAccuracyScore,
    totalScore,
    completedCount,
    totalMissions,
    collisionCount: snapshot.collisionCount,
    commandCount: blocks.length,
    distanceCm: snapshot.distanceCm,
    elapsedSec: snapshot.elapsedSec,
    passed: totalScore >= 70,
    feedback,
  };
}
