import { useState, useEffect, useCallback } from 'react';
import { satAdminService } from '../../../services/api';

const inputCls = 'h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary bg-white w-full';
const labelCls = 'text-xs font-semibold text-gray-700';
const numCls   = 'h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary bg-white w-20 text-center';

const SUBJ_STYLE = { math: 'bg-purple-100 text-purple-700', reading_writing: 'bg-blue-100 text-blue-700' };
const SUBJ_LABEL = { math: 'Math', reading_writing: 'Reading & Writing' };

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyM1 = () => ({
  total_questions: '',
  time_limit_minutes: '',
  difficulty_distribution: { easy: '', medium: '', hard: '' },
});

// SAT industry-standard default score bands for Module 2
const defaultBands = () => [
  { min_score: 70, label: 'Hard Tier',   easy_pct: 10, medium_pct: 30, hard_pct: 60 },
  { min_score: 40, label: 'Medium Tier', easy_pct: 30, medium_pct: 50, hard_pct: 20 },
  { min_score: 0,  label: 'Easy Tier',   easy_pct: 60, medium_pct: 30, hard_pct: 10 },
];

const diffSum = (dd)  => Number(dd.easy || 0) + Number(dd.medium || 0) + Number(dd.hard || 0);
const bandPct = (b)   => Number(b.easy_pct || 0) + Number(b.medium_pct || 0) + Number(b.hard_pct || 0);

