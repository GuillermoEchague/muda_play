// Todo lo de la PWA: actualizaciones, instalación y avisos.
import { registerSW } from 'virtual:pwa-register';

let deferredInstall = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export const onInstallChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const isStandalone = () =>
  matchMedia('(display-mode: fullscreen)').matches
  || matchMedia('(display-mode: standalone)').matches
  || navigator.standalone === true;

export const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Android y Chrome de escritorio: el navegador avisa que se puede instalar.
export const canInstall = () => !!deferredInstall && !isStandalone();
// iPhone: no hay botón automático, se muestra una guía.
export const needsIosHelp = () => isIOS() && !isStandalone();

export async function promptInstall() {
  if (!deferredInstall) return false;
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  deferredInstall = null;
  notify();
  return outcome === 'accepted';
}

export function showIosHelp(show = true) {
  document.getElementById('ios-help')?.classList.toggle('open', show);
}

export function toast(message, actionLabel, onAction) {
  const box = document.getElementById('toast');
  if (!box) return;
  box.innerHTML = '';
  const p = document.createElement('span');
  p.textContent = message;
  box.append(p);
  if (actionLabel) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = actionLabel;
    b.addEventListener('click', () => { box.classList.remove('open'); onAction?.(); });
    box.append(b);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'ghost';
  close.textContent = 'Cerrar';
  close.addEventListener('click', () => box.classList.remove('open'));
  box.append(close);
  box.classList.add('open');
  if (!actionLabel) setTimeout(() => box.classList.remove('open'), 5000);
}

export function setupPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // se muestra nuestro propio botón en el menú
    deferredInstall = e;
    notify();
  });
  window.addEventListener('appinstalled', () => { deferredInstall = null; notify(); toast('¡Juego instalado! Ábrelo desde tu pantalla de inicio.'); });
  document.getElementById('ios-help-close')?.addEventListener('click', () => showIosHelp(false));

  const updateSW = registerSW({
    onNeedRefresh() {
      toast('Hay una versión nueva del juego.', 'Actualizar', () => updateSW(true));
    },
    onOfflineReady() {
      toast('Listo: ya puedes jugar sin internet.');
    },
  });
}
