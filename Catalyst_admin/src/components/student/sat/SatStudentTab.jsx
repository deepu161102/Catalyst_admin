import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { satStudentService } from '../../../services/api';

const STATUS_META = {
  pending:     { label: 'Not Started', bg: '#f9fafb', color: '#6b7280', dot: '#9ca3af' },
  in_progress: { label: 'In Progress', bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' },
  completed:   { label: 'Completed',   bg: '#f0fdf4', color: '#065f46', dot: '#10b981' },
};

const SUBJECT_STYLE = {
  math:            'bg-blue-100 text-blue-700',
  reading_writing: 'bg-purple-100 text-purple-700',
};

function AssignmentCard({ a, onAction }) {
  const sm        = STATUS_META[a.status] || STATUS_META.pending;
  const testName  = a.exam_config_id?.name || a.full_length_exam_config_id?.name || 'SAT Practice Test';
  const subject   = a.exam_config_id?.subject;
  const typeLabel = a.test_type === 'full_length' ? 'Full Length' : subject === 'math' ? 'Math' : 'Reading & Writing';
  const typeStyle = a.test_type === 'full_length' ? 'bg-emerald-100 text-emerald-700' : (SUBJECT_STYLE[subject] || 'bg-gray-100 text-gray-700');

  const m1 = a.exam_config_id?.module_1;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}
      >
        📐
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-gray-900 truncate">{testName}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeStyle}`}>{typeLabel}</span>
          {m1 && (
            <span className="text-[11px] text-gray-400">{m1.total_questions}Q · {m1.time_limit_minutes}min per module</span>
          )}
          {a.due_date && (
            <span className="text-[11px] text-gray-400">
              Due {new Date(a.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: sm.bg, color: sm.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sm.dot }} />
          {sm.label}
        </span>

        {a.status !== 'completed' && (
          <button
            onClick={() => onAction(a._id)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
          >
            {a.status === 'in_progress' ? 'Resume →' : 'Start →'}
          </button>
        )}

        {a.status === 'completed' && (
          <button
            onClick={() => onAction(a._id)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            View Results
          </button>
        )}
      </div>
    </div>
  );
}

export default function SatStudentTab() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const load = useCallback(async () => {
    const studentId = user?._id || user?.id;
    if (!studentId) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const res = await satStudentService.getAssignments(studentId);
      const list = Array.isArray(res) ? res : (res.data || res.assignments || []);
      setAssignments(list);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, [user?._id, user?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Loading SAT tests…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="font-bold underline shrink-0 ml-3">Retry</button>
        </div>
      )}

      {assignments.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
          <span className="text-base shrink-0 mt-0.5">📐</span>
          <p className="text-[12px] text-indigo-700 leading-relaxed">
            <span className="font-bold">Adaptive SAT Tests</span> — each test has two modules.
            Your Module 2 difficulty is adjusted based on your Module 1 performance.
          </p>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-3">📭</span>
          <h3 className="text-base font-extrabold text-gray-700 mb-1">No SAT tests assigned</h3>
          <p className="text-sm text-gray-400 max-w-xs">Your mentor will assign SAT practice tests here. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <AssignmentCard
              key={a._id}
              a={a}
              onAction={(id) => navigate(`/student/sat-test/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
