export type SaleCategory = 'device' | 'accessory' | 'service' | 'movement'

export function saleCategory(sale: { brand?: string | null }): SaleCategory {
  const b = (sale.brand || '').toUpperCase()
  if (b === 'MOVIMIENTO') return 'movement'
  if (b === 'SERVICIO') return 'service'
  if (b === 'ACCESORIOS') return 'accessory'
  return 'device'
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

export type CategoryStats = { revenue: number; cost: number; profit: number; margin: number }
export type CategoryBreakdown = { device: CategoryStats; accessory: CategoryStats; service: CategoryStats }

function stats(revenue: number, cost: number): CategoryStats {
  const profit = revenue - cost
  return { revenue, cost, profit, margin: revenue > 0 ? (profit / revenue) * 100 : 0 }
}

export function categoryBreakdown(sales: any[], repairs: any[], exchangeRate: number): CategoryBreakdown {
  let deviceRev = 0, deviceCost = 0
  let accRev = 0, accCost = 0
  let svcRev = 0

  for (const s of sales) {
    const cat = saleCategory(s)
    if (cat === 'movement') continue

    // Accesorios: del JSON de TODAS las ventas (equipo + sueltas)
    accRev += saleAccessoriesRevenueUSD(s, exchangeRate)
    accCost += saleAccessoriesCostUSD(s, exchangeRate)

    if (cat === 'device') {
      deviceRev += toUSD(s.price || 0, s.currency, exchangeRate)
      deviceCost += toUSD(s.cost_price || 0, s.currency, exchangeRate)
    } else if (cat === 'service') {
      svcRev += toUSD(s.price || 0, s.currency, exchangeRate)
    }
    // cat === 'accessory': su price/cost NO se usan (se cuentan vía JSON arriba)
  }

  const svcCost = (repairs || []).reduce(
    (acc: number, r: any) => acc + toUSD(r.cost || 0, 'ARS', exchangeRate),
    0,
  )

  return {
    device: stats(deviceRev, deviceCost),
    accessory: stats(accRev, accCost),
    service: stats(svcRev, svcCost),
  }
}
