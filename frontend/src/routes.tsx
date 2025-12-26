import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/components/layout'
import {
  Dashboard,
  ThreatModels,
  ThreatModelDetail,
  CreateThreatModel,
  Frameworks,
  TechComponents,
  ThreatLibraries,
  DFDEditor,
} from '@/pages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'threat-models', element: <ThreatModels /> },
      { path: 'threat-models/new', element: <CreateThreatModel /> },
      { path: 'threat-models/:id', element: <ThreatModelDetail /> },
      { path: 'threat-models/:id/diagrams/:diagramId', element: <DFDEditor /> },
      { path: 'frameworks', element: <Frameworks /> },
      { path: 'tech-components', element: <TechComponents /> },
      { path: 'threat-libraries', element: <ThreatLibraries /> },
    ],
  },
])
