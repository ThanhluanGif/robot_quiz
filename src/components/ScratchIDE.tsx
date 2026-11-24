import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getCategoriesForQuiz, getCommandsForQuiz } from '../data/commands';
import { BlockCategory, CommandDefinition, ProgramBlock, QuizDefinition } from '../types/robotics';

interface ScratchIDEProps {
  quiz: QuizDefinition;
  blocks: ProgramBlock[];
  activeBlockId: string | null;
  completedMissionIds: string[];
  isRunning: boolean;
  onChangeBlocks: (next: ProgramBlock[]) => void;
  onLoadSample: () => void;
}

function createBlockFromDef(def: CommandDefinition): ProgramBlock {
  const values: Record<string, number | string> = {};
  for (const p of def.params) {
    values[p.key] = p.default;
  }
  return {
    instanceId: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    commandKey: def.key,
    values,
  };
}

export const ScratchIDE: React.FC<ScratchIDEProps> = ({
  quiz,
  blocks,
  activeBlockId,
  completedMissionIds,
  isRunning,
  onChangeBlocks,
  onLoadSample,
}) => {
  const categories = useMemo(() => getCategoriesForQuiz(quiz), [quiz]);
  const allCommands = useMemo(() => getCommandsForQuiz(quiz), [quiz]);
  const commandMap = useMemo(
    () => new Map(allCommands.map((c) => [c.key, c])),
    [allCommands]
  );

  const [selectedCategory, setSelectedCategory] = useState<BlockCategory>('Nhiệm vụ');
  const [zoom, setZoom] = useState<number>(100);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ensure selected category stays valid when switching between Enjoy AI and Patrol Line quizzes
  const activeCat = categories.some((c) => c.id === selectedCategory)
    ? selectedCategory
    : categories[0].id;

  const visibleToolbox = useMemo(
    () => allCommands.filter((c) => c.category === activeCat),
    [allCommands, activeCat]
  );

  const completedSet = useMemo(() => new Set(completedMissionIds), [completedMissionIds]);

  const flashNote = (msg: string) => {
    setStatusNote(msg);
    window.setTimeout(() => setStatusNote(null), 2200);
  };

  const handleAppendBlock = (def: CommandDefinition) => {
    if (isRunning) return;
    onChangeBlocks([...blocks, createBlockFromDef(def)]);
  };

  const handleUpdateParam = (instanceId: string, key: string, value: number | string) => {
    if (isRunning) return;
    onChangeBlocks(
      blocks.map((b) =>
        b.instanceId === instanceId ? { ...b, values: { ...b.values, [key]: value } } : b
      )
    );
  };

  const handleRemoveBlock = (instanceId: string) => {
    if (isRunning) return;
    onChangeBlocks(blocks.filter((b) => b.instanceId !== instanceId));
  };

  const handleDuplicateBlock = (index: number) => {
    if (isRunning) return;
    const orig = blocks[index];
    const copy: ProgramBlock = {
      ...orig,
      instanceId: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      values: { ...orig.values },
    };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onChangeBlocks(next);
  };

  const handleMoveBlock = (index: number, delta: -1 | 1) => {
    if (isRunning) return;
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChangeBlocks(next);
  };

  const handleExportJson = () => {
    const payload = {
      quizSlug: quiz.slug,
      quizTitle: quiz.title,
      exportedAt: new Date().toISOString(),
      blocks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.slug}-program.json`;
    a.click();
    URL.revokeObjectURL(url);
    flashNote('Đã lưu chương trình JSON');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rawBlocks: unknown[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.blocks)
            ? parsed.blocks
            : [];
        const valid = rawBlocks
          .filter(
            (b): b is ProgramBlock =>
              typeof b === 'object' &&
              b !== null &&
              typeof (b as ProgramBlock).commandKey === 'string' &&
              commandMap.has((b as ProgramBlock).commandKey)
          )
          .map((b, i) => ({
            instanceId: `imp_${Date.now()}_${i}`,
            commandKey: b.commandKey,
            values: b.values || {},
          }));
        if (valid.length === 0) {
          flashNote('Tệp không có khối lệnh hợp lệ cho đề này');
        } else {
          onChangeBlocks(valid);
          flashNote(`Đã nhập ${valid.length} khối lệnh`);
        }
      } catch {
        flashNote('Lỗi đọc tệp JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDropOnWorkspace = (e: React.DragEvent, dropIndex?: number) => {
    e.preventDefault();
    if (isRunning) return;
    const newCmdKey = e.dataTransfer.getData('application/x-robot-cmd');
    if (newCmdKey) {
      const def = commandMap.get(newCmdKey);
      if (!def) return;
      const created = createBlockFromDef(def);
      const next = [...blocks];
      if (dropIndex !== undefined) next.splice(dropIndex, 0, created);
      else next.push(created);
      onChangeBlocks(next);
      return;
    }

    if (dragIndex !== null && dropIndex !== undefined && dragIndex !== dropIndex) {
      const next = [...blocks];
      const [moved] = next.splice(dragIndex, 1);
      const insertAt = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
      next.splice(insertAt, 0, moved);
      onChangeBlocks(next);
    }
    setDragIndex(null);
  };

  const libraryCount = allCommands.filter((c) => c.category !== 'Nhiệm vụ').length;

  return (
    <section
      className="flex h-full min-h-[540px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
      aria-label="Robot Scratch IDE"
    >
      {/* IDE Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <span className="font-mono text-xs font-bold">{'{}'}</span>
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight text-slate-900">Robot Scratch IDE</h2>
            <p className="text-xs text-slate-500 tabular-nums">
              {libraryCount} lệnh · Classroom
              {statusNote ? ` · ${statusNote}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom Controls */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(70, z - 10))}
              aria-label="Thu nhỏ khối lệnh"
              className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-slate-900"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              aria-label="Đặt lại tỉ lệ 100%"
              className="px-1.5 text-xs font-semibold text-slate-700 tabular-nums hover:text-slate-900"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(120, z + 10))}
              aria-label="Phóng to khối lệnh"
              className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-slate-900"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            Nhập
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Download className="h-3.5 w-3.5" />
            Lưu
          </button>
          <button
            type="button"
            onClick={() => onChangeBlocks([])}
            disabled={isRunning || blocks.length === 0}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-45"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa
          </button>
        </div>
      </div>

      {/* Main Split: Category Tabs | Block Flyout | Dotted Workspace Canvas */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Category Rail */}
        <nav
          aria-label="Danh mục khối lệnh"
          className="flex w-[86px] shrink-0 flex-col border-r border-slate-200 bg-white py-2"
        >
          {categories.map((cat) => {
            const active = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative flex flex-col items-start gap-0.5 px-2.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
                style={active ? { backgroundColor: cat.color } : undefined}
              >
                {!active && (
                  <span
                    className="absolute inset-y-1.5 left-0 w-1 rounded-r"
                    style={{ backgroundColor: cat.color }}
                  />
                )}
                <span className="leading-tight">{cat.label}</span>
                <span
                  className={`text-[10px] font-medium tabular-nums ${
                    active ? 'text-white/85' : 'text-slate-400'
                  }`}
                >
                  {cat.count} khối
                </span>
              </button>
            );
          })}
        </nav>

        {/* Toolbox Flyout */}
        <div className="w-[230px] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-100/90 p-2.5">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-slate-500">
              Nhấn hoặc kéo sang phải
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {visibleToolbox.map((def) => {
              const isDoneMission = def.missionId && completedSet.has(def.missionId);
              return (
                <button
                  key={def.key}
                  type="button"
                  draggable={!isRunning}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-robot-cmd', def.key);
                  }}
                  onClick={() => handleAppendBlock(def)}
                  disabled={isRunning}
                  title={def.description}
                  className="group relative w-full cursor-grab rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-white shadow-xs transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: isDoneMission ? '#059669' : def.color,
                    boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.16)',
                  }}
                >
                  {/* Scratch top & bottom puzzle notch visual */}
                  <span
                    className="pointer-events-none absolute -top-0.5 left-4 h-1 w-6 rounded-b-sm bg-slate-100/90"
                    aria-hidden="true"
                  />
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="leading-snug">{def.displayName}</span>
                    <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-75 transition-opacity group-hover:opacity-100" />
                  </div>
                  {def.params.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {def.params.slice(0, 3).map((p) => (
                        <span
                          key={p.key}
                          className="rounded bg-black/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/95"
                        >
                          {p.label}: {p.default}
                          {p.unit || ''}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dotted Workspace Canvas */}
        <div
          className="scratch-grid-bg relative flex-1 overflow-auto p-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDropOnWorkspace(e)}
          data-testid="scratch-workspace"
        >
          <div
            className="origin-top-left transition-transform duration-150"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {/* Golden Hat Block: When Start Clicked */}
            <div className="inline-flex flex-col items-start">
              <div
                className="relative min-w-[196px] rounded-t-[20px] rounded-b-lg px-4 py-3 text-sm font-bold text-white shadow-sm"
                style={{
                  backgroundColor: '#f59e0b',
                  boxShadow: 'inset 0 -3px 0 rgba(180, 83, 9, 0.35)',
                }}
              >
                When Start Clicked
                <span
                  className="pointer-events-none absolute -bottom-1.5 left-5 h-2 w-7 rounded-b-md"
                  style={{ backgroundColor: '#f59e0b' }}
                  aria-hidden="true"
                />
              </div>

              {/* Snapped Program Stack */}
              <div className="mt-0.5 flex flex-col items-start">
                {blocks.length === 0 ? (
                  <div className="mt-4 max-w-[300px] rounded-xl border border-dashed border-slate-300 bg-white/90 p-4 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Chưa có khối lệnh nào</p>
                    <p className="mt-1 leading-relaxed text-slate-500">
                      Chọn khối từ danh mục bên trái để lắp ghép vào chuỗi chạy của robot, hoặc nạp
                      nhanh chương trình mẫu để quan sát chiến thuật hoàn thành 7/7 trạm.
                    </p>
                    <button
                      type="button"
                      onClick={onLoadSample}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Nạp bài mẫu (7/7 trạm)
                    </button>
                  </div>
                ) : (
                  blocks.map((block, index) => {
                    const def = commandMap.get(block.commandKey);
                    if (!def) return null;
                    const isActive = activeBlockId === block.instanceId;
                    const isMissionDone = def.missionId && completedSet.has(def.missionId);

                    return (
                      <div
                        key={block.instanceId}
                        draggable={!isRunning}
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.stopPropagation();
                          handleDropOnWorkspace(e, index);
                        }}
                        className={`group relative mb-0.5 flex flex-wrap items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white transition-all ${
                          isActive
                            ? 'z-10 ring-4 ring-amber-300 ring-offset-1'
                            : 'hover:brightness-[1.03]'
                        }`}
                        style={{
                          backgroundColor: isMissionDone ? '#059669' : def.color,
                          boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.18)',
                          minWidth: '250px',
                        }}
                      >
                        {/* Step number */}
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/20 font-mono text-[10px] font-bold tabular-nums">
                          {index + 1}
                        </span>

                        {/* Block label */}
                        <span className="whitespace-nowrap">{def.displayName}</span>

                        {/* Inline editable parameter inputs */}
                        {def.params.map((p) => {
                          const currentVal = block.values[p.key] ?? p.default;
                          if (p.type === 'dropdown' && p.options) {
                            return (
                              <label
                                key={p.key}
                                className="inline-flex items-center gap-1 rounded-md bg-black/15 px-1.5 py-0.5 text-[11px]"
                              >
                                <span className="opacity-85">{p.label}</span>
                                <select
                                  aria-label={`${def.displayName} ${p.label}`}
                                  disabled={isRunning}
                                  value={String(currentVal)}
                                  onChange={(e) =>
                                    handleUpdateParam(block.instanceId, p.key, e.target.value)
                                  }
                                  className="rounded bg-white px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-900 focus:outline-none"
                                >
                                  {p.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            );
                          }
                          return (
                            <label
                              key={p.key}
                              className="inline-flex items-center gap-1 rounded-md bg-black/15 px-1.5 py-0.5 text-[11px]"
                            >
                              <span className="opacity-85">{p.label}</span>
                              <input
                                type="number"
                                aria-label={`${def.displayName} ${p.label}`}
                                disabled={isRunning}
                                value={currentVal}
                                min={p.min}
                                max={p.max}
                                step={p.step || 1}
                                onChange={(e) =>
                                  handleUpdateParam(
                                    block.instanceId,
                                    p.key,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-14 rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-900 tabular-nums focus:outline-none"
                              />
                              {p.unit && <span className="opacity-85">{p.unit}</span>}
                            </label>
                          );
                        })}

                        {/* Quick edit actions */}
                        {!isRunning && (
                          <div className="ml-auto flex items-center gap-0.5 pl-2 opacity-80 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleMoveBlock(index, -1)}
                              disabled={index === 0}
                              aria-label={`Di chuyển khối ${index + 1} lên`}
                              className="rounded p-1 hover:bg-black/20 disabled:opacity-35"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveBlock(index, 1)}
                              disabled={index === blocks.length - 1}
                              aria-label={`Di chuyển khối ${index + 1} xuống`}
                              className="rounded p-1 hover:bg-black/20 disabled:opacity-35"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateBlock(index)}
                              aria-label={`Nhân bản khối ${index + 1}`}
                              className="rounded p-1 hover:bg-black/20"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBlock(block.instanceId)}
                              aria-label={`Xóa khối ${index + 1}`}
                              className="rounded p-1 hover:bg-black/25"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {/* Bottom interlocking notch */}
                        <span
                          className="pointer-events-none absolute -bottom-1.5 left-5 h-2 w-7 rounded-b-md"
                          style={{
                            backgroundColor: isMissionDone ? '#059669' : def.color,
                          }}
                          aria-hidden="true"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
