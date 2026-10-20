import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Home, Calendar, MessageCircle, ChartLine, Map, Target, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { springSnappy } from './ui/motionTokens';

export type TabId =
  | 'home'
  | 'roadmap'
  | 'quests'
  | 'chat'
  | 'progress'
  | 'appointments'
  | 'settings'
  | 'quiz';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const tabs: Tab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'quests', label: 'Quests', icon: Target },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'progress', label: 'Progress', icon: ChartLine },
  { id: 'appointments', label: 'Schedule', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/** Tabs reachable from the bottom bar; the rest are pushed programmatically. */
const primaryTabs = new Set<TabId>(['home', 'roadmap', 'quests', 'chat', 'progress', 'settings']);

const layoutId = 'tab-indicator';

interface LayoutProps {
  children: ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const visibleTabs = tabs.filter((t) => primaryTabs.has(t.id));

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-ink-950 relative">
      {/* Subtle ambient wash at the top of the app shell. */}
      <div className="aurora opacity-70" aria-hidden />

      <main className="flex-1 pb-24 overflow-x-hidden relative z-10">{children}</main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-40">
        <div className="glass-strong border-t border-white/[0.06] px-1.5 py-2 safe-area-bottom">
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
                  className="relative flex flex-col items-center gap-1 py-1.5 px-1.5 min-w-0 flex-1 transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId={layoutId}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full"
                      transition={springSnappy}
                    />
                  )}
                  <motion.span
                    animate={{ scale: active ? 1.1 : 1 }}
                    transition={springSnappy}
                    className="flex items-center justify-center h-5"
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors duration-200 ${active ? 'text-primary-400' : 'text-gray-600'}`}
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                  </motion.span>
                  <span
                    className={`text-[10px] font-medium transition-colors ${active ? 'text-primary-400' : 'text-gray-600'}`}
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
