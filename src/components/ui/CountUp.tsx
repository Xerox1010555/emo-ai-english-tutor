import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { EASE } from './motionTokens';

interface CountUpProps {
  value: number;
  /** Rendered after the number (e.g. "%", " XP"). */
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  decimals?: number;
  className?: string;
}

/**
 * Counts up to a value when it scrolls into view.
 *
 * Numbers that move are read as alive; a value that is simply set feels like
 * a static label. The animation is frame-rate independent and respects
 * prefers-reduced-motion through the global CSS rule.
 */
export function CountUp({
  value,
  suffix = '',
  prefix = '',
  durationMs = 900,
  decimals = 0,
  className = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // easeOutExpo — fast start, gentle landing.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/**
 * A number that animates on every change (not only on first view) — used for
 * XP and counters that update while the app is open.
 */
export function AnimatedNumber({
  value,
  className = '',
  suffix = '',
}: {
  value: number;
  className?: string;
  suffix?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.4, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      className={className}
    >
      {value}
      {suffix}
    </motion.span>
  );
}
