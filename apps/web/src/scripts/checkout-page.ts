/** Checkout page: renders summary from local cart, submits order to /api/checkout. */
import { getCart, money, itemCount, clearCart, apiBase } from './cart-store';
import { toast } from './ui';

interface ApiCartState {
  items: { variantId: number; qty: number; productName: string; color: string; colorHex: string; lineTotal: number }[];
  subtotal: number;
  promoCode: string | null;
  discount: number;
  shippingEstimate: number;
  total: number;
}

function el(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function renderSummary(data: ApiCartState | null): void {
  const items = getCart();
  const wrap = el('checkout-lines');
  if (!wrap) return;

  if (items.length === 0) {
    wrap.innerHTML = `<p class="text-sm text-slate-text">Your cart is empty. <a href="/shop" class="text-brand font-semibold">Shop now →</a></p>`;
    return;
  }
  wrap.innerHTML = items
    .map(
      (i) => `
      <div class="flex justify-between gap-3">
        <span class="min-w-0"><span class="font-medium">${i.qty} × ${i.productName}</span> <span class="text-slate-text">· ${i.color}</span></span>
        <span class="whitespace-nowrap font-semibold">${money(i.unitPrice * i.qty)}</span>
      </div>`,
    )
    .join('');

  if (data) {
    if (el('co-subtotal')) el('co-subtotal')!.textContent = money(data.subtotal);
    if (el('co-shipping')) el('co-shipping')!.textContent = data.shippingEstimate === 0 ? 'FREE' : money(data.shippingEstimate);
    if (el('co-total')) el('co-total')!.textContent = money(data.total);
    const row = el('co-discount-row');
    if (row) {
      row.hidden = !data.promoCode;
      if (el('co-discount')) el('co-discount')!.textContent = `−${money(data.discount)}`;
    }
  } else {
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    if (el('co-subtotal')) el('co-subtotal')!.textContent = money(subtotal);
    if (el('co-shipping')) el('co-shipping')!.textContent = subtotal >= 40 ? 'FREE' : money(4.99);
    if (el('co-total')) el('co-total')!.textContent = money(subtotal + (subtotal >= 40 ? 0 : 4.99));
  }
}

async function loadApiState(): Promise<ApiCartState | null> {
  if (itemCount() === 0) return null;
  try {
    const res = await fetch(`${apiBase()}/api/cart`, { credentials: 'include' });
    if (!res.ok) return null;
    return (await res.json()) as ApiCartState;
  } catch {
    return null;
  }
}

function init(): void {
  loadApiState().then((state) => renderSummary(state));
  renderSummary(null);

  const form = document.getElementById('checkout-form') as HTMLFormElement | null;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = el('checkout-error');
    const btn = document.getElementById('checkout-submit') as HTMLButtonElement | null;
    if (itemCount() === 0) {
      if (errEl) {
        errEl.textContent = 'Your cart is empty.';
        errEl.hidden = false;
      }
      return;
    }
    const fd = new FormData(form);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Placing order…';
    }
    try {
      const res = await fetch(`${apiBase()}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: fd.get('email'),
          name: fd.get('name'),
          address: {
            line1: fd.get('line1'),
            line2: fd.get('line2') || '',
            city: fd.get('city'),
            state: fd.get('state') || '',
            postalCode: fd.get('postalCode'),
            country: fd.get('country'),
          },
          shippingMethod: fd.get('shippingMethod') || 'standard',
        }),
      });
      const data = (await res.json()) as {
        mode: string;
        orderId: string;
        checkoutUrl?: string;
        error?: { message: string };
      };
      if (!res.ok) {
        if (errEl) {
          errEl.textContent = data.error?.message ?? 'Checkout failed — please try again.';
          errEl.hidden = false;
        }
        return;
      }
      if (data.mode === 'stripe' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      clearCart();
      window.location.href = `/order/${data.orderId}`;
    } catch {
      if (errEl) {
        errEl.textContent = 'Network error — please try again.';
        errEl.hidden = false;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Place order';
      }
    }
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}

// keep toast import used (tree-shake guard for dev builds)
void toast;
