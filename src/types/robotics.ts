export interface Point2D {
  x: number;
  y: number;
}

export interface LineLayer {
  lineId: string;
  width: number;
  points: Point2D[];
}

export type InteractionEdge = 'top' | 'bottom' | 'left' | 'right' | 'any';

export type StationKind =
  | 'cannon'
  | 'compass'
  | 'pyramid'
  | 'printing'
  | 'great_wall'
  | 'papermaking'
  | 'seismoscope';

export interface MissionZone {
  id: string;
  label: string;
  kind: StationKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  interactionEdge: InteractionEdge;
  points: number;
  order: number;
  description: string;
}

export interface ObstacleBox {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
}

export interface CommandParamOption {
  label: string;
  value: string;
}

export interface CommandParamSchema {
  key: string;
  label: string;
  type: 'number' | 'dropdown';
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: CommandParamOption[];
}

export type BlockCategory = 'Nhiệm vụ' | 'MyBlock' | 'Motion' | 'Patrol line';

export interface CommandDefinition {
  key: string;
  category: BlockCategory;
  color: string;
  displayName: string;
  description: string;
  template: string;
  primitive:
    | 'execute_mission'
    | 'ffl_left_stop'
    | 'ffl_right_stop'
    | 'ffl_t_stop'
    | 'follow_line_distance'
    | 'follow_line_time'
    | 'move_distance'
    | 'turn_left'
    | 'turn_right'
    | 'motor_rotate_angle'
    | 'motor_run_duration'
    | 'patrol_init'
    | 'black_white_detect'
    | 'patrol_intersections'
    | 'set_patrol_speed'
    | 'wait_button'
    | 'move_time'
    | 'move_angle'
    | 'move_sensor'
    | 'patrol_turn';
  params: CommandParamSchema[];
  missionId?: string;
}

export interface ProgramBlock {
  instanceId: string;
  commandKey: string;
  values: Record<string, number | string>;
}

export type CommandPackId = 'enjoy-ai' | 'patrol-line';

export interface QuizDefinition {
  id: number;
  slug: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;
  difficulty: 'Trung bình';
  durationMinutes: number;
  commandPack: CommandPackId;
  commandPackTitle: string;
  boardWidth: number;
  boardHeight: number;
  pxPerCm: number;
  start: { x: number; y: number; headingDeg: number; label: string };
  finish: { x: number; y: number; label: string };
  missions: MissionZone[];
  obstacles: ObstacleBox[];
  changesSummary: string;
  sampleProgram: Omit<ProgramBlock, 'instanceId'>[];
}

export interface SensorReadings {
  channels: [number, number, number, number, number]; // 0 = black line, 1 = light mat
  onLine: boolean;
  intersection: 'none' | 'left' | 'right' | 't';
  distanceToObstacleCm: number;
}

export interface RobotPose {
  x: number; // board px (0..3888)
  y: number; // board px (0..2160)
  headingRad: number; // radians, 0 = +X (right), -PI/2 = -Y (up)
  wheelAngle: number;
  armAngle: number; // radians for front mechanical arm
  activeActionLabel: string;
}

export interface SimulationSnapshot {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  elapsedSec: number;
  distanceCm: number;
  robot: RobotPose;
  sensors: SensorReadings;
  completedMissionIds: string[];
  collisionCount: number;
  collidingObstacleId: string | null;
  activeBlockIndex: number; // -1 if none
  activeBlockId: string | null;
  trail: Point2D[];
  eventLog: string[];
  finishedAtTarget: boolean;
}

export interface GradingBreakdown {
  destinationScore: number; // max 35
  routeAdherenceScore: number; // max 30
  commandQualityScore: number; // max 20
  distanceAccuracyScore: number; // max 15
  totalScore: number; // 0..100
  completedCount: number;
  totalMissions: number;
  collisionCount: number;
  commandCount: number;
  distanceCm: number;
  elapsedSec: number;
  passed: boolean;
  feedback: string[];
}

export interface QuizAttemptRecord {
  quizSlug: string;
  studentName: string;
  score: number;
  completedMissions: number;
  totalMissions: number;
  commandCount: number;
  timestamp: number;
}
