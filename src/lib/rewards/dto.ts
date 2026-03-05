import type { DisplayReward } from './service'

export type RewardsListResponse = {
  rewards: DisplayReward[]
  rerollPrice: number
  userStats: {
    totalPoints: number
    availableCoins: number
    totalSteps: number
  }
}

export type ClaimRewardResponse =
  | {
      success: true
    }
  | {
      error: string
    }

export type AvatarRerollResponse =
  | {
      success: true
      newAvatarUrl: string
      remainingCoins: number
    }
  | {
      error: string
    }

export type BackgroundGachaResponse =
  | {
      success: true
      background: {
        id: string
        name: string
        gradient: string
        image: string | null
      }
      remainingCoins: number
    }
  | {
      error: string
    }

export type RevealCluesResponse =
  | {
      success: true
      newBalance: number
    }
  | {
      error: string
    }
