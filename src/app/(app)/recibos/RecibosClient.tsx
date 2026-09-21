"use client";
import { useState, useMemo, useRef } from 'react';
import { Search, Printer, X, Receipt as ReceiptIcon, Share2, Loader2, Plus, PackageOpen, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { PAY } from '@/constants/data';

const PAY_METHODS = PAY.filter(p => p.id !== 'tradein');

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const productLabel = (s: any) =>
  s.brand === 'ACCESORIOS'
    ? (s.accessories || []).map((a: any) => `${a.qty}x ${a.name}`).join(', ')
    : [s.brand, s.model].filter(Boolean).join(' ');

function ManualReceipt({ sale, shop, displayPrice, displayCurrency, warranty, clientName, payment }: any) {
  const isAccessorySale = sale.brand === 'ACCESORIOS';
  const details = [sale.storage, sale.color].filter(v => v && v !== '-').join(' · ');
  return (
    <div className="receipt-view" style={{ color: '#000' }}>
      <div className="receipt-header" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: -1 }}>{shop?.shop_name?.toUpperCase() || 'MUNDOAPPLE'}</div>
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 4, marginTop: 4 }}>RECIBO</div>
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
          <strong>{productLabel(sale)}</strong>
          {details && <><br /><span style={{ fontSize: 11 }}>{details}</span></>}
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

const emptyForm = () => ({
  date: todayStr(),
  clientName: '',
  clientPhone: '',
  product: '',
  imei: '',
  payMethod: 'ars_cash',
  warranty: '',
  total: '',
  exchangeRate: '',
  register: true,
});

