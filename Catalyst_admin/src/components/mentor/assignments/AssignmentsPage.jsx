// ============================================================
// SAT ASSIGNMENTS PAGE
// Entry point for the mentor assignments section.
// Manages list, builder, batch-enrollment and progress views.
// All data is persisted to the backend via assignmentService.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { assignmentService, batchService } from '../../../services/api';
import CreateAssignmentPage    from './CreateAssignmentPage';
import AssignmentProgressPage  from './AssignmentProgressPage';
import BatchEnrollModal        from './components/BatchEnrollModal';
import { SECTION_META } from './components/sectionMeta';

// ────────────────────────────────────────────────────────────
// Default SAT structure factory
// ────────────────────────────────────────────────────────────
function buildDefaultSections() {
  return [
    {
      id: 'rw', sid: 'rw',
      name: 'Reading and Writing',
      modules: [
        { id: 'rw-1',   mid: 'rw-1',   number: 1, timeLimit: 32, questions: [] },
        { id: 'rw-2',   mid: 'rw-2',   number: 2, timeLimit: 32, questions: [] },
      ],
    },
    {
      id: 'math', sid: 'math',
      name: 'Math',
      modules: [
        { id: 'math-1', mid: 'math-1', number: 1, timeLimit: 35, questions: [] },
        { id: 'math-2', mid: 'math-2', number: 2, timeLimit: 35, questions: [] },
      ],
    },
  ];
}

function newAssignment(mentorId) {
  return {
    _id:               null,   // null = not yet saved
    mentorId,
    title:             '',
    description:       '',
    dueDate:           '',
    enrolledBatches:   [],
    status:            'draft',
    createdAt:         new Date().toISOString(),
    passingScore:      70,
    rules:             [],
    isGuestAccessible: false,
    assignmentType:    'full',
    sections:          buildDefaultSections(),
  };
}

// Normalise a backend assignment doc so the builder can use it
// (backend uses sid/mid/qid; builder uses id)
function normalise(a) {
  return {
    ...a,
    id: a._id || a.id,
    sections: (a.sections || []).map((s) => ({
      ...s,
      id:  s.sid || s.id,
      sid: s.sid || s.id,
      modules: (s.modules || []).map((m) => ({
        ...m,
        id:  m.mid || m.id,
        mid: m.mid || m.id,
        questions: (m.questions || []).map((q) => ({
          ...q,
          id:  q.qid || q.id,
          qid: q.qid || q.id,
        })),
      })),
    })),
  };
}

// ────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────
function getAssignmentTotals(assignment) {
  let totalQ = 0, totalScore = 0;
  for (const s of assignment.sections)
    for (const m of s.modules) {
      totalQ    += m.questions.length;
      totalScore += m.questions.reduce((a, q) => a + (q.score || 1), 0);
    }
  return { totalQ, totalScore };
}

