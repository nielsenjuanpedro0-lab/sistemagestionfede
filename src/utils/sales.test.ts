import { describe, it, expect } from 'vitest'
import {
  saleCategory,
  toUSD,
  saleExchangeRate,
  saleAccessoriesRevenueUSD,
  saleAccessoriesCostUSD,
  isRepairClosed,
  categoryBreakdown,
  totalsFromBreakdown,
} from './sales'

const RATE = 1000

describe('saleCategory', () => {
  it('clasifica por la marca magica', () => {
    expect(saleCategory({ brand: 'MOVIMIENTO' })).toBe('movement')
    expect(saleCategory({ brand: 'SERVICIO' })).toBe('service')
    expect(saleCategory({ brand: 'ACCESORIOS' })).toBe('accessory')
    expect(saleCategory({ brand: 'Apple' })).toBe('device')
    expect(saleCategory({ brand: null })).toBe('device')
  })
})

describe('toUSD', () => {
  it('deja los USD como estan y divide los ARS', () => {
    expect(toUSD(100, 'USD', RATE)).toBe(100)
    expect(toUSD(100000, 'ARS', RATE)).toBe(100)
  })

  it('no explota con monto 0 ni cotizacion 0', () => {
    expect(toUSD(0, 'ARS', RATE)).toBe(0)
    expect(toUSD(1000, 'ARS', 0)).toBe(1000)
  })
})

describe('saleExchangeRate', () => {
  it('usa la cotizacion guardada en la venta', () => {
    const sale = { payments: [{ exchange_rate: 1500 }] }
    expect(saleExchangeRate(sale, 1000)).toBe(1500)
  })

  it('cae en la cotizacion actual si la venta no la tiene', () => {
    expect(saleExchangeRate({ payments: [{ exchange_rate: null }] }, 1200)).toBe(1200)
    expect(saleExchangeRate({ payments: [] }, 1200)).toBe(1200)
    expect(saleExchangeRate({}, 1200)).toBe(1200)
  })

  it('una venta vieja en ARS no se revalua con el dolar de hoy', () => {
    // Vendido a $1.500.000 con el dolar a 1500 => fueron 1000 USD reales.
    const sale = {
      brand: 'Apple',
      price: 1_500_000,
      cost_price: 1_200_000,
      currency: 'ARS',
      payments: [{ exchange_rate: 1500 }],
    }
    // Hoy el dolar esta a 1000; sin la cotizacion historica daria 1500 USD.
    const b = categoryBreakdown([sale], [], 1000)
    expect(b.device.revenue).toBe(1000)
    expect(b.device.cost).toBe(800)
    expect(b.device.profit).toBe(200)
  })
})

describe('accesorios', () => {
  const sale = {
    accessories: [
      { price: 10, cost_price: 4, qty: 2, currency: 'USD' },
      { price: 5000, cost_price: 2000, qty: 1, currency: 'ARS' },
      { price: 99, cost_price: 50, qty: 1, currency: 'USD', is_gift: true },
    ],
  }

  it('suma la venta ignorando los regalos', () => {
    expect(saleAccessoriesRevenueUSD(sale, RATE)).toBe(25) // 20 + 5
  })

  it('suma el costo incluyendo el regalo, porque el regalo cuesta igual', () => {
    expect(saleAccessoriesCostUSD(sale, RATE)).toBe(60) // 8 + 2 + 50
  })
})

describe('isRepairClosed', () => {
  it('solo cuenta las entregadas', () => {
    expect(isRepairClosed({ status: 'ENTREGADO' })).toBe(true)
    expect(isRepairClosed({ status: 'entregado' })).toBe(true)
    expect(isRepairClosed({ status: 'REPARADO' })).toBe(false)
    expect(isRepairClosed({})).toBe(false)
  })
})

