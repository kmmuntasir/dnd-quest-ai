import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Game } from './pages/Game';
import { Settings } from './pages/Settings';
import { Layout } from './components/common/Layout';
import { NotFound } from './components/common/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'library', element: <Library /> },
      { path: 'game/:gameId', element: <Game /> },
      { path: 'settings', element: <Settings /> }
    ]
  },
  {
    path: '*',
    element: <NotFound />
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
