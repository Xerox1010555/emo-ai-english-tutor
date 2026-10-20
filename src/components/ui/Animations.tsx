import { useEffect, useState } from 'react';

interface TypingDotsProps {
  className?: string;
}

export function TypingDots({ className = '' }: TypingDotsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-typing"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

interface SoundWaveProps {
  active: boolean;
  className?: string;
}

export function SoundWave({ active, className = '' }: SoundWaveProps) {
  const bars = 5;
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${active ? 'bg-primary-500 animate-wave' : 'bg-gray-600'}`}
          style={{
            height: active ? '24px' : '8px',
            animationDelay: `${i * 0.1}s`,
            transition: 'height 0.2s',
          }}
        />
      ))}
    </div>
  );
}

interface ShimmerProps {
  className?: string;
}

export function Shimmer({ className = '' }: ShimmerProps) {
  return <div className={`shimmer-bg animate-shimmer rounded-lg ${className}`} />;
}

export function useCountdown(target: Date) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    function update() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Now');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) setCountdown(`${days}d ${hours}h ${minutes}m`);
      else if (hours > 0) setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      else if (minutes > 0) setCountdown(`${minutes}m ${seconds}s`);
      else setCountdown(`${seconds}s`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return countdown;
}
