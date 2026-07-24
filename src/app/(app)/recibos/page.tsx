import { createClient } from '@/utils/supabase/server'
import { RecibosClient } from './RecibosClient'

export const dynamic = 'force-dynamic'

export default async function RecibosPage() {
  const supabase = await createClient()

  const [{ data: sales }, { data: settings }] = await Promise.all([
    supabase.from('sales').select('*').neq('brand', 'MOVIMIENTO').order('created_at', { ascending: false }).limit(200),
    supabase.from('settings').select('*').single()
  ])

  return <RecibosClient sales={sales || []} shop={settings || {}} />
}
