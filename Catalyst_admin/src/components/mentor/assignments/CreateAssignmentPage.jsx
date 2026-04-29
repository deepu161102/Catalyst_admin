// ============================================================
// CREATE / EDIT ASSIGNMENT PAGE
// Multi-step SAT digital assignment builder.
//
// Steps:
//   1. Assignment Info   — title, description, due date, students
//   2. SAT Structure     — configure section/module time limits
//   3. Add Questions     — build question bank (SectionBuilder)
//   4. Rules & Scoring   — pass %, custom rules
//   5. Review & Publish  — summary + publish action
// ============================================================

import { useState } from 'react';
import SectionBuilder from './components/SectionBuilder';
import { SECTION_META } from './components/sectionMeta';

// ── Step metadata ────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Assignment Info',  icon: '📋', desc: 'Title & details' },
  { num: 2, label: 'SAT Structure',    icon: '🏗',  desc: 'Sections & modules' },
  { num: 3, label: 'Add Questions',    icon: '📝',  desc: 'Build question bank' },
  { num: 4, label: 'Rules & Scoring',  icon: '⚙️',  desc: 'Pass criteria' },
  { num: 5, label: 'Review & Publish', icon: '🚀',  desc: 'Final check' },
];

// ── Utility: compute totals ───────────────────────────────────
function computeTotals(data) {
  let totalQ = 0;
  let totalScore = 0;
  for (const section of data.sections) {
    for (const mod of section.modules) {
      totalQ += mod.questions.length;
      totalScore += mod.questions.reduce((a, q) => a + (q.score || 1), 0);
    }
  }
  return { totalQ, totalScore };
}

