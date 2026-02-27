import React, { useState, useEffect, useRef } from "react";

function formatTime(sec) {
  if (sec == null || isNaN(sec)) return "00:00";
  sec = Math.floor(sec);
  const s = (sec % 60).toString().padStart(2, "0");
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function SeekBar({ progress, duration, onSeek }) {
  const [local, setLocal] = useState(0);

  const dragging = useRef(false);
  const suppressNext = useRef(false);

  useEffect(() => {
    if (dragging.current) return;

    if (suppressNext.current) {
      suppressNext.current = false;
      return;
    }

    setLocal(progress);
  }, [progress]);

  const handleChange = (e) => {
    dragging.current = true;
    setLocal(Number(e.target.value));   // UPDATE SLIDER ONLY (UI-only)
  };

  const handleRelease = () => {
    dragging.current = false;

    suppressNext.current = true;

    // Perform actual audio seek *once*
    onSeek(local);
  };

  const percent = duration ? (local / duration) * 100 : 0;
  const remaining = Math.max(0, (duration || 0) - local);

  return (
    <div className="seekbar-root">
      <div className="time current">{formatTime(local)}</div>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={local}
        onChange={handleChange}      // UI ONLY
        onMouseUp={handleRelease}    // Seek here
        onTouchEnd={handleRelease}   // Seek here
        style={{ "--progress": `${percent}%` }}
      />

      <div className="time remaining">-{formatTime(remaining)}</div>
    </div>
  );
}
