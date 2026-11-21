import React, { useState, useEffect, useRef, useMemo } from "react";
import "../styles/waveProgressBar.css";

function formatTime(sec) {
    if (sec == null || isNaN(sec)) return "00:00";
    sec = Math.floor(sec);
    const s = (sec % 60).toString().padStart(2, "0");
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export default function WaveProgressBar({ progress, duration, onSeek }) {
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
        setLocal(Number(e.target.value));
    };

    const handleRelease = () => {
        dragging.current = false;
        suppressNext.current = true;
        onSeek(local);
    };

    const barsCount = 60;
    const waveHeights = useMemo(() => {
        const heights = [];
        // Creating a deterministic random looking wave based on duration
        let p = Math.floor(duration || 100) % 1000;
        if (p === 0) p = 152;
        for (let i = 0; i < barsCount; i++) {
            p = (p * 9301 + 49297) % 233280;
            const rand = p / 233280;
            // Apply an arch factor so the edges are a bit smaller on average
            let factor = 0.5 + Math.sin((i / barsCount) * Math.PI) * 0.5;
            let h = 0.15 + (rand * 0.85) * factor;
            if (h < 0.1) h = 0.1;
            if (h > 1) h = 1;
            heights.push(h);
        }
        return heights;
    }, [duration]);

    const currentPercent = (duration || 0) > 0 ? local / duration : 0;

    return (
        <div className="wave-progress-root">
            <div className="wave-bars-container">
                {waveHeights.map((h, i) => {
                    const barStartPercent = i / barsCount;
                    const isFilled = barStartPercent <= currentPercent;
                    return (
                        <div
                            key={i}
                            className={`wave-bar ${isFilled ? 'filled' : ''}`}
                            style={{ height: `${h * 100}%` }}
                        />
                    );
                })}
            </div>

            <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={local}
                onChange={handleChange}
                onMouseUp={handleRelease}
                onTouchEnd={handleRelease}
                className="wave-range-input"
            />

            <div className="wave-time-row">
                <span>{formatTime(local)}</span>
                <span>-{formatTime(Math.max(0, (duration || 0) - local))}</span>
            </div>
        </div>
    );
}
