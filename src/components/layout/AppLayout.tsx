import { LayoutDashboard } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { cn } from '../../lib/utils'

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Leads', to: '/leads' },
  { label: 'Campanhas', to: '/campaigns' },
  { label: 'Campos de Leads', to: '/settings/lead-fields' },
  { label: 'Regras do Funil', to: '/settings/pipeline-rules' },
]

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">Mini CRM SDR</p>
              <p className="text-xs text-slate-500">Base inicial do projeto</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="Navegação principal">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950',
                    isActive && 'bg-slate-950 text-white hover:bg-slate-950 hover:text-white',
                  )
                }
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
