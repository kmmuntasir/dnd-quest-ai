import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { NotFound } from './components/common/NotFound';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingPage } from './components/ui/LoadingSpinner';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Library = lazy(() => import('./pages/Library'));
const Game = lazy(() => import('./pages/Game'));
const Settings = lazy(() => import('./pages/Settings'));
const Gallery = lazy(() => import('./pages/Gallery'));
const CharacterCreation = lazy(() => import('./components/game/CharacterCreation'));

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
        path: 'create-character/:adventureId',
        element: (
          <LazyRoute>
            <CharacterCreation />
          </LazyRoute>
        )
      },
      {
        path: 'game/:gameId',
        element: (
          <LazyRoute>
            <Game />
          </LazyRoute>
        )
      },
      {
        path: 'settings',
        element: (
          <LazyRoute>
            <Settings />
          </LazyRoute>
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
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
