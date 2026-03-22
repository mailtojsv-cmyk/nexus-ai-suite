'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/app/lib/store';
import { supabase } from '@/app/lib/supabase';

interface Room {
  id: string;
  name: string;
  owner_id: string;
  members: string[];
  created_at: string;
}

interface Message {
  id: number;
  user_id: string;
  room_id: string;
  model: string;
  user_message: string;
  ai_response: string;
  created_at: string;
  sender_name?: string;
}

export default function TeamChat() {
  const { user, currentModel, addNotification } = useStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadRooms();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRooms = async () => {
    // Load rooms where user is owner or member
    const { data } = await supabase
      .from('collaboration_rooms')
      .select('*')
      .order('created_at', { ascending: false });

    const myRooms = (data || []).filter(
      (room) => room.owner_id === user?.id || room.members?.includes(user?.id || '')
    );
    setRooms(myRooms);
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;

    const { data, error } = await supabase
      .from('collaboration_rooms')
      .insert({
        name: newRoomName,
        owner_id: user?.id,
        members: [user?.id],
      })
      .select()
      .single();

    if (data) {
      setRooms([data, ...rooms]);
      setCurrentRoom(data);
      setNewRoomName('');
      setShowCreateRoom(false);
      addNotification({ type: 'success', message: `Room "${newRoomName}" created!` });
      subscribeToRoom(data.id);
      loadRoomMessages(data.id);
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;

    // Find room by ID
    const { data: room } = await supabase
      .from('collaboration_rooms')
      .select('*')
      .eq('id', joinCode)
      .single();

    if (!room) {
      addNotification({ type: 'error', message: 'Room not found' });
      return;
    }

    // Add user to members
    const updatedMembers = [...(room.members || []), user?.id];
    await supabase
      .from('collaboration_rooms')
      .update({ members: updatedMembers })
      .eq('id', room.id);

    room.members = updatedMembers;
    setRooms([room, ...rooms]);
    setCurrentRoom(room);
    setJoinCode('');
    setShowJoinRoom(false);
    addNotification({ type: 'success', message: `Joined "${room.name}"!` });
    subscribeToRoom(room.id);
    loadRoomMessages(room.id);
  };

  const subscribeToRoom = (roomId: string) => {
    // Unsubscribe from previous
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Only add if not from current user
          if (newMessage.user_id !== user?.id) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const members = Object.values(state).flat().map((p: any) => p.name);
        setOnlineMembers(members);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user?.id,
            name: user?.name,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;
  };

  const loadRoomMessages = async (roomId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    setMessages(data || []);
  };

  const enterRoom = (room: Room) => {
    setCurrentRoom(room);
    subscribeToRoom(room.id);
    loadRoomMessages(room.id);
  };

  const leaveRoom = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    setCurrentRoom(null);
    setMessages([]);
    setOnlineMembers([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentRoom) return;

    const userMsg: Message = {
      id: Date.now(),
      user_id: user?.id || '',
      room_id: currentRoom.id,
      model: currentModel,
      user_message: input,
      ai_response: '',
      created_at: new Date().toISOString(),
      sender_name: user?.name,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Save user message
      await supabase.from('chat_messages').insert({
        user_id: user?.id,
        room_id: currentRoom.id,
        model: currentModel,
        user_message: input,
        ai_response: '(team message)',
      });

      // Check if message starts with @ai
      if (input.toLowerCase().startsWith('@ai ')) {
        const aiQuery = input.substring(4);

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: aiQuery,
            model: currentModel,
            history: messages.slice(-5).map((m) => ({
              role: m.user_id === user?.id ? 'user' : 'assistant',
              content: m.user_message || m.ai_response,
            })),
          }),
        });

        const data = await res.json();

        const aiMsg: Message = {
          id: Date.now() + 1,
          user_id: 'ai',
          room_id: currentRoom.id,
          model: currentModel,
          user_message: '',
          ai_response: data.response,
          created_at: new Date().toISOString(),
          sender_name: 'AI Assistant',
        };

        setMessages((prev) => [...prev, aiMsg]);

        // Save AI response
        await supabase.from('chat_messages').insert({
          user_id: user?.id,
          room_id: currentRoom.id,
          model: currentModel,
          user_message: `@ai ${aiQuery}`,
          ai_response: data.response,
        });
      }
    } catch (error: any) {
      addNotification({ type: 'error', message: 'Failed to send message' });
    }

    setLoading(false);
  };

  const copyRoomCode = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom.id);
      addNotification({ type: 'success', message: 'Room code copied! Share with teammates.' });
    }
  };

  // Room List View
  if (!currentRoom) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold gradient-text">👥 Team Collaboration</h2>
            <p className="text-gray-400 text-sm">Create or join rooms to chat with teammates + AI</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreateRoom(!showCreateRoom)} className="btn btn-primary">
              + Create Room
            </button>
            <button onClick={() => setShowJoinRoom(!showJoinRoom)} className="btn btn-secondary">
              🔗 Join Room
            </button>
          </div>
        </div>

        {/* Create Room Form */}
        {showCreateRoom && (
          <div className="glass p-6 rounded-lg border border-cyan-500/30">
            <h3 className="font-bold mb-3">Create New Room</h3>
            <div className="flex gap-2">
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name (e.g., Math Study Group)"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && createRoom()}
              />
              <button onClick={createRoom} className="btn btn-primary">
                Create
              </button>
            </div>
          </div>
        )}

        {/* Join Room Form */}
        {showJoinRoom && (
          <div className="glass p-6 rounded-lg border border-cyan-500/30">
            <h3 className="font-bold mb-3">Join Existing Room</h3>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Paste room code here..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              />
              <button onClick={joinRoom} className="btn btn-primary">
                Join
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Ask your teammate for the room code</p>
          </div>
        )}

        {/* Rooms List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.length === 0 ? (
            <div className="col-span-full text-center py-20 text-gray-400">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-2">No rooms yet</h3>
              <p>Create a room or join one with a code</p>
            </div>
          ) : (
            rooms.map((room) => (
              <div key={room.id} className="glass p-5 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 transition hover:scale-105">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-xl font-bold">
                    {room.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold">{room.name}</h3>
                    <p className="text-xs text-gray-400">{room.members?.length || 1} member{(room.members?.length || 1) > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Created: {new Date(room.created_at).toLocaleDateString()}
                </div>
                <button onClick={() => enterRoom(room)} className="w-full btn btn-primary text-sm">
                  Enter Room →
                </button>
              </div>
            ))
          )}
        </div>

        {/* Instructions */}
        <div className="glass p-6 rounded-lg">
          <h3 className="font-bold mb-3">💡 How Team Collaboration Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-2xl mb-2">1️⃣</div>
              <div className="font-semibold">Create a Room</div>
              <div className="text-gray-400">Click "Create Room" and name it</div>
            </div>
            <div>
              <div className="text-2xl mb-2">2️⃣</div>
              <div className="font-semibold">Share Room Code</div>
              <div className="text-gray-400">Copy the room code and send to friends</div>
            </div>
            <div>
              <div className="text-2xl mb-2">3️⃣</div>
              <div className="font-semibold">Chat Together + AI</div>
              <div className="text-gray-400">Everyone sees messages. Type @ai to ask AI</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat View (Inside Room)
  return (
    <div className="space-y-4">
      {/* Room Header */}
      <div className="glass p-4 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={leaveRoom} className="btn btn-secondary text-sm">
            ← Back
          </button>
          <div>
            <h2 className="text-xl font-bold">{currentRoom.name}</h2>
            <p className="text-xs text-gray-400">
              {onlineMembers.length > 0
                ? `${onlineMembers.length} online: ${onlineMembers.join(', ')}`
                : `${currentRoom.members?.length || 1} member(s)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyRoomCode} className="btn btn-secondary text-sm">
            📋 Copy Room Code
          </button>
          <div className="flex -space-x-2">
            {onlineMembers.slice(0, 5).map((name, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-xs font-bold border-2 border-gray-900">
                {name[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="glass rounded-xl p-6 min-h-[400px] max-h-[400px] overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-2">💬</div>
            <p>Start chatting! Type <strong>@ai</strong> before your message to ask AI.</p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            const isAi = msg.user_id === 'ai';

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  isAi
                    ? 'bg-purple-500/20 border border-purple-500/50'
                    : isMe
                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                    : 'bg-white/5 border border-white/10'
                }`}>
                  <div className="text-xs font-semibold mb-1">
                    {isAi ? '🤖 AI Assistant' : isMe ? 'You' : msg.sender_name || 'Teammate'}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {isAi ? msg.ai_response : msg.user_message}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-500/50">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type message... (use @ai to ask AI)"
          className="flex-1 px-4 py-3 rounded-lg"
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn btn-primary px-8">
          {loading ? '...' : 'Send'}
        </button>
      </div>

      <div className="text-xs text-center text-gray-400">
        💡 Type <strong>@ai what is gravity?</strong> to ask AI in the group chat
      </div>
    </div>
  );
            }
