import assert from 'node:assert/strict';
import test from 'node:test';
import { getCommandsForQuiz } from '../data/commands';
import { ROBOT_QUIZZES } from '../data/quizzes';
import { ProgramBlock } from '../types/robotics';
import { evaluateSimulation, RobotSimulator } from './engine';
import { distanceToLineNetwork, pointInOrientedRect, sampleSensors } from './geometry';

test('all 5 Enjoy AI 2026 quizzes exist with exact mission, obstacle, and command counts', () => {
  assert.equal(ROBOT_QUIZZES.length, 5);
  assert.deepEqual(
    ROBOT_QUIZZES.map((q) => q.slug),
    [
      'enjoy-ai',
      'enjoy-ai-2026-e-2',
      'enjoy-ai-2026-e-2-ban-sao',
      'enjoy-ai-2026-e-3',
      'enjoy-ai-2026-e-4',
    ]
  );

  for (const quiz of ROBOT_QUIZZES) {
    assert.equal(quiz.missions.length, 7, `${quiz.slug} must have 7 missions`);
    assert.equal(quiz.obstacles.length, 3, `${quiz.slug} must have 3 obstacles`);
    const cmds = getCommandsForQuiz(quiz);
    const expectedTotal = quiz.commandPack === 'patrol-line' ? 7 + 13 : 7 + 10;
    assert.equal(cmds.length, expectedTotal, `${quiz.slug} command count mismatch`);
  }

  // Verify Đề 4 has the rotated Vật cản 1 at (922, 1052, rot=268)
  const de4 = ROBOT_QUIZZES[4];
  assert.equal(de4.obstacles[0].x, 922);
  assert.equal(de4.obstacles[0].rotation, 268);
});

test('grayscale line sensors accurately detect black lines and T-intersections', () => {
  const quiz = ROBOT_QUIZZES[0];
  // Point directly on vertical line-1 at x=284, y=1400 facing UP (-PI/2)
  const onStraight = sampleSensors(284, 1400, -Math.PI / 2, quiz.obstacles);
  assert.equal(onStraight.onLine, true);
  assert.ok(onStraight.channels[2] < 0.25, 'Center sensor S3 must read dark on line');

  // Point approaching intersection of line-4 (x=1234) and line-2 (y=1080) from below
  const atCross = sampleSensors(1234, 1156, -Math.PI / 2, quiz.obstacles);
  assert.equal(atCross.intersection, 't', 'Should detect T/Cross intersection at (1234, 1080)');

  // Point far off any line
  const distFar = distanceToLineNetwork({ x: 500, y: 1500 });
  assert.ok(distFar > 100);
});

test('move_distance and turn_right update robot position and heading deterministically', () => {
  const quiz = ROBOT_QUIZZES[0];
  const sim = new RobotSimulator(quiz);
  const startY = quiz.start.y;
  const blocks: ProgramBlock[] = [
    { instanceId: 'b1', commandKey: 'move_distance', values: { speed: 50, distance: 20 } },
    { instanceId: 'b2', commandKey: 'turn_right', values: { speed: 40, angle: 90 } },
  ];
  sim.start(blocks);
  const finalSnap = sim.runToCompletion();

  assert.equal(finalSnap.status, 'completed');
  // Facing up (-90 deg), moving 20cm = 360px decreases Y by ~360px
  assert.ok(Math.abs(startY - finalSnap.robot.y - 360) < 25);
  // Turning right 90 deg from -90 deg results in heading ~0 rad (+X)
  assert.ok(Math.abs(finalSnap.robot.headingRad) < 0.08);
});

test('all 5 quizzes sample programs complete all 7/7 missions cleanly with high score and zero collisions', () => {
  for (const quiz of ROBOT_QUIZZES) {
    const sim = new RobotSimulator(quiz);
    const blocks: ProgramBlock[] = quiz.sampleProgram.map((b, i) => ({
      ...b,
      instanceId: `sample-${i}`,
    }));
    sim.start(blocks);
    const snap = sim.runToCompletion(9000, 1 / 30);
    const grade = evaluateSimulation(quiz, snap, blocks, sim.getLineAdherenceRatio());

    assert.equal(snap.status, 'completed', `${quiz.slug} sample program should finish`);
    assert.equal(
      snap.completedMissionIds.length,
      7,
      `${quiz.slug} should complete all 7 missions, got ${snap.completedMissionIds.length}`
    );
    assert.equal(
      snap.collisionCount,
      0,
      `${quiz.slug} sample run should avoid all obstacles, collisions=${snap.collisionCount}`
    );
    assert.ok(grade.totalScore >= 85, `${quiz.slug} grade should be >= 85, got ${grade.totalScore}`);
    assert.equal(grade.passed, true);
  }
});

test('empty program scores 0 and fails rubric, while oriented obstacle check detects rotated box', () => {
  const de4 = ROBOT_QUIZZES[4];
  const sim = new RobotSimulator(de4);
  sim.start([]);
  const snap = sim.getSnapshot();
  const grade = evaluateSimulation(de4, snap, []);
  assert.equal(grade.totalScore, 0);
  assert.equal(grade.passed, false);

  // Center of Vật cản 1 in Đề 4 is (922 + 76, 1052 + 33) = (998, 1085)
  assert.equal(pointInOrientedRect({ x: 998, y: 1085 }, de4.obstacles[0], 0), true);
  assert.equal(pointInOrientedRect({ x: 200, y: 200 }, de4.obstacles[0], 0), false);
});
