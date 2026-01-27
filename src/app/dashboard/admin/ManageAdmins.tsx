'use client'

import { useState, useEffect } from 'react'
import { Shield, Save, Loader2, Check, X, Search, Plus, User } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

type Permission = 'manage_users' | 'manage_points' | 'manage_rewards' | 'view_activity' | 'manage_admins' | 'manage_content'

const ALL_PERMISSIONS: { key: Permission, label: string }[] = [
    { key: 'manage_users', label: 'Manage Users' },
    { key: 'manage_points', label: 'Manage Points' },
    { key: 'manage_rewards', label: 'Manage Rewards' },
    { key: 'manage_content', label: 'Manage Content (Quests/Surveys)' },
    { key: 'view_activity', label: 'View Activity' },
    { key: 'manage_admins', label: 'Manage Admins' },
]

export default function ManageAdmins() {
    const { success, error: toastError } = useToast()
    const [admins, setAdmins] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [tempPermissions, setTempPermissions] = useState<Permission[]>([])
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    const [newAdminPermissions, setNewAdminPermissions] = useState<Permission[]>([])
    const [selectedUserToAdd, setSelectedUserToAdd] = useState<any>(null)

    const handleSearch = async (term: string) => {
        setSearchTerm(term)
        if (term.length < 3) {
            setSearchResults([])
            return
        }
        setSearching(true)
        try {
            // Reusing the admin/users/list but filtering locally or using a search param if available
            // Since we don't have a dedicated search endpoint yet, let's fetch list and filter or just create a new endpoint?
            // Actually, admin/users/list returns all users (pagination might be an issue later but focusing on MVP).
            const res = await fetch('/api/admin/users/list')
            const data = await res.json()
            if (data.users) {
                const results = data.users.filter((u: any) =>
                    u.username?.toLowerCase().includes(term.toLowerCase()) ||
                    u.full_name?.toLowerCase().includes(term.toLowerCase())
                ).filter((u: any) => !admins.find(a => a.id === u.id)) // Exclude existing admins
                setSearchResults(results.slice(0, 5))
            }
        } catch (e) {
            console.error(e)
        } finally {
            setSearching(false)
        }
    }

    const handleAddAdmin = async () => {
        if (!selectedUserToAdd) return

        // Default to no permissions if none selected, or validation?
        if (newAdminPermissions.length === 0) {
            toastError('Select at least one permission')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/admin/admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: selectedUserToAdd.id,
                    permissions: newAdminPermissions
                })
            })

            if (res.ok) {
                success('Admin added successfully!')
                setSelectedUserToAdd(null)
                setSearchTerm('')
                setSearchResults([])
                setNewAdminPermissions([])
                fetchAdmins()
            } else {
                toastError('Failed to add admin')
            }
        } catch (e) {
            toastError('Error adding admin')
        } finally {
            setSaving(false)
        }
    }

    const toggleNewPermission = (key: Permission) => {
        if (newAdminPermissions.includes(key)) {
            setNewAdminPermissions(newAdminPermissions.filter(p => p !== key))
        } else {
            setNewAdminPermissions([...newAdminPermissions, key])
        }
    }

    useEffect(() => {
        fetchAdmins()
    }, [])

    const fetchAdmins = async () => {
        try {
            const res = await fetch('/api/admin/admins')
            const data = await res.json()
            if (data.admins) {
                setAdmins(data.admins)
            }
        } catch (e) {
            console.error(e)
            toastError('Failed to load admins')
        } finally {
            setLoading(false)
        }
    }

    const startEditing = (admin: any) => {
        setEditingId(admin.id)
        // If super admin (permissions=['*']), separate logic or just show all checked
        // But for granular editing, let's load actual array. 
        // If '*', map to all keys for UI representation? Or keep '*' special?
        // Let's assume '*' means everything is checked.
        if (admin.permissions && admin.permissions.includes('*')) {
            setTempPermissions(ALL_PERMISSIONS.map(p => p.key))
        } else {
            setTempPermissions(admin.permissions || [])
        }
    }

    const togglePermission = (key: Permission) => {
        if (tempPermissions.includes(key)) {
            setTempPermissions(tempPermissions.filter(p => p !== key))
        } else {
            setTempPermissions([...tempPermissions, key])
        }
    }

    const savePermissions = async () => {
        if (!editingId) return
        setSaving(true)
        try {
            const res = await fetch('/api/admin/admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: editingId,
                    permissions: tempPermissions
                })
            })

            if (res.ok) {
                success('Permissions updated!')
                setEditingId(null)
                fetchAdmins()
            } else {
                toastError('Failed to update')
            }
        } catch (e) {
            toastError('Error saving permissions')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-400" />
                Manage Admins
            </h2>

            {/* Add New Admin Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Plus size={18} className="text-purple-400" />
                    Add New Admin
                </h3>
                <div className="relative">
                    <div className="flex items-center gap-2 bg-black/50 border border-white/20 rounded-lg px-4 py-2 focus-within:border-purple-500 transition-colors">
                        <Search size={18} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search user by name or username..."
                            className="bg-transparent border-none outline-none text-white w-full placeholder:text-gray-600"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        {searching && <Loader2 size={16} className="animate-spin text-purple-500" />}
                    </div>

                    {searchResults.length > 0 && !selectedUserToAdd && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/20 rounded-lg overflow-hidden z-20 shadow-xl">
                            {searchResults.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => { setSelectedUserToAdd(user); setSearchResults([]); setSearchTerm('') }}
                                    className="w-full text-left p-3 hover:bg-white/10 flex items-center gap-3 transition-colors border-b border-white/5 last:border-none"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <User size={14} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white">{user.full_name}</div>
                                        <div className="text-xs text-white/50">@{user.username}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedUserToAdd && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-4 animate-fade-in">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                    {selectedUserToAdd.avatar_url ? <img src={selectedUserToAdd.avatar_url} className="w-full h-full object-cover" /> : <User size={18} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Promote {selectedUserToAdd.full_name}</h4>
                                    <p className="text-xs text-white/60">@{selectedUserToAdd.username}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUserToAdd(null)} className="text-white/40 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {ALL_PERMISSIONS.map(perm => (
                                <label key={perm.key} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={newAdminPermissions.includes(perm.key)}
                                        onChange={() => toggleNewPermission(perm.key)}
                                        className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                                    />
                                    {perm.label}
                                </label>
                            ))}
                        </div>

                        <button
                            onClick={handleAddAdmin}
                            disabled={saving || newAdminPermissions.length === 0}
                            className="w-full py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            Confirm & Promote Admin
                        </button>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {admins.map(admin => (
                    <div key={admin.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-white">{admin.full_name || 'Apps Admin'}</h3>
                                <p className="text-sm text-white/50">@{admin.username}</p>
                            </div>
                            {admin.permissions?.includes('*') && (
                                <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded-full border border-yellow-500/20">
                                    Super Admin
                                </span>
                            )}
                        </div>

                        {editingId === admin.id ? (
                            <div className="space-y-3 pt-2 border-t border-white/10">
                                <div className="grid grid-cols-2 gap-2">
                                    {ALL_PERMISSIONS.map(perm => (
                                        <label key={perm.key} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:text-white">
                                            <input
                                                type="checkbox"
                                                checked={tempPermissions.includes(perm.key)}
                                                onChange={() => togglePermission(perm.key)}
                                                className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                                            />
                                            {perm.label}
                                        </label>
                                    ))}
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                    <button
                                        onClick={savePermissions}
                                        disabled={saving}
                                        className="p-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-1">
                                    {(!admin.permissions || admin.permissions.length === 0) && (
                                        <span className="text-xs text-white/30 italic">No specific permissions</span>
                                    )}
                                    {admin.permissions?.map((p: string) => (
                                        <span key={p} className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/70">
                                            {p === '*' ? 'All Access' : p.replace('manage_', '').replace('view_', '')}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    onClick={() => startEditing(admin)}
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors border border-white/5 hover:border-white/10"
                                >
                                    Edit Permissions
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-200">
                    To add a new admin, first ask them to sign up. Then, as a Super Admin, find them in the "Users" tab (implementation pending integration) or ensure they appear here if they are already flagged.
                    <br />
                    (Currently this list shows users who <em>already</em> have permissions. To promote a user, we might need a "Promote to Admin" button in the User list.)
                </p>
            </div>
        </div>
    )
}
