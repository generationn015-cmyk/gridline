let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  unlocked = true;
}

export function setMuted(muted: boolean) {
  const c = getCtx();
  if (!c || !master) return;
  master.gain.setTargetAtTime(muted ? 0 : 0.22, c.currentTime, 0.02);
}

function beep(opts: { freq: number; dur: number; type?: OscillatorType; vol?: number; slide?: number }) {
  const c = getCtx();
  if (!c || !master || !unlocked) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "triangle";
  osc.frequency.setValueAtTime(opts.freq, c.currentTime);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.slide), c.currentTime + opts.dur);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.4, c.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + opts.dur);
  osc.connect(g);
  g.connect(master);
  osc.start();
  osc.stop(c.currentTime + opts.dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

export const sfx = {
  tap() {
    beep({ freq: 420, dur: 0.05, type: "sine", vol: 0.22 });
  },
  place() {
    beep({ freq: 520, dur: 0.07, type: "triangle", vol: 0.28 });
  },
  error() {
    beep({ freq: 180, dur: 0.14, type: "square", vol: 0.16, slide: 90 });
  },
  hint() {
    beep({ freq: 660, dur: 0.12, type: "sine", vol: 0.24 });
  },
  win() {
    beep({ freq: 523, dur: 0.12, type: "triangle", vol: 0.3 });
    setTimeout(() => beep({ freq: 659, dur: 0.12, type: "triangle", vol: 0.28 }), 90);
    setTimeout(() => beep({ freq: 784, dur: 0.22, type: "triangle", vol: 0.3 }), 180);
  },
  lose() {
    beep({ freq: 300, dur: 0.2, type: "sine", vol: 0.2, slide: 140 });
  },
};
