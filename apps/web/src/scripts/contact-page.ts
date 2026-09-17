/** Contact form submission. */
import { apiBase } from './cart-store';
import { toast } from './ui';

function init(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('contact-status');
    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const fd = new FormData(form);
    if (btn) btn.disabled = true;
    try {
      const res = await fetch(`${apiBase()}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          subject: fd.get('subject'),
          message: fd.get('message'),
        }),
      });
      const data = (await res.json()) as { message?: string; error?: { message: string } };
      if (res.ok) {
        toast(data.message ?? 'Message sent!');
        if (status) {
          status.textContent = data.message ?? 'Message received — we reply within one business day.';
          status.hidden = false;
          status.className = 'text-sm text-brand';
        }
        form.reset();
      } else {
        toast(data.error?.message ?? 'Could not send', 'error');
      }
    } catch {
      toast('Network error — try again', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
