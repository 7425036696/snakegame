
export const initAudio = () => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

const getContext = (): AudioContext | null => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return null;
  
  // Use a singleton-like pattern via window property or just new instance if needed, 
  // but typically we want one context.
  if (!(window as any).gameAudioContext) {
    (window as any).gameAudioContext = new AudioContext();
  }
  return (window as any).gameAudioContext;
};

export const playEatSound = () => {
  try {
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // High pitched retro "coin" pickup sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error(e);
  }
};

export const playDieSound = () => {
  try {
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Low pitched crash/noise approximation
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.error(e);
  }
};

export const playGameOverSound = () => {
  try {
    const ctx = getContext();
    if (!ctx) return;

    // Sad descending arpeggio
    [300, 250, 200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const startTime = ctx.currentTime + (i * 0.2);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } catch (e) {
    console.error(e);
  }
};

export const playWinSound = () => {
   try {
    const ctx = getContext();
    if (!ctx) return;

    // Victory fanfare (Major arpeggio)
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { // C E G C
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const startTime = ctx.currentTime + (i * 0.1);
      const duration = i === 3 ? 0.4 : 0.1;
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.05, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {
    console.error(e);
  }
};
