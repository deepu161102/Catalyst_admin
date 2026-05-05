// ============================================================
// STUDENT ASSIGNMENTS PAGE — /student/assignments
//
// Shows all assignments the logged-in student is enrolled in
// (regular mentor-assigned + guest/explore tests).
// For every COMPLETED assignment the student can open a full
// analytics report with four tabs:
//   1. Questions   – per-question answer review
//   2. Topic Mastery – mastery-level badges per topic
//   3. Charts       – Column / Pie / Line charts
//   4. AI Summary   – generated performance analysis + download
//
// WHY a two-step data load?
//   The list API (/assignments/my) returns lightweight summaries.
//   The report needs the FULL attempt object — specifically:
//     attempt.sectionResults[].modules[].answers[questionId]
//   Without those answers, computeTopicMastery() returns {} and
//   the mastery / charts / AI tabs stay empty.
//
//   Solution: on "View Report" click we call getProgress(:id) which
//   returns the complete data, then filter to this student's attempt.
//   Results are cached in a useRef (60 s TTL) so repeated views are
//   instant.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { studentAssignmentService } from '../../../services/api';
import { StudentReportModal } from '../../mentor/assignments/AssignmentProgressPage';
import SatStudentTab from '../sat/SatStudentTab';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const CACHE_TTL = 60_000; // 60 seconds

