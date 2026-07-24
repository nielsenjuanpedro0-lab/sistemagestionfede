"use client";
import { useState, useMemo } from 'react';
import { Search, Printer, X, Receipt as ReceiptIcon } from 'lucide-react';

function ManualReceipt({ sale, shop, displayPrice, displayCurrency, warranty, clientName, payment }: any) {
  const isAccessorySale = sale.brand === 'ACCESORIOS';
  return (
    <div className="receipt-view" style={{ color: '#000' }}>
      <div className="receipt-header" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: -1 }}>{shop?.shop_name?.toUpperCase() || 'MUNDOAPPLE'}</div>
        {shop?.address && <div style={{ fontSize: 10, marginTop: 4 }}>{shop.address}</div>}
        <div style={{ fontSize: 10, display: 'flex', justifyContent: 'center', gap: 10, marginTop: 4 }}>
          {shop?.phone && <span>WA: {shop.phone}</span>}
          {shop?.instagram && <span>IG: {shop.instagram}</span>}
        </div>
      </div>
      <div className="receipt-row"><span>Fecha:</span><span>{sale.created_at ? new Date(sale.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
      <div className="receipt-row"><span>Cliente:</span><span>{clientName || sale.customer?.name || '-'}</span></div>
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>PRODUCTO</div>
      {isAccessorySale ? (
        <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
          {(sale.accessories || []).map((a: any, i: number) => (
            <div key={i}><strong>{a.qty}x {a.name}</strong></div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>
          <strong>{sale.brand} {sale.model}</strong><br />
          <span style={{ fontSize: 11 }}>{sale.storage} · {sale.color}</span>
        </div>
      )}
      {!isAccessorySale && (
        <div className="receipt-row"><span>Imei iPhone:</span><span>{sale.imei || '-'}</span></div>
      )}
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div className="receipt-row"><span>Pago:</span><span>{payment || '-'}</span></div>
      <div className="receipt-row"><span>Garantía:</span><span>{warranty || '—'}</span></div>
      <div style={{ marginTop: 20, padding: 12, background: '#f9f9f9', borderRadius: 4 }}>
        <div className="receipt-row" style={{ fontWeight: 'bold', fontSize: 14 }}>
          <span>TOTAL ABONADO:</span>
          <span>{displayCurrency === 'USD' ? 'U$' : 'ARS'} {(parseFloat(displayPrice) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      {shop?.warranty_text && (
        <div style={{ marginTop: 24, fontSize: 9, color: '#444', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.4, borderTop: '1px solid #eee', paddingTop: 12 }}>
          {shop.warranty_text}
        </div>
      )}
    </div>
  );
}

export function RecibosClient({ sales, shop }: { sales: any[]; shop: any }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [displayPrice, setDisplayPrice] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState('ARS');
  const [warranty, setWarranty] = useState('');
  const [clientName, setClientName] = useState('');
  const [payment, setPayment] = useState('');

  const filtered = useMemo(() => {
    if (!q) return sales.slice(0, 50);
    const term = q.toLowerCase();
    return sales.filter(s =>
      `${s.brand} ${s.model} ${s.customer?.name || ''}`.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [sales, q]);

  const openSale = (sale: any) => {
    setSelected(sale);
    setDisplayPrice(String(sale.price || ''));
    setDisplayCurrency(sale.currency || 'ARS');
    setWarranty(sale.notes || '');
    setClientName(sale.customer?.name || '');
    setPayment('');
  };

  return (
    <div className="page">
      <div className="sh">
        <div>
          <h1 className="st">Recibo</h1>
          <p className="helper-text">Generá el recibo para el cliente con los datos que quieras mostrar.</p>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <Search size={16} color="var(--text-3)" />
        <input className="inp" placeholder="Buscar por cliente, marca o modelo..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="tw">
        <table className="table">
          <thead>
            <tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th style={{ width: 40 }}></th></tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} onClick={() => openSale(s)} style={{ cursor: 'pointer' }}>
                <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString('es-AR') : ''}</td>
                <td>{s.customer?.name || '-'}</td>
                <td style={{ fontWeight: 600 }}>
                  {s.brand === 'ACCESORIOS' ? (s.accessories || []).map((a: any) => `${a.qty}x ${a.name}`).join(', ') : `${s.brand} ${s.model}`}
                </td>
                <td><ReceiptIcon size={14} color="var(--text-3)" /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>No hay ventas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="mo" onClick={() => setSelected(null)}>
          <div className="mb" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="mh no-print">
              <div className="mh-title">Generar Recibo</div>
              <button className="btn-icon" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="mbd no-print" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
              <div className="field">
                <label className="lbl">Nombre del cliente</label>
                <input className="inp" value={clientName} onChange={e => setClientName(e.target.value)} />
              </div>
              <div className="row">
                <div className="col field">
                  <label className="lbl">Precio a mostrar</label>
                  <input className="inp" type="number" value={displayPrice} onChange={e => setDisplayPrice(e.target.value)} />
                </div>
                <div className="col field" style={{ maxWidth: 110 }}>
                  <label className="lbl">Moneda</label>
                  <select className="inp" value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)}>
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="lbl">Pago</label>
                <input className="inp" value={payment} onChange={e => setPayment(e.target.value)} placeholder="Ej: Efectivo" />
              </div>
              <div className="field">
                <label className="lbl">Garantía</label>
                <input className="inp" value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="Ej: 60 días" />
              </div>
            </div>

            <div style={{ background: '#fff' }}>
              <ManualReceipt
                sale={selected}
                shop={shop}
                displayPrice={displayPrice}
                displayCurrency={displayCurrency}
                warranty={warranty}
                clientName={clientName}
                payment={payment}
              />
            </div>

            <div className="mh no-print">
              <button className="btn btn-dark" style={{ width: '100%' }} onClick={() => window.print()}>
                <Printer size={14} /> Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
