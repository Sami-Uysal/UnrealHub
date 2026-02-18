import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'

import { AppearanceProvider } from './context/AppearanceContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppearanceProvider>
      <App />
    </AppearanceProvider>
  </React.StrictMode>,
)

window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
