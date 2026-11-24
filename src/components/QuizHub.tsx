import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Cpu, Layers, Play, Trophy } from 'lucide-react';
import { BOARD_HEIGHT, BOARD_WIDTH, ENJOY_AI_LINE_LAYERS } from '../data/enjoyAiMat';
import { ROBOT_QUIZZES } from '../data/quizzes';
import { QuizAttemptRecord, QuizDefinition } from '../types/robotics';
import { getQuizStats } from '../utils/storage';

interface QuizHubProps {
  attempts: QuizAttemptRecord[];
  studentName: string;
  onChangeStudentName: (name: string) => void;
  onStartQuiz: (quizSlug: string) => void;
}

/**
 * Miniature SVG map showing the exact 13 lines, 7 mission stations (with rotations),
 * and 3 obstacles for each of the 5 Enjoy AI 2026 exercises so differences are immediately visible.
 */
const MiniMatPreview: React.FC<{ quiz: QuizDefinition }> = ({ quiz }) => {
  return (
    <svg
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
      className="h-auto w-full rounded-xl border border-slate-200 bg-[#d5c7e5]"
      role="img"
      aria-label={`Sơ đồ sa bàn ${quiz.title}`}
    >
      {/* Mat Frame */}
      <rect x="0" y="0" width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="#1e293b" />
      <rect
        x="34"
        y="34"
        width={BOARD_WIDTH - 68}
        height={BOARD_HEIGHT - 68}
        fill="#d6c8e6"
      />

      {/* Start box 2026 */}
      <rect x="64" y="1625" width="450" height="468" fill="#7c3aed" opacity="0.85" rx="18" />

      {/* Center right oval emblem */}
      <circle cx="3158" cy="1080" r="220" fill="#8b5cf6" opacity="0.18" />

      {/* Exact 13 Black Line Layers */}
      {ENJOY_AI_LINE_LAYERS.map((layer) => (
        <polyline
          key={layer.lineId}
          fill="none"
          stroke="#111827"
          strokeWidth="44"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={layer.points.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      ))}

      {/* Finish ring */}
      <circle
        cx={quiz.finish.x}
        cy={quiz.finish.y}
        r="105"
        fill="none"
        stroke="#059669"
        strokeWidth="26"
        strokeDasharray="60 36"
      />

      {/* 3 Obstacles */}
      {quiz.obstacles.map((obs) => {
        const cx = obs.x + obs.width / 2;
        const cy = obs.y + obs.height / 2;
        return (
          <g key={obs.id} transform={`rotate(${obs.rotation || 0} ${cx} ${cy})`}>
            <rect
              x={obs.x}
              y={obs.y}
              width={obs.width}
              height={obs.height}
              fill="#dc2626"
              stroke="#7f1d1d"
              strokeWidth="18"
              rx="12"
            />
          </g>
        );
      })}

      {/* 7 Mission Zones */}
      {quiz.missions.map((m) => {
        const cx = m.x + m.width / 2;
        const cy = m.y + m.height / 2;
        return (
          <g key={m.id} transform={`rotate(${m.rotation || 0} ${cx} ${cy})`}>
            <rect
              x={m.x}
              y={m.y}
              width={m.width}
              height={m.height}
              fill="#2563eb"
              fillOpacity="0.82"
              stroke="#ffffff"
              strokeWidth="20"
              rx="16"
            />
          </g>
        );
      })}

      {/* Start robot marker */}
      <circle cx={quiz.start.x} cy={quiz.start.y} r="96" fill="#f59e0b" stroke="#ffffff" strokeWidth="26" />
    </svg>
  );
};

export const QuizHub: React.FC<QuizHubProps> = ({
  attempts,
  studentName,
  onChangeStudentName,
  onStartQuiz,
}) => {
  const [previewQuiz, setPreviewQuiz] = useState<QuizDefinition | null>(null);
  const [packFilter, setPackFilter] = useState<'all' | 'enjoy-ai' | 'patrol-line'>('all');

  const filteredQuizzes = ROBOT_QUIZZES.filter((q) =>
    packFilter === 'all' ? true : q.commandPack === packFilter
  );

  const completedQuizzesCount = ROBOT_QUIZZES.filter((q) => {
    const st = getQuizStats(attempts, q.slug);
    return st.bestScore !== null && st.bestScore >= 70;
  }).length;

  const overallBest =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="whitespace-nowrap shrink-0 text-lg font-extrabold tracking-tight text-slate-900"
          >
            Enjoy AI 2026 Studio
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#danh-sach-de" className="whitespace-nowrap shrink-0 hover:text-slate-900">
              5 đề Robot Quiz
            </a>
            <a href="#bo-lenh" className="whitespace-nowrap shrink-0 hover:text-slate-900">
              Bộ lệnh mô phỏng
            </a>
            <a href="#lich-su" className="whitespace-nowrap shrink-0 hover:text-slate-900">
              Lịch sử luyện tập
            </a>
          </nav>

          <button
            type="button"
            onClick={() => onStartQuiz('enjoy-ai')}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Play className="h-3.5 w-3.5" />
            Vào Đề 1 ngay
          </button>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1320px] px-6 py-10">
        {/* Hero Split */}
        <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <p className="text-xs font-semibold text-blue-700">
                Enjoy AI 2026 · WhalesBot Robot Quiz · Sa bàn 2D & 3D
              </p>
              <h1 className="mt-2.5 max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 [text-wrap:balance] sm:text-4xl">
                Luyện thi Robotics với trọn bộ 5 đề thực hành Enjoy AI 2026
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">
                Lập trình khối lệnh Scratch IDE trực quan, chạy mô phỏng bám vạch 5 mắt cảm biến
                quang trên sa bàn 3D chân thực, kiểm tra va chạm 3 vật cản và chấm điểm theo thang
                100 điểm chuẩn thi đấu.
              </p>
            </div>

            {/* 4 Clean Key Metrics */}
            <div className="mt-7 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">5</p>
                <p className="mt-0.5 text-xs text-slate-500">Đề thực hành robot</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">7</p>
                <p className="mt-0.5 text-xs text-slate-500">Trạm nhiệm vụ / sa bàn</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {completedQuizzesCount}/5
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Đề đạt chuẩn ≥ 70đ</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-blue-600 tabular-nums">
                  {overallBest !== null ? `${overallBest}đ` : '—'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Điểm cao nhất</p>
              </div>
            </div>
          </div>

          {/* Right Highlight Card: Live Preview of Đề 1 Mat */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-800">Sa bàn thi đấu 216 × 120 cm</span>
                <span className="font-mono tabular-nums">18.00 px/cm · 13 tuyến line</span>
              </div>
              <div className="mt-3">
                <MiniMatPreview quiz={ROBOT_QUIZZES[0]} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600">
              <span>Xanh dương: 7 trạm nhiệm vụ · Đỏ: 3 vật cản · Vàng: Xuất phát 2026</span>
            </div>
          </div>
        </section>

        {/* 5 Exercises Catalog */}
        <section id="danh-sach-de" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Danh sách 5 bài Robot Quiz Enjoy AI 2026
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Mỗi đề có tọa độ, góc xoay trạm nhiệm vụ, vị trí vật cản hoặc bộ lệnh điều khiển riêng biệt.
              </p>
            </div>

            {/* Interactive Segmented Filter */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
              <button
                type="button"
                onClick={() => setPackFilter('all')}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  packFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả (5)
              </button>
              <button
                type="button"
                onClick={() => setPackFilter('enjoy-ai')}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  packFilter === 'enjoy-ai'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bộ lệnh Enjoy AI (4)
              </button>
              <button
                type="button"
                onClick={() => setPackFilter('patrol-line')}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  packFilter === 'patrol-line'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Patrol Line · Bảo Nam (1)
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredQuizzes.map((quiz, idx) => {
              const stats = getQuizStats(attempts, quiz.slug);
              const cmdCount = quiz.commandPack === 'patrol-line' ? 13 : 10;

              return (
                <article
                  key={quiz.slug}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700">
                        0{idx + 1}. {quiz.commandPackTitle}
                      </span>
                      <span className="tabular-nums">{cmdCount} lệnh · 7 trạm</span>
                    </div>

                    <h3 className="mt-2 text-lg font-bold text-slate-900">{quiz.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {quiz.changesSummary}
                    </p>

                    <div className="mt-4">
                      <MiniMatPreview quiz={quiz} />
                    </div>

                    <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {quiz.durationMinutes} phút
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {stats.attemptCount > 0 ? `${stats.attemptCount} lượt làm` : 'Chưa có lượt làm'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={stats.bestScore !== null ? 'font-semibold text-emerald-700' : ''}>
                        {stats.bestScore !== null ? `Cao nhất: ${stats.bestScore}/100` : 'Chưa có điểm'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => onStartQuiz(quiz.slug)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
                    >
                      Bắt đầu thử thách
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewQuiz(quiz)}
                      className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Chi tiết
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Command Packs Reference */}
        <section id="bo-lenh" className="mt-14 border-t border-slate-200 pt-10">
          <h2 className="text-xl font-bold text-slate-900">Hai bộ lệnh chuẩn trong 5 đề thi</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ngoài 7 khối Nhiệm vụ tự động, mỗi đề hỗ trợ bộ khối điều khiển chuyên biệt sát sân thi thực tế.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Cpu className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bộ lệnh Enjoy AI (10 lệnh)</h3>
                  <p className="text-xs text-slate-500">Áp dụng cho Đề 1, Đề 2, Đề 3 và Đề 4</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                Gồm 8 khối <strong>MyBlock</strong> (FLL Left/Right/T Stop, bám line theo khoảng
                cách & thời gian, Move Distance, Turn Left/Right) và 2 khối <strong>Motion</strong>{' '}
                (Motor Rotate Angle, Motor Run Duration).
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Bộ lệnh Patrol Line · Bảo Nam (13 lệnh)
                  </h3>
                  <p className="text-xs text-slate-500">Áp dụng cho Enjoy AI 2026 - Đề 2 - Bảo Nam</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                Bộ lệnh WhalesBot chuyên sâu gồm khởi tạo bánh Mecanum 4 động cơ, hiệu chuẩn đen/trắng,
                bám vạch ngã rẽ với thời gian vượt giao lộ (Rush Time), chạy động cơ theo thời gian,
                góc quay và ngưỡng cảm biến quang.
              </p>
            </div>
          </div>
        </section>

        {/* Attempt History */}
        <section id="lich-su" className="mt-14 border-t border-slate-200 pt-10 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Lịch sử nộp bài gần đây</h2>
              <p className="mt-1 text-sm text-slate-600">
                Kết quả lưu trực tiếp trên trình duyệt để bạn theo dõi tiến độ qua từng lần tối ưu chiến thuật.
              </p>
            </div>
          </div>

          {attempts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Chưa có bài nộp nào. Chọn một trong 5 đề ở trên, lắp ghép khối lệnh và nhấn{' '}
              <strong className="text-slate-800">Nộp bài</strong> để ghi nhận điểm số.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Đề thi</th>
                    <th className="px-4 py-3 font-semibold">Thí sinh</th>
                    <th className="px-4 py-3 font-semibold">Nhiệm vụ</th>
                    <th className="px-4 py-3 font-semibold">Khối lệnh</th>
                    <th className="px-4 py-3 font-semibold">Điểm số</th>
                    <th className="px-4 py-3 font-semibold">Thời điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.slice(0, 10).map((att, i) => {
                    const q = ROBOT_QUIZZES.find((x) => x.slug === att.quizSlug);
                    return (
                      <tr key={`${att.timestamp}-${i}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {q?.title || att.quizSlug}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{att.studentName || 'Thí sinh tự do'}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                          {att.completedMissions}/{att.totalMissions}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                          {att.commandCount}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold tabular-nums">
                          <span className={att.score >= 70 ? 'text-emerald-700' : 'text-amber-700'}>
                            {att.score}/100
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 tabular-nums">
                          {new Date(att.timestamp).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Pre-Start Briefing Modal (matches reference preview card) */}
      {previewQuiz && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="briefing-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <div className="md:col-span-7">
                <p className="text-xs font-semibold text-blue-600">Robot Mission Runtime</p>
                <h2 id="briefing-title" className="mt-1 text-2xl font-extrabold text-slate-900">
                  {previewQuiz.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {previewQuiz.description}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-xl bg-blue-50/70 p-3">
                    <p className="text-lg font-extrabold text-blue-700 tabular-nums">
                      {previewQuiz.commandPack === 'patrol-line' ? 13 : 10}
                    </p>
                    <p className="text-[11px] text-slate-600">Lệnh khả dụng</p>
                  </div>
                  <div className="rounded-xl bg-teal-50/70 p-3">
                    <p className="text-lg font-extrabold text-teal-700 tabular-nums">
                      {previewQuiz.durationMinutes}p
                    </p>
                    <p className="text-[11px] text-slate-600">Thời gian thi</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 p-3">
                    <p className="text-lg font-extrabold text-emerald-700 tabular-nums">7</p>
                    <p className="text-[11px] text-slate-600">Trạm nhiệm vụ</p>
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="student-name-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Họ tên thí sinh (tùy chọn)
                  </label>
                  <input
                    id="student-name-input"
                    type="text"
                    value={studentName}
                    onChange={(e) => onChangeStudentName(e.target.value)}
                    placeholder="Nhập họ tên để lưu bảng điểm"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between md:col-span-5">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Bố cục sa bàn đề này</p>
                  <div className="mt-2">
                    <MiniMatPreview quiz={previewQuiz} />
                  </div>
                  <ul className="mt-3 space-y-1 text-[11px] text-slate-600">
                    {previewQuiz.missions.map((m) => (
                      <li key={m.id} className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                          <CheckCircle2 className="h-3 w-3 text-blue-500" />
                          {m.label}
                        </span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          cạnh {m.interactionEdge} · {m.rotation}°
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setPreviewQuiz(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const slug = previewQuiz.slug;
                  setPreviewQuiz(null);
                  onStartQuiz(slug);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Trophy className="h-3.5 w-3.5" />
                Bắt đầu làm bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
