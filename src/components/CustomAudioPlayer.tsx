import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface CustomAudioPlayerProps {
  src: string;
}

export function CustomAudioPlayer({ src }: CustomAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reset player state if src changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [src]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Audio playback failed:", err);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-[210px] inline-flex flex-col gap-1.5 p-2 bg-slate-900 border border-indigo-950/40 rounded-lg text-slate-300 shadow-md">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        preload="metadata"
      />
      
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
          title={isPlaying ? "Pausar" : "Ouvir"}
        >
          {isPlaying ? (
            <Pause className="h-3 w-3 fill-indigo-400/20" />
          ) : (
            <Play className="h-3 w-3 fill-indigo-400/20 translate-x-[0.5px]" />
          )}
        </button>

        {/* Dynamic Progress Timeline Bar */}
        <div 
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-1.5 bg-slate-800 rounded-full flex-1 relative cursor-pointer overflow-hidden group"
        >
          <div 
            className="absolute top-0 left-0 h-full bg-cyan-500 rounded-full group-hover:bg-cyan-400 transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Small Audio Icon indicator */}
        <Volume2 className="h-3.5 w-3.5 text-indigo-400/60 shrink-0" />
      </div>

      {/* Time Tracking Row */}
      <div className="flex justify-between items-center px-1">
        <span className="font-mono text-[9px] text-slate-400 select-none">
          {formatTime(currentTime)}
        </span>
        <span className="font-mono text-[9px] text-slate-400 select-none">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
