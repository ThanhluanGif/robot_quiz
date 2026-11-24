import { useCallback, useState } from 'react';
import { QuizHub } from './components/QuizHub';
import { WorkspaceView } from './components/WorkspaceView';
import { getQuizBySlug, ROBOT_QUIZZES } from './data/quizzes';
import { QuizAttemptRecord } from './types/robotics';
import {
  loadAttempts,
  loadStudentName,
  recordAttempt,
  saveStudentName,
} from './utils/storage';

function resolveInitialQuizSlug(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const quizParam = params.get('quiz');
    if (quizParam && ROBOT_QUIZZES.some((q) => q.slug === quizParam)) {
      return quizParam;
    }
    if (params.get('autostart') === '1') {
      return ROBOT_QUIZZES[0].slug;
    }
  } catch {
    // ignore
  }
  return null;
}

export default function App() {
  const [activeQuizSlug, setActiveQuizSlug] = useState<string | null>(() =>
    resolveInitialQuizSlug()
  );
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>(() => loadAttempts());
  const [studentName, setStudentName] = useState<string>(() => loadStudentName());

  const handleChangeStudentName = useCallback((name: string) => {
    setStudentName(name);
    saveStudentName(name);
  }, []);

  const handleRecordAttempt = useCallback((attempt: QuizAttemptRecord) => {
    setAttempts(recordAttempt(attempt));
  }, []);

  if (activeQuizSlug) {
    const quiz = getQuizBySlug(activeQuizSlug);
    return (
      <WorkspaceView
        quiz={quiz}
        studentName={studentName}
        onExit={() => setActiveQuizSlug(null)}
        onSwitchQuiz={(slug) => setActiveQuizSlug(slug)}
        onRecordAttempt={handleRecordAttempt}
      />
    );
  }

  return (
    <QuizHub
      attempts={attempts}
      studentName={studentName}
      onChangeStudentName={handleChangeStudentName}
      onStartQuiz={(slug) => setActiveQuizSlug(slug)}
    />
  );
}
