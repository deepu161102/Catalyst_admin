import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchService, studentService } from '../../../services/api';

const inputClass = 'w-full px-3 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 text-[13px] outline-none bg-white focus:border-ops-primary transition-colors';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

/* ── Add Student Modal ─────────────────────────────────────── */
function AddStudentModal({ batchId, onAdded, onClose }) {
  const [all, setAll]           = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    studentService.getAll()
      .then(res => setAll(res.data))
      .catch(err => setError(err.message));
  }, []);

  const available = all.filter(s => {
    const sid = s.batchId?._id?.toString() || s.batchId?.toString();
    return sid !== batchId;
  });

  const filtered = available.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(s => s._id)));
    }
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError('');
    try {
      await Promise.all([...selected].map(sid => batchService.addStudent(batchId, sid)));
      onAdded();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s._id));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] backdrop-blur-sm">
      <div className="bg-white rounded-[18px] w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Add Students to Batch</h3>
            {selected.size > 0 && (
              <p className="text-xs text-ops-primary font-semibold mt-0.5">{selected.size} student{selected.size !== 1 ? 's' : ''} selected</p>
            )}
          </div>
          <button className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-sm" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 border-b border-gray-100 shrink-0">
          <input
            className="w-full px-3 py-2 rounded-lg border-[1.5px] border-gray-200 text-[13px] outline-none bg-gray-50 focus:border-ops-primary transition-colors"
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded mx-4 mt-3 px-3 py-2">{error}</p>}

          {available.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No unassigned students found.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No students match your search.</p>
          ) : (
            <>
              {/* Select all row */}
              <div
                className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={toggleAll}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${allFilteredSelected ? 'bg-ops-primary border-ops-primary' : 'border-gray-300 bg-white'}`}>
                  {allFilteredSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="text-[12px] font-semibold text-gray-600">Select all ({filtered.length})</span>
              </div>

              {filtered.map(s => {
                const isChecked = selected.has(s._id);
                const batchLabel = s.batchId?.name ? `In: ${s.batchId.name}` : 'Unassigned';
                return (
                  <div
                    key={s._id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${isChecked ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                    onClick={() => toggle(s._id)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-ops-primary border-ops-primary' : 'border-gray-300 bg-white'}`}>
                      {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                      {initials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{s.email}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">{batchLabel}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 flex gap-2.5 justify-end shrink-0">
          <button className="px-5 py-2 rounded-[10px] bg-gray-100 text-gray-700 font-semibold text-[13px]" onClick={onClose}>Cancel</button>
          {available.length > 0 && (
            <button
              disabled={selected.size === 0 || saving}
              className="px-5 py-2 rounded-[10px] bg-ops-primary text-white font-semibold text-[13px] disabled:opacity-40"
              onClick={handleAdd}
            >
              {saving ? 'Adding...' : `Add ${selected.size > 0 ? selected.size : ''} Student${selected.size !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Shift Student Modal ───────────────────────────────────── */
function ShiftStudentModal({ student, fromBatchId, onShifted, onClose }) {
  const [batches, setBatches]     = useState([]);
  const [targetId, setTargetId]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    batchService.getAll()
      .then(res => setBatches(res.data))
      .catch(err => setError(err.message));
  }, []);

  const otherBatches = batches.filter(b => b._id !== fromBatchId);

  const handleShift = async () => {
    if (!targetId) return;
    setSaving(true);
    try {
      await batchService.addStudent(targetId, student._id);
      onShifted();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] backdrop-blur-sm">
      <div className="bg-white rounded-[18px] w-[440px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900">Shift Student to Another Batch</h3>
          <button className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-sm" onClick={onClose}>✕</button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="bg-orange-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold text-[12px] flex items-center justify-center shrink-0">
              {initials(student.name)}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{student.name}</p>
              <p className="text-[11px] text-gray-500">{student.email}</p>
            </div>
          </div>
          {otherBatches.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">No other batches available.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Move to Batch *</label>
              <select className={inputClass} value={targetId} onChange={e => setTargetId(e.target.value)}>
                <option value="">Select target batch...</option>
                {otherBatches.map(b => (
                  <option key={b._id} value={b._id}>{b.name} — {b.course} ({b.studentCount ?? 0} students)</option>
                ))}
              </select>
            </div>
          )}
          <p className="text-[11px] text-gray-400">The student will be moved to the selected batch immediately.</p>
        </div>
        <div className="px-6 py-3.5 border-t border-gray-100 flex gap-2.5 justify-end">
          <button className="px-5 py-2 rounded-[10px] bg-gray-100 text-gray-700 font-semibold text-[13px]" onClick={onClose}>Cancel</button>
          {otherBatches.length > 0 && (
            <button
              disabled={!targetId || saving}
              className="px-5 py-2 rounded-[10px] bg-orange-500 text-white font-semibold text-[13px] disabled:opacity-40"
              onClick={handleShift}
            >
              {saving ? 'Shifting...' : 'Shift Student'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Remove Confirm Modal ──────────────────────────────────── */
function RemoveConfirmModal({ student, onConfirm, onClose, saving }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] backdrop-blur-sm">
      <div className="bg-white rounded-[18px] w-[400px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900">Remove Student</h3>
          <button className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-sm" onClick={onClose}>✕</button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600">
            Remove <span className="font-semibold text-gray-900">{student.name}</span> from this batch?
            Their account won't be deleted — they'll just become unassigned.
          </p>
        </div>
        <div className="px-6 py-3.5 border-t border-gray-100 flex gap-2.5 justify-end">
          <button className="px-5 py-2 rounded-[10px] bg-gray-100 text-gray-700 font-semibold text-[13px]" onClick={onClose}>Cancel</button>
          <button disabled={saving} className="px-5 py-2 rounded-[10px] bg-red-500 text-white font-semibold text-[13px] disabled:opacity-50" onClick={onConfirm}>
            {saving ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */
export default function BatchDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [batch, setBatch]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [editMode, setEditMode]       = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [shiftTarget, setShiftTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving]       = useState(false);

  const loadBatch = useCallback(() => {
    batchService.getById(id)
      .then(res => { setBatch(res.data); setError(''); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadBatch(); }, [loadBatch]);

  const handleRemoveConfirm = async () => {
    setRemoving(true);
    try {
      await batchService.removeStudent(id, removeTarget._id);
      setRemoveTarget(null);
      loadBatch();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-10">
        <p className="text-5xl">🔍</p>
        <p className="text-lg font-bold text-gray-700">Batch not found</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="mt-2 px-5 py-2 rounded-[10px] bg-ops-primary text-white font-semibold text-sm" onClick={() => navigate('/operations/batches')}>
          Back to Batches
        </button>
      </div>
    );
  }

  const students = batch.students || [];
  const mentor   = batch.mentor;
  const pct      = Math.round(((batch.completedSessions || 0) / (batch.totalSessions || 1)) * 100);

  return (
    <div className="p-6 flex flex-col gap-5 fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors" onClick={() => navigate('/operations/batches')}>←</button>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-gray-900">{batch.name}</h2>
          <p className="text-sm text-gray-500">{batch.course}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[12px] font-semibold ${batch.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {batch.status}
        </span>
        <button
          className={`px-5 py-2 rounded-[10px] font-semibold text-sm transition-colors ${editMode ? 'bg-gray-200 text-gray-700' : 'bg-ops-primary text-white shadow-[0_4px_12px_rgba(124,58,237,0.3)]'}`}
          onClick={() => setEditMode(v => !v)}
        >
          {editMode ? 'Done Editing' : 'Edit Batch'}
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Enrolled Students', value: students.length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Session Progress',  value: `${pct}%`,       color: '#10b981', bg: '#d1fae5' },
          { label: 'Start Date',        value: fmt(batch.startDate), color: '#0d9488', bg: '#f0fdfa' },
          { label: 'End Date',          value: fmt(batch.endDate),   color: '#f59e0b', bg: '#fef3c7' },
        ].map(c => (
          <div key={c.label} className="rounded-xl px-5 py-4 border border-black/[0.04]" style={{ background: c.bg }}>
            <p className="text-[20px] font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Mentor + Progress */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[14px] p-5 border border-gray-200 shadow-panel">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Mentor</p>
          {mentor ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {initials(mentor.name)}
              </div>
              <div>
                <p className="text-[14px] font-bold text-gray-900">{mentor.name}</p>
                <p className="text-[12px] text-gray-500">{mentor.specialization || 'General'}</p>
                <p className="text-[11px] text-gray-400">{mentor.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No mentor assigned</p>
          )}
        </div>

        <div className="bg-white rounded-[14px] p-5 border border-gray-200 shadow-panel">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Session Progress</p>
          <div className="flex justify-between mb-2">
            <span className="text-[13px] text-gray-600">{batch.completedSessions || 0} of {batch.totalSessions} sessions</span>
            <span className="text-[13px] font-bold text-ops-primary">{pct}%</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-ops-primary to-purple-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Batch ID: {batch.batchId || batch._id}</p>
        </div>
      </div>

      {/* Students table */}
      <div className="bg-white rounded-[14px] border border-gray-200 shadow-panel overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">Enrolled Students</h3>
            <p className="text-xs text-gray-400 mt-0.5">{students.length} student{students.length !== 1 ? 's' : ''} in this batch</p>
          </div>
          {editMode && (
            <button className="px-4 py-2 rounded-[10px] bg-ops-primary text-white font-semibold text-[13px] shadow-[0_4px_12px_rgba(124,58,237,0.25)]" onClick={() => setShowAdd(true)}>
              + Add Student
            </button>
          )}
        </div>

        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-2">
            <p className="text-3xl">👥</p>
            <p className="text-sm font-semibold text-gray-500">No students enrolled yet</p>
            {editMode && <p className="text-xs text-gray-400">Click "+ Add Student" to enroll someone</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {students.map(student => {
              const prog = student.progress || 0;
              const isActive = student.isActive !== false;
              return (
                <div key={student._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ops-primary/80 to-purple-400 text-white font-bold text-[12px] flex items-center justify-center shrink-0">
                    {initials(student.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900">{student.name}</p>
                    <p className="text-[12px] text-gray-400 truncate">{student.email}{student.phone ? ` · ${student.phone}` : ''}</p>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-gray-400">Progress</span>
                      <span className="text-[11px] font-bold text-ops-primary">{prog}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-ops-primary to-purple-400 rounded-full" style={{ width: `${prog}%` }} />
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                    {isActive ? 'active' : 'inactive'}
                  </span>
                  {editMode && (
                    <div className="flex gap-2 ml-2 shrink-0">
                      <button className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 font-semibold text-[12px] hover:bg-orange-100 transition-colors border border-orange-200" onClick={() => setShiftTarget(student)}>
                        Shift
                      </button>
                      <button className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-semibold text-[12px] hover:bg-red-100 transition-colors border border-red-200" onClick={() => setRemoveTarget(student)}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && <AddStudentModal batchId={id} onAdded={() => { setShowAdd(false); loadBatch(); }} onClose={() => setShowAdd(false)} />}
      {shiftTarget && <ShiftStudentModal student={shiftTarget} fromBatchId={id} onShifted={() => { setShiftTarget(null); loadBatch(); }} onClose={() => setShiftTarget(null)} />}
      {removeTarget && <RemoveConfirmModal student={removeTarget} saving={removing} onConfirm={handleRemoveConfirm} onClose={() => setRemoveTarget(null)} />}
    </div>
  );
}
