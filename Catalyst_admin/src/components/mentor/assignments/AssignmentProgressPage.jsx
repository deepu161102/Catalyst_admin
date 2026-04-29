// ============================================================
// ASSIGNMENT PROGRESS PAGE
// Shows per-student attempt status, scores, and pass/fail for
// a specific published assignment.
// Mentor can drill into any student for a full question-level
// report (with explanations) — these are hidden during the test.
// ============================================================

import { useState, useMemo } from 'react';
import { SECTION_META } from './components/sectionMeta';

function getMasteryLevel(pct) {
  if (pct >= 85) return { label: 'MASTER',       color: '#2563eb', bg: '#dbeafe', bar: '#10b981' };
  if (pct >= 70) return { label: 'ELITE',        color: '#0891b2', bg: '#cffafe', bar: '#06b6d4' };
  if (pct >= 55) return { label: 'EXPERT',       color: '#7c3aed', bg: '#ede9fe', bar: '#8b5cf6' };
  if (pct >= 40) return { label: 'ADVANCED',     color: '#d97706', bg: '#fef3c7', bar: '#f59e0b' };
  if (pct >= 25) return { label: 'INTERMEDIATE', color: '#ea580c', bg: '#ffedd5', bar: '#f97316' };
  return           { label: 'NOVICE',            color: '#ef4444', bg: '#fee2e2', bar: '#d1d5db' };
}

function getTopicGroupName(section, moduleNum) {
  const name = section.name.toLowerCase();
  const isRW = name.includes('reading') || name.includes('writing') || section.id === 'rw';
  if (isRW) return moduleNum === 1 ? 'Writing Mastery' : 'Reading Mastery';
  return 'Mathematics Mastery';
}

function computeTopicMastery(assignment, attempt) {
  const result = {};
  (assignment.sections || []).forEach((section) => {
    const sectionResult = attempt.sectionResults?.find((sr) => sr.sectionId === section.id);
    (section.modules || []).forEach((mod) => {
      const groupName    = getTopicGroupName(section, mod.number);
      const moduleResult = sectionResult?.modules.find((m) => m.moduleNumber === mod.number);
      if (!result[groupName]) result[groupName] = {};
      (mod.questions || []).forEach((q) => {
        const topic = (q.topic || '').trim() || null;
        if (!topic) return;
        if (!result[groupName][topic]) result[groupName][topic] = { correct: 0, total: 0, score: 0, maxScore: 0 };
        const studentAnswer = moduleResult?.answers?.[q.id];
        const isCorrect     = studentAnswer && studentAnswer === q.correctAnswer;
        result[groupName][topic].total++;
        result[groupName][topic].maxScore += (q.score || 1);
        if (isCorrect) { result[groupName][topic].correct++; result[groupName][topic].score += (q.score || 1); }
      });
      if (Object.keys(result[groupName]).length === 0) delete result[groupName];
    });
  });
  return result;
}

