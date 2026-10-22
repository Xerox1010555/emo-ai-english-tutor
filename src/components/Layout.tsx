import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Home, Calendar, MessageCircle, ChartLine, Map, Target, Settings, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { springSnappy } from './ui/motionTokens';
import { MeshBackground } from './ui/MeshBackground';
import { useI18n } from '@/lib/i18n';

export type TabId =
  | 'home'
  | 'roadmap'
  | 'quests'
  | 'review'
  | 'chat'
  | 'progress'
  | 'appointments'
  | 'vocabulary'
  | 'report'
  | 'exam'
  | 'scenario'
  | 'league'
  | 'year'
  | 'admin'
  | 'settings'
  | 'quiz';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

/** Tabs reachable from the bottom bar; the rest are pushed programmatically. */
const primaryTabs = new Set<TabId>([
  'home',
  'roadmap',
  'quests',
  'review',
  'chat',
  'progress',
  'settings',
]);

const layoutId = 'tab-indicator';

interface LayoutProps {
  children: ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { t } = useI18n();
  const allTabs: Tab[] = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'roadmap', label: t('nav.roadmap'), icon: Map },
    { id: 'quests', label: t('nav.quests'), icon: Target },
    { id: 'review', label: t('nav.review'), icon: RefreshCw },
    { id: 'chat', label: t('nav.chat'), icon: MessageCircle },
    { id: 'progress', label: t('nav.progress'), icon: ChartLine },
    { id: 'appointments', label: t('nav.schedule'), icon: Calendar },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];
  const visibleTabs = allTabs.filter((tab) => primaryTabs.has(tab.id));

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-ink-950/60 relative">
      <MeshBackground />

      <main className="flex-1 pb-28 overflow-x-hidden relative z-10">{children}</main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-40 px-3 pb-3 pointer-events-none">
        <div className="glass-panel rounded-[22px] px-2 py-2 safe-area-bottom pointer-events-auto shadow-glass-lg">
          <div className="flex items-center justify-around">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                  className="relative flex flex-col items-center gap-1 py-2 px-1.5 min-w-0 flex-1 transition-colors group"
                >
                  {active && (
                    <motion.span
                      layoutId={layoutId}
                      className="absolute inset-x-2 -top-px h-0.5 rounded-full bg-gradient-to-r from-primary-400 via-primary-300 to-accent-400 shadow-glow-primary"
                      transition={springSnappy}
                    />
                  )}
                  <motion.span
                    animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                    transition={springSnappy}
                    className={`flex items-center justify-center h-6 w-9 rounded-xl transition-colors duration-300 ${
                      active
                        ? 'bg-gradient-to-b from-primary-500/25 to-primary-500/5 text-primary-300'
                        : 'text-gray-500 group-hover:text-gray-300'
                    }`}
                  >
                    <Icon
                      className="w-5 h-5"
                      strokeWidth={active ? 2.3 : 1.9}
                    />
                  </motion.span>
                  <span
                    className={`text-[10px] font-semibold transition-colors ${
                      active ? 'text-primary-300' : 'text-gray-600 group-hover:text-gray-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
