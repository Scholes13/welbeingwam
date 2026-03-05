import Image from 'next/image'
import { Footprints, Plus, RotateCcw, Search, Target, Trash2 } from 'lucide-react'

import type { AdminUser } from '../types'

type UsersTabProps = {
  loading: boolean
  users: AdminUser[]
  filteredUsers: AdminUser[]
  searchTerm: string
  selectedUserIds: string[]
  isAllSelected: boolean
  onSearchTermChange: (value: string) => void
  onToggleSelectAll: () => void
  onToggleSelectUser: (id: string) => void
  onOpenBulkPointsModal: () => void
  onOpenBulkResetModal: () => void
  onOpenPointsModal: (user: { id: string; name: string }) => void
  onOpenStepsModal: (user: { id: string; name: string }) => void
  onOpenResetModal: (user: { id: string; name: string }) => void
  onPromptDeleteUser: (id: string, username: string) => void
}

function displayName(user: AdminUser): string {
  return user.full_name || user.username || 'User'
}

function displayUsername(user: AdminUser): string {
  return user.username || '-'
}

function displayAvatarUrl(user: AdminUser): string {
  return user.avatar_url || '/placeholder-avatar.png'
}

function displayAccessCode(user: AdminUser): string {
  return user.access_code || '-'
}

export function UsersTab(props: UsersTabProps) {
  const {
    loading,
    users,
    filteredUsers,
    searchTerm,
    selectedUserIds,
    isAllSelected,
    onSearchTermChange,
    onToggleSelectAll,
    onToggleSelectUser,
    onOpenBulkPointsModal,
    onOpenBulkResetModal,
    onOpenPointsModal,
    onOpenStepsModal,
    onOpenResetModal,
    onPromptDeleteUser,
  } = props

  return (
    <>
      <div className="hidden md:block bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Search users by name or username..."
              className="w-full bg-black border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
            />
          </div>
        </div>

        {selectedUserIds.length > 0 && (
          <div className="bg-[#FC4C02]/10 p-4 flex items-center justify-between border-b border-[#FC4C02]/20 animate-in fade-in slide-in-from-top-2">
            <div className="text-[#FC4C02] font-bold text-sm">{selectedUserIds.length} Users Selected</div>
            <div className="flex gap-2">
              <button
                onClick={onOpenBulkPointsModal}
                className="px-4 py-2 bg-[#FC4C02] text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Bulk Add Points
              </button>
              <button
                onClick={onOpenBulkResetModal}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <RotateCcw size={16} /> Bulk Reset
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-left">
          <thead className="bg-black/50 text-gray-400 text-sm uppercase">
            <tr>
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-gray-600 bg-black/50 text-[#FC4C02] focus:ring-[#FC4C02]"
                />
              </th>
              <th className="p-4">User</th>
              <th className="p-4">Username</th>
              <th className="p-4">Access Code</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => onToggleSelectUser(user.id)}
                      className="w-4 h-4 rounded border-gray-600 bg-black/50 text-[#FC4C02] focus:ring-[#FC4C02]"
                    />
                  </td>
                  <td className="p-4 flex items-center gap-3">
                    <Image
                      src={displayAvatarUrl(user)}
                      width={40}
                      height={40}
                      unoptimized
                      className="w-10 h-10 rounded-full"
                      alt=""
                    />
                    <span className="font-medium">{displayName(user)}</span>
                  </td>
                  <td className="p-4 font-mono text-gray-400">@{displayUsername(user)}</td>
                  <td className="p-4 font-mono text-[#FC4C02]">{displayAccessCode(user)}</td>
                  <td className="p-4">
                    <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-full text-xs font-bold">Active</span>
                  </td>
                  <td className="p-4 text-right">
                    {user.username !== 'admin_wam' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onOpenPointsModal({ id: user.id, name: displayName(user) })}
                          title="Adjust Points"
                          className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
                        >
                          <Target size={14} />
                        </button>
                        <button
                          onClick={() => onOpenStepsModal({ id: user.id, name: displayName(user) })}
                          title="Adjust Steps"
                          className="p-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors"
                        >
                          <Footprints size={14} />
                        </button>
                        <button
                          onClick={() => onOpenResetModal({ id: user.id, name: displayName(user) })}
                          title="Reset Points"
                          className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => onPromptDeleteUser(user.id, user.username || 'unknown')}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-[#1a1a1a] border border-white/10 p-4 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Image
                  src={displayAvatarUrl(user)}
                  width={40}
                  height={40}
                  unoptimized
                  className="w-10 h-10 rounded-full shrink-0 object-cover"
                  alt=""
                />
                <div className="min-w-0">
                  <div className="font-bold truncate">{displayName(user)}</div>
                  <div className="text-xs text-gray-500 font-mono truncate">@{displayUsername(user)}</div>
                  <div className="text-xs text-[#FC4C02] font-mono mt-1 bg-[#FC4C02]/10 inline-block px-1.5 py-0.5 rounded">
                    {user.access_code || 'NO-CODE'}
                  </div>
                </div>
              </div>

              {user.username !== 'admin_wam' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenPointsModal({ id: user.id, name: displayName(user) })}
                    className="p-2 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg shrink-0 transition-colors"
                  >
                    <Target size={18} />
                  </button>
                  <button
                    onClick={() => onOpenStepsModal({ id: user.id, name: displayName(user) })}
                    className="p-2 text-purple-500 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg shrink-0 transition-colors"
                  >
                    <Footprints size={18} />
                  </button>
                  <button
                    onClick={() => onOpenResetModal({ id: user.id, name: displayName(user) })}
                    className="p-2 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg shrink-0 transition-colors"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={() => onPromptDeleteUser(user.id, user.username || 'unknown')}
                    className="p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg shrink-0 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  )
}
