import { LayoutGrid, Box, ShoppingCart, Wallet, Menu, ScanLine, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface BottomNavProps {
  page: string;
  user: any;
  onMenu: () => void;
  isSuperAdmin?: boolean;
}

export function BottomNav({ page, user, onMenu, isSuperAdmin }: BottomNavProps) {
  const isOwner = user?.role === 'owner';

  const navItems = isSuperAdmin
    ? [
        { id: 'superadmin', l: 'Negocios', i: <ShieldAlert size={20} /> },
        { id: 'menu', l: 'Menú', i: <Menu size={20} />, action: onMenu }
      ]
    : isOwner
    ? [
        { id: 'dashboard', l: 'Resumen', i: <LayoutGrid size={20} /> },
        { id: 'stock',     l: 'Stock',   i: <Box size={20} /> },
        { id: 'sell',      l: 'Ventas',  i: <ShoppingCart size={20} /> },
        { id: 'menu',      l: 'Menú',    i: <Menu size={20} />, action: onMenu }
      ]
    : [
        { id: 'sell', l: 'Vender', i: <ShoppingCart size={20} /> },
        { id: 'scan', l: 'Cargar', i: <ScanLine size={20} /> },
        { id: 'stock', l: 'Stock', i: <Box size={20} /> },
        { id: 'menu', l: 'Menú', i: <Menu size={20} />, action: onMenu }
      ];

  return (
    <div className="bottom-nav no-print">
      {navItems.map((it) => {
        if (it.action) {
          return (
            <button key={it.id} className={`bn-item ${page === it.id ? 'on' : ''}`} onClick={it.action}>
              {it.i}
              <span>{it.l}</span>
            </button>
          );
        }
        return (
          <Link key={it.id} href={`/${it.id}`} className={`bn-item ${page === it.id ? 'on' : ''}`}>
            {it.i}
            <span>{it.l}</span>
          </Link>
        );
      })}
    </div>
  );
}
