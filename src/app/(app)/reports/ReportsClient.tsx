"use client"
import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Smartphone, Warehouse, Calendar, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, Legend } from 'recharts';
import { categoryBreakdown, totalsFromBreakdown, saleCategory, saleExchangeRate, toUSD, isRepairClosed } from '@/utils/sales';
import { ProfitBreakdownModal, type ProfitLine } from '@/components/ProfitBreakdownModal';

type Period = '7d' | '30d' | '90d' | 'all';

export function ReportsClient({ sales, expenses, deposits, exchangeRate, repairs = [] }: {
  sales: any[];
  expenses: any[];
  deposits: any[];
  exchangeRate: number;
  repairs?: any[];
}) {
  const [period, setPeriod] = useState<Period>('30d');
  const [detailCat, setDetailCat] = useState<'device' | 'accessory' | 'service' | null>(null);

  const cutoff = useMemo(() => {
    if (period === 'all') return null;
    const d = new Date();
    if (period === '7d') d.setDate(d.getDate() - 7);
    else if (period === '30d') d.setDate(d.getDate() - 30);
    else if (period === '90d') d.setDate(d.getDate() - 90);
    return d;
  }, [period]);

  const filteredSales = useMemo(() => {
    const valid = sales.filter(s => s.brand !== 'MOVIMIENTO');
    return cutoff ? valid.filter(s => new Date(s.created_at) >= cutoff) : valid;
  }, [sales, cutoff]);

  const filteredExpenses = useMemo(() =>
    cutoff ? expenses.filter(e => new Date(e.created_at) >= cutoff) : expenses
  , [expenses, cutoff]);

  const filteredRepairs = useMemo(() =>
    cutoff ? repairs.filter(r => new Date(r.updated_at || r.created_at) >= cutoff) : repairs
  , [repairs, cutoff]);

  const breakdown = useMemo(
    () => categoryBreakdown(filteredSales, filteredRepairs, exchangeRate),
    [filteredSales, filteredRepairs, exchangeRate]
  );

  /* ── Detalle línea por línea de cada tarjeta ───────── */
  const byNewest = (a: { time: string }, b: { time: string }) =>
    new Date(b.time).getTime() - new Date(a.time).getTime();

  const deviceLines = useMemo(() => filteredSales
    .filter(s => saleCategory(s) === 'device')
    .map(s => {
      const rate = saleExchangeRate(s, exchangeRate);
      const priceUSD = toUSD(s.price || 0, s.currency, rate);
      const costUSD = toUSD(s.cost_price || 0, s.currency, rate);
      return {
        id: String(s.id),
        label: `${s.brand} ${s.model}${s.cost_price ? '' : '  ⚠ sin costo cargado'}`,
        costUSD, priceUSD, profitUSD: priceUSD - costUSD, time: s.created_at,
      };
    })
    .sort(byNewest),
    [filteredSales, exchangeRate]
  );

  const accessoryLines = useMemo(() => {
    const rows: (ProfitLine & { time: string })[] = [];
    filteredSales.forEach(s => {
      const rate = saleExchangeRate(s, exchangeRate);
      (s.accessories || []).forEach((a: any, i: number) => {
        if (a.is_gift) return;
        const priceUSD = toUSD((a.price || 0) * (a.qty || 1), a.currency || 'ARS', rate);
        const costUSD = toUSD((a.cost_price || 0) * (a.qty || 1), a.currency || 'ARS', rate);
        rows.push({ id: `${s.id}-${i}`, label: `${a.qty || 1}x ${a.name}`, costUSD, priceUSD, profitUSD: priceUSD - costUSD, time: s.created_at });
      });
    });
    return rows.sort(byNewest);
  }, [filteredSales, exchangeRate]);

  const serviceLines = useMemo(() => {
    const closed = filteredRepairs.filter(isRepairClosed).sort((a, b) =>
      new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );
    const revenueByCustomer = new Map<string, number>();
    filteredSales.filter(s => saleCategory(s) === 'service').forEach(s => {
      const key = (s.customer?.name || '').toLowerCase().trim();
      const rate = saleExchangeRate(s, exchangeRate);
      revenueByCustomer.set(key, (revenueByCustomer.get(key) || 0) + toUSD(s.price || 0, s.currency, rate));
    });
    return closed.map(r => {
      const key = (r.customer_name || '').toLowerCase().trim();
      const priceUSD = revenueByCustomer.get(key) || 0;
      const costUSD = toUSD(r.cost || 0, 'ARS', exchangeRate);
      return {
        id: String(r.id),
        label: `${r.device_brand || ''} ${r.device_model || ''}`.trim() || 'Reparación',
        costUSD, priceUSD, profitUSD: priceUSD - costUSD,
        time: r.updated_at || r.created_at,
      };
    });
  }, [filteredRepairs, filteredSales, exchangeRate]);

  const linesFor = (cat: 'device' | 'accessory' | 'service'): ProfitLine[] =>
    cat === 'device' ? deviceLines : cat === 'accessory' ? accessoryLines : serviceLines;

  const PERIOD_LABEL: Record<Period, string> = { '7d': '7 días', '30d': '30 días', '90d': '90 días', all: 'Todo' };

  // --- KPI Calculations ---
  // Derivados del mismo desglose por categoría, para que Facturación y
  // Ganancia Bruta sean siempre exactamente la suma de las tres tarjetas.
  const totals = useMemo(() => totalsFromBreakdown(breakdown), [breakdown]);
  const totalRevenue = totals.revenue;
  const totalCost = totals.cost;
  const grossProfit = totals.profit;
  const margin = totals.margin;

  // Expenses in USD
  const totalExpensesUSD = filteredExpenses.reduce((acc, e) => {
    if (e.currency === 'USD') return acc + e.amount;
    return acc + (e.amount / exchangeRate);
  }, 0);

  const netProfit = grossProfit - totalExpensesUSD;

  // --- Profitability by Model ---
  const modelProfit: Record<string, { model: string; revenue: number; cost: number; count: number }> = {};
  filteredSales.forEach(s => {
    const key = `${s.brand} ${s.model}`;
    if (!modelProfit[key]) modelProfit[key] = { model: key, revenue: 0, cost: 0, count: 0 };
    const rev = s.currency === 'USD' ? (s.price || 0) : ((s.price || 0) / exchangeRate);
    const cost = s.currency === 'USD' ? (s.cost_price || 0) : ((s.cost_price || 0) / exchangeRate);
    modelProfit[key].revenue += rev;
    modelProfit[key].cost += cost;
    modelProfit[key].count++;
  });
  const modelRanking = Object.values(modelProfit)
    .map(m => ({ ...m, profit: m.revenue - m.cost, avg: m.count > 0 ? (m.revenue - m.cost) / m.count : 0 }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  // --- Seller profitability ---
  const sellerProfit: Record<string, { name: string; revenue: number; cost: number; count: number }> = {};
  filteredSales.forEach(s => {
    const key = s.seller_id || s.seller_name || 'Desconocido';
    if (!sellerProfit[key]) sellerProfit[key] = { name: s.seller_name || 'Sin nombre', revenue: 0, cost: 0, count: 0 };
    const rev = s.currency === 'USD' ? (s.price || 0) : ((s.price || 0) / exchangeRate);
    const cost = s.currency === 'USD' ? (s.cost_price || 0) : ((s.cost_price || 0) / exchangeRate);
    sellerProfit[key].revenue += rev;
    sellerProfit[key].cost += cost;
    sellerProfit[key].count++;
  });
  const sellerRanking = Object.values(sellerProfit)
    .map(s => ({ ...s, profit: s.revenue - s.cost }))
    .sort((a, b) => b.profit - a.profit);

  // --- Per deposit balance ---
  const depBalance = deposits.map(dep => {
    const depSales = filteredSales.filter(s => {
      // Try to match deposit from stock data embedded or fallback
      return true; // All sales contribute (we don't have deposit on sale yet)
    });
    const depExpenses = filteredExpenses.filter(e => e.deposit_id === dep.id);
    const expUSD = depExpenses.reduce((a, e) => a + (e.currency === 'USD' ? e.amount : e.amount / exchangeRate), 0);
    return {
      name: dep.name,
      expenses: Math.round(expUSD),
    };
  }).filter(d => d.expenses > 0);

  // --- Daily trend (last N days) ---
  const trendDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 14 : 30;
  const trendStep = period === '90d' ? 7 : 1; // weekly buckets for 90d
  const today = new Date();
  const dailyTrend = Array.from({ length: Math.ceil(trendDays / trendStep) }, (_, i) => {
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - i * trendStep);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - trendStep + 1);
    const endStr = endDate.toISOString().slice(0, 10);
    const startStr = startDate.toISOString().slice(0, 10);

    const daySales = filteredSales.filter(s => {
      const d = s.created_at?.slice(0, 10);
      return d >= startStr && d <= endStr;
    });
    const dayExpenses = filteredExpenses.filter(e => {
      const d = e.created_at?.slice(0, 10);
      return d >= startStr && d <= endStr;
    });

    const rev = daySales.reduce((a, s) => a + (s.currency === 'USD' ? (s.price || 0) : ((s.price || 0) / exchangeRate)), 0);
    const cost = daySales.reduce((a, s) => a + (s.currency === 'USD' ? (s.cost_price || 0) : ((s.cost_price || 0) / exchangeRate)), 0);
    const exp = dayExpenses.reduce((a, e) => a + (e.currency === 'USD' ? e.amount : e.amount / exchangeRate), 0);

    return {
      label: trendStep === 1
        ? endDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
        : `${startDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`,
      revenue: Math.round(rev),
      profit: Math.round(rev - cost - exp),
    };
  }).reverse();

  // Colors
  const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 20 }}>
        <h1 className="st">Rentabilidad</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['7d', '7 días'], ['30d', '30 días'], ['90d', '90 días'], ['all', 'Todo']] as [Period, string][]).map(([v, l]) => (
            <button key={v} className={`btn-pill ${period === v ? 'active' : ''}`} onClick={() => setPeriod(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="sg" style={{ marginBottom: 24 }}>
        <div className="sc">
          <div className="sl">Facturación</div>
          <div className="sv">U$ {Math.round(totalRevenue).toLocaleString('es-AR')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Todo lo que entró: equipos + accesorios + servicio
          </div>
        </div>
        <div className="sc">
          <div className="sl">Ganancia Bruta</div>
          <div className="sv" style={{ color: grossProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
            U$ {Math.round(grossProfit).toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Facturación − lo que te costó · margen {margin.toFixed(0)}%
          </div>
        </div>
        <div className="sc">
          <div className="sl">Gastos Operativos</div>
          <div className="sv" style={{ color: 'var(--red)' }}>U$ {Math.round(totalExpensesUSD).toLocaleString('es-AR')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Alquiler, sueldos, servicios ({filteredExpenses.length} {filteredExpenses.length === 1 ? 'registro' : 'registros'})
          </div>
        </div>
        <div className="sc" style={{ border: '1px solid var(--green)', background: 'rgba(16,185,129,0.06)' }}>
          <div className="sl">Ganancia Neta</div>
          <div className="sv" style={{ color: netProfit >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 28 }}>
            U$ {Math.round(netProfit).toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Lo que te queda: ganancia bruta − gastos
          </div>
        </div>
      </div>

      {/* Category breakdown cards */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        {([
          { key: 'device' as const, label: 'Ganancia Equipos', s: breakdown.device },
          { key: 'accessory' as const, label: 'Ganancia Accesorios', s: breakdown.accessory },
          { key: 'service' as const, label: 'Ganancia Servicio Técnico', s: breakdown.service },
        ]).map(c => (
          <div className="sc" key={c.key} style={{ cursor: 'pointer' }} onClick={() => setDetailCat(c.key)}>
            <div className="sl" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {c.label}
              {c.s.missingCost > 0 && <AlertTriangle size={12} color="var(--amber)" />}
            </div>
            <div className="sv" style={{ color: c.s.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
              U$ {Math.round(c.s.profit).toLocaleString('es-AR')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              {c.s.revenue > 0
                ? `Vendiste U$ ${Math.round(c.s.revenue).toLocaleString('es-AR')} · margen ${c.s.margin.toFixed(0)}%`
                : 'Sin ventas en el período'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
              Ver cómo se calcula →
            </div>
          </div>
        ))}
      </div>

      {totals.missingCost > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 24 }}>
          <AlertTriangle size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-2)' }}>
            <strong>{totals.missingCost} {totals.missingCost === 1 ? 'operación no tiene' : 'operaciones no tienen'} el costo cargado.</strong>{' '}
            Su costo cuenta como cero, así que la ganancia figura más alta que la real.
            Tocá cada tarjeta para ver cuáles son y corregirlas.
          </div>
        </div>
      )}

      {/* Revenue vs Profit Trend */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="sl" style={{ marginBottom: 20 }}>Tendencia: Facturación vs Ganancia (USD)</div>
        <div style={{ height: 250, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                formatter={(val: any) => [`U$ ${val.toLocaleString()}`, undefined]}
              />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="revenue" name="Facturación" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="profit" name="Ganancia" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#profGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 24 }}>
        {/* Profitability by Model */}
        <div className="col card" style={{ flex: 2, padding: 24 }}>
          <div className="sl" style={{ marginBottom: 20 }}>
            <Smartphone size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Ganancia por Modelo (USD)
          </div>
          {modelRanking.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Sin datos de ventas en este período</div>
          ) : (
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={modelRanking} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                  <YAxis dataKey="model" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text)', fontSize: 11, fontWeight: 500 }} width={130} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                    formatter={(val: any, name: any) => [`U$ ${Math.round(val).toLocaleString()}`, name === 'profit' ? 'Ganancia' : name]}
                  />
                  <Bar dataKey="profit" name="Ganancia" radius={[0, 6, 6, 0]} barSize={22}>
                    {modelRanking.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Seller ranking */}
        <div className="col card" style={{ padding: 24 }}>
          <div className="sl" style={{ marginBottom: 20 }}>
            <Users size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Utilidad por Vendedor
          </div>
          {sellerRanking.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Sin datos</div>
          ) : sellerRanking.map((s, i) => {
            const maxProfit = sellerRanking[0]?.profit || 1;
            const pct = maxProfit > 0 ? (s.profit / maxProfit * 100) : 0;
            return (
              <div key={s.name} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i === 0 ? 'var(--amber)' : 'var(--surface-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 11, color: i === 0 ? '#000' : 'var(--text-3)', flexShrink: 0
                    }}>
                      {s.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.count} ventas</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: s.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      U$ {Math.round(s.profit).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(pct, 2)}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expenses per deposit */}
      {depBalance.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="sl" style={{ marginBottom: 20 }}>
            <Warehouse size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Gastos por Depósito (USD)
          </div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depBalance} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  formatter={(val: any) => [`U$ ${val.toLocaleString()}`, 'Gastos']}
                />
                <Bar dataKey="expenses" name="Gastos" radius={[6, 6, 0, 0]} barSize={36}>
                  {depBalance.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Exchange rate info */}
      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--text-3)' }}>
        Cotización Dólar Blue utilizada: <strong>$ {exchangeRate.toLocaleString()}</strong> · Los montos en ARS se convirtieron automáticamente.
      </div>

      {detailCat && (
        <ProfitBreakdownModal
          cat={detailCat}
          stats={breakdown[detailCat]}
          lines={linesFor(detailCat)}
          pendingRepairs={breakdown.pendingRepairs}
          periodLabel={PERIOD_LABEL[period]}
          onClose={() => setDetailCat(null)}
        />
      )}
    </div>
  );
}
