/** PDP interactions: variant switching, quantity, add to cart, gallery, review submit. */
import { addItem, apiBase } from './cart-store';
import { toast } from './ui';

interface VariantEl extends HTMLElement {
  dataset: {
    variant: string;
    color: string;
    hex: string;
    price: string;
    stock: string;
    images: string;
    sku: string;
  };
}

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function init(): void {
  const variantBtns = Array.from(document.querySelectorAll<VariantEl>('[data-variant]'));
  const priceEl = document.getElementById('pdp-price');
  const priceMobile = document.getElementById('pdp-price-mobile');
  const stockEl = document.getElementById('pdp-stock');
  const colorName = document.getElementById('pdp-color-name');
  const mainImg = document.getElementById('pdp-image') as HTMLImageElement | null;
  const thumbsWrap = document.getElementById('pdp-thumbs');
  const qtyEl = document.getElementById('qty-value');

  let current = variantBtns.find((b) => b.getAttribute('aria-checked') === 'true') ?? variantBtns[0];
  let qty = 1;

  function applyVariant(btn: VariantEl | undefined): void {
    if (!btn) return;
    current = btn;
    const d = btn.dataset;
    const price = Number(d.price);
    const stock = Number(d.stock);
    if (priceEl) priceEl.textContent = money(price);
    if (priceMobile) priceMobile.textContent = money(price);
    if (colorName) colorName.textContent = d.color;
    if (stockEl) {
      if (stock === 0) stockEl.textContent = 'Sold out';
      else if (stock <= 10) stockEl.textContent = `Only ${stock} left in ${d.color}`;
      else stockEl.textContent = `In stock · ships in 1–2 days`;
    }
    variantBtns.forEach((b) => {
      b.setAttribute('aria-checked', String(b === btn));
      b.style.borderColor = b === btn ? 'var(--brand)' : 'color-mix(in srgb, var(--ink) 20%, transparent)';
    });
    // swap gallery
    let images: string[] = [];
    try {
      images = JSON.parse(d.images) as string[];
    } catch {
      images = [];
    }
    if (mainImg && images[0]) {
      mainImg.src = images[0];
      mainImg.alt = `PureSip in ${d.color}`;
    }
    if (thumbsWrap) {
      thumbsWrap.innerHTML = images
        .map(
          (img, i) => `
          <button type="button" class="h-20 w-20 rounded-2xl overflow-hidden border-2 ${i === 0 ? 'border-brand' : 'border-transparent hover:border-brand/40'}" data-thumb="${img}" aria-label="View image ${i + 1}">
            <img src="${img}" alt="" class="h-full w-full object-cover" loading="lazy" width="80" height="80" />
          </button>`,
        )
        .join('');
    }
  }

  applyVariant(current);

  variantBtns.forEach((btn) =>
    btn.addEventListener('click', () => applyVariant(btn as VariantEl)),
  );

  // Gallery thumbs (event delegation so variant swaps keep working)
  thumbsWrap?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-thumb]');
    if (!btn || !mainImg) return;
    mainImg.src = btn.dataset.thumb ?? '';
    thumbsWrap.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('border-brand', b === btn);
      b.classList.toggle('border-transparent', b !== btn);
    });
  });

  // Quantity
  document.getElementById('qty-inc')?.addEventListener('click', () => {
    const max = Number(current?.dataset.stock ?? 99);
    qty = Math.min(qty + 1, Math.max(max, 1));
    if (qtyEl) qtyEl.textContent = String(qty);
  });
  document.getElementById('qty-dec')?.addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    if (qtyEl) qtyEl.textContent = String(qty);
  });

  // Add to cart (both buttons)
  function addToCart(): void {
    if (!current) return;
    const d = current.dataset;
    const stock = Number(d.stock);
    if (stock === 0) {
      toast('Sold out — pick another color', 'error');
      return;
    }
    const images: string[] = JSON.parse(d.images || '[]');
    addItem(
      {
        variantId: Number(d.variant),
        productName: document.querySelector('h1')?.textContent?.trim() ?? 'PureSip product',
        color: d.color,
        colorHex: d.hex,
        image: images[0] ?? null,
        unitPrice: Number(d.price),
        slug: window.location.pathname.split('/').pop() ?? null,
        stock,
      },
      qty,
    );
    toast(`Added ${qty} × ${d.color} to cart`);
    window.dispatchEvent(new CustomEvent('ps:open-cart'));
  }

  document.getElementById('add-to-cart')?.addEventListener('click', addToCart);
  document.getElementById('add-to-cart-mobile')?.addEventListener('click', addToCart);

  // Review form
  const toggle = document.getElementById('review-toggle');
  const form = document.getElementById('review-form') as HTMLFormElement | null;
  toggle?.addEventListener('click', () => {
    form?.classList.toggle('hidden');
  });
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('review-status');
    const fd = new FormData(form);
    try {
      const res = await fetch(`${apiBase()}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: fd.get('productSlug'),
          rating: Number(fd.get('rating')),
          title: fd.get('title'),
          body: fd.get('body'),
          authorName: fd.get('authorName'),
        }),
      });
      const data = (await res.json()) as { error?: { message: string } };
      if (res.ok) {
        if (status) status.textContent = 'Thanks! Your review is live.';
        toast('Review submitted — thank you!');
        form.reset();
        setTimeout(() => window.location.reload(), 900);
      } else {
        if (status) status.textContent = data.error?.message ?? 'Could not submit';
        toast(data.error?.message ?? 'Could not submit', 'error');
      }
    } catch {
      toast('Network error — try again', 'error');
    }
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
