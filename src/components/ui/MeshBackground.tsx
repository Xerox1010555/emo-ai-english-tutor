/**
 * The ambient background of the app shell.
 *
 * Three slowly drifting colour fields under a fine grain layer. Everything is
 * transform/opacity only, so the whole thing runs on the compositor and never
 * triggers layout.
 */
export function MeshBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none ${className}`} aria-hidden>
      <div className="scene absolute inset-0">
        <div className="mesh-field">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="noise-overlay" />
      {/* A soft vignette pulls focus to the middle of the screen. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, transparent 40%, rgba(7,7,16,0.55) 100%)',
        }}
      />
    </div>
  );
}
