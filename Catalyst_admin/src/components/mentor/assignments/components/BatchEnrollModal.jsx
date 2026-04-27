// ============================================================
// BATCH ENROLL MODAL
// Lets the mentor select one or more of their batches to
// enroll into a published assignment.
// Already-enrolled batches are shown as disabled.
// ============================================================

import { useState } from 'react';

export default function BatchEnrollModal({ batches, enrolledBatches = [], onEnroll, onClose }) {
  const [selected, setSelected] = useState([]);

  const toggle = (batchId) =>
    setSelected((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId],
    );

  const handleConfirm = () => {
    if (selected.length > 0) onEnroll(selected);
  };

  // enrolledBatches can be plain IDs or populated objects — normalise to strings
  const enrolledIds = (enrolledBatches || []).map((b) =>
    typeof b === 'object' ? String(b._id || b.id) : String(b)
  );
  const availableBatches = batches.filter((b) => !enrolledIds.includes(String(b.id)));
  const alreadyEnrolled  = batches.filter((b) =>  enrolledIds.includes(String(b.id)));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-[0_25px_80px_rgba(0,0,0,0.25)] overflow-hidden"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)' }}
        >
          <div>
            <h3 className="text-sm font-extrabold text-indigo-800">Enroll a Batch</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select batches whose students will be assigned this test.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/80 text-gray-500 hover:bg-white hover:text-gray-800 flex items-center justify-center text-sm font-bold transition-colors shadow-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Available batches */}
          {availableBatches.length === 0 && alreadyEnrolled.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No batches found. Create batches in the Operations portal.
            </div>
          )}

          {availableBatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">
                Available Batches
              </p>
              {availableBatches.map((batch) => {
                const isSelected = selected.includes(batch.id);
                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => toggle(batch.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                    </div>

                    {/* Batch icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                      style={{ background: isSelected ? '#4f46e5' : '#a5b4fc' }}
                    >
                      {batch.name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                        {batch.name}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {batch.course} &nbsp;·&nbsp; {batch.studentIds.length} student{batch.studentIds.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="text-indigo-500 shrink-0 text-sm font-bold">Selected</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Already enrolled */}
          {alreadyEnrolled.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">
                Already Enrolled
              </p>
              {alreadyEnrolled.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 opacity-75"
                >
                  <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px] font-black">✓</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold text-white bg-emerald-400 shrink-0">
                    {batch.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-emerald-800 truncate">{batch.name}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">
                      {batch.studentIds.length} student{batch.studentIds.length !== 1 ? 's' : ''} enrolled
                    </p>
                  </div>
                  <span className="text-emerald-600 text-[11px] font-bold shrink-0">Enrolled</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {selected.length > 0
              ? `${selected.length} batch${selected.length > 1 ? 'es' : ''} selected`
              : 'Select at least one batch'}
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.length === 0}
              className="px-5 py-2 rounded-xl font-extrabold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                boxShadow: selected.length > 0 ? '0 4px 14px rgba(79,70,229,0.35)' : 'none',
              }}
            >
              Enroll {selected.length > 0 ? `(${selected.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
