import { BlockCategory, CommandDefinition, QuizDefinition } from '../types/robotics';

export const ENJOY_AI_COMMANDS: CommandDefinition[] = [
  // MyBlock (8 commands)
  {
    key: 'ffl_left_stop',
    category: 'MyBlock',
    color: '#4c97ff',
    displayName: 'FLL Left Line Stop With Speed',
    description: 'Robot bám line và dừng khi phát hiện nhánh rẽ bên trái.',
    template: 'FLL Left Line Stop · Speed {{speed}}',
    primitive: 'ffl_left_stop',
    params: [{ key: 'speed', label: 'Speed', type: 'number', default: 35, min: 10, max: 100, unit: '%' }],
  },
  {
    key: 'ffl_right_stop',
    category: 'MyBlock',
    color: '#4c97ff',
    displayName: 'FLL Right Line Stop With Speed',
    description: 'Robot bám line và dừng khi phát hiện nhánh rẽ bên phải.',
    template: 'FLL Right Line Stop · Speed {{speed}}',
    primitive: 'ffl_right_stop',
    params: [{ key: 'speed', label: 'Speed', type: 'number', default: 35, min: 10, max: 100, unit: '%' }],
  },
  {
    key: 'ffl_t_stop',
    category: 'MyBlock',
    color: '#4c97ff',
    displayName: 'FLL T Line Stop With Speed',
    description: 'Robot bám line và dừng khi cảm biến gặp ngã ba (T) hoặc ngã tư.',
    template: 'FLL T Line Stop · Speed {{speed}}',
    primitive: 'ffl_t_stop',
    params: [{ key: 'speed', label: 'Speed', type: 'number', default: 35, min: 10, max: 100, unit: '%' }],
  },
  {
    key: 'ffl_distance',
    category: 'MyBlock',
    color: '#4c97ff',
    displayName: 'FLL With Speed And Distance',
    description: 'Robot bám line với tốc độ Speed trong khoảng cách Distance cm.',
    template: 'FLL Speed {{speed}} · Distance {{distance}} cm',
    primitive: 'follow_line_distance',
    params: [
      { key: 'speed', label: 'Speed', type: 'number', default: 40, min: 10, max: 100, unit: '%' },
      { key: 'distance', label: 'Distance', type: 'number', default: 40, min: 1, max: 250, unit: 'cm' },
    ],
  },
  {
    key: 'fll_time',
    category: 'MyBlock',
    color: '#4c97ff',
    displayName: 'FLL With Speed With Time',
    description: 'Robot bám line với tốc độ Speed trong thời gian Time giây.',
    template: 'FLL Speed {{speed}} · Time {{time}} s',
    primitive: 'follow_line_time',
    params: [
      { key: 'speed', label: 'Speed', type: 'number', default: 40, min: 10, max: 100, unit: '%' },
      { key: 'time', label: 'Time', type: 'number', default: 2, min: 0.1, max: 20, step: 0.1, unit: 's' },
    ],
  },
  {
    key: 'move_distance',
    category: 'MyBlock',
    color: '#4c97ff',
    displayName: 'Move With Speed And Distance',
    description: 'Robot di chuyển thẳng với tốc độ Speed và khoảng cách Distance cm.',
    template: 'Move Speed {{speed}} · Distance {{distance}} cm',
    primitive: 'move_distance',
    params: [
      { key: 'speed', label: 'Speed', type: 'number', default: 50, min: -100, max: 100, unit: '%' },
      { key: 'distance', label: 'Distance', type: 'number', default: 30, min: 1, max: 250, unit: 'cm' },
    ],
  },
  {
    key: 'turn_left',
    category: 'MyBlock',
    color: '#4c97ff',
    displayName: 'Turn Left With Speed And Angle',
    description: 'Robot quay trái tại chỗ với tốc độ Speed và góc Angle độ.',
    template: 'Turn Left · Speed {{speed}} · Angle {{angle}}°',
    primitive: 'turn_left',
    params: [
      { key: 'speed', label: 'Speed', type: 'number', default: 30, min: 10, max: 100, unit: '%' },
      { key: 'angle', label: 'Angle', type: 'number', default: 90, min: 5, max: 360, unit: '°' },
    ],
  },
  {
    key: 'turn_right',
    category: 'MyBlock',
    color: '#4c97ff',
    displayName: 'Turn Right With Speed And Angle',
    description: 'Robot quay phải tại chỗ với tốc độ Speed và góc Angle độ.',
    template: 'Turn Right · Speed {{speed}} · Angle {{angle}}°',
    primitive: 'turn_right',
    params: [
      { key: 'speed', label: 'Speed', type: 'number', default: 30, min: 10, max: 100, unit: '%' },
      { key: 'angle', label: 'Angle', type: 'number', default: 90, min: 5, max: 360, unit: '°' },
    ],
  },

  // Motion (2 commands)
  {
    key: 'motor_rotate_angle',
    category: 'Motion',
    color: '#ff6680',
    displayName: 'Motor Rotate Angle',
    description: 'Quay động cơ cơ cấu (tay gắp / nâng) tại cổng Port theo góc Angle độ.',
    template: 'Motor Port {{port}} · Speed {{speed}} · Angle {{angle}}°',
    primitive: 'motor_rotate_angle',
    params: [
      {
        key: 'port',
        label: 'Port',
        type: 'dropdown',
        default: 'A',
        options: [
          { label: 'A', value: 'A' },
          { label: 'B', value: 'B' },
          { label: 'C', value: 'C' },
          { label: 'D', value: 'D' },
        ],
      },
      { key: 'speed', label: 'Speed', type: 'number', default: 40, min: -100, max: 100, unit: '%' },
      { key: 'angle', label: 'Angle', type: 'number', default: 180, min: -720, max: 720, unit: '°' },
    ],
  },
  {
    key: 'motor_run_duration',
    category: 'Motion',
    color: '#ff6680',
    displayName: 'Motor Run Duration',
    description: 'Chạy động cơ tại cổng Port với công suất Speed trong Duration giây.',
    template: 'Motor Port {{port}} · Speed {{speed}} · For {{duration}} s',
    primitive: 'motor_run_duration',
    params: [
      {
        key: 'port',
        label: 'Port',
        type: 'dropdown',
        default: 'A',
        options: [
          { label: 'A', value: 'A' },
          { label: 'B', value: 'B' },
          { label: 'C', value: 'C' },
          { label: 'D', value: 'D' },
        ],
      },
      { key: 'speed', label: 'Speed', type: 'number', default: 40, min: -100, max: 100, unit: '%' },
      { key: 'duration', label: 'Duration', type: 'number', default: 1, min: 0.1, max: 10, step: 0.1, unit: 's' },
    ],
  },
];

