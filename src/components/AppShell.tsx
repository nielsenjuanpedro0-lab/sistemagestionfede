"use client"
import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export function AppShell({ user, children }: { user: any, children: React.ReactNode }) {
  const [sbOpen, setSbOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()

  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'

  // Fetch profile client-side once — doesn't block navigation
  useEffect(() => {
    if (isSuperAdmin) {
      setProfile({ role: 'owner', name: 'Fede', initials: 'FE', color: '#f59e0b' })
      return
    }
    const supabase = createClient()
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setProfile(data))
  }, [user.id])

  const finalRole = isSuperAdmin ? 'owner' : (profile?.role || 'seller')

  const mergedUser = {
    ...profile,
    id: user.id,
    email: user.email,
    name: profile?.name || (isSuperAdmin ? 'Fede' : user.email),
    role: finalRole,
    initials: profile?.initials || (isSuperAdmin ? 'FE' : user.email?.substring(0, 2).toUpperCase()),
    color: profile?.color || (isSuperAdmin ? '#f59e0b' : '#ccc'),
    org_id: profile?.org_id || null
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const page = pathname.replace('/', '') || 'dashboard'

  return (
    <div className="app">
      <Sidebar
        user={mergedUser}
        page={page}
        setPage={(p) => setSbOpen(false)}
        onLogout={handleLogout}
        isOpen={sbOpen}
        isSuperAdmin={isSuperAdmin}
      />
      <div className="main" onClick={() => sbOpen && setSbOpen(false)}>
        <Topbar page={page} user={mergedUser} onMenu={() => setSbOpen(true)} onLogout={handleLogout} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          {children}
        </div>
      </div>
      <BottomNav page={page} user={mergedUser} onMenu={() => setSbOpen(true)} isSuperAdmin={isSuperAdmin} />
      {sbOpen && (
        <div className="sidebar-overlay" onClick={() => setSbOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, backdropFilter: 'blur(4px)'
        }}></div>
      )}
    </div>
  )
}
