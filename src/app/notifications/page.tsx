'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Check, Loader2, Trash2, Reply, Send, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/context/ToastContext'

interface Notification {
    id: string
    title: string
    message: string
    type: string
    is_read: boolean
    created_at: string
    sender_id?: string
    sender?: {
        username: string
        full_name: string
        avatar_url: string
    }
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [replyTarget, setReplyTarget] = useState<any>(null)
    const [replyMessage, setReplyMessage] = useState('')
    const [sendingReply, setSendingReply] = useState(false)
    const router = useRouter()
    const { success, error } = useToast()

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

            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id })
            })

        } catch (error) {
            console.error('Error marking as read:', error)
            fetchNotifications() // Revert on error
        }
    }

    const markAllRead = async () => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: 'all' })
            })

        } catch (error) {
            console.error('Error marking all as read:', error)
            fetchNotifications()
        }
    }

    const deleteNotification = async (id: string) => {
        try {
            setNotifications(prev => prev.filter(n => n.id !== id))
            await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
        } catch (error) {
            console.error('Error deleting notification:', error)
        }
    }

    const openReplyModal = (sender: any) => {
        setReplyTarget(sender)
        setReplyMessage('')
    }

    const handleSendReply = async () => {
        if (!replyMessage.trim() || !replyTarget) return
        setSendingReply(true)
        try {
            const res = await fetch('/api/user/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: replyTarget.id, message: replyMessage, isReply: true })
            })

            const data = await res.json()

            if (res.ok) {
                // Check if bonus points were awarded
                if (data.bonusPoints) {
                    success(`${data.message}`)
                } else {
                    success('Reply sent!')
                }
                setReplyTarget(null)
                fetchNotifications() // Refresh to see bonus notification
            } else {
                error(data.error || 'Failed to send reply')
            }
        } catch (e) {
            error('Error sending reply')
        } finally {
            setSendingReply(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-white p-4 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#FC4C02]" size={32} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white pb-32">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-10 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/[0.06] p-4">
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
                            className="text-center py-12 text-gray-500 border border-dashed border-white/[0.12] rounded-2xl"
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
                                    ? 'bg-[#111111] border-white/[0.06] opacity-70'
                                    : 'bg-[#111111] border-[#FC4C02]/30 shadow-[0_0_15px_-5px_#FC4C02]'
                                    }`}
                            >
                                <div className="flex gap-4">
                                    {/* Sender Avatar or Default Icon */}
                                    <div className="shrink-0 pt-1">
                                        {notification.sender ? (
                                            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/[0.12]">
                                                <img
                                                    src={notification.sender.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.sender.username}`}
                                                    alt={notification.sender.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/[0.12]">
                                                <Bell size={18} className="text-[#FC4C02]" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <h3 className={`font-bold text-sm ${notification.is_read ? 'text-gray-400' : 'text-white'}`}>
                                                {notification.sender ? `@${notification.sender.username}` : notification.title}
                                            </h3>
                                            <span className="text-[10px] text-gray-600 shrink-0 tabular-nums">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </span>
                                        </div>

                                        <p className="text-gray-400 text-xs leading-relaxed mb-3">
                                            {notification.message}
                                        </p>

                                        <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.06]">
                                            {notification.sender && (
                                                <button
                                                    onClick={() => openReplyModal({ ...notification.sender, id: notification.sender_id })}
                                                    className="text-xs font-bold text-[#FC4C02] hover:text-orange-400 flex items-center gap-1 transition-colors mr-auto"
                                                >
                                                    <Reply size={14} /> Reply
                                                </button>
                                            )}
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

            {/* Reply Modal */}
            <AnimatePresence>
                {replyTarget && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-[#FC4C02] rounded-2xl p-6 w-full max-w-sm relative"
                        >
                            <button onClick={() => setReplyTarget(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>

                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Reply className="text-[#FC4C02]" size={20} />
                                Reply to @{replyTarget.username}
                            </h3>

                            <div className="flex items-center gap-3 mb-4 p-3 bg-black/50 rounded-lg">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/[0.12]">
                                    <img
                                        src={replyTarget.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                                        alt={replyTarget.username || 'avatar'}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-2 italic">"{replyMessage || 'Tulis balasanmu di bawah...'}"</p>
                            </div>

                            <textarea
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                className="w-full bg-black border border-white/[0.12] rounded-lg p-3 text-sm focus:border-[#FC4C02] outline-none mb-4 h-24 resize-none"
                                placeholder="Type your reply..."
                                autoFocus
                            />

                            <button
                                onClick={handleSendReply}
                                disabled={sendingReply || !replyMessage.trim()}
                                className="w-full py-2 bg-[#FC4C02] rounded-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#e04402] transition-colors"
                            >
                                {sendingReply ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={16} />}
                                Send Reply
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
