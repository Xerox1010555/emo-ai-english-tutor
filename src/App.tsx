import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthScreen } from '@/components/AuthScreen';
import { PlacementTest } from '@/components/PlacementTest';
import { Layout, type TabId } from '@/components/Layout';
import { Home } from '@/components/screens/HomeScreen';
import { RoadmapScreen } from '@/components/screens/RoadmapScreen';
import { QuestsScreen } from '@/components/screens/QuestsScreen';
import { ReviewScreen } from '@/components/screens/ReviewScreen';
import { ChatScreen } from '@/components/screens/ChatScreen';
import { ProgressScreen } from '@/components/screens/ProgressScreen';
import { AppointmentsScreen } from '@/components/screens/AppointmentsScreen';
import { QuizScreen } from '@/components/screens/QuizScreen';
import { VocabularyScreen } from '@/components/screens/VocabularyScreen';
import { WeeklyReportScreen } from '@/components/screens/WeeklyReportScreen';
import { ExamScreen } from '@/components/screens/ExamScreen';
import { ScenarioScreen } from '@/components/screens/ScenarioScreen';
import { AdminScreen } from '@/components/screens/AdminScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { PageTransition } from '@/components/ui/motion';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';
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
  const { user, profile, loading, profileLoading, profileError, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [submittingPlacement, setSubmittingPlacement] = useState(false);

  const handlePlacementComplete = useCallback(
    async (results: {
      level: CEFRLevel;
      skillScores: Partial<Record<Skill, number>>;
    }) => {
      if (!user) return;
      setSubmittingPlacement(true);
      try {
        // Only skills that were actually measured are stored. Writing a 0 for a
        // skill that was never tested used to drag every skill average down
        // for the rest of the learner's life.
        const skillEntries = Object.entries(results.skillScores) as [Skill, number][];

        if (skillEntries.length > 0) {
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
        }

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

  // A missing profile must not become an endless spinner — and it must not
  // become an error either while it is still on its way. Only a finished
  // attempt that failed counts as an error.
  if (!profile) {
    if (loading || profileLoading) return <LoadingScreen />;
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950 px-6">
        <div className="glass rounded-2xl p-6 text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 rounded-2xl bg-warning-500/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-warning-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">We could not load your profile</h2>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              {profileError ?? 'Something went wrong while preparing your account.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={() => void refreshProfile()}>
              Try again
            </Button>
            <Button fullWidth variant="ghost" onClick={() => window.location.reload()}>
              Reload the app
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile.placement_done) {
    if (submittingPlacement) return <LoadingScreen label="Setting up your plan..." />;
    return <PlacementTest onComplete={handlePlacementComplete} />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <ErrorBoundary screenKey={activeTab}>
        <PageTransition transitionKey={activeTab}>
          {activeTab === 'home' && <Home onNavigate={setActiveTab} />}
          {activeTab === 'roadmap' && <RoadmapScreen onNavigate={setActiveTab} />}
          {activeTab === 'quests' && <QuestsScreen onNavigate={setActiveTab} />}
          {activeTab === 'review' && <ReviewScreen />}
          {activeTab === 'chat' && <ChatScreen />}
          {activeTab === 'progress' && <ProgressScreen onNavigate={setActiveTab} />}
          {activeTab === 'appointments' && <AppointmentsScreen />}
          {activeTab === 'vocabulary' && <VocabularyScreen onNavigate={setActiveTab} />}
          {activeTab === 'report' && <WeeklyReportScreen />}
          {activeTab === 'exam' && <ExamScreen />}
          {activeTab === 'scenario' && <ScenarioScreen />}
          {activeTab === 'admin' && <AdminScreen />}
          {activeTab === 'settings' && <SettingsScreen onNavigate={setActiveTab} />}
          {activeTab === 'quiz' && <QuizScreen onNavigate={setActiveTab} />}
        </PageTransition>
      </ErrorBoundary>
    </Layout>
  );
}

export default App;