// ── Score report modal ────────────────────────────────────────
function StudentReportModal({ attempt, assignment, onClose }) {
  const [view, setView] = useState('questions'); // 'questions' | 'topics'
  const [activeSection, setActiveSection] = useState(
    attempt.sectionResults[0]?.sectionId || 'rw',
  );
  const [activeModule, setActiveModule] = useState(1);

  const topicMastery = useMemo(() => computeTopicMastery(assignment, attempt), [assignment, attempt]);
  const hasTopics    = Object.keys(topicMastery).length > 0;

  const sectionResult = attempt.sectionResults.find((s) => s.sectionId === activeSection);
  const moduleResult  = sectionResult?.modules.find((m) => m.moduleNumber === activeModule);
  const assignSection = assignment.sections.find((s) => s.id === activeSection);
  const assignModule  = assignSection?.modules.find((m) => m.number === activeModule);
  const meta          = SECTION_META[activeSection] || SECTION_META.rw;

  const formatTime = (mins) => {
    if (!mins && mins !== 0) return '—';
    return `${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {attempt.avatar}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">{attempt.studentName}</h3>
              <p className="text-xs text-indigo-300 mt-0.5">
                {attempt.batchName} &nbsp;·&nbsp; Score report
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Overall score badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white">
              <span className="text-sm font-extrabold">
                {attempt.score}/{attempt.maxScore}
              </span>
              <span className="text-[11px] opacity-70">({attempt.percentage}%)</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  attempt.passed ? 'bg-emerald-400 text-white' : 'bg-red-400 text-white'
                }`}
              >
                {attempt.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/15 text-white hover:bg-white/30 flex items-center justify-center text-sm font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div className="shrink-0 border-b border-gray-100 bg-white px-5 pt-3 flex gap-1">
          {[
            { key: 'questions', label: 'Questions' },
            ...(hasTopics ? [{ key: 'topics', label: 'Topic Mastery' }] : []),
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className="px-4 py-1.5 rounded-t-lg text-[12px] font-bold border-b-2 transition-all"
              style={
                view === t.key
                  ? { borderColor: '#4f46e5', color: '#4f46e5', background: '#fff' }
                  : { borderColor: 'transparent', color: '#9ca3af' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Section + module tabs (only in questions view) */}
        <div className={`shrink-0 border-b border-gray-100 bg-gray-50 ${view !== 'questions' ? 'hidden' : ''}`}>
          {/* Section tabs */}
          <div className="flex gap-1 px-5 pt-3">
            {attempt.sectionResults.map((sr) => {
              const m = SECTION_META[sr.sectionId] || {};
              const sScore    = sr.modules.reduce((a, mod) => a + mod.score, 0);
              const sMaxScore = sr.modules.reduce((a, mod) => a + mod.maxScore, 0);
              const active    = activeSection === sr.sectionId;
              return (
                <button
                  key={sr.sectionId}
                  onClick={() => { setActiveSection(sr.sectionId); setActiveModule(1); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-all"
                  style={
                    active
                      ? { borderColor: m.accent, color: m.accent, background: '#fff' }
                      : { borderColor: 'transparent', color: '#9ca3af', background: 'transparent' }
                  }
                >
                  <span>{m.icon}</span>
                  <span>{sr.sectionName}</span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: m.bg, color: m.accent }}
                  >
                    {sScore}/{sMaxScore}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Module tabs */}
          {sectionResult && (
            <div className="flex gap-1 px-5 py-2">
              {sectionResult.modules.map((mod) => {
                const active = activeModule === mod.moduleNumber;
                return (
                  <button
                    key={mod.moduleNumber}
                    onClick={() => setActiveModule(mod.moduleNumber)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                    style={
                      active
                        ? { background: meta.accent, color: '#fff' }
                        : { background: '#f3f4f6', color: '#9ca3af' }
                    }
                  >
                    Module {mod.moduleNumber}
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold"
                      style={
                        active
                          ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                          : { background: '#e5e7eb', color: '#6b7280' }
                      }
                    >
                      {mod.score}/{mod.maxScore}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Topic Mastery view */}
        {view === 'topics' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {Object.entries(topicMastery).map(([groupName, topics]) => (
              <div key={groupName} className="rounded-xl overflow-hidden border border-gray-200">
                <div className="bg-gray-800 px-4 py-3">
                  <p className="text-sm font-bold text-white">{groupName}</p>
                </div>
                <div className="grid grid-cols-[1fr_auto_160px] bg-gray-700 px-4 py-2">
                  <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest">Topics</span>
                  <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest text-center px-6">Mastery Level</span>
                  <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest text-right">Score</span>
                </div>
                {Object.entries(topics).map(([topic, data]) => {
                  const pct     = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0;
                  const mastery = getMasteryLevel(pct);
                  return (
                    <div key={topic} className="grid grid-cols-[1fr_auto_160px] items-center px-4 py-3 border-t border-gray-100 bg-white">
                      <p className="text-[13px] text-gray-700">{topic}</p>
                      <span
                        className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mx-6"
                        style={{ background: mastery.bg, color: mastery.color }}
                      >
                        {mastery.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: mastery.bar }} />
                        </div>
                        {pct > 0 && (
                          <span className="text-[10px] font-bold shrink-0 w-8 text-right" style={{ color: mastery.bar }}>
                            {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Question-level breakdown */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-3 ${view !== 'questions' ? 'hidden' : ''}`}>
          {/* Module meta bar */}
          {moduleResult && assignModule && (
            <div
              className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: meta.bg }}
            >
              <span style={{ color: meta.accent }} className="font-bold">
                Module {activeModule}
              </span>
              <span className="text-gray-500 text-xs">
                ⏱ {formatTime(moduleResult.timeTaken)} / {formatTime(assignModule.timeLimit)} used
              </span>
              <span className="text-gray-500 text-xs">
                ⭐ {moduleResult.score} / {moduleResult.maxScore} pts
              </span>
              <span className="text-gray-500 text-xs">
                {assignModule.questions.length} questions
              </span>
            </div>
          )}

          {/* Questions */}
          {assignModule?.questions.map((q, idx) => {
            const studentAnswer  = moduleResult?.answers?.[q.id];
            const isCorrect      = studentAnswer === q.correctAnswer;
            const notAnswered    = !studentAnswer;

            return (
              <div
                key={q.id}
                className={`rounded-2xl border overflow-hidden ${
                  notAnswered
                    ? 'border-gray-200'
                    : isCorrect
                    ? 'border-emerald-200'
                    : 'border-red-200'
                }`}
              >
                {/* Question header */}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: notAnswered
                      ? '#f9fafb'
                      : isCorrect
                      ? '#f0fdf4'
                      : '#fff1f2',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                    style={{ background: notAnswered ? '#9ca3af' : isCorrect ? '#10b981' : '#ef4444' }}
                  >
                    {q.number || idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-semibold truncate"
                      style={{
                        color: notAnswered ? '#6b7280' : isCorrect ? '#065f46' : '#991b1b',
                      }}
                    >
                      {q.title || 'Untitled question'}
                    </p>
                    {q.topic && (
                      <span className="inline-flex mt-0.5 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                        {q.topic}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {notAnswered ? (
                      <span className="text-[11px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                        Not attempted
                      </span>
                    ) : isCorrect ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✓ Correct · +{q.score || 1} pt{(q.score || 1) !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        ✗ Wrong · 0 pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 py-4 bg-white space-y-3">
                  {/* Question description */}
                  {q.description && (
                    <div
                      className="text-[13px] text-gray-700 leading-relaxed border-l-2 pl-3 border-gray-200"
                      dangerouslySetInnerHTML={{ __html: q.description }}
                    />
                  )}

                  {/* Choices */}
                  <div className="grid grid-cols-1 gap-1.5">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const isStudentAnswer = studentAnswer === letter;
                      const isAnswerKey     = q.correctAnswer === letter;
                      let bg = '#f9fafb', border = '#e5e7eb', color = '#374151';
                      if (isStudentAnswer && isAnswerKey)  { bg = '#f0fdf4'; border = '#6ee7b7'; color = '#065f46'; }
                      else if (isStudentAnswer && !isAnswerKey) { bg = '#fff1f2'; border = '#fca5a5'; color = '#991b1b'; }
                      else if (!isStudentAnswer && isAnswerKey) { bg = '#f0fdf4'; border = '#a7f3d0'; color = '#065f46'; }

                      return (
                        <div
                          key={letter}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl border"
                          style={{ background: bg, borderColor: border }}
                        >
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-extrabold shrink-0"
                            style={{ background: border, color }}
                          >
                            {letter}
                          </div>
                          <span className="text-[13px] flex-1" style={{ color }}>
                            {q.choices[letter] || '—'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isStudentAnswer && (
                              <span className="text-[10px] font-bold" style={{ color }}>
                                Student
                              </span>
                            )}
                            {isAnswerKey && (
                              <span className="text-[10px] font-extrabold text-emerald-600">
                                ✓ Key
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation — always shown in report */}
                  {q.explanation && (
                    <div className="flex gap-2.5 p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-base shrink-0">💡</span>
                      <div>
                        <p className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wide mb-1">
                          Explanation
                        </p>
                        <div
                          className="text-[12px] text-amber-800 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: q.explanation }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(!assignModule || assignModule.questions.length === 0) && (
            <div className="text-center py-12 text-gray-400 text-sm">
              No questions in this module.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Attempt row ───────────────────────────────────────────────
function AttemptRow({ attempt, onViewReport }) {
  const statusMeta = {
    completed:   { label: 'Completed',   dot: '#10b981', bg: '#f0fdf4', color: '#065f46' },
    in_progress: { label: 'In Progress', dot: '#f59e0b', bg: '#fffbeb', color: '#92400e' },
    not_started: { label: 'Not Started', dot: '#9ca3af', bg: '#f9fafb', color: '#6b7280' },
  };
  const sm = statusMeta[attempt.status] || statusMeta.not_started;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
        {attempt.avatar || attempt.studentName.slice(0, 2).toUpperCase()}
      </div>

      {/* Student info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-bold text-gray-900">{attempt.studentName}</p>
          <span className="text-[11px] text-gray-400">{attempt.batchName}</span>
        </div>
        {attempt.status === 'completed' && (
          <div className="flex items-center gap-2 mt-1.5">
            {/* Progress bar */}
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${attempt.percentage}%`,
                  background: attempt.passed ? '#10b981' : '#ef4444',
                }}
              />
            </div>
            <span className="text-xs font-bold text-gray-600">{attempt.percentage}%</span>
            <span className="text-xs text-gray-400">
              {attempt.score}/{attempt.maxScore} pts
            </span>
          </div>
        )}
        {attempt.completedAt && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            Completed {new Date(attempt.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Status + result */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: sm.bg, color: sm.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sm.dot }} />
          {sm.label}
        </span>
        {attempt.status === 'completed' && (
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
              attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {attempt.passed ? '✓ Pass' : '✗ Fail'}
          </span>
        )}
        {attempt.status === 'completed' && (
          <button
            onClick={() => onViewReport(attempt)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            View Report
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AssignmentProgressPage({ assignment, onBack }) {
  const [filter, setFilter]    = useState('all');
  const [reportFor, setReportFor] = useState(null);

  const attempts = assignment.attempts || [];

  // ── Aggregate stats ───────────────────────────────────────
  const total      = attempts.length;
  const attempted  = attempts.filter((a) => a.status !== 'not_started').length;
  const completed  = attempts.filter((a) => a.status === 'completed').length;
  const passed     = attempts.filter((a) => a.passed).length;
  const avgPct     = completed > 0
    ? Math.round(attempts.filter((a) => a.status === 'completed').reduce((s, a) => s + a.percentage, 0) / completed)
    : 0;

  // ── Filter ────────────────────────────────────────────────
  const filtered = filter === 'all'
    ? attempts
    : attempts.filter((a) => a.status === filter || (filter === 'passed' && a.passed) || (filter === 'failed' && a.status === 'completed' && !a.passed));

  const counts = {
    all:         total,
    completed:   completed,
    in_progress: attempts.filter((a) => a.status === 'in_progress').length,
    not_started: attempts.filter((a) => a.status === 'not_started').length,
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/60 fade-in">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-semibold transition-colors shrink-0"
        >
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-extrabold text-gray-900 truncate">{assignment.title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Assignment progress &nbsp;·&nbsp;
            {assignment.dueDate && `Due ${new Date(assignment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-700 shrink-0">
          ✓ Published
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: '👥', value: total,      label: 'Enrolled',    color: '#4f46e5' },
            { icon: '📝', value: attempted,  label: 'Attempted',   color: '#f59e0b' },
            { icon: '✅', value: completed,  label: 'Completed',   color: '#10b981' },
            { icon: '🎯', value: passed,     label: 'Passed',      color: '#059669' },
            { icon: '📊', value: `${avgPct}%`, label: 'Avg Score', color: '#7c3aed' },
          ].map(({ icon, value, label, color }) => (
            <div key={label} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-4 border border-gray-200">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: color + '15' }}>
                {icon}
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900 leading-none">{value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section score summary ── */}
        {completed > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">
                Average by Section
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {assignment.sections.map((section) => {
                const meta = SECTION_META[section.id] || {};
                const completedAttempts = attempts.filter((a) => a.status === 'completed');
                const sectionScores = completedAttempts.map((a) => {
                  const sr = a.sectionResults?.find((s) => s.sectionId === section.id);
                  if (!sr) return null;
                  const score    = sr.modules.reduce((x, m) => x + m.score, 0);
                  const maxScore = sr.modules.reduce((x, m) => x + m.maxScore, 0);
                  return maxScore > 0 ? (score / maxScore) * 100 : 0;
                }).filter(Boolean);
                const avgSection = sectionScores.length > 0
                  ? Math.round(sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length)
                  : 0;

                return (
                  <div key={section.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="text-lg shrink-0">{meta.icon}</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-gray-700">{section.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${avgSection}%`, background: meta.accent }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-600 shrink-0" style={{ color: meta.accent }}>
                          {avgSection}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {section.modules.map((mod) => {
                        const modScores = completedAttempts.map((a) => {
                          const sr = a.sectionResults?.find((s) => s.sectionId === section.id);
                          const mr = sr?.modules.find((m) => m.moduleNumber === mod.number);
                          return mr ? { s: mr.score, m: mr.maxScore } : null;
                        }).filter(Boolean);
                        const avgMod = modScores.length > 0
                          ? Math.round(modScores.reduce((a, x) => a + x.s, 0) / modScores.length)
                          : 0;
                        const maxMod = modScores[0]?.m || 0;
                        return (
                          <p key={mod.id} className="text-[11px] text-gray-400">
                            M{mod.number}: {avgMod}/{maxMod} avg
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { key: 'all',         label: `All (${counts.all})` },
            { key: 'completed',   label: `Completed (${counts.completed})` },
            { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
            { key: 'not_started', label: `Not Started (${counts.not_started})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap ${
                filter === t.key
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Attempt list ── */}
        {attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-3">👥</span>
            <h3 className="text-base font-extrabold text-gray-700 mb-1">No students enrolled yet</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Go back and use "Enroll Batch" to add a batch of students to this assignment.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No students in this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((attempt) => (
              <AttemptRow
                key={attempt.studentId}
                attempt={attempt}
                assignment={assignment}
                onViewReport={setReportFor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Report modal */}
      {reportFor && (
        <StudentReportModal
          attempt={reportFor}
          assignment={assignment}
          onClose={() => setReportFor(null)}
        />
      )}
    </div>
  );
}