describe('categoryBreakdown', () => {
  it('no duplica los accesorios vendidos sueltos', () => {
    // La venta suelta guarda el total en price/cost_price Y el detalle en el JSON.
    // Debe contarse una sola vez, via el JSON.
    const sales = [{
      brand: 'ACCESORIOS',
      price: 20000,
      cost_price: 8000,
      currency: 'ARS',
      accessories: [{ price: 20000, cost_price: 8000, qty: 1, currency: 'ARS' }],
    }]
    const b = categoryBreakdown(sales, [], RATE)
    expect(b.accessory.revenue).toBe(20)
    expect(b.accessory.cost).toBe(8)
    expect(b.device.revenue).toBe(0)
  })

  it('cuenta los accesorios que acompanian a un equipo, sin mezclarlos con el equipo', () => {
    const sales = [{
      brand: 'Apple',
      price: 1000,
      cost_price: 800,
      currency: 'USD',
      accessories: [{ price: 30, cost_price: 10, qty: 1, currency: 'USD' }],
    }]
    const b = categoryBreakdown(sales, [], RATE)
    expect(b.device.revenue).toBe(1000)
    expect(b.device.profit).toBe(200)
    expect(b.accessory.revenue).toBe(30)
    expect(b.accessory.profit).toBe(20)
  })

  it('ignora los MOVIMIENTO', () => {
    const b = categoryBreakdown([{ brand: 'MOVIMIENTO', price: 999, currency: 'USD' }], [], RATE)
    expect(b.device.revenue).toBe(0)
    expect(b.device.units).toBe(0)
  })

  it('imputa el costo de la reparacion recien cuando se entrega', () => {
    const sales = [{ brand: 'SERVICIO', price: 100_000, currency: 'ARS' }]
    const repairs = [
      { status: 'ENTREGADO', cost: 30_000 },
      { status: 'REPARADO', cost: 25_000 }, // todavia en el taller
    ]
    const b = categoryBreakdown(sales, repairs, RATE)
    expect(b.service.revenue).toBe(100)
    expect(b.service.cost).toBe(30) // solo la entregada
    expect(b.service.profit).toBe(70)
    expect(b.pendingRepairs).toBe(1)
  })

  it('marca los equipos sin costo cargado en vez de inventar 100% de margen', () => {
    const sales = [
      { brand: 'Apple', price: 1000, cost_price: 800, currency: 'USD' },
      { brand: 'Apple', price: 500, cost_price: null, currency: 'USD' },
    ]
    const b = categoryBreakdown(sales, [], RATE)
    expect(b.device.units).toBe(2)
    expect(b.device.missingCost).toBe(1)
    // El numero sigue siendo optimista, pero ahora el sistema puede avisarlo.
    expect(b.device.profit).toBe(700)
  })

  it('margen 0 cuando no hubo facturacion, sin dividir por cero', () => {
    const b = categoryBreakdown([], [{ status: 'ENTREGADO', cost: 10_000 }], RATE)
    expect(b.service.revenue).toBe(0)
    expect(b.service.cost).toBe(10)
    expect(b.service.profit).toBe(-10)
    expect(b.service.margin).toBe(0)
  })
})

describe('totalsFromBreakdown', () => {
  it('el total es exactamente la suma de las tres tarjetas', () => {
    const sales = [
      { brand: 'Apple', price: 1000, cost_price: 800, currency: 'USD', accessories: [{ price: 30, cost_price: 10, qty: 1, currency: 'USD' }] },
      { brand: 'SERVICIO', price: 100_000, currency: 'ARS' },
    ]
    const repairs = [{ status: 'ENTREGADO', cost: 30_000 }]
    const b = categoryBreakdown(sales, repairs, RATE)
    const t = totalsFromBreakdown(b)

    expect(t.revenue).toBe(1000 + 30 + 100)
    expect(t.cost).toBe(800 + 10 + 30)
    expect(t.profit).toBe(t.revenue - t.cost)
    expect(t.profit).toBe(b.device.profit + b.accessory.profit + b.service.profit)
  })
})
