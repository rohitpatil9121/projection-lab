import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { consumeBackPress } from '../hooks/backButton.js'

const ROOT_PATHS = new Set(['/', '/login'])

export default function AndroidBackHandler() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined

    let listener
    ;(async () => {
      const { App } = await import('@capacitor/app')
      listener = await App.addListener('backButton', () => {
        if (consumeBackPress()) return

        const path = window.location.hash.replace(/^#/, '') || '/'
        if (!ROOT_PATHS.has(path)) {
          navigate(-1)
          return
        }

        App.minimizeApp()
      })
    })()

    return () => { listener?.remove() }
  }, [navigate, pathname])

  return null
}
