"use client"
import { useState, useEffect } from 'react';
import { LayoutDashboard, Box, ScanLine, ShoppingCart, Wallet, LogOut, User as UserIcon, Settings, Warehouse, Users2, ShieldAlert, FileText, Package, Headphones, Wrench, Truck, BarChart3, CreditCard, ShoppingBag, CalendarDays, Receipt } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  user: any;
  page: string;
  setPage: (page: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  isSuperAdmin?: boolean;
}

export function Sidebar({ user, page, setPage, onLogout, isOpen, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();
  // Derive active from real pathname so it updates instantly on navigation
  const currentPage = pathname.replace('/', '') || 'dashboard';

  const nav = isSuperAdmin ?
    [
      { g: 'Stackr Admin' },
      { id: 'superadmin', l: 'Negocios', i: <ShieldAlert size={17} /> },
    ] :
    user.role === 'owner' ?
    [
      { g: 'General' },
      { id: 'dashboard',   l: 'Resumen',        i: <LayoutDashboard size={17} /> },
      { id: 'reports',     l: 'Rentabilidad',    i: <BarChart3 size={17} /> },
      { g: 'Inventario' },
      { id: 'stock',       l: 'Inventario',      i: <Package size={17} /> },
      { id: 'accessories', l: 'Accesorios',      i: <Headphones size={17} /> },
      { id: 'deposits',    l: 'Depósitos',        i: <Warehouse size={17} /> },
      { id: 'scan',        l: 'Carga EAN',        i: <ScanLine size={17} /> },
      { g: 'Operaciones' },
      { id: 'sell',        l: 'Nueva Operación',  i: <ShoppingCart size={17} /> },
      { id: 'sales',       l: 'Historial Ventas', i: <FileText size={17} /> },
      { id: 'recibos',     l: 'Recibo',           i: <Receipt size={17} /> },
      { id: 'repairs',     l: 'Servicio Técnico', i: <Wrench size={17} /> },
      { id: 'expenses',    l: 'Gastos',           i: <Wallet size={17} /> },
      { g: 'Configuración' },
      { id: 'users',       l: 'Usuarios',         i: <UserIcon size={17} /> },
      { id: 'settings',    l: 'Configuración',    i: <Settings size={17} /> },
    ] :
    [
      { g: 'Mi Terminal' },
      { id: 'dashboard',  l: 'Resumen',          i: <LayoutDashboard size={17} /> },
      { id: 'sell',       l: 'Nueva Operación',  i: <ShoppingCart size={17} /> },
      { id: 'stock',      l: 'Ver Stock',        i: <Box size={17} /> },
      { id: 'scan',       l: 'Ingresar Equipo',  i: <ScanLine size={17} /> },
      { id: 'repairs',    l: 'Servicio Técnico', i: <Wrench size={17} /> },
    ];

  return (
    <div className={`sidebar no-print ${isOpen ? 'open' : ''}`}>
      <div className="s-brand" style={{ justifyContent: 'center', padding: '16px' }}>
        <div style={{ width: 120, height: 120, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '0 auto' }}>
          <img src="/logo.png?v=2" alt="Stackr Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.5)' }} />
        </div>
      </div>
      <div className="s-nav">
        {nav.map((it: any, i) => it.g ?
          <div key={i} className="s-group">{it.g}</div> :
          <Link
            key={it.id}
            href={`/${it.id}`}
            prefetch={true}
            className={`s-item ${currentPage === it.id || (currentPage === '' && it.id === 'dashboard') ? 'on' : ''}`}
            onClick={() => setPage(it.id)}
          >
            {it.i}
            {it.l}
          </Link>
        )}
      </div>
      <div className="s-foot">
        <div className="u-row">
          <div className="av" style={{ background: user.color, color: '#000', width: 32, height: 32 }}>
            {user.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="u-name">{user.name}</div>
            <div className="u-role">{user.role}</div>
          </div>
          <button className="btn-ghost" onClick={onLogout} style={{ padding: 4 }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
