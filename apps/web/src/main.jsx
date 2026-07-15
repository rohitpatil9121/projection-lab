import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import './index.css'
import { guardTextZoom } from './utils/textZoomGuard.js'

// Hash routing avoids blank screens on Android when opening deep links like /settings.
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter

if (Capacitor.isNativePlatform()) guardTextZoom()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)