// ────────────────────────────────────────────────────────────
// Assignment card
// ────────────────────────────────────────────────────────────
function AssignmentCard({ assignment, onEdit, onDelete, onTogglePublish, onEnrollBatch, onProgress }) {
  const { totalQ, totalScore } = getAssignmentTotals(assignment);
  const isPublished  = assignment.status === 'published';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all overflow-hidden flex flex-col group">
      <div className="h-1.5 shrink-0" style={{ background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)' }} />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-extrabold text-gray-900 truncate">
              {assignment.title || 'Untitled Assignment'}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Created {new Date(assignment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {assignment.dueDate && ` · Due ${new Date(assignment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {isPublished ? '✓ Published' : '⏺ Draft'}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {assignment.sections.map((s) => {
            const meta = SECTION_META[s.id || s.sid] || {};
            const qc   = s.modules.reduce((a, m) => a + m.questions.length, 0);
            return (
              <div key={s.id || s.sid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: meta.bg, color: meta.accent }}>
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="opacity-60">· {qc}Q</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 text-xs text-gray-500 mb-3 flex-wrap">
          <span>📝 {totalQ} questions</span>
          <span>⭐ {totalScore} pts</span>
          <span>🎯 Pass: {assignment.passingScore}%</span>
          {(assignment.enrolledBatches || []).length > 0 && (
            <span>👥 {(assignment.enrolledBatches || []).length} batch{(assignment.enrolledBatches || []).length !== 1 ? 'es' : ''} enrolled</span>
          )}
          {assignment.isGuestAccessible && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold border border-amber-200">
              {assignment.assignmentType === 'diagnostic' ? '🩺 Diagnostic' : '📝 Practice'} · Guest
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-100 mt-auto flex-wrap">
          <button onClick={() => onEdit(assignment)} className="flex-1 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors min-w-[60px]">
            ✏️ Edit
          </button>

          {isPublished ? (
            <>
              <button onClick={() => onEnrollBatch(assignment)} className="flex-1 py-2 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors min-w-[80px]">
                👥 Enroll Batch
              </button>
              <button onClick={() => onProgress(assignment)} className="flex-1 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors min-w-[80px]">
                📊 Progress
              </button>
              <button onClick={() => onTogglePublish(assignment)} className="py-2 px-2.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                ⏸
              </button>
            </>
          ) : (
            <button onClick={() => onTogglePublish(assignment)} className="flex-1 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
              🚀 Publish
            </button>
          )}

          <button onClick={() => onDelete(assignment)} className="w-9 py-2 rounded-xl text-sm text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center" title="Delete">
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Stat card
// ────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 border border-gray-200">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: color + '18' }}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-extrabold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl shadow-lg" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)' }}>
          📋
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow">
          +
        </div>
      </div>
      <h3 className="text-lg font-extrabold text-gray-800 mb-1.5">No Assignments Yet</h3>
      <p className="text-sm text-gray-500 mb-7 max-w-xs leading-relaxed">
        Create your first SAT digital practice test. Build structured sections, add questions, enroll batches and track student progress.
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 6px 20px rgba(79,70,229,0.4)' }}
      >
        <span>+</span> Create First Assignment
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────
export default function AssignmentsPage() {
  const { user }                           = useAuth();

  const [myBatches,  setMyBatches]         = useState([]);
  const [assignments, setAssignments]      = useState([]);
  const [loading, setLoading]              = useState(true);
  const [saving,  setSaving]               = useState(false);
  const [error,   setError]                = useState('');
  const [view,    setView]                 = useState('list');   // 'list' | 'builder' | 'progress'
  const [editing, setEditing]              = useState(null);
  const [progressFor, setProgressFor]      = useState(null);
  const [enrollFor,   setEnrollFor]        = useState(null);
  const [statusTab,   setStatusTab]        = useState('all');

  // ── Load from backend ──────────────────────────────────────
  const loadAssignments = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const [aRes, bRes] = await Promise.all([
        assignmentService.getByMentor(user._id),
        batchService.getAll({ mentorId: user._id }).catch(() => ({ data: [] })),
      ]);
      setAssignments((aRes.data || []).map(normalise));
      setMyBatches((bRes.data || []).map((b) => ({
        id:         b._id,
        name:       b.name,
        subject:    b.subject,
        mentorId:   String(b.mentorId?._id || b.mentorId),
        studentIds: b.studentId ? [b.studentId._id || b.studentId] : [],
      })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  // ── CRUD ──────────────────────────────────────────────────
  const openCreate = () => { setEditing(newAssignment(user?._id)); setView('builder'); };

  const openEdit = async (a) => {
    try {
      const res = await assignmentService.getById(a._id);
      setEditing(normalise(res.data));
      setView('builder');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSave = async (saved) => {
    try {
      setSaving(true);
      setError('');
      const payload = {
        ...saved,
        mentorId: user?._id,
        sections: saved.sections.map((s) => ({
          sid:  s.sid || s.id,
          name: s.name,
          modules: (s.modules || []).map((m) => ({
            mid:               m.mid || m.id,
            number:            m.number,
            timeLimit:         m.timeLimit,
            calculatorAllowed: m.calculatorAllowed || false,
            questions: (m.questions || []).map((q) => ({
              qid:           q.qid || q.id,
              number:        q.number,
              title:         q.title,
              description:   q.description,
              topic:         q.topic || '',
              choices:       q.choices,
              correctAnswer: q.correctAnswer,
              explanation:   q.explanation,
              score:         q.score,
            })),
          })),
        })),
      };

      let result;
      if (saved._id) {
        result = await assignmentService.update(saved._id, payload);
      } else {
        const { _id, ...createPayload } = payload;
        result = await assignmentService.create(createPayload);
      }

      const normalised = normalise(result.data);
      setAssignments((prev) =>
        prev.some((a) => a._id === normalised._id)
          ? prev.map((a) => (a._id === normalised._id ? normalised : a))
          : [...prev, normalised]
      );
      setView('list');
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignment) => {
    if (!window.confirm('Delete this assignment? This cannot be undone.')) return;
    try {
      await assignmentService.remove(assignment._id);
      setAssignments((prev) => prev.filter((a) => a._id !== assignment._id));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleTogglePublish = async (assignment) => {
    try {
      const newStatus = assignment.status === 'published' ? 'draft' : 'published';
      const res = await assignmentService.setStatus(assignment._id, newStatus);
      const updated = normalise(res.data);
      setAssignments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Batch enrollment ──────────────────────────────────────
  const handleEnrollBatch = async (selectedBatchIds) => {
    if (!enrollFor) return;
    try {
      const existingIds = (enrollFor.enrolledBatches || []).map((b) =>
        typeof b === 'object' ? String(b._id || b.id) : String(b)
      );
      const merged = [...new Set([...existingIds, ...selectedBatchIds.map(String)])];
      const res = await assignmentService.enrollBatches(enrollFor._id, merged);
      const updated = normalise(res.data);
      setAssignments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      setEnrollFor(updated);
      if (progressFor?._id === updated._id) setProgressFor(updated);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUnenrollBatch = async (batchId) => {
    if (!enrollFor) return;
    const res = await assignmentService.unenrollBatch(enrollFor._id, batchId);
    const updated = normalise(res.data);
    setAssignments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    setEnrollFor(updated);
    if (progressFor?._id === updated._id) setProgressFor(updated);
  };

  // ── Progress view ─────────────────────────────────────────
  const openProgress = async (a) => {
    try {
      const res = await assignmentService.getProgress(a._id);
      setProgressFor(normalise(res.data));
      setView('progress');
    } catch (e) {
      setError(e.message);
    }
  };
  const handleProgressBack = () => { setProgressFor(null); setView('list'); };

  // ── Sub-views ─────────────────────────────────────────────
  if (view === 'builder') {
    return (
      <CreateAssignmentPage
        initial={editing}
        onSave={handleSave}
        onClose={() => { setView('list'); setEditing(null); }}
      />
    );
  }

  if (view === 'progress' && progressFor) {
    return <AssignmentProgressPage assignment={progressFor} onBack={handleProgressBack} />;
  }

  // ── List view ─────────────────────────────────────────────
  const counts = {
    all:       assignments.length,
    draft:     assignments.filter((a) => a.status === 'draft').length,
    published: assignments.filter((a) => a.status === 'published').length,
  };
  const filtered =
    statusTab === 'all' ? assignments : assignments.filter((a) => a.status === statusTab);

  const totalQuestions = assignments.reduce(
    (acc, a) => acc + a.sections.reduce((s, sec) => s + sec.modules.reduce((m, mod) => m + mod.questions.length, 0), 0), 0,
  );
  const totalEnrolled = assignments.reduce((acc, a) => acc + (a.enrolledBatches || []).length, 0);

  return (
    <div className="p-6 flex flex-col gap-6 fade-in min-h-full">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">SAT Assignments</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Create, publish, and track digital SAT practice tests for your batches.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shrink-0 transition-all hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}
        >
          <span className="text-base leading-none">+</span>
          <span>Create Assignment</span>
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold">×</button>
        </div>
      )}

      {/* ── Saving indicator ── */}
      {saving && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold">
          <span className="animate-spin">⏳</span> Saving…
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading assignments…</div>
      ) : (
        <>
          {/* ── Stats ── */}
          {assignments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon="📋" value={counts.all}       label="Total Assignments" color="#4f46e5" />
              <StatCard icon="🚀" value={counts.published}  label="Published"         color="#10b981" />
              <StatCard icon="📝" value={totalQuestions}   label="Total Questions"   color="#7c3aed" />
              <StatCard icon="👥" value={totalEnrolled}    label="Batch Enrollments" color="#f59e0b" />
            </div>
          )}

          {/* ── Tabs ── */}
          {assignments.length > 0 && (
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              {[
                { key: 'all',       label: `All (${counts.all})` },
                { key: 'draft',     label: `Draft (${counts.draft})` },
                { key: 'published', label: `Published (${counts.published})` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setStatusTab(t.key)}
                  className={`px-4 py-1.5 rounded-[10px] text-xs font-bold transition-all ${statusTab === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Content ── */}
          {filtered.length === 0 && assignments.length === 0 ? (
            <EmptyState onCreateClick={openCreate} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-sm font-bold text-gray-600">No {statusTab} assignments</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((a) => (
                <AssignmentCard
                  key={a._id}
                  assignment={a}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTogglePublish={handleTogglePublish}
                  onEnrollBatch={(assignment) => setEnrollFor(assignment)}
                  onProgress={openProgress}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Batch Enroll Modal ── */}
      {enrollFor && (
        <BatchEnrollModal
          batches={myBatches}
          enrolledBatches={enrollFor.enrolledBatches || []}
          onEnroll={handleEnrollBatch}
          onUnenroll={handleUnenrollBatch}
          onClose={() => setEnrollFor(null)}
        />
      )}
    </div>
  );
}
