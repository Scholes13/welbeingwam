'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Check, Loader2, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface Notification {
    id: string
    title: string
    message: string
    type: string
    is_read: boolean
    created_at: string
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications')
            if (res.status === 401) {
                router.push('/')
                return
            }
            const data = await res.json()
            setNotifications(data.notifications || [])
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (id: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ))

            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: [id] })
            })

        } catch (error) {
            console.error('Error marking as read:', error)
            fetchNotifications() // Revert on error
        }
    }

    const markAllRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
            if (unreadIds.length === 0) return

            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: unreadIds })
            })

        } catch (error) {
            console.error('Error marking all as read:', error)
            fetchNotifications()
        }
    }

    const deleteNotification = async (id: string) => {
        try {
            setNotifications(prev => prev.filter(n => n.id !== id))

            await fetch(`/api/notifications?id=${id}`, {
                method: 'DELETE'
            })

        } catch (error) {
            console.error('Error deleting notification:', error)
            fetchNotifications()
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white p-4 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#FC4C02]" size={32} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 p-4">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="font-bold text-lg flex items-center gap-2">
                            <Bell className="text-[#FC4C02]" size={20} />
                            Notifications
                        </h1>
                    </div>
                    {notifications.some(n => !n.is_read) && (
                        <button
                            onClick={markAllRead}
                            className="text-xs font-bold text-[#FC4C02] hover:text-orange-400 transition-colors"
                        >
                            Mark all read
                        </button>
                    )}
                </div>
            </div>

            <div className="pt-20 px-4 max-w-md mx-auto space-y-4">
                <AnimatePresence mode="popLayout">
                    {notifications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl"
                        >
                            <Bell size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No notifications yet</p>
                        </motion.div>
                    ) : (
                        notifications.map((notification) => (
                            <motion.div
                                key={notification.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`p-4 rounded-2xl border transition-colors ${notification.is_read
                                    ? 'bg-[#1a1a1a] border-white/5 opacity-60'
                                    : 'bg-[#1a1a1a] border-[#FC4C02]/30 shadow-[0_0_15px_-5px_#FC4C02]'
                                    }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${notification.is_read ? 'bg-transparent' : 'bg-[#FC4C02]'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className={`font-bold text-sm mb-1 ${notification.is_read ? 'text-gray-400' : 'text-white'}`}>
                                                {notification.title}
                                            </h3>
                                            <span className="text-[10px] text-gray-600 shrink-0 tabular-nums">
                                                {new Date(notification.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-xs leading-relaxed mb-3">
                                            {notification.message}
                                        </p>

                                        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                                            {!notification.is_read && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                                                >
                                                    <Check size={14} /> Mark Read
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notification.id)}
                                                className="text-xs font-bold text-gray-600 hover:text-red-500 flex items-center gap-1 transition-colors"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
