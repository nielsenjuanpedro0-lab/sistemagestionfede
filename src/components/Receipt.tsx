export function Receipt({ sale, shop }: any) {
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
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>CLIENTE</div>
      <div className="receipt-row"><span>Nombre:</span><span>{sale.customer?.name}</span></div>
      {sale.customer?.dni && <div className="receipt-row"><span>DNI:</span><span>{sale.customer?.dni}</span></div>}
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div className="receipt-row"><span>DÍA Y HORA:</span><span>{sale.created_at ? new Date(sale.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>PRODUCTO</div>
      {sale.brand === 'ACCESORIOS' ? (
        <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
          {(sale.accessories || []).map((a: any, i: number) => (
            <div key={i}>
              <strong>{a.qty}x {a.name}</strong>
              {a.is_gift
                ? <span style={{ fontSize: 10 }}> (regalo)</span>
                : <span style={{ fontSize: 10, opacity: 0.8 }}> — {sale.currency === 'USD' ? 'U$' : '$'} {((a.price || 0) * (a.qty || 1)).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>
          <strong>{sale.brand} {sale.model}</strong><br />
          <span style={{ fontSize: 11 }}>{sale.storage} · {sale.color}</span><br />
          <span style={{ fontSize: 10, opacity: 0.8 }}>IMEI/Serie: {sale.imei}</span>
          {(sale.accessories || []).length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11 }}>
              {sale.accessories.map((a: any, i: number) => (
                <div key={i}>+ {a.qty}x {a.name}{a.is_gift ? ' (regalo)' : ''}</div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div className="receipt-row"><span>GARANTÍA:</span><span>{sale.notes || '—'}</span></div>
      <div style={{ margin: '15px 0', borderBottom: '1px dashed #ccc' }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 11 }}>PAGO</div>
      {sale.payments?.map((p: any, i: number) => (
        <div key={i} className="receipt-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{p.label || p.id}:</span>
            {p.exchange_rate && <span style={{ fontSize: 10, color: '#666' }}>({p.currency === 'USD' ? 'U$' : 'ARS'} {p.original_amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })} a cot. {p.exchange_rate})</span>}
          </div>
          <span>{sale.currency === 'USD' ? 'U$' : 'ARS'} {p.amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
        </div>
      ))}
      <div style={{ marginTop: 20, padding: 12, background: '#f9f9f9', borderRadius: 4 }}>
        <div className="receipt-row" style={{ fontWeight: 'bold', fontSize: 14 }}>
          <span>TOTAL:</span>
          <span>{sale.currency === 'USD' ? 'U$' : 'ARS'} {sale.price?.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
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
