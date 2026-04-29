// ============================================================
// SECTION BUILDER (Step 3 — Add Questions)
// Two-level navigation: Section → Module → Question list.
// Opens QuestionEditor modal when adding / editing a question.
// ============================================================

import { useState } from 'react';
import QuestionEditor from './QuestionEditor';
import BulkUploadModal from './BulkUploadModal';
import { SECTION_META } from './sectionMeta';

// ── Blank question factory ────────────────────────────────────
function makeBlankQuestion(number) {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    number,
    title: '',
    description: '',
    choices: { A: '', B: '', C: '', D: '' },
    correctAnswer: '',
    explanation: '',
    score: 1,
    topic: '',
  };
}

// ── Question preview card ────────────────────────────────────
function QuestionCard({ question, accentColor, onEdit, onDelete }) {
  const allChoicesFilled = Object.values(question.choices).every((v) => v.trim().length > 0);
  const isComplete = question.title && question.correctAnswer && allChoicesFilled;

  return (
    <div className="group flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
      {/* Number badge */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
        style={{ background: accentColor }}
      >
        {question.number}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 truncate">
          {question.title || <span className="text-gray-400 italic">Untitled question</span>}
        </p>
        {question.description && (
          <p
            className="text-[11px] text-gray-400 mt-0.5 line-clamp-1"
            dangerouslySetInnerHTML={{ __html: question.description }}
          />
        )}
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {question.correctAnswer ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
              ✓ {question.correctAnswer}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
              ○ No answer set
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
            ⭐ {question.score} pt{question.score !== 1 ? 's' : ''}
          </span>
          {!isComplete && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
              ⚠ Incomplete
            </span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm hover:bg-indigo-100 transition-colors"
          title="Edit question"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center text-sm hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Delete question"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function SectionBuilder({ data, onChange }) {
  const [activeSection, setActiveSection] = useState('rw');
  const [activeModule, setActiveModule] = useState(1);
  const [editingQ, setEditingQ] = useState(null); // { sectionId, moduleNum, question }
  const [bulkTarget, setBulkTarget] = useState(null); // sectionId string, null = closed

  // ── Derived state ──────────────────────────────────────────
  const currentSection = data.sections.find((s) => s.id === activeSection);
  const currentModule  = currentSection?.modules.find((m) => m.number === activeModule);
  const meta           = SECTION_META[activeSection] || SECTION_META.rw;

  // ── Data mutation helpers ──────────────────────────────────
  const updateSections = (updater) => {
    onChange({ ...data, sections: updater(data.sections) });
  };

  const saveQuestion = (sectionId, moduleNum, question) => {
    updateSections((sections) =>
      sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              modules: s.modules.map((m) =>
                m.number !== moduleNum
                  ? m
                  : {
                      ...m,
                      questions: m.questions.some((q) => q.id === question.id)
                        ? m.questions.map((q) => (q.id === question.id ? question : q))
                        : [...m.questions, question],
                    },
              ),
            },
      ),
    );
  };

  const deleteQuestion = (sectionId, moduleNum, qId) => {
    updateSections((sections) =>
      sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              modules: s.modules.map((m) =>
                m.number !== moduleNum
                  ? m
                  : { ...m, questions: m.questions.filter((q) => q.id !== qId) },
              ),
            },
      ),
    );
  };

  // ── Handlers ──────────────────────────────────────────────
  const openAdd = () => {
    const nextNum = (currentModule?.questions.length || 0) + 1;
    setEditingQ({
      sectionId: activeSection,
      moduleNum: activeModule,
      question: makeBlankQuestion(nextNum),
    });
  };

  const openEdit = (q) => {
    setEditingQ({ sectionId: activeSection, moduleNum: activeModule, question: { ...q } });
  };

  const handleSave = (question) => {
    saveQuestion(editingQ.sectionId, editingQ.moduleNum, question);
    setEditingQ(null);
  };

  const handleBulkImport = (questions) => {
    updateSections((sections) =>
      sections.map((s) => {
        if (s.id !== bulkTarget) return s;
        // Group imported questions by their module number (1 or 2)
        const byModule = {};
        questions.forEach((q) => {
          const m = q.module === 2 ? 2 : 1;
          (byModule[m] = byModule[m] || []).push(q);
        });
        return {
          ...s,
          modules: s.modules.map((m) => {
            const incoming = byModule[m.number] || [];
            if (!incoming.length) return m;
            const startNum = m.questions.length + 1;
            const numbered = incoming.map((q, i) => ({ ...q, number: startNum + i }));
            return { ...m, questions: [...m.questions, ...numbered] };
          }),
        };
      }),
    );
    setBulkTarget(null);
  };

  // ── Total counts ──────────────────────────────────────────
  const sectionTotal = (sectionId) =>
    data.sections
      .find((s) => s.id === sectionId)
      ?.modules.reduce((a, m) => a + m.questions.length, 0) ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Page title */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Add Questions</h3>
        <p className="text-sm text-gray-500">
          Build your question bank for each section and module. Each question has its own scoring weight.
        </p>
      </div>

      {/* ── Section tabs ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {data.sections.map((section) => {
            const m = SECTION_META[section.id] || {};
            const count = sectionTotal(section.id);
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  setActiveModule(1);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                style={
                  active
                    ? { background: m.accent, borderColor: m.accent, color: '#fff', boxShadow: `0 4px 14px ${m.accent}44` }
                    : { background: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
                }
              >
                <span>{m.icon}</span>
                <span>{section.name}</span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold"
                  style={
                    active
                      ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                      : { background: '#f3f4f6', color: '#6b7280' }
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setBulkTarget(activeSection)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all hover:-translate-y-0.5 shrink-0"
          style={{ borderColor: meta.accent, color: meta.accent, background: '#fff' }}
        >
          📤 Bulk Upload Section
        </button>
      </div>

      {/* ── Module tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {currentSection?.modules.map((m) => {
          const active = activeModule === m.number;
          return (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.number)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-[10px] text-xs font-bold transition-all"
              style={active ? { background: '#fff', color: meta.accent, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#9ca3af' }}
            >
              Module {m.number}
              <span
                className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-extrabold"
                style={
                  active
                    ? { background: meta.accent, color: '#fff' }
                    : { background: '#e5e7eb', color: '#9ca3af' }
                }
              >
                {m.questions.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Module info bar ── */}
      {currentModule && (
        <div
          className="flex items-center justify-between p-4 rounded-2xl"
          style={{ background: meta.bg }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shadow-sm"
              style={{ background: meta.accent }}
            >
              M{activeModule}
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: meta.accent }}>
                {currentSection.name} — Module {activeModule}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                ⏱ {currentModule.timeLimit} min &nbsp;·&nbsp; 📝 {currentModule.questions.length} question{currentModule.questions.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ⭐ {currentModule.questions.reduce((a, q) => a + (q.score || 1), 0)} pts
              </p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: meta.accent,
              boxShadow: `0 4px 12px ${meta.accent}44`,
            }}
          >
            <span>+</span> Add Question
          </button>
        </div>
      )}

      {/* ── Question list ── */}
      {currentModule && (
        <div className="space-y-2">
          {currentModule.questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <span className="text-5xl mb-3">📝</span>
              <p className="text-sm font-bold text-gray-600 mb-1">No questions yet</p>
              <p className="text-xs text-gray-400 mb-5">
                Add questions to {currentSection?.name} Module {activeModule}
              </p>
              <button
                onClick={openAdd}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: meta.accent, boxShadow: `0 4px 12px ${meta.accent}44` }}
              >
                + Add First Question
              </button>
            </div>
          ) : (
            currentModule.questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                accentColor={meta.accent}
                onEdit={() => openEdit(q)}
                onDelete={() => {
                  if (window.confirm(`Delete question #${q.number}?`)) {
                    deleteQuestion(activeSection, activeModule, q.id);
                  }
                }}
              />
            ))
          )}
        </div>
      )}

      {/* ── Question Editor Modal ── */}
      {editingQ && (
        <QuestionEditor
          key={editingQ.question.id}
          question={editingQ.question}
          sectionMeta={SECTION_META[editingQ.sectionId]}
          onSave={handleSave}
          onClose={() => setEditingQ(null)}
        />
      )}

      {/* ── Bulk Upload Modal ── */}
      {bulkTarget && (
        <BulkUploadModal
          sectionName={data.sections.find((s) => s.id === bulkTarget)?.name || ''}
          onImport={handleBulkImport}
          onClose={() => setBulkTarget(null)}
        />
      )}
    </div>
  );
}
