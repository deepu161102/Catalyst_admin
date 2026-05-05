import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { satMentorService, studentService } from '../../../services/api';

// ── Assign Modal ─────────────────────────────────────────────
function AssignModal({ test, testType, students, onAssign, onClose }) {
  const [studentId, setStudentId] = useState('');
  const [dueDate,   setDueDate]   = useState('');
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState('');

  const submit = async () => {
    if (!studentId) { setErr('Select a student'); return; }
    setBusy(true); setErr('');
    try {
      await onAssign({
        student_id:                 studentId,
        test_type:                  testType,
        exam_config_id:             testType === 'subject'     ? test._id : undefined,
        full_length_exam_config_id: testType === 'full_length' ? test._id : undefined,
        due_date:                   dueDate || undefined,
      });
      onClose();
    } catch (e) { setErr(e.message); }
    finally     { setBusy(false); }
  };

  const subjectLabel =
    testType === 'full_length'           ? 'Full Length' :
    test.subject === 'math'              ? 'Math'         : 'Reading & Writing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-base font-extrabold text-gray-900 mb-0.5">Assign SAT Test</h3>
          <p className="text-xs text-gray-500 mb-5 truncate">{test.name} · {subjectLabel}</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Student *</label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
              >
                <option value="">Select a student…</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name}{s.email ? ` (${s.email})` : ''}
                  </option>
                ))}
              </select>
              {students.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-600">No students found under your account.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Due Date <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
              />
            </div>
          </div>

          {err && <p className="mt-3 text-xs font-medium text-red-600">{err}</p>}
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {busy ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Test card ────────────────────────────────────────────────
const SUBJECT_STYLE = {
  math:            { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Math' },
  reading_writing: { bg: '#fdf4ff', text: '#7e22ce', dot: '#a855f7', label: 'Reading & Writing' },
};
const FL_STYLE = { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Full Length' };

function TestCard({ test, type, onAssignClick }) {
  const style   = type === 'full_length' ? FL_STYLE : (SUBJECT_STYLE[test.subject] || SUBJECT_STYLE.math);
  const modules = type === 'subject' ? [
    { label: 'Module 1',   data: test.module_1 },
    { label: 'Mod 2 Hard', data: test.module_2_hard },
    { label: 'Mod 2 Easy', data: test.module_2_easy },
  ] : [];
  const flParts = type === 'full_length' ? [
    { label: 'R&W',  name: test.rw_exam_config_id?.name },
    { label: 'Math', name: test.math_exam_config_id?.name },
  ] : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold text-gray-900 leading-snug">{test.name}</h4>
          <span
            className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{ background: style.bg, color: style.text }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
            {style.label}
          </span>
        </div>
        <button
          onClick={() => onAssignClick(test, type)}
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          Assign →
        </button>
      </div>

      {modules.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {modules.map(({ label, data }) => data && (
            <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
              <p className="text-[10px] font-bold text-gray-500 mb-1">{label}</p>
              <p className="text-xs font-extrabold text-gray-800">{data.total_questions}Q</p>
              <p className="text-[10px] text-gray-400">{data.time_limit_minutes}min</p>
            </div>
          ))}
        </div>
      )}

      {flParts.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {flParts.map(({ label, name }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-xs font-semibold text-gray-700 truncate mt-0.5">{name || '—'}</p>
            </div>
          ))}
        </div>
      )}

      {type === 'subject' && (
        <p className="text-[11px] text-gray-400">Adaptive threshold: {test.adaptive_threshold ?? 60}%</p>
      )}
    </div>
  );
}

// ── Assignment history row ───────────────────────────────────
const STATUS_STYLE = {
  pending:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-emerald-100 text-emerald-700',
};

function AssignmentRow({ a }) {
  const studentName = a.student_id?.name || '—';
  const testName    = a.exam_config_id?.name || a.full_length_exam_config_id?.name || '—';
  const subject     = a.exam_config_id?.subject;
  const typeLabel   = a.test_type === 'full_length' ? 'Full Length' : subject === 'math' ? 'Math' : 'R&W';
  const typeStyle   =
    a.test_type === 'full_length' ? 'bg-emerald-100 text-emerald-700' :
    subject     === 'math'        ? 'bg-blue-100 text-blue-700'       : 'bg-purple-100 text-purple-700';

  return (
    <tr className="hover:bg-gray-50 transition-colors border-t border-gray-100">
      <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{studentName}</td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate" title={testName}>{testName}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${typeStyle}`}>{typeLabel}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${STATUS_STYLE[a.status] || 'bg-gray-100 text-gray-600'}`}>
          {a.status?.replace('_', ' ')}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
        {a.due_date
          ? new Date(a.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
        {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </td>
    </tr>
  );
}

// ── Main component ───────────────────────────────────────────
export default function SatAssignTab() {
  const { user } = useAuth();

  const [tests,       setTests]       = useState({ subject_tests: [], full_length_tests: [] });
  const [assignments, setAssignments] = useState([]);
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [filter,      setFilter]      = useState('all'); // 'all' | 'math' | 'reading_writing' | 'full_length'
  const [assigning,   setAssigning]   = useState(null);  // { test, type }
  const [success,     setSuccess]     = useState('');

  const load = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true); setError('');
    try {
      const [testRes, assignRes, studentRes] = await Promise.all([
        satMentorService.listTests(),
        satMentorService.getAssignments(),
        studentService.getByMentor(user._id).catch(() => ({ data: [] })),
      ]);
      setTests(testRes.data || { subject_tests: [], full_length_tests: [] });
      setAssignments(assignRes.data || []);
      setStudents((studentRes.data || []).map(({ student, batch }) => ({ ...student, batch })));
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, [user?._id]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (payload) => {
    const res = await satMentorService.assign(payload);
    setAssignments(prev => [res.data, ...prev]);
    setSuccess('Test assigned successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const visibleSubject    = (filter === 'all' || filter === 'math' || filter === 'reading_writing')
    ? tests.subject_tests.filter(t => filter === 'all' || t.subject === filter)
    : [];
  const visibleFullLength = (filter === 'all' || filter === 'full_length')
    ? tests.full_length_tests
    : [];
  const totalVisible = visibleSubject.length + visibleFullLength.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Loading SAT modules…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold">×</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <span>✓</span> {success}
        </div>
      )}

      {/* ── Available Modules ── */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">Available SAT Modules</h3>
            <p className="text-xs text-gray-400 mt-0.5">Created by operations · shared across all mentors</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { key: 'all',             label: 'All' },
              { key: 'math',            label: 'Math' },
              { key: 'reading_writing', label: 'R&W' },
              { key: 'full_length',     label: 'Full Length' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-[10px] text-xs font-bold transition-all ${filter === f.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {totalVisible === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-sm font-bold text-gray-600">No modules available</p>
            <p className="text-xs text-gray-400 mt-1">The operations team hasn't created any active modules yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSubject.map(t => (
              <TestCard key={t._id} test={t} type="subject"     onAssignClick={(test, type) => setAssigning({ test, type })} />
            ))}
            {visibleFullLength.map(t => (
              <TestCard key={t._id} test={t} type="full_length" onAssignClick={(test, type) => setAssigning({ test, type })} />
            ))}
          </div>
        )}
      </div>

      {/* ── My SAT Assignments ── */}
      <div>
        <h3 className="text-sm font-extrabold text-gray-900 mb-3">
          My SAT Assignments{' '}
          <span className="text-gray-400 font-normal">({assignments.length})</span>
        </h3>

        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm font-bold text-gray-600">No SAT assignments yet</p>
            <p className="text-xs text-gray-400 mt-1">Pick a module above and assign it to a student</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  {['Student', 'Test', 'Type', 'Status', 'Due', 'Assigned'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => <AssignmentRow key={a._id} a={a} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Assign Modal ── */}
      {assigning && (
        <AssignModal
          test={assigning.test}
          testType={assigning.type}
          students={students}
          onAssign={handleAssign}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  );
}
