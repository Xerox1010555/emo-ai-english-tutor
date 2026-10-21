import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees. Keep it small: 8–12° reads as premium, more reads as a toy. */
  max?: number;
  /** Lift towards the viewer while hovering, in pixels. */
  lift?: number;
  /** Adds the moving specular highlight. */
  glare?: boolean;
  onClick?: () => void;
}

/**
 * A glass surface that tilts in 3D towards the pointer.
 *
 * The tilt is driven by motion values (not React state) and smoothed with a
 * spring, so it stays on the compositor and never re-renders the tree. The
 * glare uses the same values, so the highlight always sits where the
 * "light" is.
 */
export function TiltCard({
  children,
  className = '',
  max = 9,
  lift = 14,
  glare = true,
  onClick,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const spring = { stiffness: 180, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const translateZ = useSpring(useTransform(px, [0, 1], [0, lift]), spring);

  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
  }

  function handlePointerLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-tilt="true"
      style={{ rotateX, rotateY, translateZ, transformStyle: 'preserve-3d' }}
      className={`group relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
      {glare && (
        <motion.span
          aria-hidden
          className="glare"
          style={
            {
              '--glare-x': glareX,
              '--glare-y': glareY,
            } as React.CSSProperties
          }
        />
      )}
    </motion.div>
  );
}
