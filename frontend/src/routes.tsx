import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import {
  Dashboard,
  ThreatModels,
  ThreatModelDetail,
  CreateThreatModel,
  Frameworks,
  TechComponents,
  ThreatLibraries,
  Countermeasures,
  DFDTemplates,
  Packs,
  InstalledPacks,
  DFDEditor,
  Login,
} from '@/pages'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'threat-models', element: <ThreatModels /> },
      { path: 'threat-models/new', element: <CreateThreatModel /> },
      { path: 'threat-models/:id', element: <ThreatModelDetail /> },
      { path: 'threat-models/:id/diagrams/:diagramId', element: <DFDEditor /> },
      { path: 'frameworks', element: <Frameworks /> },
      { path: 'packs', element: <Packs /> },
      { path: 'packs/installed', element: <InstalledPacks /> },
      { path: 'tech-components', element: <TechComponents /> },
      { path: 'threat-libraries', element: <ThreatLibraries /> },
      { path: 'countermeasures', element: <Countermeasures /> },
      { path: 'dfd-templates', element: <DFDTemplates /> },
    ],
  },
])
