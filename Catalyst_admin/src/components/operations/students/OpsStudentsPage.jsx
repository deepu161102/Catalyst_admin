import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService, mentorService } from '../../../services/api';

const inputClass = 'px-3 py-2 rounded-lg border-[1.5px] border-gray-200 text-[13px] outline-none bg-white text-gray-700';

export default function OpsStudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [mentors, setMentors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [search, setSearch]             = useState('');
  const [filterMentor, setFilterMentor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');

  useEffect(() => {
    Promise.all([studentService.getAll(), mentorService.getAll()])
      .then(([sRes, mRes]) => {
        setStudents(sRes.data);
        setMentors(mRes.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const courses = [...new Set(students.map((s) => s.batchId?.course).filter(Boolean))];

  const filtered = students.filter((s) => {
    const mentorId = s.batchId?.mentorId?._id?.toString();
    const course   = s.batchId?.course || '';
    const status   = s.isActive ? 'active' : 'inactive';

    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchMentor = filterMentor === 'all' || mentorId === filterMentor;
    const matchStatus = filterStatus === 'all' || status === filterStatus;
    const matchCourse = filterCourse === 'all' || course === filterCourse;
    return matchSearch && matchMentor && matchStatus && matchCourse;
  });

  const avgProgress = students.length
    ? Math.round(students.reduce((a, s) => a + (s.progress || 0), 0) / students.length)
    : 0;

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">All Students</h2>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} total students across the platform</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-[10px] bg-ops-primary text-white font-semibold text-sm shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
          onClick={() => navigate('/operations/students/add')}
        >
          + Add Student
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: students.length,                            color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Active',       value: students.filter(s => s.isActive).length,    color: '#10b981', bg: '#d1fae5' },
          { label: 'Inactive',     value: students.filter(s => !s.isActive).length,   color: '#ef4444', bg: '#fee2e2' },
          { label: 'Avg Progress', value: `${avgProgress}%`,                          color: '#f59e0b', bg: '#fef3c7' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl px-5 py-4 border border-black/[0.04]" style={{ background: c.bg }}>
            <p className="text-[22px] font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2.5 bg-white px-4 py-3 rounded-xl border border-gray-200">
        <input
          className={`${inputClass} flex-1`}
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={inputClass} value={filterMentor} onChange={(e) => setFilterMentor(e.target.value)}>
          <option value="all">All Mentors</option>
          {mentors.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
        <select className={inputClass} value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="all">All Courses</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={inputClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden">
        <div className="flex px-5 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-[0.4px] gap-3">
          <span className="flex-[2]">Student</span>
          <span className="flex-[2]">Course / Batch</span>
          <span className="flex-[2]">Mentor</span>
          <span className="flex-1">Progress</span>
          <span className="flex-1">Status</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No students match your filters</div>
        ) : filtered.map((s) => {
          const initials  = s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const mentor    = s.batchId?.mentorId;
          const course    = s.batchId?.course || '—';
          const batchName = s.batchId?.name   || '—';
          const isActive  = s.isActive !== false;
          const progress  = s.progress || 0;
          const pc        = progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444';

          return (
            <div key={s._id} className="flex items-center px-5 py-3 border-b border-gray-100 gap-3">
              <div className="flex-[2] flex items-center gap-2.5">
                <div
                  className="w-[34px] h-[34px] rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                  style={{ background: `hsl(${(s._id?.charCodeAt(0) || 0) * 25 % 360}, 60%, 50%)` }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                </div>
              </div>
              <div className="flex-[2]">
                <p className="text-[13px] text-gray-700">{course}</p>
                <p className="text-[11px] text-gray-400">{batchName}</p>
              </div>
              <div className="flex-[2] flex items-center gap-2">
                {mentor ? (
                  <>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                      {mentor.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span className="text-[13px] text-gray-700 truncate">{mentor.name}</span>
                  </>
                ) : (
                  <span className="text-[13px] text-gray-400">Not assigned</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold" style={{ color: pc }}>{progress}%</p>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: pc }} />
                </div>
              </div>
              <div className="flex-1">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: isActive ? '#d1fae5' : '#fee2e2', color: isActive ? '#065f46' : '#991b1b' }}
                >
                  {isActive ? 'active' : 'inactive'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
