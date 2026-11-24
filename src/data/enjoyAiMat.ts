import { LineLayer } from '../types/robotics';

export const BOARD_WIDTH = 3888;
export const BOARD_HEIGHT = 2160;
export const PX_PER_CM = 18; // 216 cm x 120 cm official Enjoy AI 2026 mat

/**
 * Exact 13 line_layers polylines from the Enjoy AI 2026 competition mat.
 * Coordinates are in mat pixel space (3888 x 2160, origin top-left).
 */
export const ENJOY_AI_LINE_LAYERS: LineLayer[] = [
  {
    lineId: 'line-1',
    width: 36,
    points: [
      { x: 284, y: 1612 },
      { x: 280, y: 266 },
      { x: 2193, y: 271 },
      { x: 2189, y: 1900 },
      { x: 546, y: 1892 },
    ],
  },
  {
    lineId: 'line-2',
    width: 36,
    points: [
      { x: 293, y: 1079 },
      { x: 3084, y: 1083 },
    ],
  },
  {
    lineId: 'line-3',
    width: 36,
    points: [
      { x: 1712, y: 2154 },
      { x: 1708, y: 0 },
    ],
  },
  {
    lineId: 'line-4',
    width: 36,
    points: [
      { x: 1236, y: 266 },
      { x: 1232, y: 1896 },
    ],
  },
  {
    lineId: 'line-5',
    width: 36,
    points: [
      { x: 760, y: 1083 },
      { x: 760, y: 0 },
    ],
  },
  {
    lineId: 'line-6',
    width: 36,
    points: [
      { x: 2805, y: 1075 },
      { x: 2800, y: 1437 },
      { x: 2861, y: 1551 },
      { x: 2940, y: 1643 },
      { x: 3089, y: 1699 },
      { x: 3228, y: 1704 },
      { x: 3342, y: 1660 },
      { x: 3394, y: 1625 },
      { x: 3486, y: 1494 },
      { x: 3521, y: 1354 },
      { x: 3521, y: 1232 },
      { x: 3521, y: 1075 },
      { x: 3512, y: 716 },
      { x: 3447, y: 590 },
      { x: 3355, y: 507 },
      { x: 3250, y: 463 },
      { x: 3167, y: 441 },
      { x: 3058, y: 459 },
      { x: 2931, y: 507 },
      { x: 2861, y: 603 },
      { x: 2826, y: 660 },
      { x: 2796, y: 730 },
      { x: 2796, y: 813 },
      { x: 2796, y: 944 },
      { x: 2800, y: 1092 },
    ],
  },
  {
    lineId: 'line-7',
    width: 36,
    points: [
      { x: 2193, y: 1446 },
      { x: 2800, y: 1433 },
    ],
  },
  {
    lineId: 'line-8',
    width: 36,
    points: [
      { x: 2189, y: 716 },
      { x: 2809, y: 716 },
    ],
  },
  {
    lineId: 'line-9',
    width: 36,
    points: [
      { x: 2665, y: 205 },
      { x: 2944, y: 502 },
    ],
  },
  {
    lineId: 'line-10',
    width: 36,
    points: [
      { x: 3381, y: 502 },
      { x: 3674, y: 201 },
    ],
  },
  {
    lineId: 'line-11',
    width: 36,
    points: [
      { x: 2940, y: 1643 },
      { x: 2652, y: 1935 },
    ],
  },
  {
    lineId: 'line-12',
    width: 36,
    points: [
      { x: 3377, y: 1634 },
      { x: 3678, y: 1953 },
    ],
  },
  {
    lineId: 'line-13',
    width: 36,
    points: [
      { x: 3233, y: 1079 },
      { x: 3735, y: 1088 },
    ],
  },
];

/**
 * Key intersection hubs on the Enjoy AI 2026 black-line network, used for
 * reference path guidance and autonomous mission-block navigation around obstacles.
 */
export const LINE_NETWORK_NODES: { id: string; x: number; y: number }[] = [
  { id: 'start', x: 284, y: 1869 },
  { id: 'n_bl', x: 284, y: 1612 },
  { id: 'n_ml', x: 284, y: 1080 },
  { id: 'n_tl', x: 280, y: 266 },
  { id: 'n_t1', x: 760, y: 267 },
  { id: 'n_m1', x: 760, y: 1080 },
  { id: 'n_t2', x: 1236, y: 268 },
  { id: 'n_m2', x: 1234, y: 1080 },
  { id: 'n_b2', x: 1232, y: 1894 },
  { id: 'n_t3', x: 1710, y: 270 },
  { id: 'n_m3', x: 1710, y: 1081 },
  { id: 'n_b3', x: 1712, y: 1896 },
  { id: 'n_t4', x: 2193, y: 271 },
  { id: 'n_u4', x: 2191, y: 716 },
  { id: 'n_m4', x: 2191, y: 1082 },
  { id: 'n_l4', x: 2191, y: 1446 },
  { id: 'n_b4', x: 2189, y: 1900 },
  { id: 'n_o_u', x: 2800, y: 716 },
  { id: 'n_o_m', x: 2802, y: 1082 },
  { id: 'n_o_l', x: 2800, y: 1437 },
  { id: 'n_o_tr', x: 3381, y: 502 },
  { id: 'n_o_r', x: 3521, y: 1082 },
  { id: 'n_o_br', x: 3377, y: 1634 },
  { id: 'n_o_b', x: 2940, y: 1643 },
  { id: 'n_o_t', x: 2944, y: 502 },
  { id: 'n_o_c', x: 3160, y: 1082 },
  { id: 'n_tr_tip', x: 3600, y: 275 },
  { id: 'n_br_tip', x: 3590, y: 1850 },
  { id: 'n_b_mid', x: 800, y: 1892 },
];

export const LINE_NETWORK_EDGES: [string, string][] = [
  ['start', 'n_bl'],
  ['start', 'n_b_mid'],
  ['n_bl', 'n_ml'],
  ['n_ml', 'n_tl'],
  ['n_tl', 'n_t1'],
  ['n_t1', 'n_t2'],
  ['n_t2', 'n_t3'],
  ['n_t3', 'n_t4'],
  ['n_t1', 'n_m1'],
  ['n_ml', 'n_m1'],
  ['n_m1', 'n_m2'],
  ['n_m2', 'n_m3'],
  ['n_m3', 'n_m4'],
  ['n_t2', 'n_m2'],
  ['n_m2', 'n_b2'],
  ['n_t3', 'n_m3'],
  ['n_m3', 'n_b3'],
  ['n_b_mid', 'n_b2'],
  ['n_b2', 'n_b3'],
  ['n_b3', 'n_b4'],
  ['n_t4', 'n_u4'],
  ['n_u4', 'n_m4'],
  ['n_m4', 'n_l4'],
  ['n_l4', 'n_b4'],
  ['n_u4', 'n_o_u'],
  ['n_m4', 'n_o_m'],
  ['n_l4', 'n_o_l'],
  ['n_o_u', 'n_o_m'],
  ['n_o_m', 'n_o_l'],
  ['n_o_u', 'n_o_t'],
  ['n_o_t', 'n_o_tr'],
  ['n_o_tr', 'n_o_r'],
  ['n_o_r', 'n_o_br'],
  ['n_o_br', 'n_o_b'],
  ['n_o_b', 'n_o_l'],
  ['n_o_m', 'n_o_c'],
  ['n_o_c', 'n_o_r'],
  ['n_o_tr', 'n_tr_tip'],
  ['n_o_br', 'n_br_tip'],
  ['n_b4', 'n_o_b'],
];
