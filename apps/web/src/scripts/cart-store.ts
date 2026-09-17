/**
 * Tiny reactive cart store: localStorage as source of truth (instant UI),
 * mirrored to the KV-backed API cart on every mutation.
 */
export interface CartItem {
  variantId: number;
  qty: number;
  productName: string;
  color: string;
  colorHex: string;
  image: string | null;
  unitPrice: number;
  slug: string | null;
  stock: number;
}

const KEY = 'ps_cart_v1';

function read(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartItem[];
  } catch {
    return [];
  }
}

function write(items: CartItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

const listeners = new Set<(items: CartItem[]) => void>();

export function getCart(): CartItem[] {
  return read();
}

export function itemCount(items: CartItem[] = read()): number {
  return items.reduce((s, i) => s + i.qty, 0);
}

export function cartTotal(items: CartItem[] = read()): number {
  return Math.round(items.reduce((s, i) => s + i.unitPrice * i.qty, 0) * 100) / 100;
}

function emit(): void {
  const items = read();
  for (const fn of listeners) fn(items);
}

export function subscribe(fn: (items: CartItem[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function addItem(item: Omit<CartItem, 'qty'>, qty = 1): void {
  const items = read();
  const existing = items.find((i) => i.variantId === item.variantId);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, Math.max(existing.stock, 1));
  } else {
    items.push({ ...item, qty });
  }
  write(items);
  emit();
  syncRemote();
}

export function setQty(variantId: number, qty: number): void {
  const items = read();
  const it = items.find((i) => i.variantId === variantId);
  if (!it) return;
  it.qty = Math.max(0, Math.min(qty, Math.max(it.stock, 1)));
  if (it.qty === 0) {
    write(items.filter((i) => i.variantId !== variantId));
  } else {
    write(items);
  }
  emit();
  syncRemote();
}

export function removeItem(variantId: number): void {
  write(read().filter((i) => i.variantId !== variantId));
  emit();
  syncRemote();
}

export function clearCart(): void {
  write([]);
  emit();
  syncRemote();
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
/** Debounced mirror to the API cart (KV), best-effort. */
function syncRemote(): void {
  if (typeof window === 'undefined') return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await fetch(`${apiBase()}/api/cart`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lines: read().map((i) => ({ variantId: i.variantId, qty: i.qty })),
        }),
      });
    } catch {
      /* offline — localStorage remains source of truth */
    }
  }, 600);
}

export function apiBase(): string {
  return (import.meta.env.PUBLIC_API_BASE_URL as string | undefined) ?? '';
}

/**
 * Base URL for SERVER-side fetches (SSR pages). Node's fetch cannot use
 * relative URLs, so in dev we point straight at the local worker.
 * In production, PUBLIC_API_BASE_URL is set at build time.
 */
export function ssrApiBase(): string {
  const configured = apiBase();
  if (configured) return configured;
  return import.meta.env.DEV ? 'http://127.0.0.1:8787' : '';
}

export const money = (n: number): string =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });