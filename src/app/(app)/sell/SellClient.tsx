"use client"
import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Plus, Printer, Search, AlertTriangle, FileText, X, MapPin, PackageOpen, CreditCard, ChevronRight, Receipt as ReceiptIcon, User as UserIcon, Loader2 } from 'lucide-react';
import { PAY, BRANDS, MODELS, STORAGES, COLORS } from '@/constants/data';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Receipt } from '@/components/Receipt';

export function SellClient({ isOwner, assignedDeposits = [], sellerName }: { isOwner?: boolean, assignedDeposits?: any[], sellerName?: string | null }) {
  const [stock, setStock] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState<any>(null);
  const [accessoryOnly, setAccessoryOnly] = useState(false);
  const [accessoriesList, setAccessoriesList] = useState<any[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<any[]>([]);
  const [cust, setCust] = useState({ name: '', dni: '', phone: '', email: '', instagram: '' });
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [sc, setSc] = useState('USD');
  const [sp, setSp] = useState('');
  const [q, setQ] = useState('');
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null);
  const [sm, setSm] = useState<string | null>(null);
  const [ma, setMa] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1000');
  const [showTI, setShowTI] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [custSearch, setCustSearch] = useState('');
  const [custSuggestions, setCustSuggestions] = useState<any[]>([]);
  const [searchingCust, setSearchingCust] = useState(false);
  const custTimer = useRef<any>(null);
  const [accSearch, setAccSearch] = useState('');
  const [accSearchOpen, setAccSearchOpen] = useState(false);
  const [selectedAccId, setSelectedAccId] = useState('');
  const [accQty, setAccQty] = useState(1);
  const [accType, setAccType] = useState<'venta' | 'regalo'>('venta');
  const accSearchRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    // Fetch user session + all data in parallel — all client-side, no server wait
    Promise.all([
      supabase.auth.getSession(),
      supabase.from('stock').select('*').eq('status', 'available').order('created_at', { ascending: false }),
      supabase.from('deposits').select('*').order('name'),
      supabase.from('settings').select('*').maybeSingle(),
      supabase.from('accessories').select('*').gt('stock', 0)
    ]).then(([{ data: { session } }, { data: stockData }, { data: depositsData }, { data: settingsData }, { data: accData }]: any) => {
      const u = session?.user
      if (u) {
        const isSuperAdmin = u.email === 'asciacontacto@gmail.com'
        setUser({ id: u.id, email: u.email, name: isSuperAdmin ? 'Administrador' : (sellerName || u.email) })
      }
      
      let finalDeposits = depositsData || [];
      if (!isOwner) {
        finalDeposits = finalDeposits.filter((d: any) => assignedDeposits.map(String).includes(String(d.id)));
      }
      
      setStock(stockData || []);
      setDeposits(finalDeposits);
      if (finalDeposits.length > 0) setSelectedDeposit(String(finalDeposits[0].id));
      setSettings(settingsData);
      setAccessoriesList(accData || []);

      const preselectId = searchParams.get('item');
      if (preselectId && stockData) {
        const item = stockData.find((s: any) => String(s.id) === preselectId);
        if (item) {
          setUnit(item);
          setSp(item.price);
          setSc(item.currency);
          setStep(2);
        }
      }
    });


  }, [searchParams]);

  const shop = settings || { shop_name: 'Stackr', address: '', phone: '', instagram: '', warranty_text: '' };

  const av = stock.filter((s: any) => s.status === 'available')
    .filter((s: any) => {
      if (!isOwner && selectedDeposit === null) return false;
      return selectedDeposit === null || String(s.deposit) === selectedDeposit;
    })
    .filter((s: any) => !q || `${s.brand} ${s.model} ${s.color} ${s.storage}`.toLowerCase().includes(q.toLowerCase()));
  const price = parseFloat(sp) || 0;
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  const rem = price - paid;

  const addP = () => {
    if (!sm || !ma) return;
    const amt = parseFloat(ma);
    if (amt <= 0) return;
    const m = PAY.find(p => p.id === sm);
    
    let amountInSaleCur = amt;
    const rate = parseFloat(exchangeRate) || 1;
    if (m?.cur === 'ARS' && sc === 'USD') {
      amountInSaleCur = amt / rate;
    } else if (m?.cur === 'USD' && sc === 'ARS') {
      amountInSaleCur = amt * rate;
    }
    
    setPayments(p => [...p, { 
      id: sm, 
      label: m?.label, 
      amount: amountInSaleCur, 
      original_amount: amt,
      currency: m?.cur,
      exchange_rate: (m?.cur !== sc && m?.cur !== 'ANY') ? rate : null
    }]);
    setMa('');
    setSm(null);
  };

  const handleTI = (data: any) => {
    const amt = parseFloat(data.value);
    setPayments(p => [...p, { 
      id: 'tradein', 
      label: `TI: ${data.brand} ${data.model}`, 
      amount: amt, 
      original_amount: amt,
      currency: data.valueCurrency || sc,
      exchange_rate: null,
      device: data 
    }]);
    setShowTI(false);
  };

  const searchCustomer = (val: string) => {
    setCustSearch(val);
    clearTimeout(custTimer.current);
    custTimer.current = setTimeout(async () => {
      setSearchingCust(true);
      
      let query = supabase.from('customers').select('*').order('updated_at', { ascending: false }).limit(5);
      
      if (val.trim().length > 0) {
        query = query.or(`name.ilike.%${val}%,dni.ilike.%${val}%,instagram.ilike.%${val}%`);
      }
      
      const { data } = await query;
      
      if (data) {
        setCustSuggestions(data);
      }
      setSearchingCust(false);
    }, 350);
  };

  const applyCustSuggestion = (c: any) => {
    setCust({ name: c.name || '', dni: c.dni || '', phone: c.phone || '', email: c.email || '', instagram: c.instagram || '' });
    setCustSearch('');
    setCustSuggestions([]);
  };

  const confirmAccessoryOnly = async () => {
    if (selectedAccessories.length === 0) { toast.error('Agregá al menos un accesorio'); return; }
    if (!price || !payments.length) { toast.error('Datos incompletos'); return; }
    try {
      setLoading(true);
      const totalCost = selectedAccessories.reduce((acc, a) => acc + (a.cost_price || 0) * a.qty, 0);
      const resumen = selectedAccessories.map(a => `${a.qty}x ${a.name}`).join(' · ');
      const saleData = {
        seller_id: user.id,
        seller_name: user.name,
        deposit_id: selectedDeposit ? parseInt(String(selectedDeposit)) : null,
        brand: 'ACCESORIOS',
        model: resumen.slice(0, 120),
        storage: '-', color: '-',
        imei: `ACC-${Date.now()}`,
        cost_price: totalCost,
        price: Math.max(price, paid),
        currency: 'ARS',
        payments,
        customer: cust.name ? cust : { name: 'Consumidor Final' },
        notes: notes.trim() || null,
        accessories: selectedAccessories,
      };
      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([saleData]).select();
      if (sErr) throw sErr;

      for (const acc of selectedAccessories) {
        const { error: accErr } = await supabase.rpc('decrement_accessory_stock', { acc_id: acc.id, qty: acc.qty });
        if (accErr) throw accErr;
      }

      setLastSale(saleRow[0]);
      toast.success('Venta de accesorios confirmada');
      setStep(1); setUnit(null); setAccessoryOnly(false); setPayments([]); setSp(''); setQ(''); setNotes(''); setSelectedAccessories([]);
      setCust({ name: '', dni: '', phone: '', email: '', instagram: '' });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (accessoryOnly) { await confirmAccessoryOnly(); return; }
    if (!unit || !price || !payments.length || !cust.name) { toast.error('Datos incompletos'); return; }
    
    try {
      setLoading(true);
      const saleData = {
        seller_id: user.id,
        seller_name: user.name,
        deposit_id: unit.deposit,
        brand: unit.brand,
        model: unit.model,
        storage: unit.storage,
        color: unit.color,
        imei: unit.imei,
        cost_price: (() => {
          if (!unit.cost_price) return null;
          const rate = parseFloat(exchangeRate) || 1;
          if (unit.currency === 'USD' && sc === 'ARS') return unit.cost_price * rate;
          if (unit.currency === 'ARS' && sc === 'USD') return unit.cost_price / rate;
          return unit.cost_price;
        })(),
        price: Math.max(price, paid),
        currency: sc,
        payments,
        customer: cust,
        notes: notes.trim() || null,
        accessories: selectedAccessories
      };

      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([saleData]).select();
      if (sErr) throw sErr;

      const { error: uErr } = await supabase.from('stock').update({ status: 'sold' }).eq('id', unit.id);
      if (uErr) throw uErr;

      if (selectedAccessories.length > 0) {
        for (const acc of selectedAccessories) {
          const { error: accErr } = await supabase.rpc('decrement_accessory_stock', { acc_id: acc.id, qty: acc.qty });
          if (accErr) throw accErr;
        }
      }

      const tiItems = payments.filter(pay => pay.id === 'tradein').map(pay => ({
        brand: pay.device.brand,
        model: pay.device.notes ? `${pay.device.model} (${pay.device.notes})` : pay.device.model,
        storage: pay.device.storage,
        color: pay.device.color,
        imei: pay.device.imei || `TI-${Date.now()}`,
        condition: 'used',
        battery: pay.device.battery || null,
        deposit: unit.deposit,
        status: 'available',
        price: parseFloat(pay.device.salePrice) || pay.amount,
        cost_price: pay.amount,
        currency: pay.device.valueCurrency || sc
      }));

      if (tiItems.length > 0) {
        const { data: insertedTI, error: tErr } = await supabase.from('stock').insert(tiItems).select();
        if (tErr) throw tErr;
        if (insertedTI) setStock((p: any[]) => [...insertedTI, ...p]);
      }

      setStock((p: any[]) => p.map((s: any) => s.id === unit.id ? { ...s, status: 'sold' } : s));

      if (cust.name) {
        const custData: any = {
          name: cust.name,
          phone: cust.phone || null,
          email: cust.email || null,
          instagram: cust.instagram || null,
          updated_at: new Date().toISOString()
        };
        if (cust.dni) custData.dni = cust.dni;
        if (cust.dni) {
          await supabase.from('customers').upsert([custData], { onConflict: 'dni' });
        } else {
          const { data: existing } = await supabase.from('customers').select('id').eq('name', cust.name).maybeSingle();
          if (existing) {
            await supabase.from('customers').update({ phone: custData.phone, email: custData.email, instagram: custData.instagram, updated_at: custData.updated_at }).eq('id', existing.id);
          } else {
            await supabase.from('customers').insert([custData]);
          }
        }
      }
      
      setLastSale(saleRow[0]);
      toast.success('Venta confirmada');
      setStep(1); setUnit(null); setAccessoryOnly(false); setPayments([]); setSp(''); setQ(''); setNotes(''); setSelectedAccessories([]);
      setCust({ name: '', dni: '', phone: '', email: '', instagram: '' });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || JSON.stringify(e) || 'Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 20 }}>
        <h1 className="st">Nueva Venta</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{
              width: n === step ? 20 : 8, height: 6,
              borderRadius: 4,
              background: n === step ? 'var(--text)' : 'var(--border-md)',
              transition: 'all 0.2s'
            }} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="card">
          <div className="lbl">1. Seleccionar Equipo en Stock</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, whiteSpace: 'nowrap' }}>
            {deposits.map(d => (
              <button 
                key={d.id}
                className={`btn ${selectedDeposit === d.id ? 'btn-dark' : 'btn-outline'} btn-sm`}
                onClick={() => setSelectedDeposit(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>
          <input className="inp" placeholder="Filtrar por modelo, IMEI / N° Serie, color..." value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 16 }} />
          <button
            className="btn btn-outline"
            style={{ width: '100%', marginBottom: 16, justifyContent: 'center' }}
            onClick={() => {
              if (!selectedDeposit) { toast.error('Elegí un depósito primero'); return; }
              setAccessoryOnly(true);
              setUnit(null);
              setSc('ARS');
              setSp('');
              setStep(2);
            }}
          >
            <PackageOpen size={16} /> Vender accesorios sueltos
          </button>
          {av.length > 0 && av.length <= 5 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' }}>
              <AlertTriangle size={16} color="var(--amber)" />
              <span style={{ fontSize: 13, color: 'var(--amber)' }}>Stock bajo: solo quedan <strong>{av.length}</strong> equipos disponibles con este filtro.</span>
            </div>
          )}
          <div className="tw">
            <table className="table">
              <thead><tr><th>Equipo</th><th>Precio</th><th>Ubicación</th><th style={{ width: 30 }}></th></tr></thead>
              <tbody>
                {av.slice(0, 15).map((s: any) => (
                  <tr 
                    key={s.id} 
                    onClick={() => { setUnit(s); setSp(s.price); setSc(s.currency); setStep(2); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.brand} {s.model}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{s.storage} · {s.color}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{s.imei || 'Sin IMEI/Serie'}</div>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{s.currency === 'USD' ? 'U$' : '$'} {s.price?.toLocaleString()}</td>
                    <td><span className="badge b-neu">{deposits.find(d => d.id === s.deposit)?.name ?? '—'}</span></td>
                    <td style={{ textAlign: 'right', color: 'var(--text-3)' }}><ArrowRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">3. Datos del Cliente</div>
          <div className="field" style={{ position: 'relative' }}>
            <label className="lbl">Buscar cliente anterior (DNI o nombre)</label>
            <div className="search-inp-wrapper" style={{ position: 'relative' }}>
              <Search size={16} className="search-icon" style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-3)' }} />
              <input 
                className="inp" 
                style={{ paddingLeft: 32 }}
                placeholder="Buscar cliente guardado (Nombre, DNI o Instagram)..." 
                value={custSearch}
                onChange={e => searchCustomer(e.target.value)}
                onFocus={e => searchCustomer(e.target.value)}
                autoComplete="off"
              />
              {searchingCust && <div style={{ position: 'absolute', right: 12, top: 10 }}><Loader2 className="spin" size={16} /></div>}
            </div>
            
            {custSuggestions.length > 0 && (
              <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, overflow: 'hidden', position: 'absolute', zIndex: 50, width: '100%' }}>
                {custSuggestions.map((c, i) => (
                  <div 
                    key={i} 
                    style={{ padding: '10px 14px', borderBottom: i === custSuggestions.length - 1 ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                    className="hover-bg"
                    onMouseDown={(e) => { e.preventDefault(); applyCustSuggestion(c); }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.dni ? `DNI: ${c.dni} ` : ''}{c.phone ? `· Tel: ${c.phone} ` : ''}{c.instagram ? `· @${c.instagram.replace('@','')}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="field"><label className="lbl">Nombre y Apellido *</label><input className="inp" value={cust.name} onChange={e => setCust(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Perez" /></div>
          <div className="row">
            <div className="col field"><label className="lbl">DNI / CUIT</label><input className="inp" value={cust.dni} onChange={e => setCust(p => ({ ...p, dni: e.target.value }))} /></div>
            <div className="col field"><label className="lbl">Teléfono</label><input className="inp" value={cust.phone} onChange={e => setCust(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div className="divider" />
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>Volver</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} disabled={!accessoryOnly && !cust.name} onClick={() => setStep(4)}>Continuar al Pago</button>
          </div>
        </div>
      )}

      
      {step === 2 && (
        <div className="card">
          <div className="lbl">2. Accesorios Adicionales (Opcional)</div>
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Agregá fundas, vidrios, cargadores a esta venta. Podés marcarlos como de regalo (costo 0) o cobrarlos.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div ref={accSearchRef} style={{ flex: 1, position: 'relative' }}>
                  <input
                    className="inp"
                    placeholder="Buscar accesorio..."
                    value={accSearch}
                    onChange={e => { setAccSearch(e.target.value); setSelectedAccId(''); setAccSearchOpen(true); }}
                    onFocus={() => setAccSearchOpen(true)}
                    onBlur={() => setTimeout(() => setAccSearchOpen(false), 150)}
                    style={{ width: '100%' }}
                  />
                  {accSearchOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--r)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      maxHeight: 260, overflowY: 'auto', marginTop: 4
                    }}>
                      {accessoriesList
                        .filter(a => {
                          const baseFilter = accessoryOnly
                            ? (a.currency || 'ARS') === 'ARS'
                            : String(a.deposit_id) === String(unit?.deposit);
                          if (!accSearch.trim()) return baseFilter;
                          const q = accSearch.toLowerCase();
                          return baseFilter && `${a.category} ${a.compatible_model || ''} ${a.color || ''}`.toLowerCase().includes(q);
                        })
                        .map(a => {
                          const label = `${a.category}${a.compatible_model ? ' ' + a.compatible_model : ''}${a.color ? ' ' + a.color : ''}`;
                          return (
                            <div
                              key={a.id}
                              onMouseDown={() => {
                                setSelectedAccId(a.id);
                                setAccSearch(label);
                                setAccSearchOpen(false);
                              }}
                              style={{
                                padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                                borderBottom: '1px solid var(--border)',
                                background: selectedAccId === a.id ? 'var(--surface-2)' : undefined,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = selectedAccId === a.id ? 'var(--surface-2)' : '')}
                            >
                              <span style={{ fontWeight: 500 }}>{label}</span>
                              <span style={{ color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap', marginLeft: 12 }}>
                                Stock: {a.stock} · {a.currency === 'ARS' ? '$' : 'U$'} {a.sale_price}
                              </span>
                            </div>
                          );
                        })}
                      {accessoriesList.filter(a => {
                        const base = accessoryOnly ? (a.currency || 'ARS') === 'ARS' : String(a.deposit_id) === String(unit?.deposit);
                        if (!accSearch.trim()) return base;
                        return base && `${a.category} ${a.compatible_model || ''} ${a.color || ''}`.toLowerCase().includes(accSearch.toLowerCase());
                      }).length === 0 && (
                        <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-3)' }}>Sin resultados</div>
                      )}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  className="inp"
                  value={accQty}
                  min={1}
                  onChange={e => setAccQty(parseInt(e.target.value) || 1)}
                  style={{ width: 70 }}
                />
                <select className="inp" value={accType} onChange={e => setAccType(e.target.value as 'venta' | 'regalo')} style={{ width: 130 }}>
                  <option value="venta">Vender</option>
                  <option value="regalo">De Regalo</option>
                </select>
                <button className="btn btn-dark" onClick={() => {
                  if (!selectedAccId) return;
                  const acc = accessoriesList.find(a => a.id === selectedAccId);
                  if (!acc) return;
                  if (accQty > acc.stock) return toast.error('No hay stock suficiente');
                  setSelectedAccessories(p => {
                    const existing = p.find(x => x.id === selectedAccId && x.is_gift === (accType === 'regalo'));
                    if (existing) return p.map(x => x === existing ? { ...x, qty: x.qty + accQty } : x);
                    return [...p, { id: selectedAccId, name: `${acc.category} ${acc.compatible_model || ''} ${acc.color || ''}`.trim(), qty: accQty, price: accType === 'regalo' ? 0 : acc.sale_price, is_gift: accType === 'regalo', cost_price: acc.cost_price, currency: acc.currency || 'USD' }];
                  });
                  setAccSearch(''); setSelectedAccId(''); setAccQty(1);
                }}><Plus size={16}/> Sumar</button>
              </div>
            </div>

            {selectedAccessories.length > 0 && (
              <div style={{ borderTop: '1px dashed var(--border-md)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase' }}>Accesorios agregados</div>
                {selectedAccessories.map((sa, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, background: 'var(--surface)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                     <div>
                       <span style={{ fontWeight: 600 }}>{sa.qty}x</span> {sa.name} 
                       {sa.is_gift ? <span className="badge b-green" style={{ marginLeft: 8 }}>Regalo</span> : <span className="badge b-neu" style={{ marginLeft: 8 }}>Venta ({sa.currency === 'ARS' ? '$' : 'U$'} {sa.price})</span>}
                     </div>
                     <button className="btn-icon" onClick={() => setSelectedAccessories(p => p.filter((_, j) => j !== i))}><X size={14} color="var(--red)"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Atrás</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={() => {
               if (accessoryOnly) {
                 if (selectedAccessories.length === 0) { toast.error('Agregá al menos un accesorio'); return; }
                 const total = selectedAccessories.reduce((acc, c) => acc + (c.is_gift ? 0 : c.price * c.qty), 0);
                 setSp(String(total));
                 setSc('ARS');
               }
               setStep(3);
            }}>Continuar al Cliente</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="lbl">4. Pago y Cierre</div>
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            {accessoryOnly ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Venta de accesorios</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {selectedAccessories.map(a => `${a.qty}x ${a.name}`).join(' · ')}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{unit.brand} {unit.model}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{unit.storage} · {unit.color}</div>
                {isOwner && unit.cost_price && (
                  <div style={{ fontSize: 11, marginTop: 6, color: 'var(--text-3)' }}>
                    Precio de costo: <span style={{ fontFamily: 'JetBrains Mono' }}>{unit.currency === 'USD' ? 'U$' : '$'} {unit.cost_price?.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="row">
            <div className="col field"><label className="lbl">Precio de Venta</label><input className="inp" type="number" value={sp} onChange={e => setSp(e.target.value)} /></div>
            {!accessoryOnly && (
              <div className="col field"><label className="lbl">Moneda Venta</label><select className="inp" value={sc} onChange={e => { setSc(e.target.value); setPayments([]); }}>
                <option value="USD">Dólar (USD)</option>
                <option value="ARS">Pesos (ARS)</option>
              </select></div>
            )}
          </div>
          <div className="lbl">Método de Cobro</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {PAY.map(m => {
              const disabled = false; // Allow mixing currencies (ARS and USD)
              return <button key={m.id} disabled={disabled} className={`btn ${sm === m.id ? 'btn-dark' : 'btn-outline'} btn-sm`} onClick={() => { if (m.id === 'tradein') { setShowTI(true); setSm(null); } else { setSm(m.id); } }}>{m.label}</button>;
            })}
          </div>
          {sm && (
            <div className="card" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', padding: 16, marginBottom: 16 }}>
              {(() => {
                const selectedPay = PAY.find(p => p.id === sm);
                const needsExchange = selectedPay && selectedPay.cur !== 'ANY' && selectedPay.cur !== sc;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {needsExchange && (
                      <div className="field" style={{ margin: 0 }}>
                        <label className="lbl">Cotización Dólar</label>
                        <input className="inp" type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
                      </div>
                    )}
                    <div className="row">
                      <div className="col field" style={{ margin: 0 }}>
                        <label className="lbl">Monto a cobrar en {selectedPay?.cur}</label>
                        <input className="inp" type="number" value={ma} onChange={e => setMa(e.target.value)} placeholder="0.00" autoFocus onKeyDown={e => e.key === 'Enter' && addP()} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button className="btn btn-dark" style={{ height: 42 }} onClick={addP}><Plus size={16} /> Agregar</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {payments.length > 0 && (
            <div className="card" style={{ background: 'var(--surface-2)', padding: 16, marginBottom: 16 }}>
              {payments.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    {p.exchange_rate && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.currency === 'USD' ? 'U$' : '$'} {p.original_amount.toLocaleString()} (Cot. {p.exchange_rate})</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono' }}>{sc === 'USD' ? 'U$' : '$'} {p.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <button className="btn-ghost" onClick={() => setPayments(ps => ps.filter((_, j) => j !== i))} style={{ padding: 0, color: 'var(--red)' }}>×</button>
                  </div>
                </div>
              ))}
              <div className="divider" style={{ margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span style={{ flex: 1 }}>Saldo</span>
                <span style={{ color: rem <= 0.01 ? 'var(--green)' : 'var(--amber)' }}>{rem <= 0.01 ? 'Cubierto' : `${sc === 'USD' ? 'U$' : '$'} ${rem.toLocaleString(undefined, { maximumFractionDigits: 2 })} pendiente`}</span>
              </div>
            </div>
          )}
          <div className="field" style={{ marginTop: 16 }}>
            <label className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} /> Garantía
            </label>
            <input className="inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: 60 días" />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>Atrás</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} disabled={!price || !payments.length || loading} onClick={confirm}>
              {loading ? 'Procesando...' : 'Finalizar Operación'}
            </button>
          </div>
        </div>
      )}

      {showTI && (
        <div className="mo" style={{ zIndex: 1000 }}>
          <div className="mb">
            <div className="mh"><div className="mh-title">Tomar equipo usado</div><button className="btn-icon" onClick={() => setShowTI(false)}><X size={18}/></button></div>
            <div className="mbd">
              <TradeInForm currency={sc} onConfirm={handleTI} />
            </div>
          </div>
        </div>
      )}

      {lastSale && (
        <div className="mo" style={{ zIndex: 1000 }}>
          <div className="mb" style={{ maxWidth: 450 }}>
            <div className="mh"><div className="mh-title">Comprobante</div><button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}><Printer size={14} /> Imprimir</button></div>
            <div className="mbd" style={{ background: '#fff' }}>
              <Receipt sale={lastSale} shop={shop} />
            </div>
            <div className="mh no-print"><button className="btn btn-dark" style={{ width: '100%' }} onClick={() => setLastSale(null)}>Listo / Nueva Venta</button></div>
          </div>
        </div>
      )}
      <div style={{ height: 80 }} />
    </div>
  );
}

function TradeInForm({ currency, onConfirm }: any) {
  const [appleCategory, setAppleCategory] = useState('iPhone');
  const [f, setF] = useState({
    brand: 'Apple', model: 'iPhone 12', storage: '128GB', color: 'Negro',
    imei: '', condition: 'used', battery: '', notes: '', salePrice: '', value: '', valueCurrency: currency
  });

  return (
    <>
      <div className="row">
        <div className="col field">
          <label className="lbl">Marca</label>
          <select className="inp" value={f.brand} onChange={e => {
            const b = e.target.value;
            let m = MODELS[b]?.[0] || '';
            if (b === 'Apple') m = MODELS['Apple']?.find(x => x.startsWith(appleCategory)) || MODELS['Apple']?.[0] || '';
            setF(p => ({ ...p, brand: b, model: m }));
          }}>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {f.brand === 'Apple' && (
          <div className="col field">
            <label className="lbl">Línea</label>
            <select className="inp" value={appleCategory} onChange={e => {
              const cat = e.target.value;
              setAppleCategory(cat);
              const m = MODELS['Apple']?.find(x => x.startsWith(cat)) || '';
              setF(p => ({ ...p, model: m }));
            }}>
              <option value="iPhone">iPhone</option>
              <option value="MacBook">MacBook</option>
              <option value="AirPods">AirPods</option>
            </select>
          </div>
        )}
        <div className="col field">
          <label className="lbl">Modelo</label>
          <select className="inp" value={f.model} onChange={e => setF(p => ({ ...p, model: e.target.value }))}>
            {(f.brand === 'Apple' ? (MODELS['Apple'] || []).filter(m => m.startsWith(appleCategory)) : (MODELS[f.brand] || [])).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="row"><div className="col field"><label className="lbl">GB</label><select className="inp" value={f.storage} onChange={e => setF(p => ({ ...p, storage: e.target.value }))}>{STORAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="col field">
          <label className="lbl">Color</label>
          <input className="inp" list="tradein-colors" placeholder="Ej: Azul" value={f.color} onChange={e => setF(p => ({ ...p, color: e.target.value }))} />
          <datalist id="tradein-colors">
            {(COLORS[f.brand] || ['Negro']).map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>
      <div className="row">
        <div className="col field"><label className="lbl">IMEI / N° Serie</label><input className="inp" value={f.imei} onChange={e => setF(p => ({ ...p, imei: e.target.value }))} placeholder="15 dígitos o alfanumérico..." /></div>
        <div className="col field"><label className="lbl">% Batería</label><input className="inp" type="number" placeholder="Ej: 85" value={f.battery} onChange={e => setF(p => ({ ...p, battery: e.target.value }))} /></div>
      </div>
      <div className="field"><label className="lbl">Detalles / Observaciones</label><input className="inp" value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} placeholder="Ej: Pantalla con rayas..." /></div>
      <div className="row">
        <div className="col field"><label className="lbl">Precio Venta Sugerido</label><input className="inp" type="number" value={f.salePrice} onChange={e => setF(p => ({ ...p, salePrice: e.target.value }))} placeholder="0" /></div>
        <div className="col field"><label className="lbl">Costo (Valor toma)</label><input className="inp" type="number" value={f.value} onChange={e => setF(p => ({ ...p, value: e.target.value }))} placeholder="0" /></div>
        <div className="col field"><label className="lbl">Moneda</label><input className="inp" value={f.valueCurrency} disabled /></div>
      </div>
      <button className="btn btn-dark btn-lg" style={{ width: '100%' }} onClick={() => onConfirm(f)}>Agregar a la venta</button>
    </>
  );
}
