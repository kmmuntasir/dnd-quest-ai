import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Game } from './pages/Game';
import { Settings } from './pages/Settings';
import { Gallery } from './pages/Gallery';
import { Layout } from './components/common/Layout';
import { NotFound } from './components/common/NotFound';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CharacterCreation } from './components/game/CharacterCreation';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <ErrorBoundary><Home /></ErrorBoundary> },
      { path: 'library', element: <ErrorBoundary><Library /></ErrorBoundary> },
      { path: 'create-character/:adventureId', element: <ErrorBoundary><CharacterCreation /></ErrorBoundary> },
      { path: 'game/:gameId', element: <ErrorBoundary><Game /></ErrorBoundary> },
      { path: 'settings', element: <ErrorBoundary><Settings /></ErrorBoundary> },
      { path: 'gallery/:adventureId', element: <ErrorBoundary><Gallery /></ErrorBoundary> }
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
