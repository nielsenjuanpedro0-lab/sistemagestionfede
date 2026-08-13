import { describe, it, expect } from 'vitest'
import {
  saleCategory,
  toUSD,
  saleAccessoriesRevenueUSD,
  saleAccessoriesCostUSD,
  categoryBreakdown,
} from './sales'

describe('saleCategory', () => {
  it('clasifica por brand', () => {
    expect(saleCategory({ brand: 'SERVICIO' })).toBe('service')
    expect(saleCategory({ brand: 'ACCESORIOS' })).toBe('accessory')
    expect(saleCategory({ brand: 'MOVIMIENTO' })).toBe('movement')
    expect(saleCategory({ brand: 'Apple' })).toBe('device')
    expect(saleCategory({ brand: null })).toBe('device')
    expect(saleCategory({})).toBe('device')
  })
})

describe('toUSD', () => {
  it('USD pasa igual, ARS divide por la cotización', () => {
    expect(toUSD(100, 'USD', 1000)).toBe(100)
    expect(toUSD(1000, 'ARS', 1000)).toBe(1)
    expect(toUSD(0, 'ARS', 1000)).toBe(0)
    expect(toUSD(500, null, 1000)).toBe(0.5) // null => ARS
  })
})

describe('accesorios de una venta', () => {
  const sale = {
    accessories: [
      { price: 1000, qty: 2, cost_price: 600, currency: 'ARS', is_gift: false },
      { price: 5000, qty: 1, cost_price: 3000, currency: 'ARS', is_gift: true }, // regalo: revenue 0, costo cuenta
    ],
  }
  it('revenue ignora regalos', () => {
    expect(saleAccessoriesRevenueUSD(sale, 1000)).toBeCloseTo(2, 5) // 2000 ARS => 2 USD
  })
  it('cost suma todos (incluido regalo)', () => {
    // (600*2) + (3000*1) = 4200 ARS => 4.2 USD
    expect(saleAccessoriesCostUSD(sale, 1000)).toBeCloseTo(4.2, 5)
  })
})

describe('categoryBreakdown', () => {
  it('separa equipos, accesorios y servicio sin doble conteo', () => {
    const sales = [
      // equipo con un accesorio embebido
      { brand: 'Apple', price: 500, cost_price: 400, currency: 'USD',
        accessories: [{ price: 1000, qty: 1, cost_price: 600, currency: 'ARS', is_gift: false }] },
      // accesorios sueltos (ARS)
      { brand: 'ACCESORIOS', price: 2000, cost_price: 1200, currency: 'ARS',
        accessories: [{ price: 2000, qty: 1, cost_price: 1200, currency: 'ARS', is_gift: false }] },
      // servicio
      { brand: 'SERVICIO', price: 10000, cost_price: 0, currency: 'ARS', accessories: [] },
      // movimiento de caja: se ignora
      { brand: 'MOVIMIENTO', price: 99999, cost_price: 0, currency: 'ARS', accessories: [] },
    ]
    const repairs = [{ cost: 3000 }, { cost: null }]
    const r = categoryBreakdown(sales, repairs, 1000)

    // Equipos: revenue = 500 USD, cost = 400 USD
    expect(r.device.revenue).toBeCloseTo(500, 5)
    expect(r.device.cost).toBeCloseTo(400, 5)
    expect(r.device.profit).toBeCloseTo(100, 5)

    // Accesorios: revenue = (1000 + 2000) ARS = 3 USD ; cost = (600 + 1200) ARS = 1.8 USD
    expect(r.accessory.revenue).toBeCloseTo(3, 5)
    expect(r.accessory.cost).toBeCloseTo(1.8, 5)
    expect(r.accessory.profit).toBeCloseTo(1.2, 5)

    // Servicio: revenue = 10000 ARS = 10 USD ; cost = 3000 ARS = 3 USD
    expect(r.service.revenue).toBeCloseTo(10, 5)
    expect(r.service.cost).toBeCloseTo(3, 5)
    expect(r.service.profit).toBeCloseTo(7, 5)

    // margin equipos = 100/500 = 20%
    expect(r.device.margin).toBeCloseTo(20, 5)
  })
})
