import useSWR from 'swr'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { convertStepsToPoints } from '@/lib/points'

// Generic fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json())

type ProfileActivity = {
    id?: string | number
    type?: string | null
    name?: string | null
    start_date?: string | null
    distance?: number | null
    steps?: number | null
    mode?: string | null
    calories?: number | null
    activity_points?: number | null
    step_points?: number | null
    review_status?: string | null
    proof_url?: string | null
    source?: string | null
}

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
        rerollPrice: data?.rerollPrice || 10, // Default 10
        userStats: data?.userStats || { totalPoints: 0, totalSteps: 0 },
        isLoading,
        isError: error,
        mutate
    }
}

// Hook for Leaderboard with Realtime updates
export function useLeaderboard() {
    const { data, error, isLoading, mutate } = useSWR('/api/leaderboard', fetcher, {
        revalidateOnFocus: true, // Leaderboard changes often, keep it fresh
        refreshInterval: 30000, // Auto refresh every 30s
    })

    // Subscribe to Realtime updates for visits and participant_badges
    useEffect(() => {
        // Subscribe to visits table changes
        const visitsChannel = supabase
            .channel('leaderboard-visits')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'visits'
                },
                () => {
                    // Refresh leaderboard when a new check-in happens
                    mutate()
                }
            )
            .subscribe()

        // Subscribe to participant_badges table changes
        const badgesChannel = supabase
            .channel('leaderboard-badges')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'participant_badges'
                },
                () => {
                    // Refresh leaderboard when a badge is earned
                    mutate()
                }
            )
            .subscribe()

        // Cleanup subscriptions on unmount
        return () => {
            supabase.removeChannel(visitsChannel)
            supabase.removeChannel(badgesChannel)
        }
    }, [mutate])

    return {
        leaderboard: data?.leaderboard || [],
        currentParticipant: data?.currentParticipant || null,
        isLoading,
        isError: error,
        mutate
    }
}

// Hook for Profile (Shares cache with Quests via /api/strava/sync)
export function useProfile() {
    const { data, error, isLoading, mutate } = useSWR('/api/strava/sync', fetcher, {
        revalidateOnFocus: true, // Enable revalidation to sync points with leaderboard immediately
        dedupingInterval: 5000, // Reduced from 60000 to 5000 to allow fresher updates
    })

    const activities = (data?.activities || []) as ProfileActivity[]
    
    // Calculate stats derived from activities
    const stats = {
        count: activities.length,
        distance: activities.reduce((acc, curr) => acc + (curr.distance || 0), 0),
        steps: activities.reduce((acc, curr) => acc + (curr.steps || 0), 0),
        stepPoints: convertStepsToPoints(activities.reduce((acc, curr) => acc + (curr.steps || 0), 0)),
        sportPoints: data?.sportPoints || 0,
    }

    return {
        profile: data?.profile || null,
        activities,
        quests: data?.quests || [],
        userQuests: data?.userQuests || [],
        surveys: data?.surveys || [],
        totalPoints: data?.totalPoints || 0,
        stepPoints: data?.stepPoints || 0,
        sportPoints: data?.sportPoints || 0,
        totalPhysicalPoints: data?.totalPhysicalPoints || 0,
        coins: data?.coins || 0,
        stats,
        isLoading,
        isError: error,
        mutate
    }
}

// Hook for Notifications
export function useNotifications() {
    const { data, error, isLoading, mutate } = useSWR('/api/notifications?count_only=true', fetcher, {
        revalidateOnFocus: true,
        refreshInterval: 60000, // Check every minute
    })

    return {
        unreadCount: typeof data?.count === 'number' ? data.count : 0,
        isLoading,
        isError: error,
        mutate
    }
}
