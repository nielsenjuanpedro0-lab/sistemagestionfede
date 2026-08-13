"use client"
import { AlertTriangle, X } from 'lucide-react'
import type { CategoryStats } from '@/utils/sales'

export type ProfitLine = {
  id: string
  label: string
  costUSD: number
  priceUSD: number
  profitUSD: number
}

const usd = (n: number) => `U$ ${Math.round(n).toLocaleString('es-AR')}`

const COPY = {
  device: {
    title: 'Ganancia Equipos',
    revenueLabel: 'Vendiste (lo que te pagó el cliente)',
    costLabel: 'Te costó a vos (precio de compra)',
    source: 'Sale de cada venta de equipo del período: precio de venta menos el precio de costo que cargaste al ingresar el equipo al inventario.',
    missingWarn: (n: number) =>
      `${n} ${n === 1 ? 'equipo vendido no tiene' : 'equipos vendidos no tienen'} precio de costo cargado. ` +
      `${n === 1 ? 'Su' : 'Su'} costo cuenta como cero, así que la ganancia de acá arriba está más alta que la real. ` +
      `Editá ${n === 1 ? 'ese equipo' : 'esos equipos'} en Inventario y cargá el costo.`,
  },
  accessory: {
    title: 'Ganancia Accesorios',
    revenueLabel: 'Vendiste en accesorios',
    costLabel: 'Te costaron a vos',
    source: 'Suma todos los accesorios del período: los que vendiste sueltos y también los que salieron junto con un equipo. Los que marcaste “de regalo” no suman venta, pero sí suman costo, porque igual los pagaste.',
    missingWarn: (n: number) =>
      `${n} ${n === 1 ? 'accesorio vendido no tiene' : 'accesorios vendidos no tienen'} costo cargado. ` +
      `Cargalo en la sección Accesorios para que la ganancia sea real.`,
  },
  service: {
    title: 'Ganancia Servicio Técnico',
    revenueLabel: 'Cobraste por reparaciones',
    costLabel: 'Costo de repuestos y mano de obra',
    source: 'Lo cobrado son las señas y los saldos de reparaciones que entraron a la caja en el período. El costo se cuenta recién cuando entregás el equipo, así el gasto de repuestos cae en el mismo período en que cobrás el trabajo.',
    missingWarn: (n: number) =>
      `${n} ${n === 1 ? 'reparación entregada no tiene' : 'reparaciones entregadas no tienen'} costo cargado ` +
      `(repuestos + mano de obra). Abrí la orden y cargalo para que la ganancia sea real.`,
  },
} as const

export function ProfitBreakdownModal({
  cat,
  stats,
  lines,
  pendingRepairs = 0,
  periodLabel,
  onClose,
}: {
  cat: 'device' | 'accessory' | 'service'
  stats: CategoryStats
  lines: ProfitLine[]
  pendingRepairs?: number
  periodLabel: string
  onClose: () => void
}) {
  const c = COPY[cat]
  const positive = stats.profit >= 0

  return (
    <div className="mo" onClick={onClose}>
      <div className="mb" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="mh-title">{c.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{periodLabel}</div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="mbd" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Fórmula */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 }}>
              Cómo se calcula
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-2)' }}>{c.revenueLabel}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{usd(stats.revenue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, fontSize: 13 }}>
              <span style={{ color: 'var(--text-2)' }}>− {c.costLabel}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{usd(stats.cost)}</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-md)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>= Ganancia</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 18, color: positive ? 'var(--green)' : 'var(--red)' }}>
                {usd(stats.profit)}
              </span>
            </div>

            {stats.revenue > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                Margen = {usd(stats.profit)} ÷ {usd(stats.revenue)} ={' '}
                <strong style={{ color: positive ? 'var(--green)' : 'var(--red)' }}>{stats.margin.toFixed(0)}%</strong>
                {' '}— de cada 100 dólares que entran, te quedan {Math.round(stats.margin)}.
              </div>
            )}
            {stats.revenue === 0 && stats.cost > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                No hubo facturación en este período, así que el margen no se puede calcular (sería dividir por cero).
              </div>
            )}
          </div>

          {/* De dónde salen los números */}
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 14 }}>
            {c.source}
          </div>

          {/* Avisos */}
          {stats.missingCost > 0 && (
            <div style={{ display: 'flex', gap: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <AlertTriangle size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-2)' }}>{c.missingWarn(stats.missingCost)}</div>
            </div>
          )}

          {cat === 'service' && pendingRepairs > 0 && (
            <div style={{ display: 'flex', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <AlertTriangle size={16} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-2)' }}>
                Hay {pendingRepairs} {pendingRepairs === 1 ? 'reparación abierta' : 'reparaciones abiertas'} con costo cargado que todavía no
                {pendingRepairs === 1 ? ' entregaste' : ' entregaste'}. Ese costo va a aparecer acá cuando marques la orden como
                {' '}<strong>Entregado</strong>.
              </div>
            </div>
          )}

          {/* Detalle */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '18px 0 8px' }}>
            Detalle — {lines.length} {lines.length === 1 ? 'operación' : 'operaciones'}
          </div>

          {lines.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              Sin operaciones en este período.
            </div>
          ) : lines.map(d => (
            <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{d.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Te costó {usd(d.costUSD)} · Lo vendiste a {usd(d.priceUSD)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: d.profitUSD >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                Ganancia: {usd(d.profitUSD)}
                {d.priceUSD > 0 && (
                  <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>
                    ({Math.round((d.profitUSD / d.priceUSD) * 100)}% de margen)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
