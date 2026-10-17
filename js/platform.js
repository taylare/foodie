// Device / install related helpers.
import { toast } from './ui.js';

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  try { localStorage.setItem('foodie-theme', theme); } catch (e) { /* ignore */ }
}

export const install = {
  prompt: null,
  get standalone() {
    return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  },
  get ios() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },
  async run() {
    if (!this.prompt) return false;
    this.prompt.prompt();
    const { outcome } = await this.prompt.userChoice;
    this.prompt = null;
    return outcome === 'accepted';
  }
};

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  install.prompt = e;
  window.dispatchEvent(new CustomEvent('foodie:installable'));
});
window.addEventListener('appinstalled', () => { install.prompt = null; toast('Foodie installed 🎉'); });

// Keep the screen awake (cook mode)
let lock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
    } else if (lock) { await lock.release(); lock = null; }
  } catch (e) { /* not allowed – ignore */ }
}
document.addEventListener('visibilitychange', () => {
  if (lock && document.visibilityState === 'visible') keepAwake(true);
});

// Timer finished: beep + vibrate + notification if allowed
let audioCtx = null;
export function alarm(label) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [0, 0.35, 0.7].forEach(off => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.3, t + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.25);
      o.start(t + off); o.stop(t + off + 0.3);
    });
  } catch (e) { /* ignore */ }
  try { navigator.vibrate && navigator.vibrate([300, 150, 300, 150, 300]); } catch (e) { /* ignore */ }
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    navigator.serviceWorker?.ready.then(r => r.showNotification('⏰ Timer done', { body: label, icon: 'icons/icon-192.png', tag: 'foodie-timer' }))
      .catch(() => { try { new Notification('⏰ Timer done', { body: label }); } catch (e) { /* ignore */ } });
  }
}
// Called from a user gesture so the audio can play later
export function primeAudio() {
  try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { /* ignore */ }
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}
