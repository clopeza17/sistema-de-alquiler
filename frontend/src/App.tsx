import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppRoutes from './router'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <AppRoutes />
        <Toaster 
          position="top-right"
          expand={true}
          richColors
          toastOptions={{
            duration: 3500,
            classNames: {
              success: 'shadow-lg',
              error: 'shadow-lg',
              warning: 'shadow-lg',
              info: 'shadow-lg',
            },
          }}
        />
      </div>
    </BrowserRouter>
  )
}

export default App
