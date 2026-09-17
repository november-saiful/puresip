/** Cart page: renders lines, promo, totals; mirrors the API cart state. */
import { getCart, setQty, removeItem, money, subscribe, apiBase, itemCount } from './cart-store';
import { toast } from './ui';

interface ApiCartState {
  items: {
    variantId: number;
    qty: number;
    productName: string;
    color: string;
    colorHex: string;
    sku: string;
    image: string | null;
    unitPrice: number;
    lineTotal: number;
    stock: number;
    productSlug: string | null;
  }[];
  subtotal: number;
  promoCode: string | null;
  discount: number;
  shippingEstimate: number;
  total: number;
  itemCount: number;
}

function renderLocal(): void {
  const items = getCart();
  const wrap = document.getElementById('cart-lines');
  if (!wrap) return;

  if (items.length === 0) {
    wrap.innerHTML = `
      <div class="card p-12 text-center">
        <div class="text-5xl">💧</div>
        <h2 class="mt-4 font-display text-xl font-bold">Nothing in here yet</h2>
        <p class="mt-2 text-sm text-slate-text">Your future favorite bottle is one click away.</p>
        <a href="/shop" class="btn btn-primary mt-5">Shop the Bottle</a>
      </div>`;
    hideSummary();
    return;
  }

  wrap.innerHTML = items
    .map(
      (i) => `
      <div class="card p-4 flex gap-4 items-center">
        <a href="/product/${i.slug ?? ''}" class="shrink-0">
          <div class="w-20 h-20 rounded-2xl grid place-items-center" style="background: color-mix(in srgb, ${i.colorHex} 16%, var(--mist))">
            <div class="w-7 h-12 rounded-lg" style="background: ${i.colorHex}"></div>
          </div>
        </a>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm">${i.productName}</p>
          <p class="text-xs text-slate-text mt-0.5">${i.color} · ${money(i.unitPrice)}</p>
          <div class="mt-2 inline-flex items-center rounded-full border" style="border-color: color-mix(in srgb, var(--ink) 15%, transparent)">
            <button data-dec="${i.variantId}" class="px-3 py-1.5 hover:text-brand" aria-label="Decrease">−</button>
            <span class="min-w-6 text-center text-sm font-semibold">${i.qty}</span>
            <button data-inc="${i.variantId}" class="px-3 py-1.5 hover:text-brand" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="text-right">
          <p class="font-semibold text-sm">${money(i.unitPrice * i.qty)}</p>
          <button data-remove="${i.variantId}" class="text-xs text-slate-text hover:text-red-500 mt-1">Remove</button>
        </div>
      </div>`,
    )
    .join('');

  bindLineActions(wrap);
  paintTotalsLocal();
}

function bindLineActions(wrap: HTMLElement): void {
  wrap.querySelectorAll<HTMLButtonElement>('[data-inc]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = Number(b.dataset.inc);
      const it = getCart().find((x) => x.variantId === id);
      if (it) setQty(id, it.qty + 1);
    }),
  );
  wrap.querySelectorAll<HTMLButtonElement>('[data-dec]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = Number(b.dataset.dec);
      const it = getCart().find((x) => x.variantId === id);
      if (it) setQty(id, it.qty - 1);
    }),
  );
  wrap.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((b) =>
    b.addEventListener('click', () => removeItem(Number(b.dataset.remove))),
  );
}

function hideSummary(): void {
  const root = document.getElementById('cart-page-root');
  const aside = root?.querySelector('aside');
  if (aside) aside.hidden = true;
}

function paintTotalsLocal(): void {
  const items = getCart();
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const el = (id: string) => document.getElementById(id);
  if (el('sum-subtotal')) el('sum-subtotal')!.textContent = money(subtotal);
  if (el('sum-total')) el('sum-total')!.textContent = money(subtotal);
  if (el('sum-shipping')) el('sum-shipping')!.textContent = subtotal >= 40 ? 'FREE' : money(4.99);
}

async function refreshFromApi(): Promise<void> {
  if (itemCount() === 0) return;
  try {
    const res = await fetch(`${apiBase()}/api/cart`, { credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as ApiCartState;
    const el = (id: string) => document.getElementById(id);
    if (el('sum-subtotal')) el('sum-subtotal')!.textContent = money(data.subtotal);
    if (el('sum-shipping')) el('sum-shipping')!.textContent = data.shippingEstimate === 0 ? 'FREE' : money(data.shippingEstimate);
    if (el('sum-total')) el('sum-total')!.textContent = money(data.total);
    const row = el('sum-discount-row');
    if (row) {
      row.hidden = !data.promoCode;
      if (data.promoCode && el('sum-promo-code')) el('sum-promo-code')!.textContent = data.promoCode;
      if (el('sum-discount')) el('sum-discount')!.textContent = `−${money(data.discount)}`;
    }
  } catch {
    /* keep local totals */
  }
}

function init(): void {
  renderLocal();
  refreshFromApi();

  const promoForm = document.getElementById('promo-form') as HTMLFormElement | null;
  promoForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = promoForm.querySelector<HTMLInputElement>('input[name="code"]');
    if (!input?.value.trim()) return;
    try {
      const res = await fetch(`${apiBase()}/api/promo/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: input.value.trim() }),
      });
      const data = (await res.json()) as { code?: string; message?: string; error?: { message: string } };
      if (res.ok) {
        toast(data.message ?? `Code ${data.code} applied`);
        await refreshFromApi();
      } else {
        toast(data.error?.message ?? 'Invalid code', 'error');
      }
    } catch {
      toast('Network error — try again', 'error');
    }
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  subscribe(renderLocal);
}
