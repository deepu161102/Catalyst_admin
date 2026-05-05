import { useState, useEffect, useCallback } from 'react';
import { satAdminService } from '../../../services/api';

const DIFF_STYLE = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard:   'bg-red-100 text-red-700',
};
const SUBJ_STYLE = {
  math:             'bg-purple-100 text-purple-700',
  reading_writing:  'bg-blue-100 text-blue-700',
};
const SUBJ_LABEL = { math: 'Math', reading_writing: 'R&W' };

const Badge = ({ label, cls }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${cls}`}>{label}</span>
);

const inputCls = 'h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary bg-white';

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onDone }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    if (!file) { setError('Please select a file'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await satAdminService.bulkUpload(fd);
      setResult(res.data);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Upload Question Bank</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-500">Upload a <strong>CSV or TSV</strong> file exported by the content team. Supports both comma and tab delimiters — no reformatting needed.</p>

              <div className="border-2 border-dashed border-gray-200 rounded-[12px] p-6 text-center">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm text-gray-600 mb-3">{file ? file.name : 'No file selected'}</p>
                <label className="cursor-pointer px-4 py-2 rounded-[10px] bg-ops-lighter text-ops-primary text-sm font-semibold hover:bg-ops-light transition-colors">
                  {file ? 'Change File' : 'Choose File'}
                  <input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={e => { setFile(e.target.files[0]); setError(''); }} />
                </label>
                <p className="text-xs text-gray-400 mt-2">Accepted columns: question, options, correct_answer, difficulty_level, subject, subtopic, skill, hint, explanation_correct, explanation_wrong, points, question_status</p>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}

              <div className="flex gap-3 justify-end">
                <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} disabled={loading || !file} className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Rows', val: result.total_rows, color: 'bg-gray-50' },
                  { label: 'Imported',   val: result.successful, color: 'bg-green-50 text-green-700' },
                  { label: 'Skipped',    val: result.failed,     color: 'bg-red-50 text-red-600' },
                ].map(c => (
                  <div key={c.label} className={`rounded-[12px] p-3 text-center ${c.color}`}>
                    <div className="text-2xl font-bold">{c.val}</div>
                    <div className="text-xs mt-0.5 text-gray-500">{c.label}</div>
                  </div>
                ))}
              </div>

              {result.row_errors?.length > 0 && (
                <div className="bg-red-50 rounded-[12px] p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-600 mb-2">Skipped rows:</p>
                  {result.row_errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500">Row {e.row_number}: {e.reason}</p>
                  ))}
                </div>
              )}

              <button onClick={onClose} className="w-full py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700">Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SatQuestionBankPage() {
  const [questions, setQuestions] = useState([]);
  const [stats, setStats]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const [filters, setFilters] = useState({ subject: '', difficulty: '', domain: '', search: '' });
  const LIMIT = 20;

  const loadStats = useCallback(async () => {
    try { const r = await satAdminService.getStats(); setStats(r.data); } catch {
      console.error("Failed to load");
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filters.subject)    params.subject    = filters.subject;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.domain)     params.domain     = filters.domain;
      const r = await satAdminService.getQuestions(params);
      setQuestions(r.data);
      setTotal(r.total);
    } catch {
      console.error("Failed to load");
    }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this question? It will no longer appear in tests.')) return;
    await satAdminService.deleteQuestion(id);
    loadQuestions();
    loadStats();
  };

  // Derive summary counts from stats
  const totalActive = stats.reduce((s, r) => s + r.count, 0);
  const mathTotal   = stats.filter(r => r._id.subject === 'math').reduce((s, r) => s + r.count, 0);
  const rwTotal     = stats.filter(r => r._id.subject === 'reading_writing').reduce((s, r) => s + r.count, 0);
  const byDiff      = ['easy', 'medium', 'hard'].map(d => ({ d, count: stats.filter(r => r._id.difficulty === d).reduce((s, r) => s + r.count, 0) }));

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SAT Question Bank</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and upload questions used for adaptive test assembly</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
          <span className="text-base">↑</span> Upload Questions
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Active', val: totalActive, icon: '📚', color: 'text-ops-primary' },
          { label: 'Math',         val: mathTotal,   icon: '📐', color: 'text-purple-600' },
          { label: 'Reading & Writing', val: rwTotal, icon: '📖', color: 'text-blue-600' },
          ...byDiff.map(({ d, count }) => ({ label: d.charAt(0).toUpperCase() + d.slice(1), val: count, icon: d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴', color: 'text-gray-700' })),
        ].slice(0, 4).map((c, i) => (
          <div key={i} className="bg-white rounded-[14px] border border-gray-200 p-4 flex items-center gap-3">
            <span className="text-2xl">{c.icon}</span>
            <div>
              <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Difficulty breakdown */}
      <div className="bg-white rounded-[14px] border border-gray-200 p-4 flex gap-6 items-center">
        <span className="text-sm font-semibold text-gray-600 shrink-0">By Difficulty:</span>
        {byDiff.map(({ d, count }) => (
          <div key={d} className="flex items-center gap-2">
            <Badge label={d} cls={DIFF_STYLE[d]} />
            <span className="text-sm font-bold text-gray-700">{count}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[14px] border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <select className={inputCls} value={filters.subject} onChange={e => { setFilters(f => ({ ...f, subject: e.target.value })); setPage(1); }}>
          <option value="">All Subjects</option>
          <option value="math">Math</option>
          <option value="reading_writing">Reading & Writing</option>
        </select>
        <select className={inputCls} value={filters.difficulty} onChange={e => { setFilters(f => ({ ...f, difficulty: e.target.value })); setPage(1); }}>
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <input className={`${inputCls} w-48`} placeholder="Filter by domain…" value={filters.domain} onChange={e => { setFilters(f => ({ ...f, domain: e.target.value })); setPage(1); }} />
        <span className="ml-auto text-sm text-gray-400">{total} question{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex flex-col gap-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-gray-600">No questions found</p>
            <p className="text-sm mt-1">Upload a file or adjust your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Question', 'Subject', 'Difficulty', 'Domain', 'Topic', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {questions.map(q => (
                <tr key={q._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-gray-900 font-medium truncate" title={q.title}>{q.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={SUBJ_LABEL[q.subject] || q.subject} cls={SUBJ_STYLE[q.subject] || 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={q.difficulty} cls={DIFF_STYLE[q.difficulty] || 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{q.domain}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{q.topic}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDeactivate(q._id)} className="px-3 py-1 rounded-[8px] text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors">
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { loadQuestions(); loadStats(); }} />}
    </div>
  );
}
