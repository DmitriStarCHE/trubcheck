import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'

const CalculatorPage = lazy(() => import('./pages/CalculatorPage'))
const AccountingPage = lazy(() => import('./pages/AccountingPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))

function LoadingFallback() {
  return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Загрузка...</div>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Suspense fallback={<LoadingFallback />}><CalculatorPage /></Suspense> },
      { path: 'accounting', element: <Suspense fallback={<LoadingFallback />}><AccountingPage /></Suspense> },
      { path: 'history', element: <Suspense fallback={<LoadingFallback />}><HistoryPage /></Suspense> },
    ],
  },
])

export default function Router() {
  return <RouterProvider router={router} />
}