const PORT_OPTIONS = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
];

const SENSOR_PORT_OPTIONS = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
];

/**
 * Exact 13 WhalesBot Patrol Line commands used in "Enjoy AI 2026 - Đề 2 - Bảo Nam".
 */
export const PATROL_LINE_COMMANDS: CommandDefinition[] = [
  {
    key: 'patrol_init_mecanum_integrated',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Init Mecanum Line Patrol (Integrated)',
    description: 'Khởi tạo robot bánh Mecanum 4 động cơ bám vạch với mắt đọc tích hợp.',
    template: 'Init Mecanum · A {{rear_left_speed}} B {{rear_right_speed}} C {{front_right_speed}} D {{front_left_speed}} · Port {{grayscale_port}}',
    primitive: 'patrol_init',
    params: [
      { key: 'rear_left_speed', label: 'A', type: 'number', default: 100 },
      { key: 'rear_right_speed', label: 'B', type: 'number', default: 100 },
      { key: 'front_right_speed', label: 'C', type: 'number', default: 100 },
      { key: 'front_left_speed', label: 'D', type: 'number', default: 100 },
      { key: 'grayscale_port', label: 'Grayscale', type: 'dropdown', default: '1', options: SENSOR_PORT_OPTIONS },
    ],
  },
  {
    key: 'patrol_init_mecanum_ground_grayscale',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Init Mecanum (Ground Grayscale)',
    description: 'Khởi tạo robot bánh Mecanum với 5 cảm biến quang đơn kênh.',
    template: 'Init Mecanum Ground · A {{rear_left_speed}} B {{rear_right_speed}} · CH {{ch1}}-{{ch5}}',
    primitive: 'patrol_init',
    params: [
      { key: 'rear_left_speed', label: 'A', type: 'number', default: 100 },
      { key: 'rear_right_speed', label: 'B', type: 'number', default: 100 },
      { key: 'ch1', label: 'CH1', type: 'dropdown', default: '1', options: SENSOR_PORT_OPTIONS },
      { key: 'ch5', label: 'CH5', type: 'dropdown', default: '5', options: SENSOR_PORT_OPTIONS },
    ],
  },
  {
    key: 'black_and_white_detection',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Black & White Detection',
    description: 'Hiệu chuẩn ngưỡng phân biệt vạch đen và nền sáng trên sa bàn.',
    template: 'Black and White Detection (Calibrate)',
    primitive: 'black_white_detect',
    params: [],
  },
  {
    key: 'patrol_init_integrated',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Initialize 2-Motor (Integrated)',
    description: 'Khởi tạo 2 động cơ trái/phải bám vạch bằng cảm biến quang tích hợp.',
    template: 'Initialize · Left {{left_motor}} ({{left_speed}}) · Right {{right_motor}} ({{right_speed}}) · Port {{grayscale_port}}',
    primitive: 'patrol_init',
    params: [
      { key: 'left_motor', label: 'Left', type: 'dropdown', default: 'A', options: PORT_OPTIONS },
      { key: 'left_speed', label: 'Speed', type: 'number', default: 100 },
      { key: 'right_motor', label: 'Right', type: 'dropdown', default: 'B', options: PORT_OPTIONS },
      { key: 'right_speed', label: 'Speed', type: 'number', default: -100 },
      { key: 'grayscale_port', label: 'Port', type: 'dropdown', default: '1', options: SENSOR_PORT_OPTIONS },
    ],
  },
  {
    key: 'patrol_init_ground_grayscale',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Initialize 2-Motor (Ground Grayscale)',
    description: 'Khởi tạo 2 động cơ trái/phải với cụm 5 cảm biến quang độc lập.',
    template: 'Initialize Ground · L {{left_motor}} ({{left_speed}}) · R {{right_motor}} ({{right_speed}})',
    primitive: 'patrol_init',
    params: [
      { key: 'left_motor', label: 'Left', type: 'dropdown', default: 'A', options: PORT_OPTIONS },
      { key: 'left_speed', label: 'Speed', type: 'number', default: 100 },
      { key: 'right_motor', label: 'Right', type: 'dropdown', default: 'B', options: PORT_OPTIONS },
      { key: 'right_speed', label: 'Speed', type: 'number', default: -100 },
    ],
  },
  {
    key: 'patrol_line_timing',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Patrol Line Timing',
    description: 'Bám vạch với tốc độ Speed trong khoảng thời gian Duration giây.',
    template: 'Patrol Line · Speed {{speed}} · For {{duration}} s',
    primitive: 'follow_line_time',
    params: [
      { key: 'speed', label: 'Speed', type: 'number', default: 35, min: 10, max: 100, unit: '%' },
      { key: 'duration', label: 'For', type: 'number', default: 1.5, min: 0.1, max: 20, step: 0.1, unit: 's' },
    ],
  },
  {
    key: 'patrol_line_intersections',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Patrol Line Intersections',
    description: 'Bám vạch tới ngã rẽ (Left / Right / T-Cross) rồi đi lố thêm Rush Time giây.',
    template: 'Patrol Intersections · {{intersection_type}} · Speed {{speed}} · Rush {{time}} s',
    primitive: 'patrol_intersections',
    params: [
      {
        key: 'intersection_type',
        label: 'Type',
        type: 'dropdown',
        default: 'left',
        options: [
          { label: 'left', value: 'left' },
          { label: 'right', value: 'right' },
          { label: 'T/Cross intersection', value: 'T/Cross intersection' },
        ],
      },
      { key: 'speed', label: 'Speed', type: 'number', default: 35, min: 10, max: 100, unit: '%' },
      { key: 'time', label: 'Rush', type: 'number', default: 0.1, min: 0, max: 3, step: 0.05, unit: 's' },
    ],
  },
  {
    key: 'patrol_line_speed_setting',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Patrol Line Speed Setting',
    description: 'Thiết lập tốc độ bám vạch mặc định cho các khối lệnh tiếp theo.',
    template: 'Set Patrol Line Speed {{speed}}',
    primitive: 'set_patrol_speed',
    params: [{ key: 'speed', label: 'Speed', type: 'number', default: 40, min: 10, max: 100, unit: '%' }],
  },
  {
    key: 'start_button',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Start Button',
    description: 'Chờ tín hiệu nút nhấn khởi chạy trên bộ điều khiển trung tâm.',
    template: 'Wait For Start Button',
    primitive: 'wait_button',
    params: [],
  },
  {
    key: 'start_motor_time',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Start Motor (Time)',
    description: 'Chạy 2 động cơ trái/phải độc lập theo thời gian Time giây.',
    template: 'Start Motor · L {{left_speed}} · R {{right_speed}} · Time {{time}} s',
    primitive: 'move_time',
    params: [
      { key: 'left_speed', label: 'Left', type: 'number', default: 30, min: -100, max: 100 },
      { key: 'right_speed', label: 'Right', type: 'number', default: 30, min: -100, max: 100 },
      { key: 'time', label: 'Time', type: 'number', default: 0.8, min: 0.1, max: 15, step: 0.1, unit: 's' },
    ],
  },
  {
    key: 'start_motor_angle',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Start Motor (Angle)',
    description: 'Chạy 2 động cơ trái/phải theo góc quay trục bánh Angle độ.',
    template: 'Start Motor · L {{left_speed}} · R {{right_speed}} · Angle {{angle}}°',
    primitive: 'move_angle',
    params: [
      { key: 'left_speed', label: 'Left', type: 'number', default: 30, min: -100, max: 100 },
      { key: 'right_speed', label: 'Right', type: 'number', default: 30, min: -100, max: 100 },
      { key: 'angle', label: 'Angle', type: 'number', default: 360, min: 10, max: 3600, unit: '°' },
    ],
  },
  {
    key: 'start_motor_sensor',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Start Motor (Until Sensor)',
    description: 'Chạy 2 động cơ cho đến khi cảm biến quang vượt ngưỡng threshold.',
    template: 'Start Motor · L {{left_speed}} · R {{right_speed}} · Sensor {{sensor_port}} {{operator}} {{threshold}}',
    primitive: 'move_sensor',
    params: [
      { key: 'left_speed', label: 'Left', type: 'number', default: 25, min: -100, max: 100 },
      { key: 'right_speed', label: 'Right', type: 'number', default: 25, min: -100, max: 100 },
      { key: 'sensor_port', label: 'Sensor', type: 'dropdown', default: '3', options: SENSOR_PORT_OPTIONS },
      {
        key: 'operator',
        label: 'Op',
        type: 'dropdown',
        default: '<',
        options: [
          { label: '<', value: '<' },
          { label: '>', value: '>' },
          { label: '<=', value: '<=' },
          { label: '>=', value: '>=' },
        ],
      },
      { key: 'threshold', label: 'Threshold', type: 'number', default: 1000, min: 100, max: 4000 },
    ],
  },
  {
    key: 'patrol_line_turn',
    category: 'Patrol line',
    color: '#ff8c1a',
    displayName: 'Patrol Line Turn',
    description: 'Quay robot tới vạch theo hướng trái / phải / giữa bằng tốc độ động cơ.',
    template: 'Turn {{direction}} · L {{left_speed}} · R {{right_speed}}',
    primitive: 'patrol_turn',
    params: [
      {
        key: 'direction',
        label: 'Dir',
        type: 'dropdown',
        default: 'left',
        options: [
          { label: 'left', value: 'left' },
          { label: 'right', value: 'right' },
          { label: 'middle', value: 'middle' },
        ],
      },
      { key: 'left_speed', label: 'Left', type: 'number', default: -25, min: -100, max: 100 },
      { key: 'right_speed', label: 'Right', type: 'number', default: 25, min: -100, max: 100 },
    ],
  },
];

