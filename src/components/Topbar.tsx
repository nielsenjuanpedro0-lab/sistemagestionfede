"use client"
import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, X, DollarSign, LogOut, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface TopbarProps {
  page: string;
  user: any;
  onMenu: () => void;
  onLogout?: () => void;
}

const NOTIFICATIONS = [
  {
    id: 'mejoras-jun27',
    icon: <TrendingUp size={16} />,
    color: '#059669',
    title: '¡Inventario mejorado!',
    body: 'Nuevo diseño de lista más limpio, buscador de accesorios por texto, Apple Watch con medidas y colores, y login renovado.',
    href: '/stock',
    cta: 'Ver inventario',
  },
]

const STORAGE_KEY = 'stackr_notif_read'

const TITLES: Record<string, string> = {
  dashboard: 'Panel de Control',
  '': 'Panel de Control',
  stock: 'Inventario Global',
  scan: 'Carga por Escáner',
  sales: 'Ventas y Facturas',
  sell: 'Vender',
  users: 'Gestión de Usuarios',
  settings: 'Configuración',
  repairs: 'Reparaciones',
  reports: 'Rentabilidad',
  expenses: 'Gastos',
  accessories: 'Accesorios',
}

export function Topbar({ page, user, onMenu, onLogout }: TopbarProps) {
  const [openPanel, setOpenPanel] = useState<'bell' | 'rate' | 'avatar' | null>(null)
  const [read, setRead] = useState<string[]>([])
  const [blueRate, setBlueRate] = useState<{ compra: number; venta: number; updatedAt: string } | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setRead(stored)
    } catch { setRead([]) }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenPanel(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchBlue = () => {
    setRateLoading(true)
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then(r => r.json())
      .then(d => setBlueRate({ compra: d.compra, venta: d.venta, updatedAt: d.fechaActualizacion }))
      .catch(() => {})
      .finally(() => setRateLoading(false))
  }

  useEffect(() => { fetchBlue() }, [])

  const toggle = (panel: 'bell' | 'rate' | 'avatar') =>
    setOpenPanel(v => v === panel ? null : panel)

  const unread = NOTIFICATIONS.filter(n => !read.includes(n.id))
  const hasUnread = unread.length > 0

  const dismiss = (id: string) => {
    const next = [...read, id]
    setRead(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const dismissAll = () => {
    const next = NOTIFICATIONS.map(n => n.id)
    setRead(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setOpenPanel(null)
  }

  const updatedStr = blueRate?.updatedAt
    ? new Date(blueRate.updatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="topbar no-print">
      <button className="btn-icon mobile-menu-btn" onClick={onMenu} style={{ display: 'none' }}>
        <Menu size={22} />
      </button>

      <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>

        {/* Dólar Blue chip */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => toggle('rate')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 20,
              background: openPanel === 'rate' ? 'var(--surface-3)' : 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text)',
            }}
          >
            <DollarSign size={13} style={{ color: 'var(--green)' }} />
            <span>Blue</span>
            <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono' }}>
              {blueRate ? `$${blueRate.venta.toLocaleString('es-AR')}` : '...'}
            </span>
          </button>

          {openPanel === 'rate' && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--surface)', border: '1px solid var(--border-md)',
              borderRadius: 14, boxShadow: 'var(--shadow)', zIndex: 200,
              minWidth: 220, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Dólar Blue</span>
                <button
                  onClick={fetchBlue}
                  style={{ color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Actualizar"
                >
                  <RefreshCw size={13} style={{ animation: rateLoading ? 'spin 1s linear infinite' : 'none' }} />
                </button>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                    <TrendingDown size={10} /> COMPRA
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 20, fontFamily: 'JetBrains Mono' }}>
                    ${blueRate?.compra.toLocaleString('es-AR') ?? '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                    <TrendingUp size={10} /> VENTA
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 20, fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>
                    ${blueRate?.venta.toLocaleString('es-AR') ?? '—'}
                  </div>
                </div>
              </div>
              {updatedStr && (
                <div style={{ padding: '0 16px 12px', fontSize: 10, color: 'var(--text-3)' }}>
                  Actualizado a las {updatedStr}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => toggle('bell')}
            style={{ position: 'relative' }}
            aria-label="Notificaciones"
          >
            <Bell size={20} />
            {hasUnread && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--red)', border: '2px solid var(--surface)',
                pointerEvents: 'none',
              }} />
            )}
          </button>

          {openPanel === 'bell' && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              width: 320, background: 'var(--surface)',
              border: '1px solid var(--border-md)', borderRadius: 14,
              boxShadow: 'var(--shadow)', zIndex: 200, overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px 10px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Novedades</span>
                {hasUnread && (
                  <button
                    onClick={dismissAll}
                    style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              {NOTIFICATIONS.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  Sin novedades
                </div>
              ) : (
                <div>
                  {NOTIFICATIONS.map(n => {
                    const isRead = read.includes(n.id)
                    return (
                      <div key={n.id} style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border)',
                        background: isRead ? 'transparent' : 'var(--surface-2)',
                      }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: n.color + '18', color: n.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {n.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{n.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.4 }}>{n.body}</div>
                            {n.href && (
                              <Link
                                href={n.href}
                                onClick={() => { dismiss(n.id); setOpenPanel(null) }}
                                style={{
                                  display: 'inline-block', marginTop: 8, fontSize: 12,
                                  fontWeight: 600, color: n.color, textDecoration: 'none',
                                }}
                              >
                                {n.cta} →
                              </Link>
                            )}
                          </div>
                          {!isRead && (
                            <button
                              className="btn-icon"
                              onClick={() => dismiss(n.id)}
                              style={{ flexShrink: 0, color: 'var(--text-3)' }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => toggle('avatar')}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: user.color || '#7c3aed',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: openPanel === 'avatar' ? '2px solid var(--purple)' : '2px solid transparent',
              flexShrink: 0,
            }}
            aria-label="Perfil"
          >
            {user.initials || user.name?.[0]?.toUpperCase() || '?'}
          </button>

          {openPanel === 'avatar' && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--surface)', border: '1px solid var(--border-md)',
              borderRadius: 14, boxShadow: 'var(--shadow)', zIndex: 200,
              minWidth: 210, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: user.color || '#7c3aed',
                    color: '#fff', fontSize: 14, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {user.initials || user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  </div>
                </div>
                {user.role && (
                  <div style={{
                    marginTop: 8, display: 'inline-flex', alignItems: 'center',
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                    background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 20,
                    color: 'var(--text-2)',
                  }}>
                    {user.role === 'owner' ? 'Propietario' : user.role === 'admin' ? 'Admin' : 'Vendedor'}
                  </div>
                )}
              </div>
              {onLogout && (
                <button
                  onClick={() => { setOpenPanel(null); onLogout() }}
                  style={{
                    width: '100%', padding: '12px 16px', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, color: 'var(--red)', cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
