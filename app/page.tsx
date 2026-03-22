'use client';

import { useEffect, useState, Suspense } from 'react';
import { useStore } from './lib/store';
import { getCurrentUser } from './lib/auth';

// Auth
import AuthPage from './components/Auth/AuthPage';
import TermsPopup from './components/Auth/TermsPopup';

// Layout
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import FloatingTools from './components/Layout/FloatingTools';
import Notifications from './components/Layout/Notifications';

// Tools
import PythonIDE from './components/Tools/PythonIDE';
import RoboBuilder3D from './components/Tools/RoboBuilder3D';
import SmartCanvas from './components/Tools/SmartCanvas';
import SmartBoard from './components/Tools/SmartBoard';

// AI
import ChatInterface from './components/AI/ChatInterface';

// Pages
import AdminPanel from './components/Admin/AdminPanel';
import PremiumPage from './components/Premium/PremiumPage';
import StudyHelper from './components/Study/StudyHelper';
import AdvisorHub from './components/Advisors/AdvisorHub';
import TeamChat from './components/Collaboration/TeamChat';

// Loading component
function ToolLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <div className="text-sm text-gray-400">Loading tool...</div>
      </div>
    </div>
  );
}

// Welcome Dashboard
function WelcomeDashboard({ user }: { user: any }) {
  const { setCurrentTool } = useStore();

  const quickTools = [
    { id: 'smartboard', icon: '📋', title: 'SmartBoard', desc: 'Teach, present, design', color: 'from-pink-500 to-rose-500' },
    { id: 'python-ide', icon: '⚡', title: 'Python IDE', desc: 'Code with AI copilot', color: 'from-cyan-500 to-blue-500' },
    { id: 'robo-builder', icon: '🤖', title: 'RoboBuilder', desc: 'Design robots in 3D', color: 'from-green-500 to-emerald-500' },
    { id: 'chat', icon: '💬', title: 'AI Chat', desc: 'Ask anything', color: 'from-purple-500 to-indigo-500' },
    { id: 'study', icon: '📖', title: 'Study Helper', desc: 'CBSE doubt solver', color: 'from-yellow-500 to-orange-500' },
    { id: 'team', icon: '👥', title: 'Team Chat', desc: 'Collaborate live', color: 'from-blue-500 to-cyan-500' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="glass p-8 rounded-2xl text-center">
        <h1 className="text-4xl font-bold gradient-text mb-2">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}! 👋
        </h1>
        <p className="text-gray-400">What would you like to work on today?</p>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setCurrentTool(tool.id)}
            className="glass p-6 rounded-xl text-left hover:scale-105 transition-all duration-300 hover:glow group"
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition`}>
              {tool.icon}
            </div>
            <h3 className="text-lg font-bold mb-1">{tool.title}</h3>
            <p className="text-sm text-gray-400">{tool.desc}</p>
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-lg text-center">
          <div className="text-2xl font-bold gradient-text">150+</div>
          <div className="text-xs text-gray-400">AI Models</div>
        </div>
        <div className="glass p-4 rounded-lg text-center">
          <div className="text-2xl font-bold gradient-text">24/7</div>
          <div className="text-xs text-gray-400">Available</div>
        </div>
        <div className="glass p-4 rounded-lg text-center">
          <div className="text-2xl font-bold gradient-text">₹0</div>
          <div className="text-xs text-gray-400">Forever Free</div>
        </div>
        <div className="glass p-4 rounded-lg text-center">
          <div className="text-2xl font-bold gradient-text">🇮🇳</div>
          <div className="text-xs text-gray-400">Hindi + English</div>
        </div>
      </div>

      {/* Tip of the Day */}
      <div className="glass p-6 rounded-xl border border-cyan-500/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-2xl">💡</div>
          <div className="font-bold">Tip of the Day</div>
        </div>
        <p className="text-sm text-gray-300">
          Use the <strong className="text-cyan-400">SmartBoard</strong> to create presentations, 
          YouTube thumbnails, and teaching materials — just like Canva, but with AI assistance! 
          Perfect for teachers and students.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, setUser, currentTool, showTermsPopup, setShowTermsPopup } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        if (currentUser && !currentUser.accepted_terms) {
          setShowTermsPopup(true);
        }
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    }
    loadUser();
  }, [setUser, setShowTermsPopup]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🚀</div>
          <div className="spinner mx-auto mb-4" />
          <div className="text-2xl font-bold gradient-text mb-2">Nexus AI Suite</div>
          <div className="text-sm text-gray-400">Loading your workspace...</div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass p-8 rounded-2xl max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return <AuthPage />;
  }

  // Main App
  return (
    <>
      <Sidebar />

      <div className="main-content">
        <TopBar />

        <div className="mt-6">
          <Suspense fallback={<ToolLoading />}>
            {currentTool === 'dashboard' && <WelcomeDashboard user={user} />}
            {currentTool === 'python-ide' && <PythonIDE />}
            {currentTool === 'robo-builder' && <RoboBuilder3D />}
            {currentTool === 'smart-canvas' && <SmartCanvas />}
            {currentTool === 'smartboard' && <SmartBoard />}
            {currentTool === 'chat' && <ChatInterface />}
            {currentTool === 'study' && <StudyHelper />}
            {currentTool === 'advisors' && <AdvisorHub />}
            {currentTool === 'team' && <TeamChat />}
            {currentTool === 'admin' && <AdminPanel />}
            {currentTool === 'premium' && <PremiumPage />}
            {currentTool === 'tools' && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🧰</div>
                <h2 className="text-3xl font-bold gradient-text mb-2">Utility Tools</h2>
                <p className="text-gray-400">Use the floating widget in bottom-right corner</p>
                <p className="text-gray-400 text-sm mt-2">🎵 Music • 🧮 Calculator • 💱 Currency • 💬 WhatsApp</p>
              </div>
            )}
          </Suspense>
        </div>
      </div>

      <FloatingTools />
      <Notifications />

      {showTermsPopup && <TermsPopup />}
    </>
  );
          }
