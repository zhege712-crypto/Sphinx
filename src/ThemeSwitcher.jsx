import { useSyncExternalStore } from 'react';
import { Sun, Moon, Leaf } from 'lucide-react';

const eventName = 'sphinx:theme-change';
const valid = value => ['light', 'dark', 'eye-care'].includes(value);
function applyTheme(value) {
  if (!valid(value)) return;
  document.documentElement.dataset.theme = value;
  document.documentElement.style.colorScheme = value === 'dark' ? 'dark' : 'light';
  window.dispatchEvent(new Event(eventName));
}
function subscribe(listener) {
  const storage = event => { if (event.key === 'sphinx:theme' && valid(event.newValue)) applyTheme(event.newValue); };
  window.addEventListener(eventName, listener);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(eventName, listener); window.removeEventListener('storage', storage); };
}
export function useTheme() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || 'light', () => 'light');
}
export default function ThemeSwitcher() {
  const theme = useTheme();
  return <div className="theme-switcher" role="group" aria-label="显示主题">{[
    ['light', '浅色', Sun], ['dark', '深色', Moon], ['eye-care', '护眼', Leaf],
  ].map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => {
    applyTheme(value);
    try { localStorage.setItem('sphinx:theme', value); } catch {}
  }}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>)}</div>;
}
