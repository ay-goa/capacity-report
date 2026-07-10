import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@abgov/web-components'
import '@abgov/web-components/index.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
