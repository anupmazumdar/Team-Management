import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { Message, User } from '../../types';
import {
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

interface ChatBoxProps {
  projectId: string;
  projectName: string;
  members: { userId: string; user: User }[];
}

export const ChatBox: React.FC<ChatBoxProps> = ({ projectId, projectName, members }) => {
  const { user } = useAuth();
  const { socket, joinProject, leaveProject, sendMessage, sendTyping } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const [showMentionMenu, setShowMentionMenu] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history and join project room
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/${projectId}/messages`);
        setMessages(res.data || []);
      } catch (err) {
        console.error('Failed to load project messages:', err);
      }
    };

    fetchMessages();
    joinProject(projectId);

    return () => {
      leaveProject(projectId);
    };
  }, [projectId, joinProject, leaveProject]);

  // Socket listener for new messages & typing
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (msg.projectId === projectId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleUserTyping = (data: { userId: string; fullName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const copy = { ...prev };
        if (data.isTyping && data.userId !== user?.id) {
          copy[data.userId] = data.fullName;
        } else {
          delete copy[data.userId];
        }
        return copy;
      });
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleUserTyping);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleUserTyping);
    };
  }, [socket, projectId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setContent(text);

    // Typing indication
    sendTyping(projectId, text.length > 0);

    // Mention trigger check
    const lastWord = text.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setShowMentionMenu(true);
      setMentionQuery(lastWord.substring(1).toLowerCase());
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (memberUser: User) => {
    const words = content.split(' ');
    words.pop();
    words.push(`@${memberUser.fullName}`);
    setContent(words.join(' ') + ' ');
    setShowMentionMenu(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    // Detect mentioned member user IDs
    const mentions: string[] = [];
    members.forEach((m) => {
      if (content.includes(`@${m.user.fullName}`)) {
        mentions.push(m.userId);
      }
    });

    sendMessage(projectId, content.trim(), mentions);
    setContent('');
    sendTyping(projectId, false);
    setShowMentionMenu(false);
  };

  const filteredMembers = members.filter((m) =>
    m.user.fullName.toLowerCase().includes(mentionQuery)
  );

  return (
    <div className="flex flex-col h-[650px] bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <span>#{projectName}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <p className="text-[11px] text-slate-400">
            Real-time project discussion, @mentions, and verification broadcasts.
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
            <Sparkles className="w-8 h-8 text-indigo-400/60 mb-2" />
            <p className="font-semibold text-slate-300">No messages yet in #{projectName}</p>
            <p className="text-[11px] mt-1">Start the conversation or mention team members with @.</p>
          </div>
        ) : (
          messages.map((msg) => {
            // Check if system message
            if (msg.isSystem) {
              const isApproval = msg.content.toLowerCase().includes('approved');
              const isChanges = msg.content.toLowerCase().includes('changes');

              return (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 my-2 ${
                    isApproval
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                      : isChanges
                      ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                      : 'bg-indigo-950/30 border-indigo-800/50 text-indigo-300'
                  }`}
                >
                  {isApproval ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isChanges ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  )}
                  <span className="font-medium">{msg.content}</span>
                  <span className="ml-auto text-[10px] text-slate-400 font-mono">
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </span>
                </div>
              );
            }

            const isMe = msg.senderId === user?.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <img
                  src={msg.sender?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                  alt={msg.sender?.fullName || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-800 shrink-0"
                />
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-semibold text-slate-200 text-[11px]">
                      {msg.sender?.fullName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {format(new Date(msg.createdAt), 'HH:mm')}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20'
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {Object.keys(typingUsers).length > 0 && (
        <div className="px-4 py-1 text-[11px] text-indigo-400 italic bg-slate-950/40">
          {Object.values(typingUsers).join(', ')} is typing...
        </div>
      )}

      {/* Mention Dropdown Autocomplete */}
      {showMentionMenu && filteredMembers.length > 0 && (
        <div className="mx-4 mb-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl max-h-40 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase">
            Mention Member
          </div>
          {filteredMembers.map((m) => (
            <button
              key={m.userId}
              onClick={() => insertMention(m.user)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
            >
              <img
                src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                alt=""
                className="w-4 h-4 rounded-full"
              />
              <span>{m.user.fullName}</span>
            </button>
          ))}
        </div>
      )}

      {/* Message Input Footer */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={handleInputChange}
          placeholder={`Message #${projectName} (type @ to mention)...`}
          className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