// ════════════════════════════════════════════════════════════
// STEP 1 — Assignment Info
// ════════════════════════════════════════════════════════════
function StepInfo({ data, onChange, opsMode }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      <div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-1">
          {opsMode ? 'Explore Test Details' : 'Assignment Details'}
        </h3>
        <p className="text-sm text-gray-500">
          {opsMode
            ? 'Give this explore test a name. It will be visible to all guest / trial students.'
            : 'Give your SAT practice test a name and set the basics. You can enroll batches after publishing.'}
        </p>
      </div>

      {/* Title */}
      <Field label={opsMode ? 'Test Title' : 'Assignment Title'} required>
        <input
          type="text"
          value={data.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder={opsMode ? 'e.g. SAT Diagnostic Test – April 2025' : 'e.g. SAT Practice Test #1 – Reading & Writing Focus'}
          className={inputCls}
        />
      </Field>

      {/* Description */}
      <Field label="Description" hint="Optional instructions or overview for students">
        <textarea
          value={data.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="e.g. Complete all sections under timed conditions. No calculator for Math Module 1."
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </Field>

      {/* Due date — not shown for ops explore tests */}
      {!opsMode && (
        <Field label="Due Date" required>
          <input
            type="date"
            value={data.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
            className={`${inputCls} w-auto`}
          />
        </Field>
      )}

      {opsMode ? (
        /* Ops mode: locked guest access + type picker always visible */
        <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50/40 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-sm shrink-0">🌐</div>
            <div>
              <p className="text-[13px] font-extrabold text-cyan-800">Guest Access — Always On</p>
              <p className="text-xs text-cyan-600 mt-0.5">Explore tests are always visible to all guest / trial students.</p>
            </div>
          </div>
          <Field label="Test Type" hint="Shown as a badge in the student portal">
            <div className="flex gap-2">
              {[
                { value: 'diagnostic', label: '🩺 Diagnostic Test',  desc: 'Initial skill assessment' },
                { value: 'practice',   label: '📝 Practice Test',     desc: 'Timed practice run' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('assignmentType', opt.value)}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    data.assignmentType === opt.value
                      ? 'border-cyan-400 bg-cyan-50 text-cyan-800'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-cyan-200'
                  }`}
                >
                  <p className="text-[13px] font-bold">{opt.label}</p>
                  <p className="text-[11px] opacity-70 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </Field>
        </div>
      ) : (
        /* Mentor mode: normal guest toggle */
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-extrabold text-amber-800">Guest / Trial Access</p>
              <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                Enable to make this assignment visible to guest (trial) users who haven't purchased a course yet.
                Use this for diagnostic tests and practice tests you want leads to attempt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('isGuestAccessible', !data.isGuestAccessible)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 mt-0.5 ${
                data.isGuestAccessible ? 'bg-amber-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  data.isGuestAccessible ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {data.isGuestAccessible && (
            <Field label="Assignment Type" hint="Shown as a badge in the guest portal">
              <div className="flex gap-2">
                {[
                  { value: 'diagnostic', label: '🩺 Diagnostic Test',  desc: 'Initial skill assessment' },
                  { value: 'practice',   label: '📝 Practice Test',     desc: 'Timed practice run' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('assignmentType', opt.value)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      data.assignmentType === opt.value
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-amber-200'
                    }`}
                  >
                    <p className="text-[13px] font-bold">{opt.label}</p>
                    <p className="text-[11px] opacity-70 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 2 — SAT Structure
// ════════════════════════════════════════════════════════════
function StepStructure({ data, onChange }) {
  const updateModule = (sectionId, moduleNum, key, val) => {
    onChange({
      ...data,
      sections: data.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              modules: s.modules.map((m) =>
                m.number !== moduleNum ? m : { ...m, [key]: val },
              ),
            },
      ),
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      <div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-1">SAT Section Configuration</h3>
        <p className="text-sm text-gray-500">
          The digital SAT has two sections, each split into two adaptive modules. Set the time limit for each.
        </p>
      </div>

      {data.sections.map((section) => {
        const meta = SECTION_META[section.id] || {};
        return (
          <div
            key={section.id}
            className="rounded-2xl border-2 overflow-hidden"
            style={{ borderColor: meta.accent + '30' }}
          >
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ background: meta.bg }}>
              <span className="text-2xl">{meta.icon}</span>
              <div>
                <h4 className="text-sm font-extrabold" style={{ color: meta.accent }}>
                  {section.name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  2 adaptive modules · configure time limits below
                </p>
              </div>
            </div>

            {/* Module rows */}
            <div className="bg-white divide-y divide-gray-100">
              {section.modules.map((mod) => (
                <div key={mod.id} className="flex items-center gap-4 px-5 py-4 flex-wrap">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                    style={{ background: meta.accent }}
                  >
                    M{mod.number}
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <p className="text-[13px] font-bold text-gray-800">Module {mod.number}</p>
                    <p className="text-xs text-gray-400">
                      {mod.questions.length} question{mod.questions.length !== 1 ? 's' : ''} added so far
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-gray-500">⏱ Time limit</span>
                    <input
                      type="number"
                      value={mod.timeLimit}
                      min={1}
                      max={180}
                      onChange={(e) =>
                        updateModule(section.id, mod.number, 'timeLimit', Number(e.target.value))
                      }
                      className="w-20 px-3 py-1.5 rounded-xl border border-gray-200 text-[13px] font-extrabold text-center outline-none focus:border-indigo-400 transition-colors"
                      style={{ color: meta.accent }}
                    />
                    <span className="text-xs text-gray-500">min</span>
                  </div>
                  {/* Calculator toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-gray-500">🧮 Calculator</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateModule(section.id, mod.number, 'calculatorAllowed', !mod.calculatorAllowed)
                      }
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                        mod.calculatorAllowed ? 'bg-emerald-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          mod.calculatorAllowed ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-[11px] font-bold ${mod.calculatorAllowed ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {mod.calculatorAllowed ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Info callout */}
      <div className="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
        <span className="text-lg shrink-0 mt-0.5">💡</span>
        <div>
          <p className="text-[13px] font-bold text-amber-800">Official Digital SAT Timing</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            R&W Module 1: 32 min / 27 Q &nbsp;·&nbsp; R&W Module 2: 32 min / 27 Q<br />
            Math Module 1: 35 min / 22 Q &nbsp;·&nbsp; Math Module 2: 35 min / 22 Q<br />
            You can customise these for practice assignments.
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 4 — Rules & Scoring
// ════════════════════════════════════════════════════════════
function StepRules({ data, onChange }) {
  const [draft, setDraft] = useState('');
  const { totalScore } = computeTotals(data);
  const passingPoints = Math.ceil((totalScore * data.passingScore) / 100);

  const addRule = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange({ ...data, rules: [...(data.rules || []), trimmed] });
    setDraft('');
  };

  const removeRule = (i) => {
    onChange({ ...data, rules: data.rules.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      <div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-1">Rules & Scoring</h3>
        <p className="text-sm text-gray-500">
          Set the pass threshold and add any custom rules that apply to this assignment.
        </p>
      </div>

      {/* Score overview card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-widest opacity-70 mb-4">
          Score Overview
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: totalScore,      label: 'Total Points' },
            { value: `${data.passingScore}%`, label: 'Pass Threshold' },
            { value: passingPoints,   label: 'Points to Pass' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/15 rounded-xl p-3.5 text-center">
              <p className="text-2xl font-black">{value}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pass threshold slider */}
      <Field label="Passing Score Threshold (%)">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={data.passingScore}
            onChange={(e) => onChange({ ...data, passingScore: Number(e.target.value) })}
            className="flex-1 accent-indigo-600 h-2"
          />
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              value={data.passingScore}
              min={0}
              max={100}
              onChange={(e) =>
                onChange({
                  ...data,
                  passingScore: Math.min(100, Math.max(0, Number(e.target.value))),
                })
              }
              className="w-16 px-2 py-1.5 rounded-xl border border-gray-200 text-[15px] font-extrabold text-center text-indigo-600 outline-none focus:border-indigo-400"
            />
            <span className="text-gray-500 font-bold text-sm">%</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Students need {passingPoints} / {totalScore} points to pass this assignment.
        </p>
      </Field>

      {/* Custom rules */}
      <Field
        label="Assignment Rules"
        hint="These will be shown to students before they start the test"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRule()}
            placeholder="e.g. No calculator allowed for Math Module 1"
            className={`${inputCls} flex-1`}
          />
          <button
            onClick={addRule}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shrink-0"
          >
            + Add
          </button>
        </div>

        {(data.rules || []).length > 0 && (
          <div className="space-y-2 mt-2">
            {data.rules.map((rule, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200"
              >
                <span className="text-indigo-400 shrink-0">📌</span>
                <span className="flex-1 text-[13px] text-gray-700">{rule}</span>
                <button
                  onClick={() => removeRule(i)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xl leading-none shrink-0 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 5 — Review & Publish
// ════════════════════════════════════════════════════════════
function StepReview({ data, onGoToStep, opsMode }) {
  const { totalQ, totalScore } = computeTotals(data);
  //const passingPoints = Math.ceil((totalScore * data.passingScore) / 100);

  const warnings = [];
  if (!data.title.trim())         warnings.push({ type: 'error', step: 1, msg: 'Title is required.' });
  if (!opsMode && !data.dueDate)  warnings.push({ type: 'warn',  step: 1, msg: 'No due date set.' });
  if (totalQ === 0)        warnings.push({ type: 'error', step: 3, msg: 'No questions added yet. Go to Step 3.' });
  if (!opsMode) warnings.push({ type: 'info', step: null, msg: 'Publish first, then enroll batches from the Assignments list.' });
  if (opsMode)  warnings.push({ type: 'info', step: null, msg: 'Once published, this test will be immediately visible to all guest / trial students.' });

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      <div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-1">Review & Publish</h3>
        <p className="text-sm text-gray-500">
          Everything look good? Publish it to make it visible to your students.
        </p>
      </div>

      {/* Summary hero */}
      <div
        className="p-6 rounded-2xl text-white"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
      >
        <p className="text-[11px] font-extrabold uppercase tracking-widest opacity-70 mb-2">
          Assignment Summary
        </p>
        <h2 className="text-xl font-extrabold mb-4">{data.title || 'Untitled Assignment'}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { v: totalQ,                   l: 'Questions'    },
            { v: totalScore,               l: 'Total Points' },
            { v: `${data.passingScore}%`,  l: 'Pass Mark'    },
            { v: data.sections?.length ?? 2, l: 'Sections'   },
          ].map(({ v, l }) => (
            <div key={l} className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-xl font-black">{v}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        {data.dueDate && (
          <p className="text-xs opacity-70 mt-3">
            Due: {new Date(data.dueDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Section breakdown */}
      <div className="space-y-3">
        {data.sections.map((section) => {
          const meta = SECTION_META[section.id] || {};
          const secQ = section.modules.reduce((a, m) => a + m.questions.length, 0);
          const secPts = section.modules.reduce(
            (a, m) => a + m.questions.reduce((b, q) => b + (q.score || 1), 0), 0,
          );
          return (
            <div key={section.id} className="rounded-2xl border border-gray-200 overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ background: meta.bg }}
              >
                <div className="flex items-center gap-2">
                  <span>{meta.icon}</span>
                  <span className="text-sm font-extrabold" style={{ color: meta.accent }}>
                    {section.name}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: meta.badgeBg || '#e0e7ff', color: meta.badgeColor || '#3730a3' }}
                  >
                    {secQ} Q · {secPts} pts
                  </span>
                </div>
                <button
                  onClick={() => onGoToStep(3)}
                  className="text-xs text-gray-500 hover:text-indigo-600 font-semibold transition-colors"
                >
                  Edit →
                </button>
              </div>
              <div className="divide-y divide-gray-100 bg-white">
                {section.modules.map((m) => (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[13px] text-gray-600 font-medium">Module {m.number}</span>
                    <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
                      <span>⏱ {m.timeLimit} min</span>
                      <span>📝 {m.questions.length} Q</span>
                      <span>⭐ {m.questions.reduce((a, q) => a + (q.score || 1), 0)} pts</span>
                      <span className={m.calculatorAllowed ? 'text-emerald-500' : 'text-gray-400'}>
                        {m.calculatorAllowed ? '🧮 Calculator' : '🚫 No Calculator'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules */}
      {(data.rules || []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Rules</p>
          {data.rules.map((r, i) => (
            <div key={i} className="flex gap-2 text-[13px] text-gray-600">
              <span className="text-indigo-400">📌</span> {r}
            </div>
          ))}
        </div>
      )}

      {/* Guest access summary */}
      {data.isGuestAccessible && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <span className="text-lg shrink-0">{data.assignmentType === 'diagnostic' ? '🩺' : '📝'}</span>
          <div>
            <p className="text-[13px] font-bold text-amber-800">
              Guest Accessible — {data.assignmentType === 'diagnostic' ? 'Diagnostic Test' : 'Practice Test'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Trial users will see this assignment in their portal after you publish it.
            </p>
          </div>
        </div>
      )}

      {/* Warnings / Info */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => {
            const styles = {
              error: 'bg-red-50 border-red-200 text-red-700',
              warn:  'bg-amber-50 border-amber-200 text-amber-700',
              info:  'bg-blue-50 border-blue-200 text-blue-700',
            };
            const icons = { error: '⚠️', warn: '⚠️', info: 'ℹ️' };
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-[13px] ${styles[w.type]}`}
              >
                <span>{icons[w.type]}</span>
                <span className="flex-1">{w.msg}</span>
                {w.step && (
                  <button
                    onClick={() => onGoToStep(w.step)}
                    className="text-xs font-bold underline shrink-0"
                  >
                    Fix →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Shared Field wrapper & input class
// ════════════════════════════════════════════════════════════
const inputCls =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white';

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">
          {label}
        </label>
        {required && <span className="text-red-400 text-xs">*</span>}
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN — CreateAssignmentPage
// ════════════════════════════════════════════════════════════
export default function CreateAssignmentPage({ initial, opsMode = false, onSave, onClose }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    ...initial,
    dueDate: initial.dueDate ? initial.dueDate.slice(0, 10) : '',
  });

  const canAdvance = () => {
    if (step === 1) return data.title.trim().length > 0 && (opsMode || !!data.dueDate);
    return true;
  };

  const { totalQ } = computeTotals(data);
  const canPublish  = data.title.trim() && (opsMode || data.dueDate) && totalQ > 0;

  const handleSaveDraft = () => onSave({ ...data, status: 'draft' });
  const handlePublish   = () => {
    if (canPublish) onSave({ ...data, status: 'published' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/60 fade-in">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-6 py-3.5 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-semibold transition-colors shrink-0"
        >
          ← Back
        </button>

        {/* Step pills */}
        <div className="flex-1 flex items-center justify-center gap-1.5 overflow-x-auto">
          {STEPS.map((s, i) => {
            const isPast    = s.num < step;
            const isCurrent = s.num === step;
            return (
              <div key={s.num} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => s.num <= step && setStep(s.num)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={
                    isCurrent
                      ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', boxShadow: '0 3px 10px rgba(79,70,229,0.35)' }
                      : isPast
                      ? { background: '#e0e7ff', color: '#4338ca' }
                      : { background: '#f3f4f6', color: '#9ca3af', cursor: 'default' }
                  }
                >
                  <span>{isPast ? '✓' : s.icon}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className={`text-xs ${isPast ? 'text-indigo-300' : 'text-gray-300'}`}>—</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSaveDraft}
          className="text-xs font-semibold text-gray-400 hover:text-gray-700 whitespace-nowrap transition-colors shrink-0"
        >
          Save Draft
        </button>
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 overflow-y-auto py-8 px-6">
        {step === 1 && <StepInfo      data={data} onChange={setData} opsMode={opsMode} />}
        {step === 2 && <StepStructure data={data} onChange={setData} />}
        {step === 3 && <SectionBuilder data={data} onChange={setData} />}
        {step === 4 && <StepRules     data={data} onChange={setData} />}
        {step === 5 && <StepReview    data={data} onGoToStep={setStep} opsMode={opsMode} />}
      </div>

      {/* ── Footer nav ── */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200 shrink-0">
        <button
          onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </button>

        <div className="flex items-center gap-2.5">
          {/* Step counter */}
          <span className="text-xs text-gray-400 font-medium hidden sm:inline">
            Step {step} of {STEPS.length}
          </span>

          {step < 5 ? (
            <button
              onClick={() => canAdvance() && setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="px-6 py-2.5 rounded-xl text-sm font-extrabold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={!canPublish}
              className="px-7 py-2.5 rounded-xl text-sm font-extrabold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-y-0 bg-emerald-600 hover:bg-emerald-700"
              style={{ boxShadow: canPublish ? '0 4px 14px rgba(16,185,129,0.4)' : 'none' }}
            >
              🚀 Publish Assignment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
