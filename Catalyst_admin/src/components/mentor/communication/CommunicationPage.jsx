import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { chatService, studentService } from '../../../services/api';
import { connectSocket, disconnectSocket } from '../../../services/socket';

const sendIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  const d    = new Date(ts);
  const now  = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString())  return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

export default function CommunicationPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [typing, setTyping]               = useState(false);
  const [onlineUsers, setOnlineUsers]     = useState(new Set());

  const messagesEndRef = useRef(null);
  const socketRef      = useRef(null);
  const selectedRef    = useRef(null);
  const typingTimer    = useRef(null);

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // Socket setup — token from localStorage passed in handshake auth
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('online_users', ids     => setOnlineUsers(new Set(ids)));
    socket.on('user_online',  ({ userId }) => setOnlineUsers(p => new Set([...p, userId])));
    socket.on('user_offline', ({ userId }) => setOnlineUsers(p => { const n = new Set(p); n.delete(userId); return n; }));

    socket.on('receive_message', msg => {
      const cur      = selectedRef.current;
      const senderId = msg.senderId?.toString();

      if (cur && senderId === cur.userId?.toString()) {
        setMessages(p => [...p, msg]);
        socket.emit('message_read', { senderId: msg.senderId, receiverId: user._id });
        chatService.markRead(msg.senderId, user._id).catch(() => {});
        setConversations(p => p.map(c =>
          c.userId?.toString() === senderId
            ? { ...c, lastMessage: msg.message, lastTime: msg.timestamp, unreadCount: 0 }
            : c
        ));
      } else {
        setConversations(p => p.map(c =>
          c.userId?.toString() === senderId
            ? { ...c, lastMessage: msg.message, lastTime: msg.timestamp, unreadCount: (c.unreadCount || 0) + 1 }
            : c
        ));
      }
    });

    socket.on('message_sent', ({ _id, tempId, timestamp }) => {
      setMessages(p => p.map(m => m._id === tempId ? { ...m, _id, timestamp } : m));
    });

    socket.on('user_typing', ({ senderId }) => {
      if (selectedRef.current?.userId?.toString() === senderId?.toString()) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 2000);
      }
    });

    socket.on('messages_read', () => {
      setMessages(p => p.map(m => ({ ...m, read: true })));
    });

    return () => {
      disconnectSocket();
      clearTimeout(typingTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load conversations + assigned students on mount, merge them
  useEffect(() => {
    if (!user?._id) return;
    Promise.all([
      chatService.getConversations(user._id).then(r => r.data).catch(() => []),
      studentService.getByMentor(user._id).then(r => r.data).catch(() => []),
    ]).then(([convos, students]) => {
      const convoMap = new Map(convos.map(c => [c.userId?.toString(), c]));
      const merged = [...convos];
      students.forEach(s => {
        if (!convoMap.has(s._id?.toString())) {
          merged.push({ userId: s._id, name: s.name, email: s.email, lastMessage: '', unreadCount: 0 });
        }
      });
      setConversations(merged);
    });
  }, [user?._id]);

  // Load messages when selected changes
  useEffect(() => {
    if (!selected || !user?._id) return;
    setMessages([]);
    chatService.getMessages(user._id, selected.userId)
      .then(res => setMessages(res.data))
      .catch(console.error);
    socketRef.current?.emit('message_read', { senderId: selected.userId, receiverId: user._id });
    chatService.markRead(selected.userId, user._id).catch(() => {});
    setConversations(p => p.map(c =>
      c.userId?.toString() === selected.userId?.toString() ? { ...c, unreadCount: 0 } : c
    ));
  }, [selected?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      chatService.searchUsers(search).then(res => setSearchResults(res.data)).catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSend = () => {
    if (!input.trim() || !selected || !user?._id) return;
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      _id: tempId, senderId: user._id, receiverId: selected.userId,
      message: input.trim(), timestamp: new Date().toISOString(), read: false,
    };
    setMessages(p => [...p, optimistic]);
    socketRef.current?.emit('send_message', {
      senderId: user._id, receiverId: selected.userId,
      message: input.trim(), tempId,
    });
    setConversations(p => {
      const exists = p.find(c => c.userId?.toString() === selected.userId?.toString());
      if (exists) return p.map(c =>
        c.userId?.toString() === selected.userId?.toString()
          ? { ...c, lastMessage: input.trim(), lastTime: new Date().toISOString() }
          : c
      );
      return [{ userId: selected.userId, name: selected.name, email: selected.email, lastMessage: input.trim(), lastTime: new Date().toISOString(), unreadCount: 0 }, ...p];
    });
    setInput('');
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return; }
    if (selected && user?._id) {
      socketRef.current?.emit('typing', { senderId: user._id, receiverId: selected.userId });
    }
  };

  const handleSelectContact = contact => {
    setSelected(contact);
    setSearch('');
    setSearchResults([]);
  };

  const contactList = search
    ? searchResults.map(u => ({ userId: u._id, name: u.name, email: u.email, lastMessage: '', unreadCount: 0 }))
    : conversations;

  const grouped = messages.reduce((acc, msg) => {
    const d = formatDate(msg.timestamp);
    (acc[d] = acc[d] || []).push(msg);
    return acc;
  }, {});

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Communication</h2>
        <p className="text-sm text-gray-500 mt-0.5">Chat with your students in real-time</p>
      </div>

      <div className="flex bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        {/* ── Contact list ── */}
        <div className="w-[240px] border-r border-gray-100 flex flex-col shrink-0">
          <div className="px-3.5 pt-3.5 pb-2.5 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] mb-2">Students</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-[6px]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                placeholder="Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 border-none bg-transparent text-[12px] text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {contactList.length === 0 ? (
              <p className="text-[12px] text-gray-400 text-center px-3 py-6">
                {search ? 'No students found' : 'No conversations yet — search to start one'}
              </p>
            ) : (
              contactList.map(contact => (
                <button
                  key={contact.userId}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 transition-colors text-left ${
                    selected?.userId?.toString() === contact.userId?.toString()
                      ? 'bg-teal-50 border-r-[3px] border-r-teal-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className="w-[34px] h-[34px] rounded-full text-white font-bold text-xs flex items-center justify-center"
                      style={{ background: `hsl(${(contact.name?.charCodeAt(0) || 0) * 15}, 55%, 48%)` }}
                    >
                      {getInitials(contact.name)}
                    </div>
                    {onlineUsers.has(contact.userId?.toString()) && (
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute bottom-0 right-0" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[13px] font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{contact.name}</p>
                    <p className="text-[11px] text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                      {contact.lastMessage || contact.email}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {contact.lastTime && (
                      <span className="text-[10px] text-gray-400">{formatTime(contact.lastTime)}</span>
                    )}
                    {contact.unreadCount > 0 && (
                      <span className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-[2px] rounded-full min-w-[18px] text-center">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Chat window ── */}
        {selected ? (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="w-[34px] h-[34px] rounded-full text-white font-bold text-xs flex items-center justify-center"
                  style={{ background: `hsl(${(selected.name?.charCodeAt(0) || 0) * 15}, 55%, 48%)` }}
                >
                  {getInitials(selected.name)}
                </div>
                {onlineUsers.has(selected.userId?.toString()) && (
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute bottom-0 right-0" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{selected.name}</p>
                <p className="text-[11px] font-medium">
                  {typing
                    ? <span className="text-teal-600">typing...</span>
                    : <span className={onlineUsers.has(selected.userId?.toString()) ? 'text-emerald-500' : 'text-gray-400'}>
                        {onlineUsers.has(selected.userId?.toString()) ? '● Online' : '○ Offline'}
                      </span>
                  }
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 bg-[#f0f2f5]">
              {Object.entries(grouped).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 py-1 my-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] text-gray-400 font-semibold whitespace-nowrap bg-[#f0f2f5] px-2">{date}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {msgs.map(msg => {
                    const isMe = msg.senderId?.toString() === user._id?.toString();
                    return (
                      <div key={msg._id} className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-3.5 py-2 text-[13px] leading-relaxed break-words
                            ${isMe
                              ? 'bg-[#d9fdd3] text-gray-900 rounded-[10px] rounded-tr-[2px]'
                              : 'bg-white text-gray-900 rounded-[10px] rounded-tl-[2px] shadow-sm'
                            }`}>
                            {msg.message}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-[2px] flex items-center gap-1 px-1">
                            {formatTime(msg.timestamp)}
                            {isMe && <span>{msg.read ? '✓✓' : '✓'}</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {typing && (
                <div className="flex justify-start mb-2">
                  <div className="bg-white border border-gray-200 rounded-[14px] rounded-bl-[4px] px-3.5 py-2 text-gray-400 text-[13px] italic">
                    typing...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2 bg-white">
              <input
                className="flex-1 px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 text-[13px] text-gray-900 outline-none focus:border-teal-500 transition-colors"
                placeholder={`Message ${selected.name}...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={handleSend}
                style={{ opacity: input.trim() ? 1 : 0.45 }}
                className="w-10 h-10 rounded-[10px] bg-teal-600 text-white flex items-center justify-center shrink-0 transition-opacity hover:opacity-90"
              >
                {sendIcon}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="text-sm font-medium text-gray-500">Select a student to start chatting</p>
            <p className="text-[13px] text-gray-400">Use the search bar to find a student</p>
          </div>
        )}
      </div>
    </div>
  );
}
