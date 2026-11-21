import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

export default function AudioVisualizer({ analyserNode, isPlaying }) {
  const canvasRef = useRef(null);
  const [vizMode, setVizMode] = useState('bars'); // 'bars', 'wave', 'pulsar'
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      let bufferLength = 64;
      let dataArray = new Uint8Array(bufferLength);

      if (analyserNode && isPlaying) {
        bufferLength = analyserNode.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        if (vizMode === 'wave') {
          analyserNode.getByteTimeDomainData(dataArray);
        } else {
          analyserNode.getByteFrequencyData(dataArray);
        }
      } else {
        // Idle animation mode when paused or no web audio context
        const time = Date.now() * 0.003;
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.sin(time + i * 0.2) * 40 + (isPlaying ? 80 : 20);
        }
      }

      if (vizMode === 'bars') {
        const barWidth = (width / 32) - 2;
        let x = 0;
        const step = Math.floor(bufferLength / 32) || 1;

        for (let i = 0; i < 32; i++) {
          const val = dataArray[i * step] || 0;
          const barHeight = (val / 255) * height * 0.85;

          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, 'rgba(236, 72, 153, 0.4)');
          gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.8)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 1)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          x += barWidth + 2;
        }
      } else if (vizMode === 'wave') {
        ctx.lineWidth = 3;
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#ec4899');
        gradient.addColorStop(0.5, '#8b5cf6');
        gradient.addColorStop(1, '#3b82f6');
        ctx.strokeStyle = gradient;

        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (vizMode === 'pulsar') {
        const centerX = width / 2;
        const centerY = height / 2;
        const avg = dataArray.reduce((acc, v) => acc + v, 0) / bufferLength;
        const radius = Math.max(15, (avg / 255) * (height / 2.5));

        const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(236, 72, 153, 0.9)');
        gradient.addColorStop(0.6, 'rgba(139, 92, 246, 0.5)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyserNode, isPlaying, vizMode]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={320}
        height={100}
        style={{ width: '100%', height: '100px', borderRadius: '12px' }}
      />
      <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5, background: 'rgba(0,0,0,0.4)', borderRadius: '20px', p: 0.5, backdropFilter: 'blur(8px)' }}>
        <Tooltip title="Frequency Bars">
          <IconButton size="small" onClick={() => setVizMode('bars')} sx={{ color: vizMode === 'bars' ? '#a855f7' : '#94a3b8' }}>
            <EqualizerIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Waveform">
          <IconButton size="small" onClick={() => setVizMode('wave')} sx={{ color: vizMode === 'wave' ? '#a855f7' : '#94a3b8' }}>
            <ShowChartIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Sound Pulsar">
          <IconButton size="small" onClick={() => setVizMode('pulsar')} sx={{ color: vizMode === 'pulsar' ? '#a855f7' : '#94a3b8' }}>
            <GraphicEqIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
