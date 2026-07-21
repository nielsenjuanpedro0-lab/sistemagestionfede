import { createClient } from "@/utils/supabase/server"
import { getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ExpensesClient } from "./ExpensesClient"

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) redirect("/login")
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  if (!isSuperAdmin && profile?.role !== 'owner') redirect("/sell")

  const [
    { data: expensesData },
    { data: depositsData }
  ] = await Promise.all([
    supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('deposits').select('*').order('name')
  ])

  return (
    <ExpensesClient
      initialExpenses={expensesData || []}
      initialDeposits={depositsData || []}
      currentUser={{ id: user.id, email: user.email || '', name: isSuperAdmin ? 'Fede' : (profile?.name || user.email || '') }}
    />
  )
}
