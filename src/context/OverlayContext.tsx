'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

interface OverlayContextValue {
    activeCount: number
    isActive: boolean
    pushOverlay: () => void
    popOverlay: () => void
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined)

export function OverlayProvider({ children }: { children: React.ReactNode }) {
    const [activeCount, setActiveCount] = useState(0)

    const pushOverlay = useCallback(() => {
        setActiveCount((count) => count + 1)
    }, [])

    const popOverlay = useCallback(() => {
        setActiveCount((count) => Math.max(0, count - 1))
    }, [])

    const value = useMemo<OverlayContextValue>(() => ({
        activeCount,
        isActive: activeCount > 0,
        pushOverlay,
        popOverlay,
    }), [activeCount, pushOverlay, popOverlay])

    return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}

export function useOverlayState(): OverlayContextValue {
    const context = useContext(OverlayContext)
    if (!context) {
        return { activeCount: 0, isActive: false, pushOverlay: () => {}, popOverlay: () => {} }
    }
    return context
}

/**
 * Register a fullscreen overlay while `active` is true.
 * Increments overlay count so BottomNav (and similar surfaces) can hide.
 */
export function useFullscreenOverlay(active: boolean) {
    const { pushOverlay, popOverlay } = useOverlayState()

    useEffect(() => {
        if (!active) return
        pushOverlay()
        return () => popOverlay()
    }, [active, pushOverlay, popOverlay])
}
