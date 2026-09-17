/** Shared client-side UI helpers: toasts, reveal-on-scroll, theme toggle. */
import { itemCount, subscribe } from './cart-store';

// ── Toasts ──────────────────────────────────────────────────────────────────

export function toast(message: string, kind: 'success' | 'error' = 'success'): void {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className =
    'toast pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg ' +
    (kind === 'success'
      ? 'bg-brand text-white'
      : 'bg-red-500 text-white');
  el.setAttribute('role', 'status');
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 300ms ease, transform 300ms ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

// ── Reveal on scroll ────────────────────────────────────────────────────────

function initReveal(): void {
  const els = document.querySelectorAll<HTMLElement>('.reveal');
  if (els.length === 0) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12 },
  );
  els.forEach((el) => io.observe(el));
}

// ── Theme toggle ────────────────────────────────────────────────────────────

function initTheme(): void {
  document.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest('[data-theme-toggle]');
    if (!btn) return;
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('ps_theme', dark ? 'dark' : 'light');
    document.querySelectorAll('[data-theme-icon]').forEach((el) => {
      el.textContent = dark ? '☀️' : '🌙';
    });
  });
}

// ── Cart badge count (header) ───────────────────────────────────────────────

function initCartBadge(): void {
  const badges = document.querySelectorAll<HTMLElement>('[data-cart-count]');
  const paint = (n: number) => {
    badges.forEach((b) => {
      b.textContent = String(n);
      b.classList.toggle('hidden', n === 0);
      b.classList.remove('badge-pop');
      // retrigger animation
      void b.offsetWidth;
      if (n > 0) b.classList.add('badge-pop');
    });
  };
  paint(itemCount());
  subscribe((items) => paint(itemCount(items)));
  window.addEventListener('ps:cart-refresh', () => paint(itemCount()));
}

// ── Cart drawer open/close ──────────────────────────────────────────────────

function initDrawer(): void {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  const panel = drawer.querySelector<HTMLElement>('#cart-drawer-panel');
  if (!panel) return;

  const open = () => {
    drawer.classList.remove('hidden');
    requestAnimationFrame(() => {
      drawer.classList.remove('opacity-0');
      panel.classList.remove('translate-x-full');
    });
    document.body.style.overflow = 'hidden';
    panel.querySelector<HTMLElement>('[data-drawer-close]')?.focus();
  };
  const close = () => {
    drawer.classList.add('opacity-0');
    panel.classList.add('translate-x-full');
    document.body.style.overflow = '';
    setTimeout(() => drawer.classList.add('hidden'), 260);
  };

  document.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    if (target.closest('[data-open-cart]')) {
      ev.preventDefault();
      open();
    } else if (target.closest('[data-drawer-close]') || target === drawer) {
      close();
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !drawer.classList.contains('hidden')) close();
  });
  window.addEventListener('ps:open-cart', open);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initReveal();
      initTheme();
      initCartBadge();
      initDrawer();
    });
  } else {
    initReveal();
    initTheme();
    initCartBadge();
    initDrawer();
  }
}
