import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { EASE, fadeUpVariants, springSnappy, springSoft } from './motionTokens';


/** Wraps a screen so switching tabs cross-fades instead of snapping. */
export function PageTransition({
  children,
  transitionKey,
}: {
  children: ReactNode;
  transitionKey: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Staggers direct `StaggerItem` children. */
export function StaggerList({
  children,
  className,
  gap = 0.05,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUpVariants}>
      {children}
    </motion.div>
  );
}

/** Simple entrance for standalone cards and sections. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Count-up number used for XP and quest totals. */
export function AnimatedNumber({
  value,
  className,
  duration = 0.7,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration }}
    >
      <motion.span
        key={value}
        initial={{ y: '-60%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={springSnappy}
      >
        {value}
      </motion.span>
    </motion.span>
  );
}

/** Press feedback for tappable surfaces. */
export function Pressable({
  children,
  className,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={className}
      whileHover={disabled ? undefined : { scale: 1.015 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={springSnappy}
    >
      {children}
    </motion.button>
  );
}

/** Expanding/collapsing container used for accordions and stage details. */
export function Collapse({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.26, ease: EASE }}
          className="overflow-hidden"
        >
          <div className={className}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Full-screen celebration overlay for quest and streak milestones. */
export function CelebrationOverlay({
  open,
  title,
  subtitle,
  emoji = 'ðŸŽ‰',
  onDone,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  emoji?: string;
  onDone?: () => void;
}) {
  return (
    <AnimatePresence onExitComplete={onDone}>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
        >
          <motion.div
            className="absolute inset-0 bg-ink-950/85 backdrop-blur-md"
            onClick={onDone}
          />
          <motion.div
            className="relative glass-strong rounded-3xl px-8 py-10 text-center shadow-lift max-w-xs w-full"
            initial={{ scale: 0.8, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={springSoft}
          >
            <motion.div
              className="text-5xl mb-4"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...springSoft, delay: 0.08 }}
            >
              {emoji}
            </motion.div>
            <h3 className="text-xl font-bold text-white font-sans">{title}</h3>
            {subtitle && <p className="text-sm text-gray-400 mt-1.5">{subtitle}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
