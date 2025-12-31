import useSWR from 'swr'

// Generic fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Hook for Quests & User Progress
export function useQuests() {
    const { data, error, isLoading, mutate } = useSWR('/api/strava/sync', fetcher, {
        revalidateOnFocus: false, // Don't revalidate on window focus (too aggressive)
        revalidateOnReconnect: true,
        dedupingInterval: 60000, // Cache for 1 minute
    })

    return {
        quests: data?.quests || [],
        userQuests: data?.userQuests || [],
        isLoading,
        isError: error,
        mutate
    }
}

// Hook for Rewards
export function useRewards() {
    const { data, error, isLoading, mutate } = useSWR('/api/rewards/list', fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    })

    return {
        rewards: data?.rewards || [],
        userStats: data?.userStats || { totalPoints: 0, totalSteps: 0 },
        isLoading,
        isError: error,
        mutate
    }
}

// Hook for Leaderboard
export function useLeaderboard() {
    const { data, error, isLoading, mutate } = useSWR('/api/leaderboard', fetcher, {
        revalidateOnFocus: true, // Leaderboard changes often, keep it fresh
        refreshInterval: 30000, // Auto refresh every 30s
    })

    return {
        leaderboard: data?.leaderboard || [],
        currentUser: data?.currentUser || null,
        lastUpdated: data?.lastUpdated,
        isLoading,
        isError: error,
        mutate
    }
}

// Hook for Profile (Shares cache with Quests via /api/strava/sync)
export function useProfile() {
    const { data, error, isLoading, mutate } = useSWR('/api/strava/sync', fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    })

    const activities = data?.activities || []
    
    // Calculate stats derived from activities
    const stats = {
        count: activities.length,
        distance: activities.reduce((acc: number, curr: any) => acc + (curr.distance || 0), 0),
        steps: activities.reduce((acc: number, curr: any) => acc + (curr.steps || 0), 0)
    }

    return {
        profile: data?.profile || null,
        stats,
        isLoading,
        isError: error,
        mutate
    }
}
