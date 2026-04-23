import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService } from '../../../services/api';

const backIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;

const TABS = ['Overview', 'Progress', 'Notes'];

function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function StudentProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [student, setStudent]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [newNote, setNewNote]   = useState('');
  const [notes, setNotes]       = useState([]);

  useEffect(() => {
    studentService.getById(id)
      .then(res => setStudent(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-3">
        <p className="text-4xl">👤</p>
        <p className="text-lg font-bold text-gray-700">Student not found</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="text-mentor-primary font-semibold text-sm" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const prog          = student.progress || 0;
  const progressColor = prog >= 80 ? '#10b981' : prog >= 50 ? '#f59e0b' : '#ef4444';
  const isActive      = student.isActive !== false;
  const batch         = student.batchId;
  const mentor        = batch?.mentorId;
  const sessionsDone  = student.completedSessions || 0;
  const totalSess     = student.totalSessions || batch?.totalSessions || 0;
  const batchPct      = Math.round(((batch?.completedSessions || 0) / (batch?.totalSessions || 1)) * 100);

  const addNote = () => {
    if (newNote.trim()) { setNotes(n => [...n, { text: newNote.trim(), date: new Date().toLocaleDateString('en-IN') }]); setNewNote(''); }
  };

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <button className="flex items-center gap-1.5 text-mentor-primary font-semibold text-sm" onClick={() => navigate(-1)}>
        {backIcon} Back
      </button>

      {/* Hero */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 flex items-center gap-5">
        <div
          className="w-[72px] h-[72px] rounded-full text-white font-extrabold text-[26px] flex items-center justify-center shrink-0"
          style={{ background: `hsl(${(student._id?.charCodeAt(0) || 0) * 25 % 360}, 60%, 50%)` }}
        >
          {initials(student.name)}
        </div>
        <div className="flex-1">
          <h2 className="text-[22px] font-extrabold text-gray-900">{student.name}</h2>
          <p className="text-gray-500 mt-1">{student.email}{student.phone ? ` · ${student.phone}` : ''}</p>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {batch && (
              <span className="px-3 py-1 rounded-full bg-mentor-lighter text-mentor-primary text-xs font-semibold border border-mentor-light">
                {batch.course}
              </span>
            )}
            {batch && (
              <span className="px-3 py-1 rounded-full bg-mentor-lighter text-mentor-primary text-xs font-semibold border border-mentor-light">
                {batch.name}
              </span>
            )}
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: isActive ? '#d1fae5' : '#fee2e2', color: isActive ? '#065f46' : '#991b1b' }}
            >
              {isActive ? 'active' : 'inactive'}
            </span>
          </div>
        </div>

        {/* Progress ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="7" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={progressColor} strokeWidth="7"
              strokeDasharray={`${(2 * Math.PI * 34 * prog) / 100} ${2 * Math.PI * 34}`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="absolute flex flex-col items-center leading-snug">
            <span className="text-lg font-extrabold" style={{ color: progressColor }}>{prog}%</span>
            <span className="text-[10px] text-gray-400">Progress</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Sessions Done',    value: sessionsDone,                                color: '#0d9488' },
          { label: 'Total Sessions',   value: totalSess,                                   color: '#7c3aed' },
          { label: 'Batch Progress',   value: batch ? `${batchPct}%` : '—',                color: '#f59e0b' },
          { label: 'Enrolled',         value: student.enrollmentDate
              ? new Date(student.enrollmentDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
              : '—',                                                                         color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl px-5 py-4 border border-gray-200 text-center">
            <p className="text-xl font-extrabold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`flex-1 py-2 rounded-[10px] text-[13px] transition-all ${activeTab === tab ? 'bg-white text-mentor-primary font-bold shadow-sm' : 'text-gray-500 font-medium'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden min-h-[200px]">

        {/* Overview */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="p-6">
              <h4 className="text-sm font-bold text-gray-900 mb-4">Personal Info</h4>
              {[
                { label: 'Full Name',  value: student.name },
                { label: 'Email',      value: student.email },
                { label: 'Phone',      value: student.phone || '—' },
                { label: 'Enrolled',   value: student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                { label: 'Status',     value: isActive ? 'Active' : 'Inactive' },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2.5 border-b border-gray-50">
                  <span className="text-[13px] text-gray-500">{row.label}</span>
                  <span className="text-[13px] font-semibold text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="p-6">
              <h4 className="text-sm font-bold text-gray-900 mb-4">Enrollment Details</h4>
              {[
                { label: 'Course',     value: batch?.course || '—' },
                { label: 'Batch',      value: batch?.name || '—' },
                { label: 'Mentor',     value: mentor?.name || '—' },
                { label: 'Batch Status', value: batch?.status || '—' },
                { label: 'Batch Sessions', value: batch ? `${batch.completedSessions || 0} / ${batch.totalSessions || 0}` : '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2.5 border-b border-gray-50">
                  <span className="text-[13px] text-gray-500">{row.label}</span>
                  <span className="text-[13px] font-semibold text-gray-900 capitalize">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {activeTab === 'Progress' && (
          <div className="p-6 flex flex-col gap-5">
            {/* Student progress */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
                <span className="text-sm font-bold" style={{ color: progressColor }}>{prog}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${prog}%`, background: progressColor }} />
              </div>
            </div>

            {/* Individual sessions */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Personal Sessions</span>
                <span className="text-sm text-gray-500">{sessionsDone} / {totalSess}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-mentor-primary to-cyan-500 rounded-full transition-all"
                  style={{ width: totalSess ? `${Math.round((sessionsDone / totalSess) * 100)}%` : '0%' }}
                />
              </div>
            </div>

            {/* Batch progress */}
            {batch && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Batch Progress ({batch.name})</span>
                  <span className="text-sm text-gray-500">{batch.completedSessions || 0} / {batch.totalSessions} sessions · {batchPct}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all" style={{ width: `${batchPct}%` }} />
                </div>
              </div>
            )}

            {/* Milestone markers */}
            <div className="grid grid-cols-3 gap-3 mt-1">
              {[
                { label: 'Beginner',     threshold: 30,  icon: '🌱' },
                { label: 'Intermediate', threshold: 60,  icon: '🚀' },
                { label: 'Advanced',     threshold: 90,  icon: '🏆' },
              ].map(m => (
                <div key={m.label} className={`rounded-xl p-3 text-center border ${prog >= m.threshold ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xl mb-1">{m.icon}</p>
                  <p className={`text-xs font-semibold ${prog >= m.threshold ? 'text-green-700' : 'text-gray-400'}`}>{m.label}</p>
                  <p className="text-[10px] text-gray-400">{m.threshold}%+</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {activeTab === 'Notes' && (
          <div>
            <div className="p-5 border-b border-gray-100 flex gap-3 items-end">
              <textarea
                className="flex-1 px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 resize-y text-sm outline-none text-gray-700 focus:border-mentor-primary transition-colors"
                placeholder="Add a note about this student..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={3}
              />
              <button
                className="px-5 py-2.5 rounded-[10px] bg-mentor-primary text-white font-semibold text-[13px] shrink-0 disabled:opacity-50"
                disabled={!newNote.trim()}
                onClick={addNote}
              >
                Add Note
              </button>
            </div>
            <div className="py-2">
              {notes.length === 0 ? (
                <div className="p-10 text-center text-gray-400">No notes yet. Add your first note above.</div>
              ) : (
                [...notes].reverse().map((note, i) => (
                  <div key={i} className="flex gap-3 px-6 py-3.5 border-b border-gray-100 items-start">
                    <span className="text-base shrink-0">📌</span>
                    <div className="flex-1">
                      <p className="text-gray-700 text-sm">{note.text}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{note.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
