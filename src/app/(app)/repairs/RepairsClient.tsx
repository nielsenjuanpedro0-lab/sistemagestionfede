"use client"
import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Wrench, CheckCircle, PackageSearch, PackageOpen, XCircle, Printer, Package } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';

export function RepairsClient({ isOwner, user }: { isOwner: boolean, user: any }) {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'repairs' | 'parts'>('repairs');

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    setLoading(true);
    const { data } = await supabase.from('repairs').select('*').order('created_at', { ascending: false });
    if (data) setRepairs(data);
    setLoading(false);
  };

  const STATUSES = [
    { id: 'INGRESADO', label: 'Ingresado', color: 'var(--amber)' },
    { id: 'REVISION', label: 'En Revisión', color: 'var(--blue)' },
    { id: 'REPUESTO', label: 'Esp. Repuesto', color: 'var(--purple)' },
    { id: 'REPARADO', label: 'Reparado', color: 'var(--green)' },
    { id: 'ENTREGADO', label: 'Entregado', color: 'var(--text-3)' },
    { id: 'CANCELADO', label: 'Cancelado', color: 'var(--red)' }
  ];

  const getStatus = (id: string) => STATUSES.find(s => s.id === id) || STATUSES[0];

  const filtered = repairs.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (q) {
      const qs = q.toLowerCase();
      if (!r.customer_name?.toLowerCase().includes(qs) &&
          !r.device_model?.toLowerCase().includes(qs) &&
          !r.id?.toLowerCase().includes(qs)) return false;
    }
    return true;
  });

  return (
    <div className="page">
      <div className="sh">
        <h1 className="st">Servicio Técnico</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeTab === 'repairs' && (
            <button className="btn btn-dark" onClick={() => setShowNew(true)}>
              <Plus size={16} /> Nuevo Ingreso
            </button>
          )}
          {activeTab === 'parts' && (
            <button className="btn btn-dark" onClick={() => {/* handled inside SparePartsTab */}}>
              <Plus size={16} /> Nuevo Repuesto
            </button>
          )}
        </div>
      </div>

      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        <button
          onClick={() => setActiveTab('repairs')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'repairs' ? '2px solid var(--text)' : '2px solid transparent',
            color: activeTab === 'repairs' ? 'var(--text)' : 'var(--text-3)',
            fontWeight: activeTab === 'repairs' ? 700 : 400,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: -1
          }}
        >
          Reparaciones
        </button>
        <button
          onClick={() => setActiveTab('parts')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'parts' ? '2px solid var(--text)' : '2px solid transparent',
            color: activeTab === 'parts' ? 'var(--text)' : 'var(--text-3)',
            fontWeight: activeTab === 'parts' ? 700 : 400,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: -1
          }}
        >
          Repuestos
        </button>
      </div>

      {activeTab === 'parts' ? (
        <SparePartsTab />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Ingresados</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{repairs.filter(r => r.status === 'INGRESADO').length}</div>
            </div>
            <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, textTransform: 'uppercase' }}>En Revisión</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{repairs.filter(r => r.status === 'REVISION').length}</div>
            </div>
            <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 600, textTransform: 'uppercase' }}>Esp. Repuesto</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{repairs.filter(r => r.status === 'REPUESTO').length}</div>
            </div>
            <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase' }}>Listos / Reparados</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{repairs.filter(r => r.status === 'REPARADO').length}</div>
            </div>
          </div>

          <div className="search-bar no-print">
            <Search size={16} color="var(--text-3)" style={{ flexShrink: 0 }} />
            <input
              className="inp"
              style={{ border: 'none', background: 'transparent' }}
              placeholder="Buscar por cliente, equipo o # de orden..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>

          <div className="filters-wrap no-print">
            <button className={`btn-pill ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>Todos</button>
            <div style={{ width: 1, height: 20, background: 'var(--border-md)', margin: '0 4px' }} />
            {STATUSES.map(s => (
              <button key={s.id} className={`btn-pill ${filterStatus === s.id ? 'active' : ''}`} onClick={() => setFilterStatus(s.id)}>
                {s.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Cargando reparaciones...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
              <PackageOpen size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>No hay reparaciones</div>
            </div>
          ) : (
            <div className="tw">
              <table className="table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Cliente</th>
                    <th>Equipo</th>
                    <th>Estado</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => setDetailItem(r)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-3)' }}>#{r.id.split('-')[0]}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.customer_phone || 'Sin tel'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.device_brand} {r.device_model}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Falla: {r.issue_description}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: getStatus(r.status).color, color: '#fff', fontSize: 10 }}>
                          {getStatus(r.status).label}
                        </span>
                      </td>
                      <td><button className="btn-icon" onClick={e => { e.stopPropagation(); setDetailItem(r); }}><Edit2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showNew && <NewRepairModal onClose={() => setShowNew(false)} onSave={fetchRepairs} user={user} />}
      {detailItem && <RepairDetailModal repair={detailItem} onClose={() => setDetailItem(null)} onSave={fetchRepairs} user={user} isOwner={isOwner} STATUSES={STATUSES} />}
    </div>
  );
}

// ─── SparePartsTab ────────────────────────────────────────────────────────────

function SparePartsTab() {
  const [parts, setParts] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDeposit, setFilterDeposit] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; partId: string | null }>({ open: false, partId: null });
  const supabase = createClient();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: partsData }, { data: depositsData }] = await Promise.all([
      supabase.from('spare_parts').select('*, deposits(name)').order('name'),
      supabase.from('deposits').select('id, name')
    ]);
    if (partsData) setParts(partsData);
    if (depositsData) setDeposits(depositsData);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('spare_parts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Repuesto eliminado');
    setConfirmDialog({ open: false, partId: null });
    fetchAll();
  };

  const filtered = filterDeposit === 'all' ? parts : parts.filter(p => String(p.deposit_id) === filterDeposit);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-dark btn-sm" onClick={() => { setEditingPart(null); setShowModal(true); }}>
          <Plus size={14} /> Nuevo repuesto
        </button>
        {deposits.length > 0 && (
          <select className="inp" style={{ width: 'auto', minWidth: 160 }} value={filterDeposit} onChange={e => setFilterDeposit(e.target.value)}>
            <option value="all">Todos los depósitos</option>
            {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Cargando repuestos...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
          <Package size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>No hay repuestos cargados</div>
          <div style={{ fontSize: 13 }}>Agregá repuestos para asignarlos a reparaciones</div>
        </div>
      ) : (
        <div className="tw">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Costo</th>
                <th>Stock</th>
                <th>Depósito</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{p.category || '—'}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                    {p.currency === 'USD' ? 'USD ' : '$'}{p.cost_price?.toLocaleString()}
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: p.stock === 0 ? 'var(--red)' : p.stock <= 3 ? 'var(--amber)' : 'var(--green)',
                      color: '#fff', fontSize: 11
                    }}>{p.stock}</span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.deposits?.name || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => { setEditingPart(p); setShowModal(true); }}><Edit2 size={15} /></button>
                      <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setConfirmDialog({ open: true, partId: p.id })}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <SparePartModal
          part={editingPart}
          deposits={deposits}
          onClose={() => { setShowModal(false); setEditingPart(null); }}
          onSave={() => { setShowModal(false); setEditingPart(null); fetchAll(); }}
        />
      )}

      {confirmDialog.open && (
        <div className="mo">
          <div className="mb" style={{ maxWidth: 400 }}>
            <div className="mh">
              <div className="mh-title">Eliminar repuesto</div>
              <button className="btn-icon" onClick={() => setConfirmDialog({ open: false, partId: null })}><X size={18} /></button>
            </div>
            <div className="mbd">
              <p style={{ marginBottom: 20, color: 'var(--text-2)' }}>¿Confirmás que querés eliminar este repuesto? Esta acción no se puede deshacer.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" onClick={() => setConfirmDialog({ open: false, partId: null })}>Cancelar</button>
                <button className="btn btn-dark" style={{ background: 'var(--red)', flex: 1 }} onClick={() => confirmDialog.partId && handleDelete(confirmDialog.partId)}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SparePartModal({ part, deposits, onClose, onSave }: any) {
  const isEdit = !!part;
  const [f, setF] = useState({
    name: part?.name || '',
    category: part?.category || '',
    cost_price: part?.cost_price ?? 0,
    currency: part?.currency || 'ARS',
    stock: part?.stock ?? 0,
    deposit_id: part?.deposit_id ? String(part.deposit_id) : (deposits[0]?.id ? String(deposits[0].id) : '')
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    if (!f.name.trim()) return toast.error('El nombre es obligatorio');
    setSaving(true);
    try {
      const payload = {
        name: f.name.trim(),
        category: f.category.trim() || null,
        cost_price: parseFloat(String(f.cost_price)) || 0,
        currency: f.currency,
        stock: parseInt(String(f.stock)) || 0,
        deposit_id: f.deposit_id || null
      };
      if (isEdit) {
        const { error } = await supabase.from('spare_parts').update(payload).eq('id', part.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('spare_parts').insert([payload]);
        if (error) throw error;
      }
      toast.success(isEdit ? 'Repuesto actualizado' : 'Repuesto creado');
      onSave();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mo">
      <div className="mb" style={{ maxWidth: 480 }}>
        <div className="mh">
          <div className="mh-title">{isEdit ? 'Editar repuesto' : 'Nuevo repuesto'}</div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label className="lbl">Nombre *</label>
            <input className="inp" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ej: Pantalla iPhone 11" />
          </div>
          <div className="field">
            <label className="lbl">Categoría</label>
            <input className="inp" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} placeholder="Ej: Pantallas, Baterías..." />
          </div>
          <div className="row">
            <div className="col field">
              <label className="lbl">Costo</label>
              <input className="inp" type="number" value={f.cost_price} onChange={e => setF({ ...f, cost_price: e.target.value as any })} />
            </div>
            <div className="col field">
              <label className="lbl">Moneda</label>
              <select className="inp" value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div className="col field">
              <label className="lbl">Stock</label>
              <input className="inp" type="number" value={f.stock} onChange={e => setF({ ...f, stock: e.target.value as any })} />
            </div>
            {deposits.length > 0 && (
              <div className="col field">
                <label className="lbl">Depósito</label>
                <select className="inp" value={f.deposit_id} onChange={e => setF({ ...f, deposit_id: e.target.value })}>
                  <option value="">Sin depósito</option>
                  {deposits.map((d: any) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <button className="btn btn-dark" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear repuesto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cost helper ─────────────────────────────────────────────────────────────

function calcCostARS(parts: any[], exchangeRate: number): number {
  return parts.reduce((acc, rp) => {
    const ars = rp.currency === 'USD' ? rp.cost_price * exchangeRate : rp.cost_price;
    return acc + ars * (rp.qty || 1);
  }, 0);
}

// ─── NewRepairModal ───────────────────────────────────────────────────────────

function NewRepairModal({ onClose, onSave, user }: any) {
  const [f, setF] = useState({
    device_brand: 'Apple', device_model: '', device_color: '', device_password: '',
    issue_description: '', visual_condition: '',
    budget: '', deposit_paid: '', deposit_id: ''
  });
  const [cust, setCust] = useState({ name: '', dni: '', phone: '', email: '', instagram: '' });
  const [custSearch, setCustSearch] = useState('');
  const [custSuggestions, setCustSuggestions] = useState<any[]>([]);
  const [searchingCust, setSearchingCust] = useState(false);
  const [custTimer, setCustTimer] = useState<any>(null);

  const [deposits, setDeposits] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('deposits').select('id, name').then(({data}) => {
      if(data) {
        setDeposits(data);
        if(data.length > 0) setF(p => ({...p, deposit_id: String(data[0].id)}));
      }
    });
  }, []);

  const searchCustomer = async (val: string) => {
    setCustSearch(val);
    if (custTimer) clearTimeout(custTimer);

    setCustTimer(setTimeout(async () => {
      setSearchingCust(true);
      let query = supabase.from('customers').select('*').order('updated_at', { ascending: false }).limit(5);
      if (val.trim().length > 0) query = query.or(`name.ilike.%${val}%,dni.ilike.%${val}%,instagram.ilike.%${val}%`);
      const { data } = await query;
      if (data) setCustSuggestions(data);
      setSearchingCust(false);
    }, 350));
  };

  const applyCustSuggestion = (c: any) => {
    setCust({ name: c.name || '', dni: c.dni || '', phone: c.phone || '', email: c.email || '', instagram: c.instagram || '' });
    setCustSearch('');
    setCustSuggestions([]);
  };

  const handleSave = async () => {
    if (!cust.name || !f.device_model || !f.issue_description) return toast.error('Completá los campos obligatorios');
    setSaving(true);
    try {
      // 1. Create or update customer
      let customerId = null;
      const { data: existingCust } = await supabase.from('customers').select('id').eq('name', cust.name).single();
      if (existingCust) {
        customerId = existingCust.id;
        await supabase.from('customers').update({ phone: cust.phone, dni: cust.dni, instagram: cust.instagram, email: cust.email }).eq('id', customerId);
      } else {
        const { data: newCust, error: custErr } = await supabase.from('customers').insert([cust]).select().single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      }

      const deposit_paid = parseFloat(f.deposit_paid) || 0;
      const budget = parseFloat(f.budget) || null;

      const { data: repData, error } = await supabase.from('repairs').insert([{
        customer_id: customerId, customer_name: cust.name, customer_phone: cust.phone,
        device_brand: f.device_brand, device_model: f.device_model, device_color: f.device_color, device_password: f.device_password,
        issue_description: f.issue_description, visual_condition: f.visual_condition,
        budget, deposit_paid, deposit_id: deposit_paid > 0 ? parseInt(f.deposit_id) : null
      }]).select();
      if (error) throw error;

      if (deposit_paid > 0) {
        // Registrar movimiento en caja
        const saleData = {
          seller_id: user.id, seller_name: user.name,
          deposit_id: parseInt(f.deposit_id),
          brand: 'SERVICIO', model: 'SEÑA REPARACIÓN',
          storage: '-', color: '-', imei: `REP-${repData[0].id.split('-')[0]}`,
          cost_price: 0, price: deposit_paid, currency: 'ARS',
          payments: [{ id: 'ars_cash', amount: deposit_paid, original_amount: deposit_paid, label: 'Efectivo ARS (Seña)' }],
          customer: cust
        };
        await supabase.from('sales').insert([saleData]);
      }

      toast.success('Orden creada');
      onSave();
      onClose();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mo">
      <div className="mb" style={{ maxWidth: 600 }}>
        <div className="mh">
          <div className="mh-title">Nueva Reparación</div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>1. Datos del Cliente</div>
            <div className="search-inp-wrapper" style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={16} className="search-icon" style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-3)' }} />
              <input
                className="inp" style={{ paddingLeft: 32 }} placeholder="Buscar cliente guardado (Nombre, DNI o Instagram)..."
                value={custSearch} onChange={e => searchCustomer(e.target.value)} onFocus={e => searchCustomer(e.target.value)} autoComplete="off"
              />
            </div>
            {custSuggestions.length > 0 && (
              <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, marginTop: -8, marginBottom: 12, overflow: 'hidden', position: 'relative', zIndex: 50, width: '100%' }}>
                {custSuggestions.map((c, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderBottom: i === custSuggestions.length - 1 ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                    className="hover-bg" onMouseDown={(e) => { e.preventDefault(); applyCustSuggestion(c); }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.dni ? `DNI: ${c.dni} ` : ''}{c.phone ? `· Tel: ${c.phone} ` : ''}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="row">
              <div className="col field"><label className="lbl">Nombre y Apellido *</label><input className="inp" value={cust.name} onChange={e => setCust(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Perez" /></div>
              <div className="col field"><label className="lbl">Teléfono</label><input className="inp" value={cust.phone} onChange={e => setCust(p => ({ ...p, phone: e.target.value }))} placeholder="Ej: 112345678" /></div>
            </div>
            <div className="row">
              <div className="col field"><label className="lbl">DNI</label><input className="inp" value={cust.dni} onChange={e => setCust(p => ({ ...p, dni: e.target.value }))} /></div>
            </div>
          </div>

          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>2. Dispositivo y Falla</div>
            <div className="row">
              <div className="col field"><label className="lbl">Marca</label><input className="inp" value={f.device_brand} onChange={e=>setF({...f, device_brand: e.target.value})} /></div>
              <div className="col field"><label className="lbl">Modelo *</label><input className="inp" value={f.device_model} onChange={e=>setF({...f, device_model: e.target.value})} placeholder="Ej: iPhone 11" /></div>
            </div>
            <div className="row">
              <div className="col field"><label className="lbl">Color</label><input className="inp" value={f.device_color} onChange={e=>setF({...f, device_color: e.target.value})} /></div>
              <div className="col field"><label className="lbl">Contraseña/Pin (Opcional)</label><input className="inp" value={f.device_password} onChange={e=>setF({...f, device_password: e.target.value})} /></div>
            </div>
            <div className="field"><label className="lbl">Falla Reportada *</label><textarea className="inp" style={{ minHeight: 60, padding: '10px 14px' }} value={f.issue_description} onChange={e=>setF({...f, issue_description: e.target.value})} placeholder="No prende, cambiar pantalla..." /></div>
            <div className="field"><label className="lbl">Estado Visual (Opcional)</label><input className="inp" value={f.visual_condition} onChange={e=>setF({...f, visual_condition: e.target.value})} placeholder="Rayado atrás, vidrio roto..." /></div>
          </div>

          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>3. Presupuesto y Seña</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="col field"><label className="lbl">Presupuesto Estimado ($)</label><input className="inp" type="number" value={f.budget} onChange={e=>setF({...f, budget: e.target.value})} placeholder="0" /></div>
              <div className="col field"><label className="lbl">Seña Dejada ($)</label><input className="inp" type="number" value={f.deposit_paid} onChange={e=>setF({...f, deposit_paid: e.target.value})} placeholder="0" /></div>
              {parseFloat(f.deposit_paid) > 0 && deposits.length > 0 && (
                <div className="col field"><label className="lbl">Ingresar seña a caja:</label>
                  <select className="inp" value={f.deposit_id} onChange={e=>setF({...f, deposit_id: e.target.value})}>
                    {deposits.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <button className="btn btn-dark btn-lg" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Ingreso'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── RepairDetailModal ────────────────────────────────────────────────────────

function RepairDetailModal({ repair, onClose, onSave, isOwner, STATUSES, user }: any) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [f, setF] = useState(repair);
  const [saving, setSaving] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [collectDepositId, setCollectDepositId] = useState('');

  // Spare parts state
  const [repairParts, setRepairParts] = useState<any[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState(1000);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [addingPart, setAddingPart] = useState(false);
  const [laborCost, setLaborCost] = useState<number>(repair.labor_cost || 0);

  const supabase = createClient();

  useEffect(() => {
    supabase.from('deposits').select('id, name').then(({data}) => {
      if(data) {
        setDeposits(data);
        if(data.length > 0) setCollectDepositId(String(data[0].id));
      }
    });
    fetchRepairParts();
    fetchAvailableParts();
    fetchExchangeRate();
  }, []);

  const fetchRepairParts = async () => {
    const { data } = await supabase.from('repair_parts').select('*').eq('repair_id', repair.id).order('id');
    if (data) setRepairParts(data);
  };

  const fetchAvailableParts = async () => {
    const { data } = await supabase.from('spare_parts').select('id, name, cost_price, currency, stock, deposit_id').order('name');
    if (data) setAvailableParts(data);
  };

  const fetchExchangeRate = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'exchange_rate').single();
    if (data?.value) setExchangeRate(parseFloat(data.value) || 1000);
  };

  const totalPartsCostARS = calcCostARS(repairParts, exchangeRate);
  const totalCostARS = totalPartsCostARS + (laborCost || 0);

  const handleAddPart = async () => {
    if (!selectedPartId) return toast.error('Seleccioná un repuesto');
    const part = availableParts.find(p => p.id === selectedPartId);
    if (!part) return;
    if (part.stock < selectedQty) {
      return toast.error(`Stock insuficiente. Solo hay ${part.stock} disponibles`);
    }
    setAddingPart(true);
    try {
      const { error: insertErr } = await supabase.from('repair_parts').insert([{
        repair_id: repair.id,
        spare_part_id: part.id,
        spare_part_name: part.name,
        qty: selectedQty,
        cost_price: part.cost_price,
        currency: part.currency
      }]);
      if (insertErr) throw insertErr;

      await supabase.rpc('decrement_spare_part_stock', { part_id: part.id, qty: selectedQty });

      // Recalculate cost on the repair
      const newParts = [...repairParts, {
        spare_part_id: part.id, spare_part_name: part.name,
        qty: selectedQty, cost_price: part.cost_price, currency: part.currency
      }];
      const newCost = calcCostARS(newParts, exchangeRate) + (laborCost || 0);
      await supabase.from('repairs').update({ cost: newCost }).eq('id', repair.id);

      toast.success('Repuesto agregado');
      setSelectedPartId('');
      setSelectedQty(1);
      await fetchRepairParts();
      await fetchAvailableParts();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAddingPart(false);
    }
  };

  const handleRemovePart = async (rp: any) => {
    try {
      await supabase.from('repair_parts').delete().eq('id', rp.id);
      await supabase.rpc('increment_spare_part_stock', { part_id: rp.spare_part_id, qty: rp.qty });

      const remaining = repairParts.filter(p => p.id !== rp.id);
      const newCost = calcCostARS(remaining, exchangeRate) + (laborCost || 0);
      await supabase.from('repairs').update({ cost: newCost }).eq('id', repair.id);

      toast.success('Repuesto quitado');
      await fetchRepairParts();
      await fetchAvailableParts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const budget = parseFloat(f.budget) || 0;
      const deposit_paid = parseFloat(repair.deposit_paid) || 0;
      const pending_balance = budget - deposit_paid;
      const isDeliveringWithBalance = f.status === 'ENTREGADO' && repair.status !== 'ENTREGADO' && pending_balance > 0;

      if (isDeliveringWithBalance && !collectDepositId) {
        toast.error('Seleccioná la caja para cobrar el saldo');
        setSaving(false);
        return;
      }

      const computedCost = totalPartsCostARS + (laborCost || 0);

      const { error } = await supabase.from('repairs').update({
        status: f.status,
        assigned_technician: f.assigned_technician,
        budget: parseFloat(f.budget) || null,
        cost: computedCost || null,
        labor_cost: laborCost || 0,
        notes: f.notes,
        updated_at: new Date().toISOString()
      }).eq('id', f.id);
      if (error) throw error;

      if (isDeliveringWithBalance) {
        const saleData = {
          seller_id: user.id, seller_name: user.name,
          deposit_id: parseInt(collectDepositId),
          brand: 'SERVICIO', model: 'COBRO REPARACIÓN',
          storage: '-', color: '-', imei: `REP-${f.id.split('-')[0]}`,
          cost_price: 0, price: pending_balance, currency: 'ARS',
          payments: [{ id: 'ars_cash', amount: pending_balance, original_amount: pending_balance, label: 'Efectivo ARS (Cobro)' }],
          customer: { name: repair.customer_name, phone: repair.customer_phone, id: repair.customer_id }
        };
        await supabase.from('sales').insert([saleData]);
        toast.success(`Saldo de $${pending_balance} cobrado a caja.`);
      }

      toast.success('Actualizado');
      onSave();
      onClose();
    } catch(e:any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if(!await confirm('¿Eliminar orden?')) return;
    try {
      await supabase.from('repairs').delete().eq('id', f.id);
      toast.success('Eliminada');
      onSave();
      onClose();
    } catch(e:any) { toast.error(e.message); }
  };

  const printTicket = () => {
    const printWin = window.open('', '_blank');
    if(!printWin) return;
    printWin.document.write(`
      <html><head><title>Ticket Reparacion</title>
      <style>body { font-family: monospace; padding: 20px; max-width: 300px; } h2, h3 { margin: 5px 0; }</style>
      </head><body>
      <h2>ORDEN DE REPARACION</h2>
      <div>Fecha: ${new Date(repair.created_at).toLocaleDateString()}</div>
      <div>Orden: #${repair.id.split('-')[0]}</div>
      <hr/>
      <h3>Cliente</h3>
      <div>${repair.customer_name} - ${repair.customer_phone || ''}</div>
      <hr/>
      <h3>Equipo</h3>
      <div>${repair.device_brand} ${repair.device_model} ${repair.device_color ? `(${repair.device_color})` : ''}</div>
      <div>Falla: ${repair.issue_description}</div>
      ${repair.visual_condition ? `<div>Condición: ${repair.visual_condition}</div>` : ''}
      <hr/>
      <div>Seña dejada: $${repair.deposit_paid || 0}</div>
      <hr/>
      <div style="font-size: 10px; margin-top: 20px;">Firma cliente: ......................</div>
      <div style="font-size: 10px; margin-top: 20px;">Pasados los 90 dias no nos hacemos cargo del equipo.</div>
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    printWin.document.close();
  };

  return (
    <div className="mo">
      <div className="mb" style={{ maxWidth: 600 }}>
        <div className="mh">
          <div className="mh-title">Orden #{repair.id.split('-')[0]}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-icon" onClick={printTicket} title="Imprimir Ticket"><Printer size={16} /></button>
            <button className="btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Cliente</div>
              <div style={{ fontWeight: 600 }}>{repair.customer_name}</div>
              <div>{repair.customer_phone}</div>
            </div>
            <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Equipo</div>
              <div style={{ fontWeight: 600 }}>{repair.device_brand} {repair.device_model}</div>
              <div>Pin: {repair.device_password || 'Sin pin'}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Falla reportada:</div>
            <div style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>{repair.issue_description}</div>
          </div>

          <div className="divider" />

          <div className="row">
            <div className="col field">
              <label className="lbl">Estado</label>
              <select className="inp" value={f.status} onChange={e=>setF({...f, status: e.target.value})}>
                {STATUSES.map((s:any)=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="col field">
              <label className="lbl">Técnico Asignado</label>
              <input className="inp" placeholder="Ej: Lucas (Externo)" value={f.assigned_technician || ''} onChange={e=>setF({...f, assigned_technician: e.target.value})} />
            </div>
          </div>

          {/* Repuestos usados */}
          <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={14} /> Repuestos usados
            </div>

            {repairParts.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>Sin repuestos asignados</div>
            ) : (
              <div style={{ marginBottom: 10 }}>
                {repairParts.map(rp => (
                  <div key={rp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{rp.spare_part_name}</span>
                      <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>x{rp.qty}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'JetBrains Mono' }}>
                      {rp.currency === 'USD' ? 'USD ' : '$'}{rp.cost_price} × {rp.qty}
                      {rp.currency === 'USD' && (
                        <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>
                          (≈ ${(rp.cost_price * exchangeRate * rp.qty).toLocaleString()})
                        </span>
                      )}
                    </div>
                    <button
                      className="btn-icon"
                      style={{ color: 'var(--red)' }}
                      onClick={() => handleRemovePart(rp)}
                      title="Quitar repuesto"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add part row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label className="lbl">Agregar repuesto</label>
                <select
                  className="inp"
                  value={selectedPartId}
                  onChange={e => setSelectedPartId(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {availableParts.map(p => (
                    <option key={p.id} value={p.id} disabled={p.stock === 0}>
                      {p.name} — Stock: {p.stock} ({p.currency === 'USD' ? 'USD ' : '$'}{p.cost_price})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: 70 }}>
                <label className="lbl">Cant.</label>
                <input
                  className="inp"
                  type="number"
                  min={1}
                  value={selectedQty}
                  onChange={e => setSelectedQty(parseInt(e.target.value) || 1)}
                />
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleAddPart}
                disabled={addingPart || !selectedPartId}
                style={{ marginBottom: 0 }}
              >
                {addingPart ? '...' : <><Plus size={13} /> Agregar</>}
              </button>
            </div>
          </div>

          {/* Mano de obra */}
          <div className="row">
            <div className="col field">
              <label className="lbl">Mano de obra (ARS)</label>
              <input
                className="inp"
                type="number"
                value={laborCost}
                onChange={e => setLaborCost(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="col field">
              <label className="lbl">Presupuesto Final ($)</label>
              <input className="inp" type="number" value={f.budget || ''} onChange={e=>setF({...f, budget: e.target.value})} />
              {repair.deposit_paid > 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Seña cobrada: ${repair.deposit_paid}</div>}
              {f.budget && (parseFloat(f.budget) - parseFloat(repair.deposit_paid || 0) > 0) && (
                <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginTop: 4 }}>
                  Saldo Pendiente: ${parseFloat(f.budget) - parseFloat(repair.deposit_paid || 0)}
                </div>
              )}
            </div>
          </div>

          {/* Cost breakdown */}
          {(repairParts.length > 0 || laborCost > 0) && (
            <div style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>Repuestos: <strong>${totalPartsCostARS.toLocaleString()}</strong></span>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span>Mano de obra: <strong>${(laborCost || 0).toLocaleString()}</strong></span>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span style={{ color: 'var(--text)', fontWeight: 700 }}>Total costo: ${totalCostARS.toLocaleString()}</span>
            </div>
          )}

          {f.status === 'ENTREGADO' && repair.status !== 'ENTREGADO' && f.budget && (parseFloat(f.budget) - parseFloat(repair.deposit_paid || 0) > 0) && deposits.length > 0 && (
            <div style={{ background: 'var(--surface-3)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Cobro de Saldo Pendiente</div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="lbl">Ingresar $ {parseFloat(f.budget) - parseFloat(repair.deposit_paid || 0)} a la caja:</label>
                <select className="inp" value={collectDepositId} onChange={e => setCollectDepositId(e.target.value)}>
                  {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="field">
            <label className="lbl">Notas internas / Reparación realizada</label>
            <textarea className="inp" style={{ minHeight: 60 }} value={f.notes || ''} onChange={e=>setF({...f, notes: e.target.value})} placeholder="Se cambió pin de carga, todo ok..." />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {isOwner && <button className="btn btn-ghost" style={{ color: 'var(--red)' }} onClick={handleDelete}>Eliminar</button>}
            <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleUpdate} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
          </div>
        </div>
      </div>
      {ConfirmDialog}
    </div>
  );
}