export function buildMissionCommands(quiz: QuizDefinition): CommandDefinition[] {
  return quiz.missions.map((mission) => ({
    key: `mission_${mission.id}`,
    category: 'Nhiệm vụ' as BlockCategory,
    color: '#3b82f6',
    displayName: `Thực hiện nhiệm vụ: ${mission.label}`,
    description: `Điều hướng tự động theo lưới line tránh vật cản đến trạm ${mission.label} (cạnh ${mission.interactionEdge}) và kích hoạt cơ cấu hoàn thành nhiệm vụ.`,
    template: `Thực hiện nhiệm vụ: ${mission.label}`,
    primitive: 'execute_mission',
    params: [],
    missionId: mission.id,
  }));
}

export function getCommandsForQuiz(quiz: QuizDefinition): CommandDefinition[] {
  const missionBlocks = buildMissionCommands(quiz);
  const libraryBlocks =
    quiz.commandPack === 'patrol-line' ? PATROL_LINE_COMMANDS : ENJOY_AI_COMMANDS;
  return [...missionBlocks, ...libraryBlocks];
}

export function getCategoriesForQuiz(
  quiz: QuizDefinition
): { id: BlockCategory; label: string; color: string; count: number }[] {
  if (quiz.commandPack === 'patrol-line') {
    return [
      { id: 'Nhiệm vụ', label: 'Nhiệm vụ', color: '#10b981', count: quiz.missions.length },
      { id: 'Patrol line', label: 'Patrol line', color: '#ff8c1a', count: PATROL_LINE_COMMANDS.length },
    ];
  }
  return [
    { id: 'Nhiệm vụ', label: 'Nhiệm vụ', color: '#10b981', count: quiz.missions.length },
    { id: 'MyBlock', label: 'MyBlock', color: '#4c97ff', count: 8 },
    { id: 'Motion', label: 'Motion', color: '#ff6680', count: 2 },
  ];
}
