"use client"
import { useState, useRef, useEffect } from 'react';
import { EAN_DB } from '@/constants/data';
import { ScanLine, Check, PenLine, Camera, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ManualEntryModal } from '@/components/ManualEntryModal';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

const isOldPro = (m: string) => {
  if (!m || typeof m !== 'string') return false;
  return m.includes('Pro') && (m.includes('14') || m.includes('13') || m.includes('12') || m.includes('11') || m.includes('XS'));
};

export function ScanClient({ initialDeposits }: { initialDeposits: any[] }) {
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'idle' | 'confirm'>('idle');
  const [det, setDet] = useState<any>(null);
  const [dep, setDep] = useState<any>(initialDeposits[0]?.id);
  const [sup, setSup] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [price, setPrice] = useState('');
  const [cur, setCur] = useState('USD');
  const [imei, setImei] = useState('');
  const [cond, setCond] = useState('new');
  const [battery, setBattery] = useState('100%');
  const [notes, setNotes] = useState('');
  const [showManual, setShowManual] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('suppliers').select('*').order('name').then(({ data }) => {
      if (data && data.length > 0) {
        setSuppliers(data);
        setSup(data[0].id);
      }
    });
    ref.current?.focus();
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const processCode = (scannedCode: string) => {
    if (!scannedCode.trim()) return;
    const found = EAN_DB[scannedCode.trim()];
    if (found) {
      setDet(found);
      setCond(isOldPro(found.model) ? 'used' : 'new');
      setMode('confirm');
    } else {
      toast.error('EAN no reconocido — completá los datos manualmente');
      setShowManual(true);
    }
    setCode('');
  };

  const onScan = () => processCode(code);

  const startCamera = async () => {
    setScanning(true);
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
              setScanning(false);
              setCode(decodedText);
              processCode(decodedText);
            }).catch(() => {});
          }
        },
        () => {}
      ).catch(() => {
        setScanning(false);
        toast.error('Error al acceder a la cámara. Revisa los permisos.');
      });
    }, 200);
  };

  const stopCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        setScanning(false);
      }).catch(() => {
        setScanning(false);
      });
    } else {
      setScanning(false);
    }
  };

  const confirm = async () => {
    if (!det || !price || !dep) { toast.error('Datos incompletos'); return; }
    try {
      const { data: inserted, error } = await supabase.from('stock').insert([{
        brand: det.brand,
        model: det.model,
        storage: det.storage,
        color: det.color,
        condition: cond,
        battery: cond === 'used' ? battery : null,
        imei: imei || `S/N-${Date.now()}`,
        price: parseFloat(price),
        currency: cur,
        deposit: dep,
        supplier_id: sup,
        status: 'available',
        notes: notes.trim() || null
      }]).select();
      if (error) throw error;
      if (inserted) {
        toast.success('✅ Equipo ingresado al stock');
        setMode('idle'); setDet(null); setPrice(''); setImei(''); setCond('new'); setBattery('100%'); setNotes('');
        ref.current?.focus();
      }
    } catch (e: any) {
      if (e.message?.includes('stock_imei_key')) {
        toast.error('Este IMEI / Serie ya se encuentra registrado.');
      } else {
        toast.error(e.message || 'Error al guardar');
      }
    }
  };

  return (
    <div className="page">
      <div className="sh" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="st">Ingreso de Stock</h1>
          <p className="helper-text">Escaneá el código EAN de la caja o usá la carga manual.</p>
        </div>
        <button className="btn btn-outline" onClick={() => setShowManual(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <PenLine size={16} /> Carga Manual
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="lbl">Escanear Caja (EAN / UPC)</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-dark" style={{ padding: '0 20px' }} onClick={startCamera} title="Escanear con Cámara">
            <Camera size={18} />
          </button>
          <input
            ref={ref} className="inp" value={code} onChange={e => setCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onScan(); } }}
            placeholder="Pistoleá el código o escanea con la cámara..." style={{ fontSize: 16, padding: 16, flex: 1 }} autoComplete="off"
          />
          <button className="btn btn-dark" onClick={onScan}><ScanLine size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>Si el código no está registrado, se abrirá el formulario de carga manual automáticamente.</p>
        {scanning && (
          <div style={{ marginTop: 20, position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid var(--border)' }}>
            <div id="reader" style={{ width: '100%' }}></div>
            <button className="btn btn-dark" style={{ position: 'absolute', top: 10, right: 10, padding: 8, borderRadius: '50%', zIndex: 10, minHeight: 'auto' }} onClick={stopCamera}>
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {mode === 'confirm' && det && (
        <div className="card">
          <div className="lbl">✅ Equipo Detectado — Confirmar Ingreso</div>
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{det.brand} {det.model}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>{det.storage} · {det.color}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Precio Costo</label>
              <input className="inp" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" autoFocus />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Moneda</label>
              <select className="inp" value={cur} onChange={e => setCur(e.target.value)}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">IMEI / Serie</label>
              <input className="inp" value={imei} onChange={e => setImei(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Condición</label>
              <select className="inp" value={cond} onChange={e => setCond(e.target.value)}>
                <option value="new">Sellado</option>
                <option value="used">Usado</option>
              </select>
            </div>
            {cond === 'used' && (
              <div className="field" style={{ margin: 0 }}>
                <label className="lbl">Batería</label>
                <datalist id="battery-scan-options">
                  {['100%', '95%', '90%', '85%', '80%', '75%', '70%', 'Sin dato'].map(b => <option key={b} value={b} />)}
                </datalist>
                <input className="inp" list="battery-scan-options" placeholder="Ej: 87%" value={battery} onChange={e => setBattery(e.target.value)} />
              </div>
            )}
            <div className="field" style={{ margin: 0 }}>
              <label className="lbl">Depósito</label>
              <select className="inp" value={dep ? String(dep) : ''} onChange={e => setDep(e.target.value)}>
                {initialDeposits.map((d: any) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </div>
            {suppliers.length > 0 && (
              <div className="field" style={{ margin: 0 }}>
                <label className="lbl">Proveedor</label>
                <select className="inp" value={sup ? String(sup) : ''} onChange={e => setSup(e.target.value)}>
                  {suppliers.map((s: any) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label className="lbl">Observaciones (opcional)</label>
            <input className="inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: golpe en marco, sin caja..." />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => { setMode('idle'); setDet(null); }}>Cancelar</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={confirm}>
              <Check size={18} style={{ marginRight: 8 }} /> Confirmar Ingreso
            </button>
          </div>
        </div>
      )}

      <ManualEntryModal 
        open={showManual} 
        onClose={() => setShowManual(false)} 
        onSuccess={() => toast.success('Equipo ingresado.')} 
      />
    </div>
  );
}
