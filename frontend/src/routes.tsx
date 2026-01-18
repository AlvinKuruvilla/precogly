import { createBrowserRouter, Navigate } from 'react-router-dom'
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
  Signup,
  ForgotPassword,
  ResetPassword,
  SharedThreatModelView,
  AcceptInvitation,
  SettingsLayout,
  ProfileSettings,
  OrganizationSettings,
  MemberManagement,
  TeamManagement,
} from '@/pages'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password/:uid/:token',
    element: <ResetPassword />,
  },
  // Public magic link route (no auth required)
  {
    path: '/share/:token',
    element: <SharedThreatModelView />,
  },
  // Team invitation route (works for both logged-in and logged-out users)
  {
    path: '/invite/:token',
    element: <AcceptInvitation />,
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
      // Settings routes
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: 'profile', element: <ProfileSettings /> },
          { path: 'organization', element: <OrganizationSettings /> },
          { path: 'members', element: <MemberManagement /> },
          { path: 'teams', element: <TeamManagement /> },
        ],
      },
    ],
  },
])
