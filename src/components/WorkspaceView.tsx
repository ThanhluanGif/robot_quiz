import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Square,
} from 'lucide-react';
import { getCategoriesForQuiz } from '../data/commands';
import { PX_PER_CM } from '../data/enjoyAiMat';
import { ROBOT_QUIZZES } from '../data/quizzes';
import { evaluateSimulation, RobotSimulator } from '../sim/engine';
import {
  GradingBreakdown,
  ProgramBlock,
  QuizAttemptRecord,
  QuizDefinition,
  SimulationSnapshot,
} from '../types/robotics';
import { loadSavedProgram, saveProgram } from '../utils/storage';
import { GradingModal } from './GradingModal';
import { ScratchIDE } from './ScratchIDE';
import { Simulator2D } from './Simulator2D';
import { Simulator3D } from './Simulator3D';

interface WorkspaceViewProps {
  quiz: QuizDefinition;
  studentName: string;
  onExit: () => void;
  onSwitchQuiz: (slug: string) => void;
  onRecordAttempt: (attempt: QuizAttemptRecord) => void;
}

function makeDefaultBlocks(quiz: QuizDefinition): ProgramBlock[] {
  // Start with the first mission block snapped (matching the reference screenshot!)
  return [
    {
      instanceId: `init_${quiz.slug}_1`,
      commandKey: `mission_${quiz.missions[0].id}`,
      values: {},
    },
  ];
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  quiz,
  studentName,
  onExit,
  onSwitchQuiz,
  onRecordAttempt,
}) => {
  const simRef = useRef<RobotSimulator>(new RobotSimulator(quiz));
  const [blocks, setBlocks] = useState<ProgramBlock[]>(() => {
    return loadSavedProgram(quiz.slug) || makeDefaultBlocks(quiz);
  });
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() =>
    simRef.current.getSnapshot()
  );
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [expandedSim, setExpandedSim] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [showReferencePath, setShowReferencePath] = useState<boolean>(false);
  const [showSensorOverlay, setShowSensorOverlay] = useState<boolean>(true);
  const [gradingResult, setGradingResult] = useState<GradingBreakdown | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(quiz.durationMinutes * 60);

  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;
  const runTimerRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (runTimerRef.current !== null) {
      window.clearInterval(runTimerRef.current);
      runTimerRef.current = null;
    }
  }, []);

  // Re-initialize simulator & load saved blocks when switching quiz
  useEffect(() => {
    stopLoop();
    simRef.current.setQuiz(quiz);
    const saved = loadSavedProgram(quiz.slug);
    setBlocks(saved && saved.length > 0 ? saved : makeDefaultBlocks(quiz));
    setSnapshot(simRef.current.getSnapshot());
    setGradingResult(null);
    setRemainingSec(quiz.durationMinutes * 60);
  }, [quiz, stopLoop]);

  // Countdown timer (1Hz)
  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [quiz.slug]);

  useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  const handleBlocksChange = useCallback(
    (next: ProgramBlock[]) => {
      setBlocks(next);
      saveProgram(quiz.slug, next);
    },
    [quiz.slug]
  );

  const handleReset = useCallback(() => {
    stopLoop();
    simRef.current.reset();
    setSnapshot(simRef.current.getSnapshot());
  }, [stopLoop]);

  const handleRun = useCallback(() => {
    stopLoop();
    simRef.current.start(blocks);
    const initial = simRef.current.getSnapshot();
    setSnapshot(initial);
    if (initial.status !== 'running') return;

    // 25Hz simulation stepping (clean CPU budget for both 2D & software-WebGL 3D)
    const tickMs = 40;
    runTimerRef.current = window.setInterval(() => {
      const subSteps = Math.max(1, Math.round(speedRef.current * 2));
      const dtPerSub = ((tickMs / 1000) * speedRef.current) / subSteps;
      let latest = simRef.current.getSnapshot();
      for (let i = 0; i < subSteps; i++) {
        latest = simRef.current.step(dtPerSub);
        if (latest.status !== 'running') break;
      }
      setSnapshot(latest);
      if (latest.status !== 'running') {
        stopLoop();
      }
    }, tickMs);
  }, [blocks, stopLoop]);

  const handleStop = useCallback(() => {
    stopLoop();
    const snap = simRef.current.getSnapshot();
    setSnapshot({ ...snap, status: 'paused' });
  }, [stopLoop]);

  const handleLoadSample = useCallback(() => {
    stopLoop();
    const sampleBlocks: ProgramBlock[] = quiz.sampleProgram.map((b, i) => ({
      ...b,
      instanceId: `sample_${quiz.slug}_${Date.now()}_${i}`,
    }));
    handleBlocksChange(sampleBlocks);
    simRef.current.reset();
    setSnapshot(simRef.current.getSnapshot());
    setShowOptions(false);
  }, [quiz, handleBlocksChange, stopLoop]);

  const handleSubmit = useCallback(() => {
    stopLoop();
    let finalSnap = simRef.current.getSnapshot();
    // Always run a fresh deterministic pass on the current block stack before grading
    simRef.current.start(blocks);
    finalSnap = simRef.current.runToCompletion(9000, 1 / 30);
    setSnapshot(finalSnap);

    const breakdown = evaluateSimulation(
      quiz,
      finalSnap,
      blocks,
      simRef.current.getLineAdherenceRatio()
    );
    setGradingResult(breakdown);

    onRecordAttempt({
      quizSlug: quiz.slug,
      studentName: studentName.trim() || 'Thí sinh',
      score: breakdown.totalScore,
      completedMissions: breakdown.completedCount,
      totalMissions: breakdown.totalMissions,
      commandCount: blocks.length,
      timestamp: Date.now(),
    });
  }, [blocks, onRecordAttempt, quiz, stopLoop, studentName]);

  const categories = useMemo(
    () => getCategoriesForQuiz(quiz).filter((c) => c.id !== 'Nhiệm vụ'),
    [quiz]
  );

  const quizIndex = ROBOT_QUIZZES.findIndex((q) => q.slug === quiz.slug);
  const nextQuiz = quizIndex >= 0 && quizIndex < ROBOT_QUIZZES.length - 1 ? ROBOT_QUIZZES[quizIndex + 1] : null;

  const isRunning = snapshot.status === 'running';
  const statusLabel =
    snapshot.status === 'running'
      ? 'Đang chạy'
      : snapshot.status === 'completed'
        ? 'Đã hoàn tất'
        : snapshot.status === 'paused'
          ? 'Đã tạm dừng'
          : 'Sẵn sàng chạy';

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const formattedClock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900" data-state={snapshot.status}>
      {/* Workspace Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          {/* Left: Exit + Quiz Title & Switcher */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Thoát
            </button>
            <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
                  {quiz.title}
                </h1>
                <label className="sr-only" htmlFor="quiz-switcher">
                  Chuyển nhanh giữa 5 đề thi
                </label>
                <select
                  id="quiz-switcher"
                  value={quiz.slug}
                  onChange={(e) => onSwitchQuiz(e.target.value)}
                  className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:border-blue-500 focus:outline-none sm:inline-block"
                >
                  {ROBOT_QUIZZES.map((q, idx) => (
                    <option key={q.slug} value={q.slug}>
                      Bài {idx + 1}: {q.title}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500 tabular-nums">
                {quiz.difficulty} · {quiz.pxPerCm.toFixed(2)} px/cm · Thời gian {formattedClock}
              </p>
            </div>
          </div>

          {/* Right: Run / Submit / Options */}
          <div className="relative flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={isRunning ? handleStop : handleRun}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
            >
              {isRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isRunning ? 'Dừng thử' : 'Chạy thử'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Send className="h-3.5 w-3.5" />
              Nộp bài
            </button>
            <button
              type="button"
              onClick={() => setShowOptions((v) => !v)}
              aria-expanded={showOptions}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Tùy chọn
            </button>

            {showOptions && (
              <div className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <p className="text-xs font-bold text-slate-900">Tùy chọn mô phỏng</p>
                <div className="mt-2.5 space-y-2 text-xs text-slate-700">
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span>Hiện tuyến đường gợi ý</span>
                    <input
                      type="checkbox"
                      checked={showReferencePath}
                      onChange={(e) => setShowReferencePath(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span>Hiện mắt cảm biến 2D</span>
                    <input
                      type="checkbox"
                      checked={showSensorOverlay}
                      onChange={(e) => setShowSensorOverlay(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                  </label>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-2.5">
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Nạp bài mẫu (7/7 trạm)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Compact Summary Strip (matches reference screenshot architecture) */}
      <div className="border-b border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0 max-w-xl">
            <p className="text-xs font-semibold text-blue-700">
              Robot Quiz Runtime · {quiz.commandPackTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {quiz.changesSummary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs tabular-nums">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-xs"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden="true"
                />
                <span className="font-semibold text-slate-800">{cat.label}</span>
                <span className="font-mono text-slate-500">{cat.count}</span>
              </div>
            ))}
            <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <div>
              <span className="text-slate-500">Nhiệm vụ: </span>
              <strong
                className="font-mono text-slate-900"
                data-testid="mission-counter"
              >
                {snapshot.completedMissionIds.length}/{quiz.missions.length}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Khối lệnh: </span>
              <strong className="font-mono text-slate-900" data-testid="block-counter">
                {blocks.length}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Trạng thái: </span>
              <strong
                className={
                  snapshot.status === 'running'
                    ? 'text-blue-700'
                    : snapshot.status === 'completed'
                      ? 'text-emerald-700'
                      : 'text-slate-900'
                }
              >
                {statusLabel}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column IDE + Simulator Stage */}
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-4 sm:px-6 lg:grid-cols-12">
        {/* Left Pane: Robot Scratch IDE */}
        {!expandedSim && (
          <div className="min-h-[540px] lg:col-span-6 lg:h-[calc(100vh-176px)]">
            <ScratchIDE
              quiz={quiz}
              blocks={blocks}
              activeBlockId={snapshot.activeBlockId}
              completedMissionIds={snapshot.completedMissionIds}
              isRunning={isRunning}
              onChangeBlocks={handleBlocksChange}
              onLoadSample={handleLoadSample}
            />
          </div>
        )}

        {/* Right Pane: 2D / 3D Field Simulator */}
        <section
          aria-label="Sa bàn mô phỏng Robot"
          className={`flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs ${
            expandedSim
              ? 'lg:col-span-12 lg:h-[calc(100vh-176px)]'
              : 'lg:col-span-6 lg:h-[calc(100vh-176px)]'
          }`}
        >
          {/* Simulator Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
            <div>
              <h2 className="text-sm font-bold leading-tight text-slate-900">{quiz.title}</h2>
              <p className="text-xs text-slate-500">
                {viewMode === '3d' ? 'Mô phỏng sa bàn 3D' : 'Mô phỏng sa bàn 2D OXY'} ·{' '}
                {snapshot.robot.activeActionLabel}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                    viewMode === '2d'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2D
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                    viewMode === '3d'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  3D
                </button>
              </div>

              <button
                type="button"
                onClick={() => setExpandedSim((v) => !v)}
                aria-label={expandedSim ? 'Thu gọn sa bàn' : 'Mở rộng sa bàn'}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                {expandedSim ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Viewport Container */}
          <div className="min-h-[340px] flex-1 p-3">
            {viewMode === '3d' ? (
              <Simulator3D
                quiz={quiz}
                snapshot={snapshot}
                showReferencePath={showReferencePath}
              />
            ) : (
              <Simulator2D
                quiz={quiz}
                snapshot={snapshot}
                showReferencePath={showReferencePath}
                showSensorOverlay={showSensorOverlay}
              />
            )}
          </div>

          {/* Live 5-Channel Grayscale Sensor & Telemetry Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-600 tabular-nums">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Cảm biến line (S1–S5):</span>
              <div className="flex items-center gap-1" aria-label="Trạng thái 5 cảm biến quang">
                {snapshot.sensors.channels.map((val, idx) => {
                  const dark = val < 0.45;
                  return (
                    <span
                      key={idx}
                      title={`S${idx + 1}: ${dark ? 'Vạch đen' : 'Nền sáng'} (${val})`}
                      className={`flex h-5 w-5 items-center justify-center rounded font-mono text-[10px] font-bold ${
                        dark
                          ? 'bg-slate-900 text-cyan-300'
                          : 'border border-slate-300 bg-white text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  );
                })}
              </div>
              {snapshot.sensors.intersection !== 'none' && (
                <span className="font-semibold text-blue-700">
                  Ngã rẽ: {snapshot.sensors.intersection.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <span>
                X:{Math.round(snapshot.robot.x / PX_PER_CM)}cm · Y:
                {Math.round(snapshot.robot.y / PX_PER_CM)}cm
              </span>
              <span>Quãng đường: {snapshot.distanceCm}cm</span>
              <span>Vật cản trước: {snapshot.sensors.distanceToObstacleCm}cm</span>
              {snapshot.collisionCount > 0 && (
                <span className="font-bold text-rose-600">
                  Va chạm: {snapshot.collisionCount}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Playback Bar (matches reference screenshot!) */}
          <div className="flex items-center gap-2.5 border-t border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={isRunning ? handleStop : handleRun}
              className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors ${
                isRunning
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'Dừng mô phỏng' : 'Bắt đầu chạy thử'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Đặt lại
            </button>

            <label className="sr-only" htmlFor="sim-speed-select">
              Tốc độ mô phỏng
            </label>
            <select
              id="sim-speed-select"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:border-blue-500 focus:outline-none"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1.0x</option>
              <option value={2}>2.0x</option>
              <option value={4}>4.0x</option>
            </select>
          </div>
        </section>
      </main>

      {/* Submission Grading Modal */}
      {gradingResult && (
        <GradingModal
          quiz={quiz}
          result={gradingResult}
          completedMissionIds={snapshot.completedMissionIds}
          hasNextQuiz={Boolean(nextQuiz)}
          onClose={() => setGradingResult(null)}
          onRetry={() => {
            setGradingResult(null);
            handleReset();
          }}
          onNextQuiz={() => {
            if (nextQuiz) {
              setGradingResult(null);
              onSwitchQuiz(nextQuiz.slug);
            }
          }}
          onBackToHub={() => {
            setGradingResult(null);
            onExit();
          }}
        />
      )}
    </div>
  );
};
