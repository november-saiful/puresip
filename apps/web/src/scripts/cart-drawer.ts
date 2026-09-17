/** Populates the slide-in cart drawer from the cart store. */
import { getCart, subscribe, removeItem, setQty, money } from './cart-store';

function render(): void {
  const items = getCart();
  const wrap = document.getElementById('drawer-items');
  const subtotalEl = document.getElementById('drawer-subtotal');
  if (!wrap || !subtotalEl) return;

  if (items.length === 0) {
    wrap.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
        <div class="text-4xl">💧</div>
        <p class="font-semibold">Your cart is empty</p>
        <p class="text-sm text-slate-text">Add a bottle and taste the elevation.</p>
        <a href="/shop" class="btn btn-primary mt-2" data-drawer-close>Shop the Bottle</a>
      </div>`;
    subtotalEl.textContent = money(0);
    return;
  }

  wrap.innerHTML = items
    .map(
      (i) => `
      <div class="flex gap-3 items-center card !rounded-2xl p-3">
        <div class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
             style="background: color-mix(in srgb, ${i.colorHex} 18%, var(--mist))">
          <div class="w-5 h-9 rounded-md" style="background: ${i.colorHex}"></div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold truncate">${i.productName}</p>
          <p class="text-xs text-slate-text">${i.color}</p>
          <div class="mt-1 inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs"
               style="border-color: color-mix(in srgb, var(--ink) 15%, transparent)">
            <button data-drawer-dec="${i.variantId}" aria-label="Decrease quantity" class="px-1 hover:text-brand">−</button>
            <span>${i.qty}</span>
            <button data-drawer-inc="${i.variantId}" aria-label="Increase quantity" class="px-1 hover:text-brand">+</button>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold">${money(i.unitPrice * i.qty)}</p>
          <button data-drawer-remove="${i.variantId}" class="text-xs text-slate-text hover:text-red-500 mt-1">Remove</button>
        </div>
      </div>`,
    )
    .join('');

  subtotalEl.textContent = money(items.reduce((s, i) => s + i.unitPrice * i.qty, 0));

  wrap.querySelectorAll<HTMLButtonElement>('[data-drawer-inc]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = Number(b.dataset.drawerInc);
      const item = getCart().find((i) => i.variantId === id);
      if (item) setQty(id, item.qty + 1);
    }),
  );
  wrap.querySelectorAll<HTMLButtonElement>('[data-drawer-dec]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = Number(b.dataset.drawerDec);
      const item = getCart().find((i) => i.variantId === id);
      if (item) setQty(id, item.qty - 1);
    }),
  );
  wrap.querySelectorAll<HTMLButtonElement>('[data-drawer-remove]').forEach((b) =>
    b.addEventListener('click', () => removeItem(Number(b.dataset.drawerRemove))),
  );
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
  subscribe(render);
}
