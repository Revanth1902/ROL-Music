/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQueue } from "./QueueContext";
import { useAuth } from "./AuthContext";
import { createSong, trackSongPlay } from "../api/authApi";

import { trackUserPlay } from "../utils/userTracker";

const AudioPlayerContext = createContext();

export const AudioPlayerProvider = ({ children }) => {
  const audioRef = useRef(new Audio());
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(false);
  const { queue, setQueue, isAutoPlay, playedHistory, addPlayedId, historyQueue, setHistoryQueue, pushToHistory } = useQueue();
  const prefetchingRef = useRef(false);

  // Advanced Web Audio graph nodes
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNode = useRef(null);
  const analyserRef = useRef(null);
  const stereoPannerRef = useRef(null);
  const vocalFilterRef = useRef(null);
  const convolver = useRef(null);
  const eqBandsRef = useRef([]);
  const graphReady = useRef(false);

  const [isKaraoke, setIsKaraoke] = useState(false);
  const [pannerVal, setPannerValState] = useState(0); // -1.0 to +1.0
  const [crossfadeTime, setCrossfadeTime] = useState(2); // 0 to 12 sec

  // ── Dolby Audio State & Node References ────────────────────────
  const [dolbyAudio, setDolbyAudioState] = useState(() => {
    try {
      const saved = localStorage.getItem('rol_dolby_sound');
      return saved !== null ? saved === 'true' : true; // Default ON for rich cinematic sound
    } catch {
      return true;
    }
  });
  const dolbyDryGainRef = useRef(null);
  const dolbyWetGainRef = useRef(null);
  const dolbyBassRef = useRef(null);
  const dolbyClarityRef = useRef(null);
  const dolbyAirRef = useRef(null);
  const dolbyCompressorRef = useRef(null);

  const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000];

  const EQ_PRESETS = {
    Balanced: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    Jazz: [0, 0, 2, 3, 2, 1, 0, 0, 0],
    "Bass Boost": [5, 4, 3, 1, 0, -1, -2, -2, -2],
    "Treble Boost": [-2, -2, -2, 0, 1, 2, 3, 4, 5],
    Rock: [4, 3, 2, 1, 0, 1, 2, 3, 4],
    Pop: [3, 2, 1, 0, 0, 1, 2, 3, 3],
    Classical: [-2, -1, 0, 1, 2, 1, 0, -1, -2],
    Acoustic: [0, 1, 2, 3, 2, 1, 0, 0, 0],
    "V-Shape": [5, 3, 0, 0, 0, 0, 0, 3, 5],
    Dance: [4, 3, 2, 1, 0, 1, 2, 3, 4],
    "Hip-Hop": [6, 4, 2, 0, 0, 0, 2, 4, 6],
    Electronic: [5, 4, 3, 1, 0, 1, 3, 4, 5],
    Vocal: [-1, 0, 1, 2, 3, 2, 1, 0, -1],
    Party: [5, 4, 3, 2, 1, 2, 3, 4, 5],
    "Large Hall": [0, 1, 2, 3, 3, 2, 1, 0, 0],
  };

  const [effects, setEffects] = useState({ hall: false });
  const [eqValues, setEqValues] = useState(EQ_PRESETS.Flat);
  const { user, loginType, token } = useAuth();

  const prefetchRecommendationsIfNeeded = async (targetSong, currentQueue = queue) => {
    if (!isAutoPlay || !targetSong || currentQueue.length > 3 || prefetchingRef.current) return;

    prefetchingRef.current = true;
    try {
      const { getAutoplayRecommendations, getSongFingerprint } = await import('../api/apiService');
      const excluded = [...playedHistory, targetSong.id, ...currentQueue.map(s => s.id)];
      const recs = await getAutoplayRecommendations(targetSong, excluded, 20);
      if (recs && recs.length > 0) {
        setQueue(prev => {
          const existingIds = new Set(prev.map(s => String(s.id)));
          const existingFps = new Set(prev.map(s => getSongFingerprint(s)).filter(Boolean));
          if (targetSong.id) existingIds.add(String(targetSong.id));
          const targetFp = getSongFingerprint(targetSong);
          if (targetFp) existingFps.add(targetFp);

          const newItems = recs.filter(s => {
            const sId = String(s.id);
            const fp = getSongFingerprint(s);
            if (existingIds.has(sId) || (fp && existingFps.has(fp))) return false;
            existingIds.add(sId);
            if (fp) existingFps.add(fp);
            return true;
          });

          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.warn('[prefetchRecommendations] error:', err.message);
    } finally {
      prefetchingRef.current = false;
    }
  };

  // Pre-fetch recommendations when playing song with small queue
  useEffect(() => {
    if (playing && current && isAutoPlay && queue.length <= 3) {
      prefetchRecommendationsIfNeeded(current, queue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, queue.length, isAutoPlay, playing]);

  // ── Audio events ──────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    audio.crossOrigin = "anonymous";

    const onTime = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnd = async () => {
      if (loop) { audio.currentTime = 0; audio.play(); return; }
      if (queue.length > 0) {
        const next = queue[0];
        const remaining = queue.slice(1);
        if (current) {
          pushToHistory(current);
        }
        setQueue(remaining);
        playSong(next, false);
        if (remaining.length <= 3 && isAutoPlay) {
          prefetchRecommendationsIfNeeded(next, remaining);
        }
      } else if (isAutoPlay && current) {
        if (current) pushToHistory(current);
        setAudioLoading(true);
        try {
          const { getAutoplayRecommendations } = await import('../api/apiService');
          const recs = await getAutoplayRecommendations(current, playedHistory, 20);
          if (recs && recs.length > 0) {
            const next = recs[0];
            setQueue(recs.slice(1));
            playSong(next, false);
          } else {
            setPlaying(false);
            setAudioLoading(false);
          }
        } catch (err) {
          console.error('[Autoplay onEnd error]', err);
          setPlaying(false);
          setAudioLoading(false);
        }
      } else {
        setPlaying(false);
      }
    };

    const onWaiting = () => setAudioLoading(true);
    const onCanPlay = () => setAudioLoading(false);
    const onPlaying = () => setAudioLoading(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("playing", onPlaying);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("playing", onPlaying);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, queue, setQueue, isAutoPlay, current, playedHistory]);

  // ── Init Web Audio Graph ──────────────────────────────────
  const initAudioGraph = () => {
    if (graphReady.current) return;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const audio = audioRef.current;

      sourceRef.current = ctx.createMediaElementSource(audio);
      gainNode.current = ctx.createGain();

      // Analyser Node for Visualizer
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 128;

      // Stereo Panner Node for 3D Sound
      if (ctx.createStereoPanner) {
        stereoPannerRef.current = ctx.createStereoPanner();
        stereoPannerRef.current.pan.value = pannerVal;
      }

      // Karaoke Center-Vocal Notch Filter
      vocalFilterRef.current = ctx.createBiquadFilter();
      vocalFilterRef.current.type = "notch";
      vocalFilterRef.current.frequency.value = 1000;
      vocalFilterRef.current.Q.value = 0.5;
      vocalFilterRef.current.gain.value = isKaraoke ? -24 : 0;

      // EQ filters
      eqBandsRef.current = EQ_FREQUENCIES.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = eqValues[i];
        return filter;
      });

      // Convolver (hall reverb)
      convolver.current = ctx.createConvolver();

      // ── Dolby Audio Spatial Enhancement Engine ────────────────────────
      // 1. Dry bypass path (pure bit-perfect original audio)
      dolbyDryGainRef.current = ctx.createGain();
      dolbyDryGainRef.current.gain.value = dolbyAudio ? 0 : 1;

      // 2. Wet path (immersive Dolby spatial processing)
      dolbyWetGainRef.current = ctx.createGain();
      dolbyWetGainRef.current.gain.value = dolbyAudio ? 1 : 0;

      // Dynamic cinematic sub-bass warmth (85Hz low-shelf +3.6dB)
      dolbyBassRef.current = ctx.createBiquadFilter();
      dolbyBassRef.current.type = "lowshelf";
      dolbyBassRef.current.frequency.value = 85;
      dolbyBassRef.current.gain.value = 3.6;

      // Vocal clarity & center stage presence (3000Hz peaking +2.5dB, Q: 1.1)
      dolbyClarityRef.current = ctx.createBiquadFilter();
      dolbyClarityRef.current.type = "peaking";
      dolbyClarityRef.current.frequency.value = 3000;
      dolbyClarityRef.current.Q.value = 1.1;
      dolbyClarityRef.current.gain.value = 2.5;

      // Airy treble shimmer & spatial reflections (11.5kHz high-shelf +2.8dB)
      dolbyAirRef.current = ctx.createBiquadFilter();
      dolbyAirRef.current.type = "highshelf";
      dolbyAirRef.current.frequency.value = 11500;
      dolbyAirRef.current.gain.value = 2.8;

      // Binaural Stereo Soundstage Widener (acoustic Haas crossfeed spatialization)
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const delayL = ctx.createDelay(0.05);
      const delayR = ctx.createDelay(0.05);
      delayL.delayTime.value = 0.013; // 13ms acoustic Haas delay
      delayR.delayTime.value = 0.013;

      const crossL = ctx.createGain();
      const crossR = ctx.createGain();
      crossL.gain.value = -0.3; // Subtle inverted ambient crossfeed
      crossR.gain.value = -0.3;

      // Dynamics Compressor (Studio master leveling & punch)
      dolbyCompressorRef.current = ctx.createDynamicsCompressor();
      dolbyCompressorRef.current.threshold.value = -18;
      dolbyCompressorRef.current.knee.value = 18;
      dolbyCompressorRef.current.ratio.value = 3.2;
      dolbyCompressorRef.current.attack.value = 0.003;
      dolbyCompressorRef.current.release.value = 0.22;

      // Connect Chain: source → vocalFilter → EQ chain → panner
      let chain = sourceRef.current;
      chain.connect(vocalFilterRef.current);
      chain = vocalFilterRef.current;

      eqBandsRef.current.forEach(f => { chain.connect(f); chain = f; });

      if (stereoPannerRef.current) {
        chain.connect(stereoPannerRef.current);
        chain = stereoPannerRef.current;
      }

      // Branch 1: Dry bypass direct to gainNode
      chain.connect(dolbyDryGainRef.current);
      dolbyDryGainRef.current.connect(gainNode.current);

      // Branch 2: Dolby Sound chain (Bass -> Clarity -> Air -> Spatializer -> Compressor -> Wet Gain)
      chain.connect(dolbyBassRef.current);
      dolbyBassRef.current.connect(dolbyClarityRef.current);
      dolbyClarityRef.current.connect(dolbyAirRef.current);

      dolbyAirRef.current.connect(splitter);
      splitter.connect(merger, 0, 0); // L direct
      splitter.connect(merger, 1, 1); // R direct

      splitter.connect(delayL, 1);     // R to delayL
      delayL.connect(crossL);
      crossL.connect(merger, 0, 0);   // delayed R inverted to L

      splitter.connect(delayR, 0);     // L to delayR
      delayR.connect(crossR);
      crossR.connect(merger, 0, 1);   // delayed L inverted to R

      merger.connect(dolbyCompressorRef.current);
      dolbyCompressorRef.current.connect(dolbyWetGainRef.current);
      dolbyWetGainRef.current.connect(gainNode.current);

      gainNode.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);

      graphReady.current = true;
    } catch (err) {
      console.warn("[AudioGraph] init failed:", err.message);
    }
  };

  // Resume suspended AudioContext (needed after user gesture)
  const resumeContext = async () => {
    if (audioCtxRef.current?.state === "suspended") {
      try { await audioCtxRef.current.resume(); } catch (err) { console.error(err); }
    }
  };

  // ── playSong ──────────────────────────────────────────────
  // Safe to call any number of times with different songs. Automatically resolves URLs.
  const syncPlayback = async (songToTrack) => {
    if (loginType !== 'user' || !songToTrack) return;
    const targetId = songToTrack.id || songToTrack.sourceId || songToTrack._id;
    if (!targetId) return;

    try {
      const payload = {
        sourceId: String(targetId),
        title: songToTrack.title || 'Untitled',
        artist: songToTrack.artistName || songToTrack.artist || 'Unknown Artist',
        album: songToTrack.album || '',
        albumCover: songToTrack.cover || songToTrack.albumCover || '',
        duration: Number(songToTrack.duration) || 0,
        genre: songToTrack.genre || '',
        audioUrl: songToTrack.src || songToTrack.audioUrl || '',
        releaseDate: songToTrack.year ? `${songToTrack.year}-01-01` : undefined,
      };

      await createSong(payload, token);
      await trackSongPlay(targetId, token);
    } catch (err) {
      console.warn('[playback] sync failed:', err.message);
    }
  };

  const playSong = async (rawSong, shouldPushHistory = true) => {
    if (!rawSong) return;
    if (shouldPushHistory && current && current.id && (current.id !== (rawSong.id || rawSong.sourceId || rawSong._id))) {
      pushToHistory(current);
    }

    // Assume it might need resolving
    let song = rawSong;
    const songId = song.id || song.sourceId || song._id;
    if (songId) {
      addPlayedId(songId);
      if (!song.id) song = { ...song, id: songId };
    }

    // Optional: show loading state on the UI immediately
    setCurrent(song);
    setAudioLoading(true);

    if (!song.src && song.id) {
      try {
        // Lazy load api to avoid heavy imports in pure context
        const { getSongById, searchSongs } = await import('../api/apiService');

        // Layer 1: direct ID
        let playable = await getSongById(song.id);

        // Layer 2: fallback search
        if (!playable?.src) {
          const result = await searchSongs(`${song.title} ${song.artistName}`, 0, 5);
          const match = result.results?.find(s => s.id === song.id) || result.results?.[0];
          if (match?.src) playable = match;
        }

        if (playable?.src) {
          song = { ...song, ...playable };
        }
      } catch (err) {
        console.error("[playSong] resolution failed:", err);
      }
    }

    if (!song.src) {
      setAudioLoading(false);
      setPlaying(false);
      return; // still no src, abort
    }

    const audio = audioRef.current;

    setCurrent(song);
    setProgress(0);
    setDuration(0);

    // Set new source — MediaElementSource automatically follows this
    audio.src = song.src;
    audio.load();   // force reload so 'loadedmetadata' fires for the new src

    // Init graph on first play (user gesture unlocks AudioContext)
    initAudioGraph();
    await resumeContext();

    try {
      await audio.play();
      setPlaying(true);
      await syncPlayback(song);
      trackUserPlay(user?.id || user?._id || 'guest', song);
    } catch (err) {
      console.warn("[playSong] play() failed:", err.message);
      setPlaying(false);
    }
  };

  // ── togglePlay ────────────────────────────────────────────
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!current) return;

    initAudioGraph();
    await resumeContext();

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try { await audio.play(); setPlaying(true); } catch (err) { console.error(err); }
    }
  };

  const seek = (t) => {
    audioRef.current.currentTime = Math.max(0, Math.min(t, duration));
    setProgress(audioRef.current.currentTime);
  };

  const toggleLoop = () => setLoop(l => !l);

  const playPrevious = useCallback(() => {
    if (progress > 3) {
      seek(0);
      return;
    }
    if (historyQueue && historyQueue.length > 0) {
      const prevSong = historyQueue[historyQueue.length - 1];
      setHistoryQueue(h => h.slice(0, -1));
      if (current) {
        setQueue(q => [current, ...q.filter(s => s.id !== current.id)]);
      }
      playSong(prevSong, false);
    } else {
      seek(0);
    }
  }, [progress, historyQueue, current, setQueue, setHistoryQueue]);

  const playNext = useCallback(async () => {
    if (queue && queue.length > 0) {
      const next = queue[0];
      const remaining = queue.slice(1);
      if (current) {
        pushToHistory(current);
      }
      setQueue(remaining);
      playSong(next, false);
      if (remaining.length <= 3 && isAutoPlay) {
        prefetchRecommendationsIfNeeded(next, remaining);
      }
    } else if (isAutoPlay && current) {
      if (current) pushToHistory(current);
      setAudioLoading(true);
      try {
        const { getAutoplayRecommendations } = await import('../api/apiService');
        const recs = await getAutoplayRecommendations(current, playedHistory, 20);
        if (recs && recs.length > 0) {
          const next = recs[0];
          setQueue(recs.slice(1));
          playSong(next, false);
        } else {
          setAudioLoading(false);
        }
      } catch (err) {
        console.error('[playNext autoplay error]', err);
        setAudioLoading(false);
      }
    }
  }, [queue, current, isAutoPlay, playedHistory, pushToHistory, setQueue]);

  // ── Audio Controls & Effects ─────────────────────────────
  const toggleKaraoke = () => {
    setIsKaraoke(prev => {
      const next = !prev;
      if (vocalFilterRef.current) {
        vocalFilterRef.current.gain.value = next ? -24 : 0;
      }
      return next;
    });
  };

  const setPannerVal = (val) => {
    const clamped = Math.max(-1, Math.min(1, val));
    setPannerValState(clamped);
    if (stereoPannerRef.current) {
      stereoPannerRef.current.pan.value = clamped;
    }
  };

  // ── EQ ────────────────────────────────────────────────────
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
    preset.forEach((v, i) => setEqBand(i, v));
  };

  const resetEQ = () => setEqPreset("Flat");
  const setHall = (enabled) => {
    setEffects(prev => ({ ...prev, hall: enabled }));
    // Hall effect requires reconnecting the graph — reset and reinit
    graphReady.current = false;
    initAudioGraph();
  };

  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('rol_volume');
    return saved !== null ? Number(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(false);

  const setVolume = (val) => {
    const v = Math.max(0, Math.min(1, val));
    setVolumeState(v);
    localStorage.setItem('rol_volume', String(v));
    if (gainNode.current) gainNode.current.gain.value = isMuted ? 0 : v;
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : v;
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (gainNode.current) gainNode.current.gain.value = next ? 0 : volume;
      if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
      return next;
    });
  };

  const toggleDolbyAudio = () => {
    setDolbyAudioState(prev => {
      const next = !prev;
      try {
        localStorage.setItem('rol_dolby_sound', String(next));
      } catch {}
      if (audioCtxRef.current && dolbyWetGainRef.current && dolbyDryGainRef.current) {
        const t = audioCtxRef.current.currentTime;
        dolbyWetGainRef.current.gain.setTargetAtTime(next ? 1 : 0, t, 0.04);
        dolbyDryGainRef.current.gain.setTargetAtTime(next ? 0 : 1, t, 0.04);
      }
      return next;
    });
  };

  return (
    <AudioPlayerContext.Provider value={{
      audioRef, current, playing, audioLoading, playSong, togglePlay, progress, duration, seek,
      playPrevious, playNext, historyQueue,
      loop, toggleLoop, effects, setHall,
      eqValues, setEqBand, setEqPreset, resetEQ,
      volume, setVolume, isMuted, toggleMute,
      analyserNode: analyserRef.current,
      isKaraoke, toggleKaraoke,
      pannerVal, setPannerVal,
      crossfadeTime, setCrossfadeTime,
      dolbyAudio, toggleDolbyAudio,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => useContext(AudioPlayerContext);
