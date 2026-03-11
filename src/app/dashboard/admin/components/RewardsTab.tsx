import { Pencil, Trash2 } from 'lucide-react'

import type { AdminReward } from '../types'

type RewardsTabProps = {
  rewards: AdminReward[]
  onOpenRewardDetail: (rewardId: string) => void
  onEditReward: (reward: AdminReward) => void
  onDeleteReward: (id: string, title: string) => void
}

export function RewardsTab({ rewards, onOpenRewardDetail, onEditReward, onDeleteReward }: RewardsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rewards.map((reward) => (
        <div
          key={reward.id}
          onClick={() => onOpenRewardDetail(reward.id)}
          className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-[#FC4C02] transition-colors group"
        >
          <div>
            <div className="flex justify-between items-start mb-4 gap-4">
              <h3 className="text-xl font-bold flex-1 break-words group-hover:text-[#FC4C02] transition-colors">{reward.title}</h3>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-col items-end">
                  {reward.required_points > 0 && (
                    <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-lg font-mono text-xs font-bold whitespace-nowrap mb-1">
                      {reward.required_points} PTS
                    </span>
                  )}
                  {reward.required_steps > 0 && (
                    <span className="bg-blue-500/20 text-blue-500 px-2 py-1 rounded-lg font-mono text-xs font-bold whitespace-nowrap">
                      {reward.required_steps} STEPS
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onEditReward(reward)
                    }}
                    className="text-gray-500 hover:text-blue-500 hover:bg-white/5 p-1.5 rounded-lg transition-colors z-10"
                    title="Edit Reward"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onDeleteReward(reward.id, reward.title)
                    }}
                    className="text-gray-500 hover:text-red-500 hover:bg-white/5 p-1.5 rounded-lg transition-colors z-10"
                    title="Delete Reward"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4 line-clamp-3">{reward.description}</p>
          </div>
          <div className="flex justify-between items-end border-t border-white/5 pt-4">
            <div className="text-xs text-gray-500">
              <div className="uppercase font-bold mb-1">Claims</div>
              <span className={reward.max_claims > 0 && reward.total_claimed >= reward.max_claims ? 'text-red-500' : 'text-white'}>
                {reward.total_claimed} / {reward.max_claims === 0 ? '∞' : reward.max_claims}
              </span>
            </div>
            <div className={`text-xs font-bold uppercase tracking-wider ${reward.is_active ? 'text-green-500' : 'text-red-500'} `}>
              {reward.is_active ? '● Active' : '● Inactive'}
            </div>
          </div>
        </div>
      ))}
      {rewards.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">No rewards found. Create one to get started.</div>
      )}
    </div>
  )
}
