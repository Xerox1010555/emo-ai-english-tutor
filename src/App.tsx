import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthScreen } from '@/components/AuthScreen';
import { PlacementTest } from '@/components/PlacementTest';
import { Layout, type TabId } from '@/components/Layout';
import { Home } from '@/components/screens/HomeScreen';
import { RoadmapScreen } from '@/components/screens/RoadmapScreen';
import { QuestsScreen } from '@/components/screens/QuestsScreen';
import { ChatScreen } from '@/components/screens/ChatScreen';
import { ProgressScreen } from '@/components/screens/ProgressScreen';
import { AppointmentsScreen } from '@/components/screens/AppointmentsScreen';
import { QuizScreen } from '@/components/screens/QuizScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { PageTransition } from '@/components/ui/motion';
import type { CEFRLevel, Skill } from '@/lib/types';

function LoadingScreen({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20 animate-pulse">
          <span className="text-xl font-extrabold text-white">E</span>
        </div>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function App() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [submittingPlacement, setSubmittingPlacement] = useState(false);

  const handlePlacementComplete = useCallback(
    async (results: { level: CEFRLevel; skillScores: Record<Skill, number> }) => {
      if (!user) return;
      setSubmittingPlacement(true);
      try {
        const skillEntries = Object.entries(results.skillScores) as [Skill, number][];

        await Promise.all(
          skillEntries.map(([skill, score]) =>
            supabase.from('placement_results').insert({ user_id: user.id, skill, score }),
          ),
        );

        const avgScore = Math.round(
          skillEntries.reduce((sum, [, score]) => sum + score, 0) / skillEntries.length,
        );
        await supabase
          .from('level_history')
          .insert({ user_id: user.id, level: results.level, score: avgScore });

        await supabase
          .from('profiles')
          .update({ current_level: results.level, placement_done: true })
          .eq('id', user.id);

        await refreshProfile();
      } catch (err) {
        console.error('[placement] save failed:', err);
      } finally {
        setSubmittingPlacement(false);
      }
    },
    [user, refreshProfile],
  );

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;
  if (!profile) return <LoadingScreen />;

  if (!profile.placement_done) {
    if (submittingPlacement) return <LoadingScreen label="Setting up your plan..." />;
    return <PlacementTest onComplete={handlePlacementComplete} />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <PageTransition transitionKey={activeTab}>
        {activeTab === 'home' && <Home onNavigate={setActiveTab} />}
        {activeTab === 'roadmap' && <RoadmapScreen onNavigate={setActiveTab} />}
        {activeTab === 'quests' && <QuestsScreen onNavigate={setActiveTab} />}
        {activeTab === 'chat' && <ChatScreen />}
        {activeTab === 'progress' && <ProgressScreen />}
        {activeTab === 'appointments' && <AppointmentsScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
        {activeTab === 'quiz' && <QuizScreen />}
      </PageTransition>
    </Layout>
  );
}

export default App;
