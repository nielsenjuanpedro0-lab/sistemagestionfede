import { createClient, getUser, getProfile } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { RecibosClient } from './RecibosClient'

export const dynamic = 'force-dynamic'

export default async function RecibosPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  const isOwner = isSuperAdmin || profile?.role === 'owner'
  const assignedDeposits: string[] = (profile?.deposit_ids || []).map(String)

  const supabase = await createClient()

  const [{ data: sales }, { data: settings }, { data: stock }] = await Promise.all([
    supabase.from('sales').select('*').neq('brand', 'MOVIMIENTO').order('created_at', { ascending: false }).limit(200),
    supabase.from('settings').select('*').single(),
    supabase.from('stock').select('*').eq('status', 'available').order('created_at', { ascending: false }),
  ])

  const visibleStock = isOwner
    ? stock || []
    : (stock || []).filter((s: any) => assignedDeposits.includes(String(s.deposit)))

  return (
    <RecibosClient
      sales={sales || []}
      shop={settings || {}}
      stock={visibleStock}
      seller={{ id: user.id, name: isSuperAdmin ? 'Fede' : (profile?.name || user.email) }}
    />
  )
}