function NewReceiptForm({ stock, shop, seller, onDone, onCancel }: any) {
  const supabase = createClient();
  const [f, setF] = useState(() => ({ ...emptyForm(), exchangeRate: String(shop?.exchange_rate || 1200) }));
  const [unit, setUnit] = useState<any>(null);
  const [manual, setManual] = useState(false);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (patch: any) => setF(prev => ({ ...prev, ...patch }));
  const method = PAY_METHODS.find(p => p.id === f.payMethod) || PAY_METHODS[0];
  const currency = method.cur;

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? stock.filter((s: any) => `${s.brand} ${s.model} ${s.storage} ${s.color} ${s.imei}`.toLowerCase().includes(term))
      : stock;
    return list.slice(0, 8);
  }, [stock, q]);

  const pickUnit = (s: any) => {
    setUnit(s);
    setQ('');
    const cur = PAY_METHODS.find(p => p.id === f.payMethod)?.cur;
    set({
      imei: s.imei || '',
      total: s.price ? String(s.price) : '',
      // si el equipo está en otra moneda, cambiamos el medio de pago para que coincida
      payMethod: cur === s.currency ? f.payMethod : (s.currency === 'USD' ? 'usd_cash' : 'ars_cash'),
    });
  };

  const needsRate = !!unit && !!unit.cost_price && unit.currency !== currency;

  const costInSaleCurrency = () => {
    if (!unit?.cost_price) return null;
    const rate = parseFloat(f.exchangeRate) || 1;
    if (unit.currency === 'USD' && currency === 'ARS') return unit.cost_price * rate;
    if (unit.currency === 'ARS' && currency === 'USD') return unit.cost_price / rate;
    return unit.cost_price;
  };

  const submit = async () => {
    const total = parseFloat(f.total) || 0;
    if (!f.clientName.trim()) { toast.error('Falta el cliente'); return; }
    if (!unit && !f.product.trim()) { toast.error('Elegí un producto del stock o escribilo'); return; }
    if (!total) { toast.error('Falta el total abonado'); return; }

    // Hora actual si es hoy; mediodía si se eligió otra fecha
    const createdAt = f.date === todayStr() ? new Date() : new Date(`${f.date}T12:00:00`);

    const sale: any = {
      seller_id: seller.id,
      seller_name: seller.name,
      deposit_id: unit ? unit.deposit : null,
      brand: unit ? unit.brand : '',
      model: unit ? unit.model : f.product.trim(),
      storage: unit ? unit.storage : null,
      color: unit ? unit.color : null,
      imei: f.imei.trim() || null,
      cost_price: unit ? costInSaleCurrency() : null,
      price: total,
      currency,
      payments: [{ id: method.id, label: method.label, amount: total, original_amount: total, currency, exchange_rate: null }],
      customer: { name: f.clientName.trim(), phone: f.clientPhone.trim() },
      notes: f.warranty.trim() || null,
      accessories: [],
      created_at: createdAt.toISOString(),
    };

    if (!f.register) {
      onDone(sale, { warranty: f.warranty, payment: method.label, registered: false });
      return;
    }

    try {
      setSaving(true);
      const { data: rows, error } = await supabase.from('sales').insert([sale]).select();
      if (error) throw error;

      if (unit) {
        const { error: uErr } = await supabase.from('stock').update({ status: 'sold' }).eq('id', unit.id);
        if (uErr) throw uErr;
      }

      const name = f.clientName.trim();
      const { data: existing } = await supabase.from('customers').select('id').eq('name', name).maybeSingle();
      const now = new Date().toISOString();
      if (existing) {
        if (f.clientPhone.trim()) await supabase.from('customers').update({ phone: f.clientPhone.trim(), updated_at: now }).eq('id', existing.id);
      } else {
        await supabase.from('customers').insert([{ name, phone: f.clientPhone.trim() || null, updated_at: now }]);
      }

      toast.success('Venta registrada');
      onDone(rows[0], { warranty: f.warranty, payment: method.label, registered: true });
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar la venta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="mh-title">Nuevo recibo</div>
        <button className="btn-icon" onClick={onCancel} aria-label="Cerrar"><X size={18} /></button>
      </div>

      <div className="field">
        <label className="lbl">Fecha</label>
        <input className="inp" type="date" value={f.date} onChange={e => set({ date: e.target.value })} />
      </div>

      <div className="row">
        <div className="col field">
          <label className="lbl">Cliente</label>
          <input className="inp" value={f.clientName} onChange={e => set({ clientName: e.target.value })} placeholder="Nombre y apellido" />
        </div>
        <div className="col field">
          <label className="lbl">Teléfono (opcional)</label>
          <input className="inp" type="tel" value={f.clientPhone} onChange={e => set({ clientPhone: e.target.value })} />
        </div>
      </div>

      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label className="lbl" style={{ marginBottom: 0 }}>Producto</label>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setManual(!manual); setUnit(null); set({ product: '', imei: '' }); }}
          >
            {manual ? <><PackageOpen size={13} /> Elegir del stock</> : <><PenLine size={13} /> Escribir a mano</>}
          </button>
        </div>

        {manual ? (
          <input className="inp" value={f.product} onChange={e => set({ product: e.target.value })} placeholder="Ej: iPhone 13 128GB Midnight" />
        ) : unit ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', border: '1px solid var(--border-md)', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{unit.brand} {unit.model}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{[unit.storage, unit.color].filter(Boolean).join(' · ')}</div>
            </div>
            <button className="btn-icon" onClick={() => { setUnit(null); set({ imei: '' }); }} aria-label="Quitar producto"><X size={16} /></button>
          </div>
        ) : (
          <>
            <div className="search-bar" style={{ marginBottom: 8 }}>
              <Search size={16} color="var(--text-3)" />
              <input className="inp" placeholder="Buscar en stock por modelo, color o IMEI..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', maxHeight: 240, overflowY: 'auto' }}>
              {matches.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => pickUnit(s)}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <span>
                    <span style={{ fontWeight: 600 }}>{s.brand} {s.model}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}> · {[s.storage, s.color].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {s.currency === 'USD' ? 'U$' : '$'} {Number(s.price || 0).toLocaleString('es-AR')}
                  </span>
                </button>
              ))}
              {matches.length === 0 && (
                <div style={{ padding: 14, fontSize: 13, color: 'var(--text-3)' }}>No hay equipos disponibles con esa búsqueda.</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="field">
        <label className="lbl">Imei iPhone</label>
        <input className="inp" value={f.imei} onChange={e => set({ imei: e.target.value })} readOnly={!!unit} inputMode="numeric" />
      </div>

      <div className="row">
        <div className="col field">
          <label className="lbl">Pago</label>
          <select className="inp" value={f.payMethod} onChange={e => set({ payMethod: e.target.value })}>
            {PAY_METHODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="col field">
          <label className="lbl">Garantía</label>
          <input className="inp" value={f.warranty} onChange={e => set({ warranty: e.target.value })} placeholder="Ej: 60 días" />
        </div>
      </div>

      <div className="row">
        <div className="col field">
          <label className="lbl">Total abonado ({currency === 'USD' ? 'U$' : 'ARS'})</label>
          <input className="inp" type="number" inputMode="decimal" value={f.total} onChange={e => set({ total: e.target.value })} />
        </div>
        {needsRate && f.register && (
          <div className="col field">
            <label className="lbl">Cotización dólar (para el costo)</label>
            <input className="inp" type="number" inputMode="decimal" value={f.exchangeRate} onChange={e => set({ exchangeRate: e.target.value })} />
          </div>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-2)', marginBottom: 18, cursor: 'pointer' }}>
        <input type="checkbox" checked={f.register} onChange={e => set({ register: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--text)' }} />
        Registrar como venta{unit ? ' (el equipo sale del stock)' : ''}
      </label>

      <button className="btn btn-dark" style={{ width: '100%' }} onClick={submit} disabled={saving}>
        {saving ? <Loader2 size={14} className="spin" /> : <ReceiptIcon size={14} />} Generar recibo
      </button>
    </div>
  );
}

export function RecibosClient({ sales, shop, stock, seller }: { sales: any[]; shop: any; stock: any[]; seller: { id: string; name: string } }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [displayPrice, setDisplayPrice] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState('ARS');
  const [warranty, setWarranty] = useState('');
  const [clientName, setClientName] = useState('');
  const [payment, setPayment] = useState('');
  const [generating, setGenerating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const generatePdfBlob = async (): Promise<Blob> => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    const node = receiptRef.current!;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    return pdf.output('blob');
  };

  const sharePdf = async () => {
    setGenerating(true);
    try {
      const blob = await generatePdfBlob();
      const fileName = `Recibo-${(clientName || 'cliente').trim().replace(/\s+/g, '_')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (typeof navigator !== 'undefined' && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Recibo' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('PDF descargado');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  const filtered = useMemo(() => {
    if (!q) return sales.slice(0, 50);
    const term = q.toLowerCase();
    return sales.filter(s =>
      `${s.brand} ${s.model} ${s.customer?.name || ''}`.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [sales, q]);

  const openSale = (sale: any, overrides: { warranty?: string; payment?: string } = {}) => {
    setSelected(sale);
    setDisplayPrice(String(sale.price || ''));
    setDisplayCurrency(sale.currency || 'ARS');
    setWarranty(overrides.warranty ?? sale.notes ?? '');
    setClientName(sale.customer?.name || '');
    setPayment(overrides.payment ?? (sale.payments || []).map((p: any) => p.label).filter(Boolean).join(' + '));
  };

  const onCreated = (sale: any, extra: { warranty: string; payment: string; registered: boolean }) => {
    setCreating(false);
    openSale(sale, extra);
    if (extra.registered) router.refresh();
  };

  return (
    <div className="page">
      <div className="sh">
        <div>
          <h1 className="st">Recibo</h1>
          <p className="helper-text">Cargá la venta y generá el recibo, o reimprimí el de una venta anterior.</p>
        </div>
        {!creating && (
          <button className="btn btn-dark btn-sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> Nuevo recibo
          </button>
        )}
      </div>

      {creating && (
        <NewReceiptForm stock={stock} shop={shop} seller={seller} onDone={onCreated} onCancel={() => setCreating(false)} />
      )}

      <div className="s-group" style={{ padding: '0 0 8px' }}>Ventas anteriores</div>

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
                <td style={{ fontWeight: 600 }}>{productLabel(s)}</td>
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
              <div className="mh-title">Recibo</div>
              <button className="btn-icon" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ padding: 0 }}>
              <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="lbl">Nombre del cliente</label>
                  <input className="inp" value={clientName} onChange={e => setClientName(e.target.value)} />
                </div>
                <div className="row">
                  <div className="col field" style={{ marginBottom: 0 }}>
                    <label className="lbl">Precio a mostrar</label>
                    <input className="inp" type="number" value={displayPrice} onChange={e => setDisplayPrice(e.target.value)} />
                  </div>
                  <div className="col field" style={{ maxWidth: 110, marginBottom: 0 }}>
                    <label className="lbl">Moneda</label>
                    <select className="inp" value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)}>
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="row">
                  <div className="col field" style={{ marginBottom: 0 }}>
                    <label className="lbl">Pago</label>
                    <input className="inp" value={payment} onChange={e => setPayment(e.target.value)} placeholder="Ej: Efectivo" />
                  </div>
                  <div className="col field" style={{ marginBottom: 0 }}>
                    <label className="lbl">Garantía</label>
                    <input className="inp" value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="Ej: 60 días" />
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff' }} ref={receiptRef}>
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
            </div>

            <div className="mh no-print" style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.print()}>
                <Printer size={14} /> Imprimir
              </button>
              <button className="btn btn-dark" style={{ flex: 1 }} onClick={sharePdf} disabled={generating}>
                {generating ? <Loader2 size={14} className="spin" /> : <Share2 size={14} />} Compartir PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
