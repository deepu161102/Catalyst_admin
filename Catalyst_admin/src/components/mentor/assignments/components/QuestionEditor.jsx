// ============================================================
// QUESTION EDITOR MODAL
// Full-screen modal for creating / editing a single SAT question.
// Correct answer + explanation are mentor-only (hidden from students).
// ============================================================

import { useState } from 'react';
import RichTextEditor from './RichTextEditor';

const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

// ── Helper: choice row ───────────────────────────────────────
function ChoiceRow({ letter, value, isCorrect, onChange, onMarkCorrect }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Letter badge */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 text-white transition-colors"
        style={{ background: isCorrect ? '#10b981' : '#d1d5db' }}
      >
        {letter}
      </div>

      {/* Text input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Choice ${letter}`}
        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
      />

      {/* Mark correct button */}
      <button
        type="button"
        title="Mark as correct answer"
        onClick={onMarkCorrect}
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all shrink-0 font-bold ${
          isCorrect
            ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300'
            : 'bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500'
        }`}
      >
        {isCorrect ? '✓' : '○'}
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function QuestionEditor({ question: initial, sectionMeta, onSave, onClose }) {
  const [q, setQ] = useState({ ...initial });

  const set = (key, value) => setQ((prev) => ({ ...prev, [key]: value }));
  const setChoice = (letter, value) =>
    setQ((prev) => ({ ...prev, choices: { ...prev.choices, [letter]: value } }));

  const isValid =
    q.title.trim().length > 0 &&
    q.correctAnswer !== '' &&
    CHOICE_LABELS.every((l) => q.choices[l].trim().length > 0);

  const accent = sectionMeta?.accent || '#4f46e5';
  const bg     = sectionMeta?.bg     || '#eef2ff';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.25)' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0"
          style={{ background: bg }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{sectionMeta?.icon || '📝'}</span>
            <div>
              <h3 className="text-sm font-extrabold" style={{ color: accent }}>
                {initial.title ? 'Edit Question' : 'New Question'}
                {q.number ? ` — #${q.number}` : ''}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{sectionMeta?.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/80 text-gray-500 hover:bg-white hover:text-gray-800 flex items-center justify-center text-sm font-bold transition-colors shadow-sm"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Question title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
              Question Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={q.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Which choice completes the text with the most logical and precise word or phrase?"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
              Topic
            </label>
            <input
              type="text"
              value={q.topic || ''}
              onChange={(e) => set('topic', e.target.value)}
              placeholder="e.g. Linear Equations, Data Analysis, Equivalent Expressions…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Description / passage (rich text) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
                Question Body / Passage
              </label>
              <span className="text-[10px] text-gray-400">Supports images, GIFs, links, formatting</span>
            </div>
            <RichTextEditor
              key={`desc-${q.id}`}
              value={q.description}
              onChange={(v) => set('description', v)}
              placeholder="Paste or type the passage, context, or question body here…"
              minHeight={120}
            />
          </div>

          {/* Answer choices */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
                Answer Choices <span className="text-red-400">*</span>
              </label>
              {q.correctAnswer && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ✓ Correct: {q.correctAnswer}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {CHOICE_LABELS.map((letter) => (
                <ChoiceRow
                  key={letter}
                  letter={letter}
                  value={q.choices[letter]}
                  isCorrect={q.correctAnswer === letter}
                  accentColor={accent}
                  onChange={(v) => setChoice(letter, v)}
                  onMarkCorrect={() => set('correctAnswer', letter)}
                />
              ))}
            </div>
            {!q.correctAnswer && (
              <p className="text-[11px] text-amber-600 font-semibold">
                ○ Click the circle icon next to the correct answer to mark it.
              </p>
            )}
          </div>

          {/* Explanation — mentor-only */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
                Explanation
              </label>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                🔒 Report only — hidden from student during test
              </span>
            </div>
            <RichTextEditor
              key={`exp-${q.id}`}
              value={q.explanation}
              onChange={(v) => set('explanation', v)}
              placeholder="Explain why the correct answer is right. Students see this in their score report after completion."
              minHeight={80}
            />
          </div>

          {/* Score */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
              Points
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={q.score}
                min={0}
                max={100}
                onChange={(e) => set('score', Math.max(0, Number(e.target.value)))}
                className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-[15px] font-extrabold text-center outline-none focus:border-indigo-400 transition-colors"
                style={{ color: accent }}
              />
              <span className="text-sm text-gray-500 font-medium">
                point{q.score !== 1 ? 's' : ''} for this question
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <p className="text-[11px] text-gray-400">
            {isValid ? '✓ Ready to save' : 'Fill title, all choices, and mark the correct answer'}
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => isValid && onSave(q)}
              disabled={!isValid}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: isValid ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : '#9ca3af',
                boxShadow: isValid ? `0 4px 14px ${accent}55` : 'none',
              }}
            >
              Save Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