const STATUS_META = {
  completed:   { label: 'Completed',   dot: '#10b981', bg: '#f0fdf4', color: '#065f46' },
  in_progress: { label: 'In Progress', dot: '#f59e0b', bg: '#fffbeb', color: '#92400e' },
  not_started: { label: 'Not Started', dot: '#9ca3af', bg: '#f9fafb', color: '#6b7280' },
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * normaliseAssignment
 * Backend may use _id / sid / mid / qid as primary keys.
 * This ensures every object also has the canonical "id" key
 * so the report modal and topic-mastery logic work uniformly.
 */
function normaliseAssignment(a) {
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

/**
 * extractMyAttempt
 * Finds this student's attempt in the full progress response.
 * The progress endpoint returns attempts for ALL students; we
 * filter by studentId to get only the current student's data.
 */
function extractMyAttempt(fullAssignment, studentId) {
  if (!fullAssignment?.attempts) return null;
  return (
    fullAssignment.attempts.find(
      (a) => a.studentId === studentId || a.studentId === String(studentId),
    ) || null
  );
}

/**
 * attemptHasAnswers
 * Returns true when the attempt already contains the per-question
 * answer data needed to compute topic mastery.
 * Used to skip the getProgress fetch when the list API already
 * returned complete data.
 */
function attemptHasAnswers(attempt) {
  return (attempt?.sectionResults || []).some((sr) =>
    (sr.modules || []).some(
      (m) => m.answers && Object.keys(m.answers).length > 0,
    ),
  );
}

// ─────────────────────────────────────────────────────────────
// REPORT LOADING OVERLAY
// Shown while the full progress data is being fetched.
// Keeps the UX responsive — the user sees instant feedback.
// ─────────────────────────────────────────────────────────────
function ReportLoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1100]">
      <div
        className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4"
        style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}
      >
        <div className="w-12 h-12 rounded-full border-4 border-teal-100 border-t-teal-600 animate-spin" />
        <p className="text-sm font-bold text-gray-700">Loading your report…</p>
        <p className="text-xs text-gray-400">
          Fetching full attempt data for analytics
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENT CARD
// One row showing the assignment title, score bar, and status.
// The "View Report" button triggers the two-step data load.
// ─────────────────────────────────────────────────────────────
function AssignmentCard({ item, onViewReport, loadingId }) {
  const { assignment, myAttempt } = item;
  const assignmentId = assignment?._id || assignment?.id;
  const status  = myAttempt?.status || 'not_started';
  const sm      = STATUS_META[status] || STATUS_META.not_started;
  const isFetching = loadingId === assignmentId;

  const sectionCount = (assignment.sections || []).length;
  const totalQ = (assignment.sections || []).reduce(
    (s, sec) =>
      s + sec.modules.reduce((ms, m) => ms + (m.questions?.length || 0), 0),
    0,
  );

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
      {/* Test-type icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}
      >
        {assignment.assignmentType === 'diagnostic' ? '🩺' : '📝'}
      </div>

      {/* Assignment info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-gray-900 truncate">
          {assignment.title || 'Untitled'}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-400">
            {sectionCount} section{sectionCount !== 1 ? 's' : ''}
          </span>
          <span className="text-[11px] text-gray-400">{totalQ} questions</span>
          {assignment.assignmentType === 'diagnostic' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
              Diagnostic
            </span>
          )}
          {assignment.dueDate && (
            <span className="text-[11px] text-gray-400">
              Due{' '}
              {new Date(assignment.dueDate).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Score bar — only for completed attempts */}
        {status === 'completed' && myAttempt && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width:      `${myAttempt.percentage || 0}%`,
                  background: myAttempt.passed ? '#10b981' : '#ef4444',
                }}
              />
            </div>
            <span className="text-xs font-bold text-gray-600">
              {myAttempt.percentage || 0}%
            </span>
            <span className="text-xs text-gray-400">
              {myAttempt.score ?? '—'}/{myAttempt.maxScore ?? '—'} pts
            </span>
            {myAttempt.completedAt && (
              <span className="text-[11px] text-gray-400">
                ·{' '}
                {new Date(myAttempt.completedAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short',
                })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: status badge + pass/fail + View Report */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: sm.bg, color: sm.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sm.dot }} />
          {sm.label}
        </span>

        {status === 'completed' && myAttempt && (
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
              myAttempt.passed
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {myAttempt.passed ? '✓ Pass' : '✗ Fail'}
          </span>
        )}

        {status === 'completed' && (
          <button
            onClick={() => onViewReport(item)}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-60 transition-colors"
          >
            {isFetching ? (
              /* Spinner on the button while fetching */
              <>
                <span className="w-3 h-3 rounded-full border-2 border-teal-300 border-t-teal-700 animate-spin" />
                Loading…
              </>
            ) : (
              'View Report'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STUDENT ASSIGNMENTS PAGE (default export)
// ─────────────────────────────────────────────────────────────
export default function StudentAssignmentsPage() {
  const { user } = useAuth();

  const [mainTab, setMainTab] = useState('regular'); // 'regular' | 'sat'
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('all');

  // Report modal state
  const [reportItem,    setReportItem]    = useState(null);  // { assignment, myAttempt }
  const [loadingId,     setLoadingId]     = useState(null);  // assignment id being fetched
  const [reportError,   setReportError]   = useState('');    // fetch error inside modal

  // In-memory cache: { [assignmentId]: { data: { assignment, myAttempt }, ts } }
  // Lives in a ref so writes don't trigger re-renders.
  const reportCache = useRef({});

  // ── Derived student ID ────────────────────────────────────
  const studentId = user?._id || user?.id;

  // ── Fetch the assignment list ─────────────────────────────
  // This is a lightweight call that returns titles + basic attempt
  // status. Full answer data is NOT required here — that is fetched
  // on demand when the student opens a report.
  const loadAssignments = useCallback(() => {
    if (!studentId) { setLoading(false); return; }

    setLoading(true);
    setError('');

    studentAssignmentService
      .getMyAssignments(studentId)
      .then((data) => {
        // Backend may return: array | { assignments: [] } | { data: [] }
        const raw = Array.isArray(data)
          ? data
          : (data.assignments || data.data || []);

        // Normalise so report modal always has canonical id keys
        const normalised = raw.map((item) => {
          const assignment = normaliseAssignment(item.assignment || item);
          const myAttempt  =
            item.myAttempt ||
            extractMyAttempt(item.assignment || item, studentId);
          return { assignment, myAttempt };
        });

        setItems(normalised);
      })
      .catch(() =>
        setError('Could not load assignments. Check your connection and try again.'),
      )
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  // ── handleViewReport ──────────────────────────────────────
  // Two-step report load (same pattern as OpsExploreTestsPage):
  //
  //  Step 1 — Check if this report is already cached and fresh.
  //           If yes, open instantly from cache.
  //
  //  Step 2 — If not cached (or stale), call getProgress(:id)
  //           which returns the FULL attempt object including:
  //             sectionResults[].modules[].answers[questionId]
  //           This is what computeTopicMastery() needs to produce
  //           non-empty mastery data so all 4 tabs appear.
  //
  //  The button shows an inline spinner while fetching (loadingId).
  //  If fetch fails, fall back to whatever data the list gave us
  //  (report opens but mastery/charts may be limited).
  const handleViewReport = useCallback(async (item) => {
    const assignmentId = item.assignment?._id || item.assignment?.id;
    if (!assignmentId) return;

    setReportError('');

    // ── Cache hit: open instantly ────────────────────────────
    const cached = reportCache.current[assignmentId];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setReportItem(cached.data);
      return;
    }

    // ── If attempt already has full answer data, skip fetch ──
    if (attemptHasAnswers(item.myAttempt)) {
      const data = { assignment: item.assignment, myAttempt: item.myAttempt };
      reportCache.current[assignmentId] = { data, ts: Date.now() };
      setReportItem(data);
      return;
    }

    // ── Fetch full progress data ─────────────────────────────
    setLoadingId(assignmentId);
    try {
      const res         = await studentAssignmentService.getProgress(assignmentId);
      const raw         = res.data || res;
      const fullAssign  = normaliseAssignment(raw);

      // Extract this student's attempt from the full progress response
      const myFullAttempt = extractMyAttempt(fullAssign, studentId);

      const reportData = {
        assignment: fullAssign,
        // Use full attempt if found; otherwise fall back to the list summary
        myAttempt:  myFullAttempt || item.myAttempt,
      };

      // Write to cache
      reportCache.current[assignmentId] = { data: reportData, ts: Date.now() };
      setReportItem(reportData);
    } catch (e) {
      // Graceful fallback: open the report with whatever data we have.
      // Mastery/Charts tabs may be empty but Questions tab will still work.
      setReportError(
        'Could not load full analytics — showing available data.',
      );
      setReportItem({ assignment: item.assignment, myAttempt: item.myAttempt });
    } finally {
      setLoadingId(null);
    }
  }, [studentId]);

  // ── Filter helpers ────────────────────────────────────────
  const filtered = filter === 'all'
    ? items
    : items.filter(
        (item) => (item.myAttempt?.status || 'not_started') === filter,
      );

  const counts = {
    all:         items.length,
    completed:   items.filter((i) => i.myAttempt?.status === 'completed').length,
    in_progress: items.filter((i) => i.myAttempt?.status === 'in_progress').length,
    not_started: items.filter(
      (i) => !i.myAttempt || i.myAttempt.status === 'not_started',
    ).length,
  };

  // ── Page loading state ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-gray-400">
        <div className="w-8 h-8 rounded-full border-[3px] border-gray-200 border-t-teal-500 animate-spin" />
        <p className="text-sm">Loading assignments…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/60">
      {/* ── Page header ── */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 shrink-0 space-y-3">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">My Assignments</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {counts.completed} completed · {counts.in_progress} in progress ·{' '}
            {counts.not_started} not started
          </p>
        </div>
        {/* ── Main tab bar ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { key: 'regular', label: 'Custom Assignments' },
            { key: 'sat',     label: 'SAT Tests' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={`px-4 py-1.5 rounded-[10px] text-xs font-bold transition-all ${
                mainTab === t.key ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {mainTab === 'sat' ? (
          <SatStudentTab />
        ) : (
          <>
            {/* ── List load error ── */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={loadAssignments}
                  className="text-red-600 font-bold text-xs underline ml-3 shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── Report fetch partial error (non-blocking) ── */}
            {reportError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
                <span>⚠ {reportError}</span>
                <button
                  onClick={() => setReportError('')}
                  className="text-amber-600 font-bold text-sm ml-3 shrink-0"
                >
                  ×
                </button>
              </div>
            )}

            {/* ── Filter tab bar ── */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
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
                      ? 'bg-white text-teal-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Analytics info banner ── */}
            {counts.completed > 0 && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-base shrink-0 mt-0.5">📊</span>
                <p className="text-[12px] text-indigo-700 leading-relaxed">
                  <span className="font-bold">Full analytics available</span> for completed
                  assignments — click <strong>View Report</strong> to see Topic Mastery,
                  Charts, AI-generated performance summary, and download your report.
                </p>
              </div>
            )}

            {/* ── Assignment list ── */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-5xl mb-3">📭</span>
                <h3 className="text-base font-extrabold text-gray-700 mb-1">
                  {filter === 'all'
                    ? 'No assignments yet'
                    : `No ${filter.replace('_', ' ')} assignments`}
                </h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  {filter === 'all'
                    ? 'Your mentor will assign tests here. Check back soon!'
                    : 'Try switching to a different filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((item, idx) => (
                  <AssignmentCard
                    key={item.assignment?._id || item.assignment?.id || idx}
                    item={item}
                    onViewReport={handleViewReport}
                    loadingId={loadingId}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Report fetch loading overlay ── */}
      {/* Shown while getProgress is in flight (before the modal opens) */}
      {loadingId && <ReportLoadingOverlay />}

      {/* ── Full analytics report modal ── */}
      {/* Opens only once we have the complete attempt data.
          StudentReportModal has all 4 tabs:
            Questions · Topic Mastery · Charts · AI Summary       */}
      {reportItem && reportItem.myAttempt && (
        <StudentReportModal
          attempt={reportItem.myAttempt}
          assignment={reportItem.assignment}
          onClose={() => { setReportItem(null); setReportError(''); }}
          isStudentView={true}
        />
      )}
    </div>
  );
}
