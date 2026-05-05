import { useState, useEffect, useCallback } from 'react';
import { satAdminService } from '../../../services/api';

const inputCls  = 'h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary bg-white w-full';
const labelCls  = 'text-xs font-semibold text-gray-700';
const numCls    = 'h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary bg-white w-20 text-center';

const SUBJ_STYLE = { math: 'bg-purple-100 text-purple-700', reading_writing: 'bg-blue-100 text-blue-700' };
const SUBJ_LABEL = { math: 'Math', reading_writing: 'Reading & Writing' };

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyModuleCfg = () => ({ total_questions: '', time_limit_minutes: '', difficulty_distribution: { easy: '', medium: '', hard: '' } });

const ModuleConfigRow = ({ label, value, onChange }) => (
  <div className="bg-gray-50 rounded-[12px] p-4 flex flex-col gap-3">
    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</p>
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Total Questions</label>
        <input type="number" min="1" className={numCls} value={value.total_questions}
          onChange={e => onChange({ ...value, total_questions: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Time (minutes)</label>
        <input type="number" min="1" className={numCls} value={value.time_limit_minutes}
          onChange={e => onChange({ ...value, time_limit_minutes: e.target.value })} />
      </div>
    </div>
    <div>
      <label className={`${labelCls} block mb-1.5`}>Difficulty Distribution (# of questions)</label>
      <div className="flex items-center gap-3">
        {['easy', 'medium', 'hard'].map(d => (
          <div key={d} className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{d}</span>
            <input type="number" min="0" className={numCls} value={value.difficulty_distribution[d]}
              onChange={e => onChange({ ...value, difficulty_distribution: { ...value.difficulty_distribution, [d]: e.target.value } })} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Create Subject Config Modal ───────────────────────────────────────────────
function CreateSubjectModal({ onClose, onSaved, existing }) {
  const [form, setForm] = useState({
    name:               existing?.name               || '',
    subject:            existing?.subject            || 'math',
    adaptive_threshold: existing?.adaptive_threshold ?? 60,
    module_1:           existing?.module_1      ? { ...existing.module_1, difficulty_distribution: { ...existing.module_1.difficulty_distribution } }      : emptyModuleCfg(),
    module_2_hard:      existing?.module_2_hard ? { ...existing.module_2_hard, difficulty_distribution: { ...existing.module_2_hard.difficulty_distribution } } : emptyModuleCfg(),
    module_2_easy:      existing?.module_2_easy ? { ...existing.module_2_easy, difficulty_distribution: { ...existing.module_2_easy.difficulty_distribution } } : emptyModuleCfg(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const toNum = (v) => Number(v);
  const buildPayload = () => ({
    name:               form.name,
    subject:            form.subject,
    adaptive_threshold: toNum(form.adaptive_threshold),
    module_1: { total_questions: toNum(form.module_1.total_questions), time_limit_minutes: toNum(form.module_1.time_limit_minutes), difficulty_distribution: { easy: toNum(form.module_1.difficulty_distribution.easy), medium: toNum(form.module_1.difficulty_distribution.medium), hard: toNum(form.module_1.difficulty_distribution.hard) } },
    module_2_hard: { total_questions: toNum(form.module_2_hard.total_questions), time_limit_minutes: toNum(form.module_2_hard.time_limit_minutes), difficulty_distribution: { easy: toNum(form.module_2_hard.difficulty_distribution.easy), medium: toNum(form.module_2_hard.difficulty_distribution.medium), hard: toNum(form.module_2_hard.difficulty_distribution.hard) } },
    module_2_easy: { total_questions: toNum(form.module_2_easy.total_questions), time_limit_minutes: toNum(form.module_2_easy.time_limit_minutes), difficulty_distribution: { easy: toNum(form.module_2_easy.difficulty_distribution.easy), medium: toNum(form.module_2_easy.difficulty_distribution.medium), hard: toNum(form.module_2_easy.difficulty_distribution.hard) } },
  });

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setLoading(true); setError('');
    try {
      if (existing) await satAdminService.updateExamConfig(existing._id, buildPayload());
      else          await satAdminService.createExamConfig(buildPayload());
      onSaved();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">{existing ? 'Edit' : 'Create'} Subject Practice Test</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Name + Subject + Threshold */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className={labelCls}>Test Name</label>
              <input className={inputCls} placeholder="e.g. SAT Math - Practice Test 1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Subject</label>
              <select className={inputCls} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                <option value="math">Math</option>
                <option value="reading_writing">Reading & Writing</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Adaptive Threshold (%)</label>
              <input type="number" min="0" max="100" className={inputCls} placeholder="60" value={form.adaptive_threshold} onChange={e => setForm(f => ({ ...f, adaptive_threshold: e.target.value }))} />
              <p className="text-[10px] text-gray-400">Score ≥ threshold on M1 → Hard M2. Below → Easy M2.</p>
            </div>
          </div>

          {/* Module configs */}
          <ModuleConfigRow label="Module 1 (same for everyone)" value={form.module_1} onChange={v => setForm(f => ({ ...f, module_1: v }))} />
          <ModuleConfigRow label="Module 2 — Hard Tier" value={form.module_2_hard} onChange={v => setForm(f => ({ ...f, module_2_hard: v }))} />
          <ModuleConfigRow label="Module 2 — Easy Tier" value={form.module_2_easy} onChange={v => setForm(f => ({ ...f, module_2_easy: v }))} />

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving…' : existing ? 'Save Changes' : 'Create Test'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Full Length Modal ──────────────────────────────────────────────────
function CreateFullLengthModal({ onClose, onSaved, existing, subjectConfigs }) {
  const mathConfigs = subjectConfigs.filter(c => c.subject === 'math');
  const rwConfigs   = subjectConfigs.filter(c => c.subject === 'reading_writing');

  const [form, setForm] = useState({
    name:                existing?.name || '',
    math_exam_config_id: existing?.math_exam_config_id?._id || existing?.math_exam_config_id || '',
    rw_exam_config_id:   existing?.rw_exam_config_id?._id   || existing?.rw_exam_config_id   || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSave = async () => {
    if (!form.name.trim())                { setError('Name is required'); return; }
    if (!form.math_exam_config_id)        { setError('Math config is required'); return; }
    if (!form.rw_exam_config_id)          { setError('R&W config is required'); return; }
    setLoading(true); setError('');
    try {
      if (existing) await satAdminService.updateFullLengthConfig(existing._id, form);
      else          await satAdminService.createFullLengthConfig(form);
      onSaved();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{existing ? 'Edit' : 'Create'} Full Length Test</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Test Name</label>
            <input className={inputCls} placeholder="e.g. SAT Full Length - Practice Test 1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Math Practice Test</label>
            <select className={inputCls} value={form.math_exam_config_id} onChange={e => setForm(f => ({ ...f, math_exam_config_id: e.target.value }))}>
              <option value="">Select math test…</option>
              {mathConfigs.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Reading & Writing Practice Test</label>
            <select className={inputCls} value={form.rw_exam_config_id} onChange={e => setForm(f => ({ ...f, rw_exam_config_id: e.target.value }))}>
              <option value="">Select R&W test…</option>
              {rwConfigs.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-[10px] p-3">
            A full length test runs both subject tests back-to-back. Module 2 for each subject adapts independently based on its own Module 1 score.
          </p>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving…' : existing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Config Card ───────────────────────────────────────────────────────────────
function SubjectConfigCard({ config, onEdit }) {
  const { module_1: m1, module_2_hard: m2h, module_2_easy: m2e } = config;
  return (
    <div className="bg-white rounded-[14px] border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{config.name}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SUBJ_STYLE[config.subject]}`}>{SUBJ_LABEL[config.subject]}</span>
            <span className="text-xs text-gray-400">Threshold: <strong className="text-gray-700">{config.adaptive_threshold}%</strong></span>
          </div>
        </div>
        <button onClick={() => onEdit(config)} className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 shrink-0">Edit</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Module 1', cfg: m1, color: 'border-gray-200' },
          { label: 'M2 Hard', cfg: m2h, color: 'border-red-200 bg-red-50/40' },
          { label: 'M2 Easy', cfg: m2e, color: 'border-green-200 bg-green-50/40' },
        ].map(({ label, cfg, color }) => (
          <div key={label} className={`rounded-[10px] border p-3 ${color}`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">{label}</p>
            <p className="text-xs text-gray-700"><strong>{cfg?.total_questions}Q</strong> · {cfg?.time_limit_minutes}min</p>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {['easy', 'medium', 'hard'].map(d => (
                cfg?.difficulty_distribution?.[d] > 0 && (
                  <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {cfg.difficulty_distribution[d]}{d[0].toUpperCase()}
                  </span>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullLengthCard({ config, onEdit }) {
  const math = config.math_exam_config_id;
  const rw   = config.rw_exam_config_id;
  return (
    <div className="bg-white rounded-[14px] border border-gray-200 p-5 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-gray-900 text-sm">{config.name}</h3>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-purple-50 rounded-[8px] px-2.5 py-1">
            <span className="text-[10px] font-bold text-purple-600 uppercase">Math</span>
            <span className="text-xs text-gray-600">{typeof math === 'object' ? math?.name : 'Linked'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 rounded-[8px] px-2.5 py-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase">R&W</span>
            <span className="text-xs text-gray-600">{typeof rw === 'object' ? rw?.name : 'Linked'}</span>
          </div>
        </div>
      </div>
      <button onClick={() => onEdit(config)} className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 shrink-0">Edit</button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SatExamConfigsPage() {
  const [subjectConfigs, setSubjectConfigs]   = useState([]);
  const [fullConfigs, setFullConfigs]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [tab, setTab]                         = useState('subject');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showFullModal, setShowFullModal]       = useState(false);
  const [editing, setEditing]                   = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sc, fl] = await Promise.all([
        satAdminService.getExamConfigs(),
        satAdminService.getFullLengthConfigs(),
      ]);
      setSubjectConfigs(sc.data);
      setFullConfigs(fl.data);
    } catch {
      console.error("Failed to load");
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleEditSubject = (cfg) => { setEditing(cfg); setShowSubjectModal(true); };
  const handleEditFull    = (cfg) => { setEditing(cfg); setShowFullModal(true); };

  const mathCount = subjectConfigs.filter(c => c.subject === 'math').length;
  const rwCount   = subjectConfigs.filter(c => c.subject === 'reading_writing').length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SAT Exam Configurations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define module rules, difficulty ratios, and adaptive thresholds</p>
        </div>
        <button
          onClick={() => { setEditing(null); tab === 'subject' ? setShowSubjectModal(true) : setShowFullModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          + New {tab === 'subject' ? 'Subject Test' : 'Full Length Test'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Math Tests',    val: mathCount,           icon: '📐' },
          { label: 'R&W Tests',     val: rwCount,             icon: '📖' },
          { label: 'Full Length',   val: fullConfigs.length,  icon: '📋' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-[14px] border border-gray-200 p-4 flex items-center gap-3">
            <span className="text-2xl">{c.icon}</span>
            <div>
              <div className="text-2xl font-bold text-ops-primary">{c.val}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-[12px] p-1 w-fit">
        {[{ key: 'subject', label: 'Subject Practice Tests' }, { key: 'full', label: 'Full Length Tests' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-[10px] text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-ops-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-[14px] animate-pulse" />)}
        </div>
      ) : tab === 'subject' ? (
        subjectConfigs.length === 0 ? (
          <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">⚙️</p>
            <p className="font-semibold text-gray-600">No subject tests configured yet</p>
            <p className="text-sm mt-1">Create a practice test to define module rules and difficulty distribution</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {subjectConfigs.map(c => <SubjectConfigCard key={c._id} config={c} onEdit={handleEditSubject} />)}
          </div>
        )
      ) : (
        fullConfigs.length === 0 ? (
          <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-gray-600">No full length tests configured yet</p>
            <p className="text-sm mt-1">Create a full length test by linking a math and R&W subject test</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fullConfigs.map(c => <FullLengthCard key={c._id} config={c} onEdit={handleEditFull} />)}
          </div>
        )
      )}

      {showSubjectModal && (
        <CreateSubjectModal
          onClose={() => { setShowSubjectModal(false); setEditing(null); }}
          onSaved={loadAll}
          existing={editing}
        />
      )}
      {showFullModal && (
        <CreateFullLengthModal
          onClose={() => { setShowFullModal(false); setEditing(null); }}
          onSaved={loadAll}
          existing={editing}
          subjectConfigs={subjectConfigs}
        />
      )}
    </div>
  );
}
