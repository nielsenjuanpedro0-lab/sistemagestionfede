"use client"
import { useState, useEffect, useMemo } from 'react';
import { BRANDS, MODELS, STORAGES, COLORS, MODEL_STORAGES } from '@/constants/data';
import { Edit2, Trash2, X, Search, PenLine, Package, ShoppingCart } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ManualEntryModal } from '@/components/ManualEntryModal';
import { useConfirm } from '@/hooks/useConfirm';

export function StockClient({ isOwner }: { isOwner?: boolean }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [stock, setStock] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [filter, setFilter] = useState({ brand: 'all', model: 'all', storage: 'all', sortPrice: 'none', q: '', status: 'available', condition: 'all', deposit: 'all' });
  const [editItem, setEditItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkDeposit, setBulkDeposit] = useState<string>('');
  const [bulkTransferring, setBulkTransferring] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const router = useRouter();
  const supabase = createClient();

  const STOCK_FIELDS = 'id,brand,model,storage,condition,status,deposit,color,imei,currency,price,cost_price,battery,created_at';

  useEffect(() => {
    (async () => {
      const [{ data: stockData }, { data: depositsData }] = await Promise.all([
        supabase.from('stock').select(STOCK_FIELDS).order('created_at', { ascending: false }),
        supabase.from('deposits').select('id,name,color').order('name'),
      ]);
      setStock(stockData || []);
      setDeposits(depositsData || []);
      if (depositsData && depositsData.length > 0) setSelectedDeposit(depositsData[0].id);
      setDataLoaded(true);
    })();
  }, []);

  const rows = useMemo(() => {
    const ql = filter.q.toLowerCase();
    let r = stock.filter(s =>
      (filter.brand === 'all' || s.brand === filter.brand) &&
      (filter.model === 'all' || s.model === filter.model) &&
      (filter.storage === 'all' || s.storage === filter.storage) &&
      (filter.status === 'all' || s.status === filter.status) &&
      (filter.condition === 'all' || s.condition === filter.condition) &&
      (filter.deposit === 'all' || String(s.deposit) === String(filter.deposit)) &&
      (!ql || `${s.brand} ${s.model} ${s.imei} ${s.color}`.toLowerCase().includes(ql))
    );
    if (filter.sortPrice === 'asc') r = [...r].sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (filter.sortPrice === 'desc') r = [...r].sort((a, b) => (b.price || 0) - (a.price || 0));
    return r;
  }, [stock, filter]);

  const handleDelete = async (id: any) => {
    if (!await confirm('¿Eliminar este equipo del stock?')) return;
    try {
      const { error } = await supabase.from('stock').delete().eq('id', id);
      if (error) throw error;
      setStock(p => p.filter(s => s.id !== id));
      setDetailItem(null);
      router.refresh();
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    try {
      setLoading(true);
      const updatedFields = {
        brand: editItem.brand, model: editItem.model,
        storage: editItem.storage, color: editItem.color,
        price: parseFloat(editItem.price), 
        cost_price: editItem.cost_price ? parseFloat(editItem.cost_price) : null,
        currency: editItem.currency,
        condition: editItem.condition, deposit: editItem.deposit,
        imei: editItem.imei || null,
        battery: editItem.condition === 'used' ? (editItem.battery || null) : null
      };
      const { error } = await supabase.from('stock').update(updatedFields).eq('id', editItem.id);
      if (error) throw error;
      const updatedItem = { ...editItem, ...updatedFields };
      setStock(p => p.map(s => s.id === editItem.id ? updatedItem : s));
      setEditItem(null);
      router.refresh();
      toast.success('Equipo actualizado');
    } catch (e: any) { 
      if (e.message?.includes('stock_imei_key')) {
        toast.error('Este IMEI / Serie ya se encuentra registrado en el sistema.');
      } else {
        toast.error(e.message || 'Error al guardar'); 
      }
    }
    finally { setLoading(false); }
  };

  const handleBulkTransfer = async () => {
    if (!bulkDeposit || selectedItems.length === 0) return;
    if (!await confirm(`¿Transferir ${selectedItems.length} equipos al depósito seleccionado?`)) return;
    
    setBulkTransferring(true);
    try {
      const { error } = await supabase.from('stock').update({ deposit: bulkDeposit }).in('id', selectedItems);
      if (error) throw error;
      
      setStock(p => p.map(s => selectedItems.includes(s.id) ? { ...s, deposit: bulkDeposit } : s));
      setSelectedItems([]);
      setBulkDeposit('');
      toast.success(`${selectedItems.length} equipos transferidos`);
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setBulkTransferring(false);
    }
  };

  const depositMap = useMemo(() => Object.fromEntries(deposits.map(d => [String(d.id), d])), [deposits]);
  const depositOf = (s: any) => depositMap[String(s.deposit)];

  return (
    <div className="page">
      <div className="sh">
        <h1 className="st">Inventario Global</h1>
        <button className="btn btn-dark no-print" onClick={() => setShowManual(true)}>
          <PenLine size={15} /> Cargar equipo
        </button>
      </div>

      <div className="search-bar no-print">
        <Search size={16} color="var(--text-3)" style={{ flexShrink: 0 }} />
        <input
          className="inp"
          placeholder="Buscar modelo, IMEI/Serie, color…"
          value={filter.q}
          onChange={e => setFilter({ ...filter, q: e.target.value })}
        />
        {deposits.length > 0 && <>
          <div className="search-divider" />
          <select
            className="inp"
            style={{ border: 'none', background: 'transparent', width: 'auto', padding: '13px 0', flexShrink: 0 }}
            value={filter.deposit}
            onChange={e => setFilter({ ...filter, deposit: e.target.value })}
          >
            <option value="all">Todos los depósitos</option>
            {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
        </>}
        {BRANDS.length > 0 && <>
          <div className="search-divider" />
          <select
            className="inp"
            style={{ border: 'none', background: 'transparent', width: 'auto', padding: '13px 0', flexShrink: 0 }}
            value={filter.brand}
            onChange={e => setFilter({ ...filter, brand: e.target.value })}
          >
            <option value="all">Todas las marcas</option>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </>}
      </div>

      <div className="filters-wrap no-print">
        {[
          { v: 'available', l: 'En Stock' },
          { v: 'sold',      l: 'Vendidos' },
        ].map(opt => (
          <button key={opt.v} className={`btn-pill ${filter.status === opt.v ? 'active' : ''}`}
            onClick={() => { setFilter({ ...filter, status: filter.status === opt.v ? 'all' : opt.v }); setVisibleCount(50); }}
          >{opt.l}</button>
        ))}

        <select className={`sel-pill ${filter.condition !== 'all' ? 'active' : ''}`} style={{ maxWidth: 110 }} value={filter.condition}
          onChange={e => { setFilter({ ...filter, condition: e.target.value }); setVisibleCount(50); }}
        >
          <option value="all">Condición</option>
          <option value="new">Nuevos</option>
          <option value="used">Usados</option>
        </select>

        <select className={`sel-pill ${filter.model !== 'all' ? 'active' : ''}`} style={{ maxWidth: 130 }} value={filter.model}
          onChange={e => { setFilter({ ...filter, model: e.target.value }); setVisibleCount(50); }}
        >
          <option value="all">Modelo</option>
          {(filter.brand !== 'all'
            ? (MODELS[filter.brand] || [])
            : Object.values(MODELS).flat()
          ).map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select className={`sel-pill ${filter.storage !== 'all' ? 'active' : ''}`} style={{ maxWidth: 130 }} value={filter.storage}
          onChange={e => { setFilter({ ...filter, storage: e.target.value }); setVisibleCount(50); }}
        >
          <option value="all">Almacen.</option>
          {STORAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className={`sel-pill ${filter.sortPrice !== 'none' ? 'active' : ''}`} style={{ maxWidth: 110 }} value={filter.sortPrice}
          onChange={e => { setFilter({ ...filter, sortPrice: e.target.value }); setVisibleCount(50); }}
        >
          <option value="none">Precio</option>
          <option value="desc">Mayor ↓</option>
          <option value="asc">Menor ↑</option>
        </select>
      </div>

      {!dataLoaded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <div className="skeleton skeleton-line" style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginBottom: 0 }} />
              <div style={{ flex: '1 1 200px' }}>
                <div className="skeleton skeleton-line" style={{ width: '60%', height: 14, marginBottom: 6 }} />
                <div className="skeleton skeleton-line" style={{ width: '40%', height: 11, marginBottom: 0 }} />
              </div>
              <div className="skeleton skeleton-line" style={{ flex: '0 0 100px', height: 14, marginBottom: 0 }} />
              <div className="skeleton skeleton-line" style={{ flex: '0 0 80px', height: 14, marginBottom: 0 }} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
          <Package size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Sin resultados</div>
          <div style={{ fontSize: 13 }}>Probá ajustando los filtros</div>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {rows.slice(0, visibleCount).map((s, idx) => {
              const dep = depositOf(s);
              const isSelected = selectedItems.includes(s.id);
              const batteryLabel = s.battery ? (String(s.battery).includes('%') ? s.battery : `${s.battery}%`) : null;
              return (
                <div
                  key={s.id}
                  onClick={() => setDetailItem(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: isSelected ? 'var(--surface-2)' : 'transparent',
                    borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  {/* Custom checkbox */}
                  <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                    <div
                      onClick={() => {
                        if (isSelected) setSelectedItems(selectedItems.filter(id => id !== s.id));
                        else setSelectedItems([...selectedItems, s.id]);
                      }}
                      style={{
                        width: 18, height: 18, borderRadius: 5, cursor: 'pointer', flexShrink: 0,
                        border: isSelected ? 'none' : '1.5px solid var(--border-md)',
                        background: isSelected ? 'var(--text)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s',
                      }}
                    >
                      {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>

                  {/* Condition dot */}
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: s.condition === 'new' ? 'var(--green)' : 'var(--text-3)',
                  }} />

                  {/* Main info */}
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.model}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 5, flexWrap: 'nowrap', overflow: 'hidden' }}>
                      <span>{s.storage}</span>
                      {s.color && <><span>·</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.color}</span></>}
                      {batteryLabel && s.condition === 'used' && <><span>·</span><span>{batteryLabel}</span></>}
                      {s.imei && <><span>·</span><span style={{ fontFamily: 'monospace', flexShrink: 0 }}>···{s.imei.slice(-6)}</span></>}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ flex: '0 0 auto', textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>
                      {s.currency === 'USD' ? 'U$' : '$'}{s.price?.toLocaleString()}
                    </div>
                    {isOwner && s.cost_price && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                        costo {s.currency === 'USD' ? 'U$' : '$'}{s.cost_price.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Deposit */}
                  <div style={{ flex: '0 0 90px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    {dep ? <>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dep.color || 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dep.name}</span>
                    </> : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => setEditItem(s)}><Edit2 size={13} /></button>
                    <button className="btn-icon" style={{ width: 28, height: 28, color: 'var(--red)' }} onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        {visibleCount < rows.length && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button className="btn btn-outline" onClick={() => setVisibleCount(v => v + 50)}>
              Cargar más resultados ({rows.length - visibleCount} restantes)
            </button>
          </div>
        )}
        </>
      )}

      {selectedItems.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100,
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 900
        }}>
          <div style={{ fontWeight: 600 }}>{selectedItems.length} seleccionados</div>
          <div style={{ width: 1, height: 20, background: 'var(--border-md)' }} />
          <select className="inp" style={{ width: 'auto', border: 'none', background: 'transparent' }} value={bulkDeposit} onChange={e => setBulkDeposit(e.target.value)}>
            <option value="">Elegir depósito destino...</option>
            {deposits.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn btn-dark btn-sm" disabled={!bulkDeposit || bulkTransferring} onClick={handleBulkTransfer}>
            {bulkTransferring ? 'Moviendo...' : 'Transferir Masivamente'}
          </button>
          <button className="btn-icon" onClick={() => setSelectedItems([])}><X size={16} /></button>
        </div>
      )}

      {editItem && (
        <div className="mo" style={{ zIndex: 1100 }} onClick={() => setEditItem(null)}>
          <div className="mb" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div>
                <div className="mh-title">Editar Equipo</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  {editItem.brand} {editItem.model}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setEditItem(null)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="lbl">Almacenamiento</label>
                  <select className="inp" value={editItem.storage} onChange={e => setEditItem({...editItem, storage: e.target.value})}>
                    {(MODEL_STORAGES[editItem.model] || STORAGES).map((s: string) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lbl">Color</label>
                  <input className="inp" list="edit-colors" placeholder="Ej: Azul" value={editItem.color} onChange={e => setEditItem({...editItem, color: e.target.value})} />
                  <datalist id="edit-colors">
                    {(COLORS[editItem.model] || COLORS[editItem.brand] || ['Negro']).map((c: string) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="lbl">IMEI / Serie (Opcional)</label>
                <input className="inp" placeholder="Opcional" value={editItem.imei || ''} onChange={e => setEditItem({...editItem, imei: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="lbl">Precio Venta</label>
                  <input className="inp" type="text" inputMode="decimal" value={editItem.price || ''} onChange={e => setEditItem({...editItem, price: e.target.value.replace(/[^0-9.]/g, '')})} />
                </div>
                {isOwner && (
                  <div>
                    <label className="lbl">Precio Costo</label>
                    <input className="inp" type="text" inputMode="decimal" value={editItem.cost_price || ''} onChange={e => setEditItem({...editItem, cost_price: e.target.value.replace(/[^0-9.]/g, '')})} />
                  </div>
                )}
                <div>
                  <label className="lbl">Moneda</label>
                  <select className="inp" value={editItem.currency} onChange={e => setEditItem({...editItem, currency: e.target.value})}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: editItem.condition === 'used' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="lbl">Condición</label>
                  <select className="inp" value={editItem.condition} onChange={e => setEditItem({...editItem, condition: e.target.value})}>
                    <option value="new">Sellado</option>
                    <option value="used">Usado</option>
                  </select>
                </div>
                {editItem.condition === 'used' && (
                  <div>
                    <label className="lbl">Batería (%)</label>
                    <input className="inp" type="number" placeholder="Ej: 85" value={editItem.battery || ''} onChange={e => setEditItem({...editItem, battery: e.target.value})} />
                  </div>
                )}
                <div>
                  <label className="lbl">Depósito</label>
                  <select className="inp" value={String(editItem.deposit)} onChange={e => setEditItem({...editItem, deposit: e.target.value})}>
                    {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditItem(null)}>Cancelar</button>
                <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleUpdate} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailItem && (
        <div className="mo" onClick={() => setDetailItem(null)}>
          <div className="mb" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div>
                <div className="mh-title">{detailItem.brand} {detailItem.model}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  {detailItem.storage} · {detailItem.color}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setDetailItem(null)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Price block */}
              <div>
                <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {detailItem.currency === 'USD' ? 'U$' : '$'}{detailItem.price?.toLocaleString()}
                </div>
                {isOwner && detailItem.cost_price && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
                    costo {detailItem.currency === 'USD' ? 'U$' : '$'}{detailItem.cost_price?.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Status + IMEI */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {detailItem.status !== 'available' && (
                  <span className="badge b-amber">Vendido</span>
                )}
                <span className={`badge ${detailItem.condition === 'new' ? 'b-green' : 'b-neu'}`}>
                  {detailItem.condition === 'new' ? 'Sellado' : `Usado${detailItem.battery ? ' · ' + (String(detailItem.battery).includes('%') ? detailItem.battery : detailItem.battery + '%') : ''}`}
                </span>
                {detailItem.imei && (
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>···{detailItem.imei.slice(-6)}</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                {detailItem.status === 'available' && (
                  <button className="btn btn-dark" style={{ flex: 1 }} onClick={() => router.push(`/sell?item=${detailItem.id}`)}>
                    <ShoppingCart size={15} /> Vender
                  </button>
                )}
                <button className="btn btn-outline" style={{ flex: detailItem.status === 'available' ? 0 : 1, minWidth: 100 }}
                  onClick={() => { setDetailItem(null); setEditItem(detailItem); }}>
                  <Edit2 size={15} /> Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
  
      {ConfirmDialog}
      <ManualEntryModal
        open={showManual}
        onClose={() => setShowManual(false)}
        onSuccess={() => {
          supabase.from('stock').select(STOCK_FIELDS).order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setStock(data); });
        }}
      />
    </div>
  );
}
