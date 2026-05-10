import {
  Bot,
  FileSliders,
  KanbanSquare,
  LayoutDashboard,
  Megaphone,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { cn } from '../../lib/utils'

const navigationItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: UsersRound, label: 'Leads', to: '/leads' },
  { icon: Megaphone, label: 'Campanhas', to: '/campaigns' },
  { icon: FileSliders, label: 'Campos de Leads', to: '/settings/lead-fields' },
  { icon: KanbanSquare, label: 'Regras do Funil', to: '/settings/pipeline-rules' },
  { icon: Bot, label: 'Configurações de IA', to: '/settings/ai' },
]

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-5 px-4 py-4 lg:px-5 lg:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">Mini CRM SDR</p>
              <p className="text-xs text-slate-500">Gestão comercial com IA</p>
            </div>
          </div>

          <nav
            className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
            aria-label="Navegação principal"
          >
            {navigationItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950',
                      isActive && 'bg-slate-950 text-white hover:bg-slate-950 hover:text-white',
                    )
                  }
                  to={item.to}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </aside>

      <main className="w-full px-4 py-6 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
