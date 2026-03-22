'use client';

import { useEffect, useState } from 'react';
import { useStore } from './lib/store';
import { getCurrentUser } from './lib/auth';

import AuthPage from './components/Auth/AuthPage';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import TermsPopup from './components/Auth/TermsPopup';
import FloatingTools from './components/Layout/FloatingTools';
import Notifications from './components/Layout/Notifications';

import PythonIDE from './components/Tools/PythonIDE';
import RoboBuilder3D from './components/Tools/RoboBuilder3D';
import SmartCanvas from './components/Tools/SmartCanvas';
import ChatInterface from './components/AI/ChatInterface';
import AdminPanel from './components/Admin/AdminPanel';
import PremiumPage from './components/Premium/PremiumPage';
import StudyHelper from './components/Study/StudyHelper';
import AdvisorHub from './components/Advisors/AdvisorHub';
import TeamChat from './components/Collaboration/TeamChat';

export default function Home() {
  const { user, setUser, currentTool, showTermsPopup, setShowTermsPopup } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser && !currentUser.accepted_terms) {
        setShowTermsPopup(true);
      }
      setLoading(false);
    }
    loadUser();
  }, [setUser, setShowTermsPopup]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <div className="text-2xl font-bold gradient-text">Loading Nexus AI...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="mt-6">
          {currentTool === 'python-ide' && <PythonIDE />}
          {currentTool === 'robo-builder' && <RoboBuilder3D />}
          {currentTool === 'smart-canvas' && <SmartCanvas />}
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
        </div>
      </div>
      <FloatingTools />
      <Notifications />
      {showTermsPopup && <TermsPopup />}
    </>
  );
}
