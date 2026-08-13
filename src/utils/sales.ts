export type SaleCategory = 'device' | 'accessory' | 'service' | 'movement'

export function saleCategory(sale: { brand?: string | null }): SaleCategory {
  const b = (sale.brand || '').toUpperCase()
  if (b === 'MOVIMIENTO') return 'movement'
  if (b === 'SERVICIO') return 'service'
  if (b === 'ACCESORIOS') return 'accessory'
  return 'device'
}

/**
 * Cotización con la que se convierte una venta de ARS a USD.
 *
 * Usa la cotización guardada en la venta (la que se usó el día que se vendió)
 * y sólo cae en la cotización actual si esa venta no la tiene registrada.
 * Sin esto, una venta vieja en pesos se revalúa con el dólar de hoy y la
 * ganancia histórica cambia sola cada vez que se actualiza la cotización.
 */
export function saleExchangeRate(sale: any, fallbackRate: number): number {
  const fromPayments = (sale?.payments || [])
    .map((p: any) => parseFloat(p?.exchange_rate))
    .find((r: number) => Number.isFinite(r) && r > 0)
  return fromPayments || fallbackRate || 1
}

export function toUSD(amount: number, currency: string | null | undefined, rate: number): number {
  if (!amount) return 0
  return currency === 'USD' ? amount : amount / (rate || 1)
}

export function saleAccessoriesRevenueUSD(sale: any, rate: number): number {
  return (sale.accessories || []).reduce((acc: number, a: any) => {
    if (a.is_gift) return acc
    return acc + toUSD((a.price || 0) * (a.qty || 1), a.currency || 'ARS', rate)
  }, 0)
}

export function saleAccessoriesCostUSD(sale: any, rate: number): number {
  return (sale.accessories || []).reduce(
    (acc: number, a: any) => acc + toUSD((a.cost_price || 0) * (a.qty || 1), a.currency || 'ARS', rate),
    0,
  )
}

export type CategoryStats = {
  revenue: number
  cost: number
  profit: number
  margin: number
  /** Cantidad de operaciones que entraron en el cálculo. */
  units: number
  /** Operaciones sin costo cargado: inflan la ganancia porque su costo cuenta como 0. */
  missingCost: number
}

export type CategoryBreakdown = {
  device: CategoryStats
  accessory: CategoryStats
  service: CategoryStats
  /** Reparaciones abiertas cuyo costo todavía no se imputó (no fueron entregadas). */
  pendingRepairs: number
}

function emptyStats(): CategoryStats {
  return { revenue: 0, cost: 0, profit: 0, margin: 0, units: 0, missingCost: 0 }
}

function finalize(s: CategoryStats): CategoryStats {
  s.profit = s.revenue - s.cost
  s.margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0
  return s
}

/** Una reparación aporta costo recién cuando se entrega: ahí se cierra el trabajo. */
export function isRepairClosed(repair: any): boolean {
  return (repair?.status || '').toUpperCase() === 'ENTREGADO'
}

export function categoryBreakdown(sales: any[], repairs: any[], exchangeRate: number): CategoryBreakdown {
  const device = emptyStats()
  const accessory = emptyStats()
  const service = emptyStats()

  for (const s of sales) {
    const cat = saleCategory(s)
    if (cat === 'movement') continue

    const rate = saleExchangeRate(s, exchangeRate)

    // Accesorios: siempre del JSON, tanto los vendidos sueltos como los que
    // acompañan a un equipo. Nunca de price/cost_price, para no duplicar.
    const accRev = saleAccessoriesRevenueUSD(s, rate)
    if (accRev > 0 || (s.accessories || []).some((a: any) => !a.is_gift)) {
      accessory.revenue += accRev
      accessory.cost += saleAccessoriesCostUSD(s, rate)
      accessory.units += (s.accessories || []).filter((a: any) => !a.is_gift).length
      accessory.missingCost += (s.accessories || []).filter((a: any) => !a.is_gift && !a.cost_price).length
    }

    if (cat === 'device') {
      device.revenue += toUSD(s.price || 0, s.currency, rate)
      device.cost += toUSD(s.cost_price || 0, s.currency, rate)
      device.units += 1
      if (!s.cost_price) device.missingCost += 1
    } else if (cat === 'service') {
      service.revenue += toUSD(s.price || 0, s.currency, rate)
      service.units += 1
    }
    // cat === 'accessory': su price/cost NO se usan (ya se contaron vía JSON arriba)
  }

  // Costo de servicio: sólo reparaciones entregadas, para que el costo caiga
  // en el mismo período en que se cobró el trabajo. Las abiertas se reportan
  // aparte en pendingRepairs.
  let pendingRepairs = 0
  for (const r of repairs || []) {
    if (!isRepairClosed(r)) {
      if (r?.cost) pendingRepairs += 1
      continue
    }
    service.cost += toUSD(r.cost || 0, 'ARS', exchangeRate)
    if (!r.cost) service.missingCost += 1
  }

  return {
    device: finalize(device),
    accessory: finalize(accessory),
    service: finalize(service),
    pendingRepairs,
  }
}

/** Totales del negocio, derivados del mismo desglose que ven las tarjetas. */
export function totalsFromBreakdown(b: CategoryBreakdown) {
  const revenue = b.device.revenue + b.accessory.revenue + b.service.revenue
  const cost = b.device.cost + b.accessory.cost + b.service.cost
  const profit = revenue - cost
  return {
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    missingCost: b.device.missingCost + b.accessory.missingCost + b.service.missingCost,
  }
}
