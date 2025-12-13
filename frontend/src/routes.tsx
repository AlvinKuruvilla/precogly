import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/components/layout'
import {
  Dashboard,
  ThreatModels,
  Frameworks,
  TechComponents,
  ThreatLibraries,
} from '@/pages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'threat-models', element: <ThreatModels /> },
      { path: 'frameworks', element: <Frameworks /> },
      { path: 'tech-components', element: <TechComponents /> },
      { path: 'threat-libraries', element: <ThreatLibraries /> },
    ],
  },
])
