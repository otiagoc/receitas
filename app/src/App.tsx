import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { RecipesProvider } from './hooks/useRecipes';
import { ShoppingProvider } from './hooks/useShopping';
import { TimersProvider } from './hooks/useTimers';
import { ToastProvider } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import Layout from './components/Layout';
import SketchLoader from './components/SketchLoader';
import Login from './pages/Login';
import Home from './pages/Home';
import WhatCanICook from './pages/WhatCanICook';
import RecipePage from './pages/Recipe';
import Cook from './pages/Cook';
import Shopping from './pages/Shopping';
import Add from './pages/Add';
import Settings from './pages/Settings';

function Gate() {
  const { session, loading } = useAuth();
  useTheme();
  if (loading) return <div className="login"><SketchLoader size={140} /></div>;
  if (!session) return <Login />;
  return (
    <RecipesProvider>
      <ShoppingProvider>
        <TimersProvider>
          <Routes>
            <Route path="/receita/:id/cozinhar" element={<Cook />} />
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="o-que-faco" element={<WhatCanICook />} />
              <Route path="receita/:id" element={<RecipePage />} />
              <Route path="lista" element={<Shopping />} />
              <Route path="add" element={<Add />} />
              <Route path="definicoes" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </TimersProvider>
      </ShoppingProvider>
    </RecipesProvider>
  );
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
