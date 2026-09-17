/** Admin panel: token auth + stats + order management. */
import { apiBase, money } from './cart-store';
import { toast } from './ui';

const TOKEN_KEY = 'ps_admin_token';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY) ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

interface Stats {
  revenue: number;
  orders: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  byStatus: { status: string; count: number }[];
}
interface AdminOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  created_at: string;
}

async function loadStats(): Promise<void> {
  const res = await fetch(`${apiBase()}/api/admin/stats`, { headers: authHeaders() });
  if (!res.ok) throw new Error('stats failed');
  const stats = (await res.json()) as Stats;
  const wrap = document.getElementById('admin-stats');
  if (wrap) {
    wrap.innerHTML = `
      <div class="card p-6"><p class="text-sm text-slate-text">Revenue</p><p class="mt-1 font-display text-2xl font-extrabold text-brand">${money(stats.revenue)}</p></div>
      <div class="card p-6"><p class="text-sm text-slate-text">Paid orders</p><p class="mt-1 font-display text-2xl font-extrabold">${stats.orders}</p></div>
      <div class="card p-6"><p class="text-sm text-slate-text">By status</p><p class="mt-1 text-sm">${stats.byStatus.map((s) => `${s.status}: <strong>${s.count}</strong>`).join(' · ') || '—'}</p></div>`;
  }
  const top = document.getElementById('admin-top');
  if (top) {
    top.innerHTML =
      stats.topProducts.length === 0
        ? '<p class="text-slate-text">No orders yet.</p>'
        : stats.topProducts
            .map((p) => `<div class="flex justify-between"><span>${p.name}</span><span><strong>${p.qty}</strong> sold · ${money(p.revenue)}</span></div>`)
            .join('');
  }
}

async function loadOrders(): Promise<void> {
  const res = await fetch(`${apiBase()}/api/admin/orders`, { headers: authHeaders() });
  if (!res.ok) throw new Error('orders failed');
  const data = (await res.json()) as { orders: AdminOrder[] };
  const tbody = document.getElementById('admin-orders');
  if (!tbody) return;
  if (data.orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-slate-text">No orders yet — place one in demo mode!</td></tr>';
    return;
  }
  tbody.innerHTML = data.orders
    .map(
      (o) => `
      <tr class="border-b" style="border-color: color-mix(in srgb, var(--ink) 8%, transparent)">
        <td class="px-4 py-3 font-mono text-xs">${o.id}</td>
        <td class="px-4 py-3">${o.customer_name}<br /><span class="text-xs text-slate-text">${o.customer_email}</span></td>
        <td class="px-4 py-3 font-semibold">${money(o.total)}</td>
        <td class="px-4 py-3"><span class="chip capitalize">${o.status}</span></td>
        <td class="px-4 py-3">
          <select data-order="${o.id}" class="field !w-auto !py-1 text-xs">
            ${['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`,
    )
    .join('');

  tbody.querySelectorAll<HTMLSelectElement>('select[data-order]').forEach((sel) =>
    sel.addEventListener('change', async () => {
      const id = sel.dataset.order;
      const res2 = await fetch(`${apiBase()}/api/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: sel.value }),
      });
      if (res2.ok) toast(`Order ${id} → ${sel.value}`);
      else toast('Update failed', 'error');
    }),
  );
}

function enterPanel(): void {
  document.getElementById('admin-login')?.classList.add('hidden');
  document.getElementById('admin-panel')?.classList.remove('hidden');
  loadStats().catch(() => toast('Could not load stats', 'error'));
  loadOrders().catch(() => toast('Could not load orders', 'error'));
}

function init(): void {
  if (localStorage.getItem(TOKEN_KEY)) enterPanel();

  document.getElementById('admin-token-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('admin-token') as HTMLInputElement;
    localStorage.setItem(TOKEN_KEY, input.value);
    const res = await fetch(`${apiBase()}/api/admin/stats`, { headers: authHeaders() });
    if (res.ok) {
      enterPanel();
    } else {
      localStorage.removeItem(TOKEN_KEY);
      const err = document.getElementById('admin-login-error');
      if (err) {
        err.textContent = 'Invalid token';
        err.hidden = false;
      }
    }
  });

  document.getElementById('admin-logout')?.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
