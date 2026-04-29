const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const req = (url, options = {}) => {
  const token = localStorage.getItem('catalyst_token');
  return fetch(`${BASE_URL}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
  });
};

export const batchService = {
  getAll:       (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/batches${qs ? `?${qs}` : ''}`);
  },
  getById:      (id)          => req(`/batches/${id}`),
  create:       (payload)     => req('/batches', { method: 'POST', body: JSON.stringify(payload) }),
  update:       (id, payload) => req(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove:       (id)          => req(`/batches/${id}`, { method: 'DELETE' }),
  getMentors:   ()            => req('/batches/mentors'),
  getStudents:  ()            => req('/batches/students'),
};

export const mentorService = {
  getAll:  ()              => req('/mentors'),
  getById: (id)            => req(`/mentors/${id}`),
  create:  (payload)       => req('/mentors', { method: 'POST', body: JSON.stringify(payload) }),
  update:  (id, payload)   => req(`/mentors/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove:  (id)            => req(`/mentors/${id}`, { method: 'DELETE' }),
};

export const studentService = {
  getAll:       ()              => req('/students'),
  getById:      (id)            => req(`/students/${id}`),
  getByMentor:  (mentorId)      => req(`/students/by-mentor/${mentorId}`),
  create:       (payload)       => req('/students', { method: 'POST', body: JSON.stringify(payload) }),
  update:       (id, payload)   => req(`/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove:       (id)            => req(`/students/${id}`, { method: 'DELETE' }),
  grantAccess:  (id)            => req(`/students/${id}/grant-access`, { method: 'PUT' }),
};

export const assignmentService = {
  getByMentor:   (mentorId)     => req(`/assignments?mentorId=${mentorId}`),
  getById:       (id)           => req(`/assignments/${id}`),
  getProgress:   (id)           => req(`/assignments/${id}/progress`),
  create:        (payload)      => req('/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  update:        (id, payload)  => req(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove:        (id)           => req(`/assignments/${id}`, { method: 'DELETE' }),
  setStatus:     (id, status)   => req(`/assignments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  enrollBatches:  (id, batchIds) => req(`/assignments/${id}/enroll`, { method: 'POST', body: JSON.stringify({ batchIds }) }),
  unenrollBatch:  (id, batchId)  => req(`/assignments/${id}/enroll/${batchId}`, { method: 'DELETE' }),
};

export const opsAssignmentService = {
  getByOps:  (opsId)        => req(`/assignments?ownedBy=ops&opsId=${opsId}`),
  getById:   (id)           => req(`/assignments/${id}`),
  getProgress: (id)         => req(`/assignments/${id}/progress`),
  create:    (payload)      => req('/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  update:    (id, payload)  => req(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove:    (id)           => req(`/assignments/${id}`, { method: 'DELETE' }),
  setStatus: (id, status)   => req(`/assignments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export const chatService = {
  getConversations: (userId)               => req(`/chat/conversations/${userId}`),
  getMessages:      (userId, otherId, page = 1) => req(`/chat/messages/${userId}/${otherId}?page=${page}`),
  markRead:         (senderId, receiverId)  => req('/chat/messages/read', { method: 'PUT', body: JSON.stringify({ senderId, receiverId }) }),
  searchUsers:      (q)                    => req(`/chat/users/search${q ? `?q=${encodeURIComponent(q)}` : ''}`),
};