// ── Module 1 Config ───────────────────────────────────────────────────────────
function Module1Config({ value, onChange }) {
  const total    = Number(value.total_questions) || 0;
  const used     = diffSum(value.difficulty_distribution);
  const exceeded = total > 0 && used > total;

  return (
    <div className={`bg-gray-50 rounded-[12px] p-4 flex flex-col gap-3 ${exceeded ? 'ring-1 ring-red-400' : ''}`}>
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Module 1 — Same for Everyone</p>

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
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>Difficulty Distribution (# of questions)</label>
          {total > 0 && (
            <span className={`text-[10px] font-semibold ${exceeded ? 'text-red-600' : 'text-gray-400'}`}>
              {used}/{total}{exceeded ? ' — exceeds total!' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {['easy', 'medium', 'hard'].map(d => (
            <div key={d} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize
                ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {d}
              </span>
              <input type="number" min="0"
                className={`${numCls} ${exceeded ? 'border-red-300' : ''}`}
                value={value.difficulty_distribution[d]}
                onChange={e => onChange({ ...value, difficulty_distribution: { ...value.difficulty_distribution, [d]: e.target.value } })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Score Band Row (one row in the Module 2 table) ────────────────────────────
function ScoreBandRow({ band, onChange, onRemove, canRemove, m1Total }) {
  const sum   = bandPct(band);
  const valid = sum === 100;

  return (
    <div className={`flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-[10px] border bg-white
      ${valid ? 'border-gray-200' : 'border-red-200 bg-red-50/20'}`}>

      {/* Score threshold */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-gray-500 font-medium">Score ≥</span>
        <input
          type="number" min="0" max="100"
          className="h-8 w-14 px-2 rounded-[8px] border border-gray-200 text-sm text-center focus:outline-none focus:border-ops-primary"
          value={band.min_score}
          onChange={e => onChange({ ...band, min_score: e.target.value })}
        />
        <span className="text-xs text-gray-400">%</span>
      </div>

      {/* Tier label */}
      <input
        className="h-8 px-2 rounded-[8px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary w-28"
        placeholder="e.g. Hard Tier"
        value={band.label}
        onChange={e => onChange({ ...band, label: e.target.value })}
      />

      {/* Distribution percentages + derived question counts */}
      <div className="flex items-center gap-3 ml-auto">
        {['easy', 'medium', 'hard'].map(d => {
          const pctKey = `${d}_pct`;
          const qCount = m1Total > 0 ? Math.round(m1Total * Number(band[pctKey] || 0) / 100) : null;
          return (
            <div key={d} className="flex flex-col items-center gap-0.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize
                ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {d}
              </span>
              <div className="flex items-center gap-0.5">
                <input
                  type="number" min="0" max="100"
                  className="h-8 w-12 px-1 rounded-[8px] border border-gray-200 text-sm text-center focus:outline-none focus:border-ops-primary"
                  value={band[pctKey]}
                  onChange={e => onChange({ ...band, [pctKey]: e.target.value })}
                />
                <span className="text-[10px] text-gray-400">%</span>
              </div>
              {qCount !== null && (
                <span className="text-[9px] text-gray-400">{qCount}Q</span>
              )}
            </div>
          );
        })}

        {/* Sum indicator */}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0
          ${valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
          = {sum}%{valid ? ' ✓' : ''}
        </span>

        {/* Remove */}
        {canRemove && (
          <button
            onClick={onRemove}
            className="w-6 h-6 rounded-[6px] bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 text-sm font-bold flex items-center justify-center">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ── Module 2 Config ───────────────────────────────────────────────────────────
function Module2Config({ time, onTimeChange, bands, onBandsChange, m1Total }) {
  const updateBand = (i, updated) => {
    const next = [...bands];
    next[i] = updated;
    onBandsChange(next);
  };

  const removeBand = (i) => onBandsChange(bands.filter((_, idx) => idx !== i));

  const addBand = () =>
    onBandsChange([...bands, { min_score: 0, label: '', easy_pct: 34, medium_pct: 33, hard_pct: 33 }]);

  return (
    <div className="bg-gray-50 rounded-[12px] p-4 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Module 2 — Adaptive</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Total is always inherited from M1 */}
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Total Questions</label>
          <div className="h-9 w-20 flex items-center justify-center rounded-[10px] border border-gray-200 text-sm bg-gray-100 text-gray-400 select-none">
            {m1Total > 0 ? m1Total : '—'}
          </div>
          <p className="text-[10px] text-gray-400">Inherited from M1</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Time (minutes)</label>
          <input type="number" min="1" className={numCls} value={time}
            onChange={e => onTimeChange(e.target.value)} />
        </div>
      </div>

      {/* Score band table */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls}>Score-Based Distribution</label>
          <button
            onClick={addBand}
            className="text-[10px] font-semibold text-ops-primary hover:underline">
            + Add Tier
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mb-2">
          Based on the student's Module 1 score, Module 2 applies the matching tier's distribution.
          Easy + Medium + Hard must sum to 100% per tier.
          {m1Total > 0 && <> Question counts shown below each % are based on {m1Total} total questions.</>}
        </p>

        {/* Column headers */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-1 mb-1">
          <span className="text-[10px] text-gray-400 w-28">Score threshold</span>
          <span className="text-[10px] text-gray-400 w-28">Tier label</span>
          <div className="flex items-center gap-3 ml-auto">
            {['easy', 'medium', 'hard'].map(d => (
              <span key={d} className="text-[10px] text-gray-400 w-16 text-center">{d} %</span>
            ))}
            <span className="w-12" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {bands.map((band, i) => (
            <ScoreBandRow
              key={i}
              band={band}
              onChange={updated => updateBand(i, updated)}
              onRemove={() => removeBand(i)}
              canRemove={bands.length > 1}
              m1Total={m1Total}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Create / Edit Subject Config Modal ────────────────────────────────────────
function CreateSubjectModal({ onClose, onSaved, existing }) {
  const [form, setForm] = useState({
    name:    existing?.name    || '',
    subject: existing?.subject || 'math',
    module_1: existing?.module_1
      ? { ...existing.module_1, difficulty_distribution: { ...existing.module_1.difficulty_distribution } }
      : emptyM1(),
    module_2_time: existing?.module_2?.time_limit_minutes
      || existing?.module_2_hard?.time_limit_minutes
      || '',
    // Prefer the new score_bands if present; otherwise derive from the three legacy fields
    score_bands: existing?.module_2?.score_bands || (() => {
      if (!existing?.module_2_hard) return defaultBands();
      const m1Total = existing.module_1?.total_questions || 1;
      const toPct = (count) => Math.round((count / m1Total) * 100);
      const toBand = (mod, label, min_score) => ({
        min_score,
        label,
        easy_pct:   toPct(mod.difficulty_distribution?.easy   || 0),
        medium_pct: toPct(mod.difficulty_distribution?.medium || 0),
        hard_pct:   toPct(mod.difficulty_distribution?.hard   || 0),
      });
      return [
        toBand(existing.module_2_hard,   'Hard Tier',   existing.adaptive_threshold ?? 70),
        toBand(existing.module_3_medium, 'Medium Tier', Math.floor((existing.adaptive_threshold ?? 70) / 2)),
        toBand(existing.module_2_easy,   'Easy Tier',   0),
      ];
    })(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const m1Total = Number(form.module_1.total_questions) || 0;

  const validate = () => {
    if (!form.name.trim()) return 'Test name is required.';
    const m1   = form.module_1;
    const total = Number(m1.total_questions);
    const used  = diffSum(m1.difficulty_distribution);
    if (!total || total < 1)          return 'Module 1: Total Questions is required.';
    if (!Number(m1.time_limit_minutes)) return 'Module 1: Time is required.';
    if (used > total)                 return `Module 1: distribution (${used}) exceeds total questions (${total}).`;
    if (!Number(form.module_2_time))  return 'Module 2: Time is required.';
    if (!form.score_bands.length)     return 'Module 2: at least one score tier is required.';
    for (const [i, b] of form.score_bands.entries()) {
      const s = bandPct(b);
      if (s !== 100) return `Tier ${i + 1} "${b.label || 'Untitled'}": Easy + Medium + Hard must equal 100% (currently ${s}%).`;
    }
    return null;
  };

  const buildPayload = () => {
    const toNum   = (v) => Number(v);
    const total   = toNum(form.module_1.total_questions);
    const m2Time  = toNum(form.module_2_time);

    // Sort bands highest-score-first
    const sorted = [...form.score_bands]
      .sort((a, b) => Number(b.min_score) - Number(a.min_score));

    // Convert a score band → legacy module block (actual question counts from %)
    const bandToModule = (b) => ({
      total_questions:    total,
      time_limit_minutes: m2Time,
      difficulty_distribution: {
        easy:   Math.round(total * toNum(b.easy_pct)   / 100),
        medium: Math.round(total * toNum(b.medium_pct) / 100),
        hard:   Math.round(total * toNum(b.hard_pct)   / 100),
      },
    });

    // Map bands to the three legacy slots the backend requires:
    //   highest threshold → hard tier
    //   middle            → medium tier
    //   lowest threshold  → easy tier
    const hardBand   = sorted[0];
    const easyBand   = sorted[sorted.length - 1];
    const mediumBand = sorted[Math.floor((sorted.length - 1) / 2)];

    return {
      name:               form.name,
      subject:            form.subject,
      adaptive_threshold: toNum(hardBand.min_score), // threshold that triggers the hard tier
      module_1: {
        total_questions:    total,
        time_limit_minutes: toNum(form.module_1.time_limit_minutes),
        difficulty_distribution: {
          easy:   toNum(form.module_1.difficulty_distribution.easy),
          medium: toNum(form.module_1.difficulty_distribution.medium),
          hard:   toNum(form.module_1.difficulty_distribution.hard),
        },
      },
      // Legacy fields required by the current backend schema
      module_2_hard:   bandToModule(hardBand),
      module_2_easy:   bandToModule(easyBand),
      module_3_medium: bandToModule(mediumBand),
      // New field — forward-compatible once the backend is updated
      module_2: {
        total_questions:    total,
        time_limit_minutes: m2Time,
        score_bands: sorted.map(b => ({
          min_score:  toNum(b.min_score),
          label:      b.label,
          easy_pct:   toNum(b.easy_pct),
          medium_pct: toNum(b.medium_pct),
          hard_pct:   toNum(b.hard_pct),
        })),
      },
    };
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
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
          {/* Name + Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className={labelCls}>Test Name</label>
              <input className={inputCls} placeholder="e.g. SAT Math — Practice Test 1"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Subject</label>
              <select className={inputCls} value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                <option value="math">Math</option>
                <option value="reading_writing">Reading & Writing</option>
              </select>
            </div>
          </div>

          {/* Module 1 */}
          <Module1Config
            value={form.module_1}
            onChange={m1 => setForm(f => ({ ...f, module_1: m1 }))}
          />

          {/* Module 2 */}
          <Module2Config
            time={form.module_2_time}
            onTimeChange={t => setForm(f => ({ ...f, module_2_time: t }))}
            bands={form.score_bands}
            onBandsChange={bands => setForm(f => ({ ...f, score_bands: bands }))}
            m1Total={m1Total}
          />

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
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
    if (!form.name.trim())         { setError('Name is required'); return; }
    if (!form.math_exam_config_id) { setError('Math config is required'); return; }
    if (!form.rw_exam_config_id)   { setError('R&W config is required'); return; }
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
            <input className={inputCls} placeholder="e.g. SAT Full Length — Practice Test 1"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Math Practice Test</label>
            <select className={inputCls} value={form.math_exam_config_id}
              onChange={e => setForm(f => ({ ...f, math_exam_config_id: e.target.value }))}>
              <option value="">Select math test…</option>
              {mathConfigs.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Reading & Writing Practice Test</label>
            <select className={inputCls} value={form.rw_exam_config_id}
              onChange={e => setForm(f => ({ ...f, rw_exam_config_id: e.target.value }))}>
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
          <button onClick={handleSave} disabled={loading}
            className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving…' : existing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subject Config Card ───────────────────────────────────────────────────────
function SubjectConfigCard({ config, onEdit }) {
  const m1     = config.module_1;
  const m2     = config.module_2;
  const bands  = m2?.score_bands
    ? [...m2.score_bands].sort((a, b) => Number(b.min_score) - Number(a.min_score))
    : [];

  return (
    <div className="bg-white rounded-[14px] border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{config.name}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SUBJ_STYLE[config.subject]}`}>
              {SUBJ_LABEL[config.subject]}
            </span>
          </div>
        </div>
        <button onClick={() => onEdit(config)}
          className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 shrink-0">
          Edit
        </button>
      </div>

      {/* Module 1 summary */}
      <div className="rounded-[10px] border border-gray-200 p-3">
        <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Module 1</p>
        <p className="text-xs text-gray-700"><strong>{m1?.total_questions}Q</strong> · {m1?.time_limit_minutes}min</p>
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {['easy', 'medium', 'hard'].map(d =>
            m1?.difficulty_distribution?.[d] > 0 && (
              <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded
                ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {m1.difficulty_distribution[d]}{d[0].toUpperCase()}
              </span>
            )
          )}
        </div>
      </div>

      {/* Module 2 score bands summary */}
      {m2 && (
        <div className="rounded-[10px] border border-gray-200 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Module 2 — Adaptive</p>
            <span className="text-[10px] text-gray-400">{m2.time_limit_minutes}min · {m2.total_questions}Q</span>
          </div>
          {bands.map((b, i) => {
            const total = m2.total_questions || 0;
            return (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="text-gray-500 w-16 shrink-0">≥ {b.min_score}%</span>
                <span className="text-gray-700 font-medium w-20 truncate shrink-0">{b.label}</span>
                <div className="flex gap-1">
                  {[['easy','green'], ['medium','yellow'], ['hard','red']].map(([d, c]) => {
                    const pct = b[`${d}_pct`];
                    const q   = total ? Math.round(total * pct / 100) : 0;
                    return pct > 0 ? (
                      <span key={d} className={`px-1.5 py-0.5 rounded bg-${c}-100 text-${c}-700`}>
                        {pct}%·{q}Q
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
      <button onClick={() => onEdit(config)}
        className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 shrink-0">
        Edit
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SatExamConfigsPage() {
  const [subjectConfigs, setSubjectConfigs]     = useState([]);
  const [fullConfigs, setFullConfigs]           = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [tab, setTab]                           = useState('subject');
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
    } catch { console.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleEditSubject = (cfg) => { setEditing(cfg); setShowSubjectModal(true); };
  const handleEditFull    = (cfg) => { setEditing(cfg); setShowFullModal(true); };

  const mathCount = subjectConfigs.filter(c => c.subject === 'math').length;
  const rwCount   = subjectConfigs.filter(c => c.subject === 'reading_writing').length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SAT Exam Configurations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define module rules, difficulty ratios, and adaptive score bands</p>
        </div>
        <button
          onClick={() => { setEditing(null); tab === 'subject' ? setShowSubjectModal(true) : setShowFullModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
          + New {tab === 'subject' ? 'Subject Test' : 'Full Length Test'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Math Tests',  val: mathCount,          icon: '📐' },
          { label: 'R&W Tests',   val: rwCount,            icon: '📖' },
          { label: 'Full Length', val: fullConfigs.length, icon: '📋' },
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

      <div className="flex gap-1 bg-gray-100 rounded-[12px] p-1 w-fit">
        {[{ key: 'subject', label: 'Subject Practice Tests' }, { key: 'full', label: 'Full Length Tests' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-[10px] text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-ops-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-[14px] animate-pulse" />)}
        </div>
      ) : tab === 'subject' ? (
        subjectConfigs.length === 0 ? (
          <div className="bg-white rounded-[14px] border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">⚙️</p>
            <p className="font-semibold text-gray-600">No subject tests configured yet</p>
            <p className="text-sm mt-1">Create a practice test to define module rules and score-based adaptive distribution</p>
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
