import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { CampaignsPage } from '../pages/CampaignsPage'
import { DashboardPage } from '../pages/DashboardPage'
import { LeadFieldsPage } from '../pages/LeadFieldsPage'
import { LeadsPage } from '../pages/LeadsPage'
import { LoginPage } from '../pages/LoginPage'
import { PipelineRulesPage } from '../pages/PipelineRulesPage'
import { RegisterPage } from '../pages/RegisterPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'leads',
            element: <LeadsPage />,
          },
          {
            path: 'campaigns',
            element: <CampaignsPage />,
          },
          {
            path: 'settings/lead-fields',
            element: <LeadFieldsPage />,
          },
          {
            path: 'settings/pipeline-rules',
            element: <PipelineRulesPage />,
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
])
