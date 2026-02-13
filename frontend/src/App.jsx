import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { NotFound } from './components/common/NotFound';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingPage } from './components/ui/LoadingSpinner';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Library = lazy(() => import('./pages/Library'));
const Game = lazy(() => import('./pages/Game'));
const Settings = lazy(() => import('./pages/Settings'));
const Gallery = lazy(() => import('./pages/Gallery'));
const CharacterCreation = lazy(() => import('./components/game/CharacterCreation'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Wrapper component for lazy-loaded routes with error boundary
function LazyRoute({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingPage message="Loading..." />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Protected Route - requires authentication
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingPage message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <LazyRoute>{children}</LazyRoute>;
}

/**
 * Public Route - redirects to library if already authenticated
 */
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingPage message="Loading..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/library" replace />;
  }

  return <LazyRoute>{children}</LazyRoute>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <LazyRoute>
            <Home />
          </LazyRoute>
        )
      },
      {
        path: 'library',
        element: (
          <LazyRoute>
            <Library />
          </LazyRoute>
        )
      },
      {
        path: 'login',
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        )
      },
      {
        path: 'register',
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        )
      },
      {
        path: 'create-character/:adventureId',
        element: (
          <ProtectedRoute>
            <CharacterCreation />
          </ProtectedRoute>
        )
      },
      {
        path: 'game/:gameId',
        element: (
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        )
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        )
      },
      {
        path: 'gallery/:adventureId',
        element: (
          <LazyRoute>
            <Gallery />
          </LazyRoute>
        )
      }
    ]
  },
  {
    path: '*',
    element: <NotFound />
  }
]);

export function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
