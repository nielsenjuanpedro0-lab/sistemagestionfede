"use client"
import { useState, useEffect, useRef } from 'react';
import { BRANDS, MODELS, STORAGES, COLORS, MODEL_STORAGES, EAN_DB } from '@/constants/data';
import { createClient } from '@/utils/supabase/client';
import { Check, X, ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BATTERY_OPTIONS = ['100%', '95%', '90%', '85%', '80%', '75%', '70%', '65%', '60%', 'Sin dato'];

interface ManualEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const isOldPro = (m: string) => {
  if (!m || typeof m !== 'string') return false;
  return m.includes('Pro') && (m.includes('14') || m.includes('13') || m.includes('12') || m.includes('11') || m.includes('XS'));
};

function emptyVariant() {
  return { storage: '128GB', color: 'Negro', condition: 'new' as 'new' | 'used', battery: '100%', imei: '', qty: 1, price: '', costPrice: '', notes: '' };
}

export function ManualEntryModal({ open, onClose, onSuccess }: ManualEntryModalProps) {
  const [step, setStep] = useState(1);
  const [upc, setUpc] = useState('');
  const [brand, setBrand] = useState('Apple');
  const [appleCategory, setAppleCategory] = useState('iPhone');
  const [model, setModel] = useState('iPhone 15 Pro Max');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [cur, setCur] = useState('USD');
  const [dep, setDep] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositsLoaded, setDepositsLoaded] = useState(false);
  const [sup, setSup] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [variants, setVariants] = useState([emptyVariant()]);
  const [loading, setLoading] = useState(false);
  const priceRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      setStep(1);
      setDepositsLoaded(false);
      supabase.from('deposits').select('*').order('name').then(({ data }) => {
        setDeposits(data || []);
        if (data && data.length > 0) setDep(data[0].id);
        setDepositsLoaded(true);
      });
      supabase.from('suppliers').select('*').order('name').then(({ data }) => {
        if (data && data.length > 0) {
          setSuppliers(data);
          setSup(data[0].id);
        }
      });
    }
  }, [open]);

  const handleUPCSearch = async (code: string) => {
    setUpc(code);
    if (code.length < 8) return;
    try {
      const sessionData = await supabase.auth.getSession()
      const { data } = await supabase.from('product_catalog').select('*').eq('upc', code).single();
      let found = data;
      if (!found && EAN_DB[code]) found = EAN_DB[code];
      if (found) {
        setBrand(found.brand);
        setModel(found.model);
        const colors = COLORS[found.model] || COLORS[found.brand] || ['Negro'];
        const storages = MODEL_STORAGES[found.model] || STORAGES;
        const finalColor = found.color && colors.includes(found.color) ? found.color : colors[0];
        const finalStorage = found.storage && storages.includes(found.storage) ? found.storage : storages[0];
        if (found.price) {
          setPrice(found.price.toString());
          if (found.cost_price) setCostPrice(found.cost_price.toString());
        }
        setVariants(vs => vs.map((v: any) => ({ ...v, color: finalColor, storage: finalStorage, condition: isOldPro(found.model) ? 'used' : 'new' })));
        toast.success(`✓ ${found.brand} ${found.model}`);
      }
    } catch (_) {}
  };

  const handleBrand = (b: string) => {
    setBrand(b);
    let m = MODELS[b]?.[0] || '';
    if (b === 'Apple') {
      m = MODELS['Apple']?.find(x => x.startsWith(appleCategory)) || MODELS['Apple']?.[0] || '';
    }
    setModel(m);
    setVariants(vs => vs.map((v: any) => ({
      ...v,
      color: (COLORS[m] || COLORS[b] || ['Negro'])[0],
      storage: (MODEL_STORAGES[m] || STORAGES)[0],
      condition: isOldPro(m) ? 'used' : 'new'
    })));
  };

  const handleAppleCategory = (cat: string) => {
    setAppleCategory(cat);
    const m = MODELS['Apple']?.find(x => x.startsWith(cat)) || '';
    handleModel(m);
  };

  const handleModel = (m: string) => {
    setModel(m);
    setVariants(vs => vs.map((v: any) => ({
      ...v,
      color: (COLORS[m] || COLORS[brand] || ['Negro'])[0],
      storage: (MODEL_STORAGES[m] || STORAGES)[0],
      condition: isOldPro(m) ? 'used' : 'new'
    })));
  };

  const updV = (i: number, key: string, val: any) =>
    setVariants(vs => vs.map((v, idx) => idx === i ? { ...v, [key]: val } : v));

  const addVariant = () =>
    setVariants(vs => [...vs, { ...emptyVariant(), color: COLORS[brand]?.[0] || 'Negro', condition: isOldPro(model) ? 'used' : 'new' }]);

  const removeVariant = (i: number) =>
    setVariants(vs => vs.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!model || !price || !costPrice || !dep) { toast.error('Completá todos los campos'); return; }
    setLoading(true);
    try {
      if (upc.length > 5) {
        const { data: exists } = await supabase.from('product_catalog').select('id').eq('upc', upc).maybeSingle();
        if (!exists) await supabase.from('product_catalog').insert({ upc, brand, model });
      }
      const units: any[] = [];
      variants.forEach(v => {
        const qty = Number(v.qty) || 0;
        Array.from({ length: qty }).forEach(() => {
          units.push({
            brand, model, storage: v.storage, color: v.color,
            condition: v.condition,
            battery: v.condition === 'used' ? v.battery : null,
            imei: qty === 1 && v.imei ? v.imei : null,
            price: v.price ? parseFloat(v.price) : parseFloat(price), 
            cost_price: v.costPrice ? parseFloat(v.costPrice) : parseFloat(costPrice),
            currency: cur,
            deposit: dep, supplier_id: sup, status: 'available', upc: upc || null,
            notes: v.notes?.trim() || null
          });
        });
      });
      const { data: inserted, error } = await supabase.from('stock').insert(units).select();
      if (error) throw error;
      if (inserted) {
        const total = variants.reduce((a, v) => a + (Number(v.qty) || 0), 0);
        toast.success(`${total} equipo${total !== 1 ? 's' : ''} ingresado${total !== 1 ? 's' : ''}`);
        setVariants([emptyVariant()]); setPrice(''); setCostPrice(''); setUpc('');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (e: any) {
      if (e.message?.includes('stock_imei_key')) {
        toast.error('Uno o más IMEI ingresados ya están registrados en el inventario.');
      } else {
        toast.error(e.message || 'Error al guardar');
      }
    } finally { setLoading(false); }
  };

  if (!open) return null;

  const totalUnits = variants.reduce((a, v) => a + (Number(v.qty) || 0), 0);
  const colors = COLORS[model] || COLORS[brand] || ['Negro'];
  const storages = MODEL_STORAGES[model] || STORAGES;
  const isStep1Valid = !!model && !!price && !!costPrice && !!dep && (suppliers.length === 0 || !!sup);

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, display: 'block' };

  return (
    <div className="mo" style={{ zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mb" style={{ maxWidth: 640, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: 'var(--border-md)' }} />
        </div>

        <div style={{
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)', flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Ingresar equipo</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              {step === 1 ? 'Producto y precio' : `${totalUnits} unidad${totalUnits !== 1 ? 'es' : ''}`}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '10px 20px 0', flexShrink: 0 }}>
          {[1, 2].map(n => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 3, background: n <= step ? 'var(--text)' : 'var(--border-md)', transition: 'background 0.2s' }} />
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '18px 20px', WebkitOverflowScrolling: 'touch' as any }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                <label style={labelStyle}>Escanear código UPC (opcional)</label>
                <input className="inp" style={{ textAlign: 'center', letterSpacing: 2, fontFamily: 'monospace', background: 'transparent', border: 'none', boxShadow: 'none', padding: '8px 0' }} placeholder="Hacé clic y escaneá…" value={upc} onChange={e => handleUPCSearch(e.target.value)} />
              </div>
              <div><label className="lbl">Marca</label><select className="inp" value={brand} onChange={e => handleBrand(e.target.value)}>{BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              {brand === 'Apple' && (
                <div>
                  <label className="lbl">Línea de Producto</label>
                  <select className="inp" value={appleCategory} onChange={e => handleAppleCategory(e.target.value)}>
                    <option value="iPhone">iPhone</option>
                    <option value="iPad">iPad</option>
                    <option value="MacBook">MacBook</option>
                    <option value="AirPods">AirPods</option>
                    <option value="Apple Watch">Apple Watch</option>
                  </select>
                </div>
              )}
              <div><label className="lbl">Modelo</label><select className="inp" value={model} onChange={e => handleModel(e.target.value)}>
                {(brand === 'Apple' ? (MODELS['Apple'] || []).filter(m => m.startsWith(appleCategory)) : (MODELS[brand] || [])).map(m => <option key={m} value={m}>{m}</option>)}
              </select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12 }}>
                <div><label className="lbl">Precio Venta</label><input ref={priceRef} className="inp" type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="0" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} autoComplete="off" /></div>
                <div><label className="lbl">Precio Costo</label><input className="inp" type="text" inputMode="decimal" pattern="[0-9.]*" placeholder="0" value={costPrice} onChange={e => setCostPrice(e.target.value.replace(/[^0-9.]/g, ''))} autoComplete="off" /></div>
                <div><label className="lbl">Moneda</label><select className="inp" value={cur} onChange={e => setCur(e.target.value)}><option value="USD">USD $</option><option value="ARS">ARS $</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="lbl">Depósito</label><select className="inp" value={dep !== null ? String(dep) : ''} onChange={e => setDep(e.target.value)}>{!depositsLoaded && <option value="">Cargando…</option>}{depositsLoaded && deposits.length === 0 && <option value="">Sin depósitos — creá uno primero</option>}{deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}</select></div>
                {suppliers.length > 0 && (
                  <div><label className="lbl">Proveedor</label><select className="inp" value={sup !== null ? String(sup) : ''} onChange={e => setSup(e.target.value)}>{suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}</select></div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {variants.map((v, i) => (
                <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Variante {i + 1}</span>
                    {variants.length > 1 && (<button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => removeVariant(i)}><Trash2 size={14} /></button>)}
                  </div>
                  {model.startsWith('Apple Watch') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
                        <label className="lbl" style={{ marginBottom: 8 }}>Medida</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {storages.map(s => (
                            <button key={s} className={`btn btn-sm ${v.storage === s ? 'btn-dark' : 'btn-outline'}`} onClick={() => updV(i, 'storage', s)} style={{ minWidth: 72 }}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="lbl">Color</label>
                        <input className="inp" list={`colors-list-${i}`} placeholder="Ej: Aluminio Medianoche" value={v.color} onChange={e => updV(i, 'color', e.target.value)} />
                        <datalist id={`colors-list-${i}`}>
                          {colors.map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                    </div>
                  ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div><label className="lbl">Almacenamiento</label><select className="inp" value={v.storage} onChange={e => updV(i, 'storage', e.target.value)}>{storages.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div>
                      <label className="lbl">Color</label>
                      <input className="inp" list={`colors-list-${i}`} placeholder="Ej: Azul" value={v.color} onChange={e => updV(i, 'color', e.target.value)} />
                      <datalist id={`colors-list-${i}`}>
                        {colors.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>
                  )}
                  <div style={{ marginBottom: 12 }}><label className="lbl">Condición</label><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><button className={`btn btn-sm ${v.condition === 'new' ? 'btn-dark' : 'btn-outline'}`} onClick={() => updV(i, 'condition', 'new')}>Sellado</button><button className={`btn btn-sm ${v.condition === 'used' ? 'btn-dark' : 'btn-outline'}`} onClick={() => updV(i, 'condition', 'used')}>Usado</button></div></div>
                  {v.condition === 'used' && (
                    <div style={{ marginBottom: 12 }}>
                      <label className="lbl">Batería</label>
                      <datalist id="battery-options">
                        {BATTERY_OPTIONS.map(b => <option key={b} value={b} />)}
                      </datalist>
                      <input className="inp" list="battery-options" placeholder="Ej: 87%" value={v.battery} onChange={e => updV(i, 'battery', e.target.value)} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label className="lbl">Precio Venta (opcional)</label>
                      <input className="inp" type="text" inputMode="decimal" placeholder={`Base: $${price || '0'}`} value={v.price || ''} onChange={e => updV(i, 'price', e.target.value.replace(/[^0-9.]/g, ''))} />
                    </div>
                    <div>
                      <label className="lbl">Precio Costo (opcional)</label>
                      <input className="inp" type="text" inputMode="decimal" placeholder={`Base: $${costPrice || '0'}`} value={v.costPrice || ''} onChange={e => updV(i, 'costPrice', e.target.value.replace(/[^0-9.]/g, ''))} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div><label className="lbl">Cantidad</label><input className="inp" type="text" inputMode="numeric" value={v.qty} onChange={e => { const val = e.target.value.replace(/\D/g, ''); updV(i, 'qty', val === '' ? '' : parseInt(val, 10)); }} /></div>
                    {Number(v.qty) === 1 && (<div><label className="lbl">IMEI (opcional)</label><input className="inp" type="text" inputMode="numeric" value={v.imei} placeholder="15 dígitos" onChange={e => updV(i, 'imei', e.target.value)} /></div>)}
                  </div>
                  <div><label className="lbl">Observaciones (opcional)</label><input className="inp" placeholder="Ej: golpe en marco, sin caja..." value={v.notes} onChange={e => updV(i, 'notes', e.target.value)} /></div>
                </div>
              ))}
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={addVariant}><Plus size={15} /> Agregar variante</button>
            </div>
          )}
          <div style={{ height: 8 }} />
        </div>

        <div style={{ padding: '12px 20px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--surface)', flexShrink: 0 }}>
          {step > 1 ? (<button className="btn btn-outline btn-sm" style={{ gap: 5 }} onClick={() => setStep(1)}><ChevronLeft size={15} /> Atrás</button>) : (<button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-2)' }} onClick={onClose}>Cancelar</button>)}
          {step < 2 ? (<button className="btn btn-dark" style={{ flex: 1 }} onClick={() => { if (isStep1Valid) setStep(2); }} disabled={!isStep1Valid}>Continuar <ChevronRight size={15} /></button>) : (<button className="btn btn-dark" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>{loading ? 'Guardando…' : <><Check size={15} /> Ingresar {totalUnits} ud.</>}</button>)}
        </div>
      </div>
    </div>
  );
}
