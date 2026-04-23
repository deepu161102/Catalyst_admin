import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { studentService, batchService } from '../../../services/api';

function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function StatCard({ title, value, subtitle, icon, color, onClick }) {
  return (
    <button
      className="bg-white rounded-[14px] p-5 border border-gray-200 shadow-card text-left transition-shadow hover:shadow-md w-full"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-gray-500 font-medium mb-1.5">{title}</p>
          <p className="text-[32px] font-extrabold leading-none" style={{ color }}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>}
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
          <span className="text-[22px]">{icon}</span>
        </div>
      </div>
    </button>
  );
}

export default function MentorDashboard() {
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [students, setStudents] = useState([]);
  const [batches, setBatches]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    Promise.all([
      studentService.getByMentor(user._id),
      batchService.getAll({ mentorId: user._id }),
    ])
      .then(([sRes, bRes]) => {
        setStudents(sRes.data);
        setBatches(bRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?._id]);

  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const activeStudents    = students.filter(s => s.isActive !== false).length;
  const avgProgress       = students.length
    ? Math.round(students.reduce((a, s) => a + (s.progress || 0), 0) / students.length)
    : 0;
  const totalSessionsDone = batches.reduce((a, b) => a + (b.completedSessions || 0), 0);
  const totalSessions     = batches.reduce((a, b) => a + (b.totalSessions || 0), 0);
  const activeBatches     = batches.filter(b => b.status === 'active').length;

  return (
    <div className="p-6 flex flex-col gap-5 fade-in">

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-mentor-primary to-cyan-600 rounded-2xl px-7 py-5 flex items-center justify-between shadow-banner-mentor">
        <div>
          <h2 className="text-xl font-bold text-white">{greeting}, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="text-sm text-white/80 mt-1">
            {loading ? 'Loading your dashboard...' : `You have ${students.length} students across ${batches.length} batch${batches.length !== 1 ? 'es' : ''}.`}
          </p>
        </div>
        <button
          className="px-5 py-2.5 rounded-[10px] bg-white/20 text-white font-semibold text-sm border border-white/30 backdrop-blur-sm hover:bg-white/30 transition-colors"
          onClick={() => navigate('/mentor/communication')}
        >
          💬 Messages
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Students" value={loading ? '—' : students.length}
          subtitle={loading ? '' : `${activeStudents} active`}
          icon="👥" color="#10b981"
          onClick={() => navigate('/mentor/students')}
        />
        <StatCard
          title="My Batches" value={loading ? '—' : batches.length}
          subtitle={loading ? '' : `${activeBatches} active`}
          icon="📚" color="#0d9488"
        />
        <StatCard
          title="Sessions Done" value={loading ? '—' : totalSessionsDone}
          subtitle={loading ? '' : `of ${totalSessions} total`}
          icon="✅" color="#7c3aed"
        />
        <StatCard
          title="Avg Progress" value={loading ? '—' : `${avgProgress}%`}
          subtitle={loading ? '' : 'across all students'}
          icon="📈" color="#f59e0b"
        />
      </div>

      {/* Main content: Students + Batches */}
      <div className="grid grid-cols-2 gap-4">

        {/* My Students */}
        <div className="bg-white rounded-[14px] border border-gray-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-gray-900">My Students</h3>
            <button className="text-[13px] text-mentor-primary font-semibold" onClick={() => navigate('/mentor/students')}>
              View all →
            </button>
          </div>

          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : students.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No students assigned yet</div>
          ) : (
            <div className="py-1">
              {students.slice(0, 6).map(s => {
                const prog     = s.progress || 0;
                const pc       = prog >= 80 ? '#10b981' : prog >= 50 ? '#f59e0b' : '#ef4444';
                const isActive = s.isActive !== false;
                return (
                  <button
                    key={s._id}
                    className="flex items-center gap-3 px-5 py-2.5 w-full text-left transition-colors hover:bg-gray-50 border-b border-gray-50"
                    onClick={() => navigate(`/mentor/students/${s._id}`)}
                  >
                    <div
                      className="w-9 h-9 rounded-full text-white font-bold text-[12px] flex items-center justify-center shrink-0"
                      style={{ background: `hsl(${(s._id?.charCodeAt(0) || 0) * 25 % 360}, 60%, 50%)` }}
                    >
                      {initials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.batch?.course || '—'} · {s.batch?.name || 'Unassigned'}</p>
                    </div>
                    <div className="text-right min-w-[72px]">
                      <p className="text-[13px] font-semibold" style={{ color: pc }}>{prog}%</p>
                      <div className="w-16 h-1 bg-gray-200 rounded-sm overflow-hidden mt-0.5">
                        <div className="h-full rounded-sm" style={{ width: `${prog}%`, background: pc }} />
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold ml-1 shrink-0"
                      style={{ background: isActive ? '#d1fae5' : '#fee2e2', color: isActive ? '#065f46' : '#991b1b' }}
                    >
                      {isActive ? 'active' : 'inactive'}
                    </span>
                  </button>
                );
              })}
              {students.length > 6 && (
                <button className="w-full py-2.5 text-[13px] text-mentor-primary font-semibold text-center hover:bg-gray-50 transition-colors" onClick={() => navigate('/mentor/students')}>
                  +{students.length - 6} more students →
                </button>
              )}
            </div>
          )}
        </div>

        {/* My Batches + Quick Access */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[14px] border border-gray-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-gray-900">My Batches</h3>
            </div>

            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : batches.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No batches assigned yet</div>
            ) : (
              <div className="py-1">
                {batches.map(b => {
                  const pct = Math.round(((b.completedSessions || 0) / (b.totalSessions || 1)) * 100);
                  return (
                    <div key={b._id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-mentor-primary to-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-mentor-primary w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-gray-700">{b.studentCount ?? 0}</p>
                        <p className="text-[11px] text-gray-400">students</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Access */}
          <div className="bg-white rounded-[14px] border border-gray-200 shadow-card p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.5px] mb-3">Quick Access</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Students',    icon: '👥', path: '/mentor/students' },
                { label: 'Messages',    icon: '💬', path: '/mentor/communication' },
                { label: 'Assignments', icon: '📝', path: '/mentor/assignments' },
                { label: 'Profile',     icon: '👤', path: '/mentor/profile' },
              ].map(q => (
                <button
                  key={q.path}
                  className="px-2 py-3 rounded-[10px] bg-gray-50 border border-gray-200 flex flex-col items-center gap-1.5 hover:bg-gray-100 transition-colors"
                  onClick={() => navigate(q.path)}
                >
                  <span className="text-xl">{q.icon}</span>
                  <span className="text-xs text-gray-700 font-medium">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
