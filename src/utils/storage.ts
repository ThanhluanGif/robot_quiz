import { ProgramBlock, QuizAttemptRecord } from '../types/robotics';

const PROGRAM_PREFIX = 'enjoy_ai_2026_program_';
const ATTEMPTS_KEY = 'enjoy_ai_2026_attempts_v1';
const STUDENT_KEY = 'enjoy_ai_2026_student_v1';

export function loadSavedProgram(quizSlug: string): ProgramBlock[] | null {
  try {
    const raw = localStorage.getItem(PROGRAM_PREFIX + quizSlug);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveProgram(quizSlug: string, blocks: ProgramBlock[]): void {
  try {
    localStorage.setItem(PROGRAM_PREFIX + quizSlug, JSON.stringify(blocks));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadAttempts(): QuizAttemptRecord[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordAttempt(attempt: QuizAttemptRecord): QuizAttemptRecord[] {
  const existing = loadAttempts();
  const next = [attempt, ...existing].slice(0, 100);
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
  return next;
}

export function getQuizStats(attempts: QuizAttemptRecord[], quizSlug: string): {
  attemptCount: number;
  bestScore: number | null;
  avgScore: number | null;
} {
  const matching = attempts.filter((a) => a.quizSlug === quizSlug);
  if (matching.length === 0) {
    return { attemptCount: 0, bestScore: null, avgScore: null };
  }
  const bestScore = Math.max(...matching.map((a) => a.score));
  const avgScore = Math.round(matching.reduce((s, a) => s + a.score, 0) / matching.length);
  return { attemptCount: matching.length, bestScore, avgScore };
}

export function loadStudentName(): string {
  try {
    return localStorage.getItem(STUDENT_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStudentName(name: string): void {
  try {
    localStorage.setItem(STUDENT_KEY, name);
  } catch {
    // Ignore
  }
}
