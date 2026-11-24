import React from 'react';
import { ArrowRight, CheckCircle2, RotateCcw, Trophy, X, XCircle } from 'lucide-react';
import { GradingBreakdown, QuizDefinition } from '../types/robotics';

interface GradingModalProps {
  quiz: QuizDefinition;
  result: GradingBreakdown;
  completedMissionIds: string[];
  hasNextQuiz: boolean;
  onClose: () => void;
  onRetry: () => void;
  onNextQuiz: () => void;
  onBackToHub: () => void;
}

export const GradingModal: React.FC<GradingModalProps> = ({
  quiz,
  result,
  completedMissionIds,
  hasNextQuiz,
  onClose,
  onRetry,
  onNextQuiz,
  onBackToHub,
}) => {
  const completedSet = new Set(completedMissionIds);

  const pillars = [
    { label: 'Hoàn thành trạm nhiệm vụ', score: result.destinationScore, max: 35 },
    { label: 'Bám lộ trình & an toàn vật cản', score: result.routeAdherenceScore, max: 30 },
    { label: 'Chất lượng cấu trúc lệnh', score: result.commandQualityScore, max: 20 },
    { label: 'Hiệu quả quãng đường', score: result.distanceAccuracyScore, max: 15 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grading-modal-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Pinned Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                result.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{quiz.title}</p>
              <h2 id="grading-modal-title" className="text-lg font-bold text-slate-900">
                Kết quả chấm điểm tự động
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng điểm"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Total Score & Core Telemetry */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Tổng điểm</p>
              <p className="mt-0.5 text-2xl font-extrabold text-slate-900 tabular-nums">
                {result.totalScore}
                <span className="text-sm font-semibold text-slate-400">/100</span>
              </p>
              <p
                className={`mt-0.5 text-[11px] font-semibold ${
                  result.passed ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {result.passed ? 'Đạt chuẩn thi đấu' : 'Cần tối ưu thêm'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Nhiệm vụ</p>
              <p className="mt-0.5 text-2xl font-extrabold text-slate-900 tabular-nums">
                {result.completedCount}/{result.totalMissions}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Trạm hoàn thành</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Quãng đường</p>
              <p className="mt-0.5 text-2xl font-extrabold text-slate-900 tabular-nums">
                {result.distanceCm}
                <span className="ml-0.5 text-xs font-semibold text-slate-500">cm</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                {result.elapsedSec}s chạy
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Va chạm vật cản</p>
              <p
                className={`mt-0.5 text-2xl font-extrabold tabular-nums ${
                  result.collisionCount === 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {result.collisionCount}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                {result.commandCount} khối lệnh
              </p>
            </div>
          </div>

          {/* 4-Pillar Rubric Breakdown */}
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-900">Chi tiết thang điểm Enjoy AI 2026</h3>
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {pillars.map((p) => {
                const pct = Math.round((p.score / p.max) * 100);
                return (
                  <div key={p.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{p.label}</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {p.score}/{p.max}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7 Mission Checklist */}
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-900">Danh sách 7 trạm nhiệm vụ</h3>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {quiz.missions.map((m) => {
                const done = completedSet.has(m.id);
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${
                      done
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      )}
                      <span className="truncate">{m.label}</span>
                    </span>
                    <span className="ml-1 shrink-0 font-mono text-[10px] tabular-nums">
                      {done ? `+${m.points}` : '0'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback Notes */}
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-bold text-slate-900">Nhận xét chiến thuật</p>
            <ul className="mt-1 space-y-0.5">
              {result.feedback.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pinned Footer Actions */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/60 px-6 py-3.5">
          <button
            type="button"
            onClick={onBackToHub}
            className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          >
            Quay lại danh sách 5 bài
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Chỉnh sửa & chạy lại
            </button>
            {hasNextQuiz && (
              <button
                type="button"
                onClick={onNextQuiz}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Sang đề tiếp theo
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
