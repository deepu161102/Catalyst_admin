// ============================================================
// BULK UPLOAD MODAL
// Accepts .csv or .json, validates every row, shows a preview
// table, then imports valid questions into the active module.
// ============================================================

import { useState, useRef } from 'react';
import { parseQuestionFile, CSV_TEMPLATE_CONTENT } from './parseQuestions';

// ── Template download ─────────────────────────────────────────
function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'questions_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Drag-over overlay ─────────────────────────────────────────
function DropZone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl py-12 px-6 cursor-pointer transition-all ${
        dragging
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40'
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl">
        📂
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-gray-800">Drop your file here or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">Accepts <strong>.csv</strong> and <strong>.json</strong></p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
        className="text-xs text-indigo-600 font-semibold hover:underline"
      >
        ↓ Download CSV template
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

// ── Preview table ─────────────────────────────────────────────
function PreviewTable({ rows }) {
  return (
    <div className="overflow-auto rounded-xl border border-gray-200" style={{ maxHeight: 340 }}>
      <table className="w-full text-[12px] border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-50 border-b border-gray-200">
            {['#', 'Mod', 'Topic', 'Title', 'A', 'B', 'C', 'D', 'Ans', 'Score', 'Status'].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-extrabold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.rowNum}
              className={`border-b border-gray-100 last:border-b-0 ${
                row.ok ? 'bg-white hover:bg-gray-50' : 'bg-red-50'
              }`}
            >
              <td className="px-3 py-2 text-gray-400 font-semibold">{row.rowNum}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-600">
                  M{row.question?.module ?? row.raw.module ?? 1}
                </span>
              </td>
              <td className="px-3 py-2 max-w-[120px]">
                <p className="truncate text-[11px] font-medium text-violet-600">
                  {row.raw.topic || <span className="text-gray-300 italic">—</span>}
                </p>
              </td>
              <td className="px-3 py-2 max-w-[180px]">
                <p className="truncate font-semibold text-gray-800">
                  {row.raw.title || <span className="text-gray-300 italic">—</span>}
                </p>
              </td>
              {['choice_a', 'choice_b', 'choice_c', 'choice_d'].map((k) => (
                <td key={k} className="px-3 py-2 max-w-[80px]">
                  <p className="truncate text-gray-600">{row.raw[k] || <span className="text-gray-300">—</span>}</p>
                </td>
              ))}
              <td className="px-3 py-2">
                {row.raw.correct_answer ? (
                  <span className="px-2 py-0.5 rounded-full font-extrabold bg-indigo-100 text-indigo-700">
                    {(row.raw.correct_answer || '').toUpperCase()}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-gray-500">{row.raw.score || '1'}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {row.ok ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <span>✓</span> Valid
                  </span>
                ) : (
                  <span className="text-red-500 font-semibold leading-snug" title={row.errors?.join(', ')}>
                    ✕ {row.errors?.[0]}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────
export default function BulkUploadModal({ sectionName, onImport, onClose }) {
  const [rows,      setRows]      = useState(null);  // null = no file yet
  const [fileError, setFileError] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [fileName,  setFileName]  = useState('');

  const validRows   = (rows || []).filter((r) => r.ok);
  const invalidRows = (rows || []).filter((r) => !r.ok);

  const handleFile = async (file) => {
    setLoading(true);
    setFileError('');
    setFileName(file.name);
    const result = await parseQuestionFile(file);
    setLoading(false);
    if (result.fileError) { setFileError(result.fileError); setRows(null); return; }
    setRows(result.rows);
  };

  const handleImport = () => {
    if (!validRows.length) return;
    const questions = validRows.map((r, i) => ({
      ...r.question,
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${i}`,
    }));
    onImport(questions);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-[0_25px_80px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0"
             style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)' }}>
          <div>
            <h3 className="text-sm font-extrabold text-indigo-800">Bulk Upload Questions</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {sectionName} &nbsp;·&nbsp; Questions distributed by <strong>module</strong> column
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/80 text-gray-500 hover:bg-white hover:text-gray-800 flex items-center justify-center text-sm font-bold transition-colors shadow-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Drop zone (always visible for re-upload) */}
          <DropZone onFile={handleFile} />

          {loading && (
            <div className="flex items-center gap-2 text-sm text-indigo-600 font-semibold justify-center">
              <span className="animate-spin">⏳</span> Parsing file…
            </div>
          )}

          {fileError && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold">
              ⚠️ {fileError}
            </div>
          )}

          {rows !== null && !loading && (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {fileName}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700">
                  ✓ {validRows.length} valid
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-600">
                    ✕ {invalidRows.length} error{invalidRows.length > 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  Invalid rows will be skipped on import.
                </span>
              </div>

              {/* Preview table */}
              {rows.length > 0 ? (
                <PreviewTable rows={rows} />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No rows found in the file.
                </div>
              )}

              {/* Format reminder */}
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                <span className="shrink-0 mt-0.5">💡</span>
                <div>
                  <strong>Required columns:</strong> title, choice_a, choice_b, choice_c, choice_d, correct_answer
                  &nbsp;·&nbsp;
                  <strong>Optional:</strong> description, explanation, score (defaults to 1), module (<strong>1</strong> or <strong>2</strong>), topic (e.g. "Linear Equations")
                  &nbsp;·&nbsp;
                  correct_answer must be exactly <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, or <strong>D</strong>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400">
            {validRows.length > 0
              ? `${validRows.length} question${validRows.length > 1 ? 's' : ''} will be added to ${sectionName}`
              : 'No valid questions to import yet'}
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validRows.length === 0}
              className="px-5 py-2 rounded-xl font-extrabold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                boxShadow: validRows.length > 0 ? '0 4px 14px rgba(79,70,229,0.35)' : 'none',
              }}
            >
              Import {validRows.length > 0 ? `(${validRows.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
