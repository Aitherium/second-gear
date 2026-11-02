// Tiny synthesized sounds (WebAudio): no audio files to license or download.
let ctx = null;
const ensure = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
function tone(freq, dur, type = "sine", gain = 0.15, slide = 0) {
  const c = ensure(), t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, gain = 0.12, lowpass = 1800) {
  const c = ensure(), t = c.currentTime, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = "lowpass"; f.frequency.setValueAtTime(lowpass, t); f.frequency.exponentialRampToValueAtTime(200, t + dur);
  g.gain.setValueAtTime(gain, t); s.connect(f).connect(g).connect(c.destination); s.start(t);
}
export const sfx = {
  unlock() { try { ensure().resume(); } catch { /* no audio */ } },
  freeze() { try { tone(520, 0.35, "triangle", 0.12, 0.35); } catch { /* */ } },
  click() { try { tone(880, 0.06, "square", 0.05); } catch { /* */ } },
  whoosh(n) { try { noise(0.5 + 0.08 * Math.min(n, 5), 0.16, 2400); tone(160, 0.5, "sawtooth", 0.05, 2.2); } catch { /* */ } },
  pop() { try { tone(300, 0.18, "triangle", 0.12, 1.8); } catch { /* */ } },
  win() { try { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, "triangle", 0.1), i * 110)); } catch { /* */ } },
};
