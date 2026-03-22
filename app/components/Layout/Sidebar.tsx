'use client';

import { useStore } from '@/app/lib/store';
import { isSuperAdmin, isModerator, isPremium } from '@/app/lib/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

const TOOLS = [
  { id: 'python-ide', name: '⚡ Python IDE', desc: 'AI-powered coding' },
  { id: 'robo-builder', name: '🤖 RoboBuilder 3D', desc: '3D robot designer' },
  { id: 'smart-canvas', name: '🎨 Smart Canvas', desc: 'AI whiteboard' },
  { id: 'chat', name: '💬 AI Chat', desc: '150+ models' },
  { id: 'study', name: '📖 Study Helper', desc: 'CBSE/Board help' },
  { id: 'advisors', name: '👨‍🏫 Advisors', desc: 'Mentors' },
  { id: 'team', name: '👥 Team Chat', desc: 'Collaborate', premium: true },
  { id: 'tools', name: '🧰 Utilities', desc: 'Calculator etc.' },
];

export default function Sidebar() {
  const { user, currentTool, setCurrentTool, sidebarOpen, setSidebarOpen } = useStore();
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    loadAd();
  }, [user]);

  const loadAd = async () => {
    if (isPremium(user)) return;
    try {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setAd(data);
    } catch (err) {}
  };

  const handleAdClick = async () => {
    if (!ad) return;
    await supabase.from('advertisements').update({ clicks: ad.clicks + 1 }).eq('id', ad.id);
    window.open(ad.click_url, '_blank');
  };

  const adminTools = isSuperAdmin(user) || isModerator(user)
    ? [{ id: 'admin', name: '⚙️ Admin Panel', desc: 'Manage platform' }]
    : [];

  const allTools = [...TOOLS, ...adminTools];

  return (
    <div className={`sidebar glass ${sidebarOpen ? 'open' : ''}`}>
      <div className="p-6 border-b border-cyan-500/20">
        <h1 className="text-2xl font-bold gradient-text">NEXUS AI SUITE</h1>
        <p className="text-xs text-gray-400 mt-1">Free for Students</p>
      </div>

      <div className="px-4 py-4 space-y-1">
        {allTools.map((tool) => {
          const isPremiumTool = tool.premium && !isPremium(user);
          return (
            <button
              key={tool.id}
              onClick={() => {
                if (isPremiumTool) {
                  setCurrentTool('premium');
                } else {
                  setCurrentTool(tool.id);
                  setSidebarOpen(false);
                }
              }}
              className={`w-full text-left p-3 rounded-lg transition ${
                currentTool === tool.id ? 'bg-cyan-500/20 border border-cyan-500/50 glow' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{tool.name}</div>
                  <div className="text-xs text-gray-400">{tool.desc}</div>
                </div>
                {isPremiumTool && <span className="premium-badge text-xs">PRO</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Premium CTA */}
      {!isPremium(user) && (
        <div className="px-4 py-2">
          <button
            onClick={() => setCurrentTool('premium')}
            className="w-full p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 hover:border-yellow-500/50 transition text-left"
          >
            <div className="font-semibold text-yellow-400 text-sm">⭐ Get Premium</div>
            <div className="text-xs text-gray-400">₹33/month • Unlock all features</div>
          </button>
        </div>
      )}

      {/* Advertisement */}
      {!isPremium(user) && ad && (
        <div className="px-4 py-2 border-t border-cyan-500/20">
          <div className="text-xs text-gray-500 mb-1">Sponsored</div>
          <div onClick={handleAdClick} className="glass p-2 rounded-lg cursor-pointer hover:glow transition">
            <img src={ad.image_url} alt="Ad" className="w-full rounded" />
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <div className="p-3 glass rounded-lg border border-cyan-500/30">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              isSuperAdmin(user) ? 'bg-gradient-to-br from-purple-400 to-pink-500' :
              isPremium(user) ? 'bg-gradient-to-br from-green-400 to-blue-500' :
              'bg-gradient-to-br from-cyan-400 to-blue-500'
            }`}>
              {user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-xs text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
        </div>

        <div className={`p-2 glass rounded-lg border text-center ${
          isSuperAdmin(user) ? 'border-purple-500/30' :
          isPremium(user) ? 'border-green-500/30' :
          'border-gray-500/30'
        }`}>
          <div className={`text-xs font-semibold ${
            isSuperAdmin(user) ? 'text-purple-400' :
            isModerator(user) ? 'text-blue-400' :
            isPremium(user) ? 'text-green-400' :
            'text-gray-400'
          }`}>
            {isSuperAdmin(user) ? '👑 SUPER ADMIN' :
             isModerator(user) ? '🛡️ MODERATOR' :
             isPremium(user) ? '✨ PREMIUM' : '🆓 FREE'}
          </div>
        </div>
      </div>
    </div>
  );
                  }
