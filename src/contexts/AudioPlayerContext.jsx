import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQueue } from "./QueueContext";

const AudioPlayerContext = createContext();

export const AudioPlayerProvider = ({ children }) => {
  const audioRef = useRef(new Audio());
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(false);
  const { queue, setQueue } = useQueue();

  // Web Audio
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNode = useRef(null);
  const convolver = useRef(null);
  const eqBandsRef = useRef([]);

  const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000];

  // Presets
  const EQ_PRESETS = {
    Balanced: [0,0,0,0,0,0,0,0,0],
    Flat: [0,0,0,0,0,0,0,0,0],
    Jazz: [0,0,2,3,2,1,0,0,0],
    "Bass Boost": [5,4,3,1,0,-1,-2,-2,-2],
    "Treble Boost": [-2,-2,-2,0,1,2,3,4,5],
    Rock: [4,3,2,1,0,1,2,3,4],
    Pop: [3,2,1,0,0,1,2,3,3],
    Classical: [-2,-1,0,1,2,1,0,-1,-2],
    Acoustic: [0,1,2,3,2,1,0,0,0],
    "V-Shape": [5,3,0,0,0,0,0,3,5],
    Dance: [4,3,2,1,0,1,2,3,4],
    "Hip-Hop": [6,4,2,0,0,0,2,4,6],
    Electronic: [5,4,3,1,0,1,3,4,5],
    Vocal: [-1,0,1,2,3,2,1,0,-1],
    Party: [5,4,3,2,1,2,3,4,5],
    "Large Hall": [0,1,2,3,3,2,1,0,0],
  };

  const [effects, setEffects] = useState({ hall: false });
  const [eqValues, setEqValues] = useState(EQ_PRESETS.Flat);

  // Audio events
  useEffect(() => {
    const audio = audioRef.current;
    audio.crossOrigin = "anonymous";

    const onTime = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (loop) { audio.currentTime = 0; audio.play(); return; }
      if (queue.length > 0) {
        const next = queue[0];
        setQueue(queue.slice(1));
        playSong(next);
      } else { setPlaying(false); }
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnd);
    };
  }, [loop, queue, setQueue]);

  // Init WebAudio
  const initAudioGraph = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    const audio = audioRef.current;

    try { sourceRef.current?.disconnect(); } catch {}
    sourceRef.current = ctx.createMediaElementSource(audio);
    gainNode.current = ctx.createGain();

    // EQ filters
    eqBandsRef.current = EQ_FREQUENCIES.map((freq, i) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = eqValues[i];
      return filter;
    });

    // Convolver for hall
    convolver.current = ctx.createConvolver();
    if (effects.hall) {
      const buffer = ctx.createBuffer(2, ctx.sampleRate * 2, ctx.sampleRate);
      convolver.current.buffer = buffer;
    }

    // Connect nodes: source -> EQ -> convolver(optional) -> gain -> destination
    let nodeChain = sourceRef.current;
    eqBandsRef.current.forEach(filter => nodeChain.connect(filter) && (nodeChain = filter));
    if (effects.hall) nodeChain.connect(convolver.current) && (nodeChain = convolver.current);
    nodeChain.connect(gainNode.current).connect(ctx.destination);
  };

  const playSong = async (song) => {
    if (!song) return;
    const audio = audioRef.current;
    setCurrent(song);
    audio.src = song.src;
    initAudioGraph();
    try { await audio.play(); setPlaying(true); } catch {}
    if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!current) return;
    if (playing) { audio.pause(); setPlaying(false); } 
    else { await audio.play(); setPlaying(true); if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume(); }
  };

  const seek = (t) => { audioRef.current.currentTime = Math.max(0, Math.min(t, duration)); setProgress(audioRef.current.currentTime); };
  const toggleLoop = () => setLoop(l => !l);

  // EQ functions
  const setEqBand = (index, value) => {
    setEqValues(prev => {
      const updated = [...prev];
      updated[index] = value;
      if (eqBandsRef.current[index]) eqBandsRef.current[index].gain.value = value;
      return updated;
    });
  };

  const setEqPreset = (presetName) => {
    const preset = EQ_PRESETS[presetName];
    if (!preset) return;
    preset.forEach((v,i) => setEqBand(i,v));
  };

  const resetEQ = () => setEqPreset("Flat");
  const setHall = (enabled) => { setEffects(prev => ({ ...prev, hall: enabled })); initAudioGraph(); };

  return (
    <AudioPlayerContext.Provider value={{
      audioRef, current, playing, playSong, togglePlay, progress, duration, seek,
      loop, toggleLoop, effects, setHall,
      eqValues, setEqBand, setEqPreset, resetEQ,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => useContext(AudioPlayerContext);
