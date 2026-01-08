'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Shield, Search, X, Loader2, Gift, User, ClipboardList, ChevronRight, Trash2, Target, Save, Calendar, Scan, Share2, Footprints, RotateCcw, MapPin, QrCode, Download, Copy, Check, Edit, Pencil, BarChart2 } from 'lucide-react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'

export default function AdminPage() {
    const { success, error: toastError, info } = useToast()
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const [isEditingSurvey, setIsEditingSurvey] = useState(false)
    const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null)

    const [activeTab, setActiveTab] = useState<'users' | 'quests' | 'surveys' | 'rewards' | 'activities' | 'spots'>('users')

    // ... (keep existing state) ...

    const openCreateModal = () => {
        setIsEditingSurvey(false)
        setEditingSurveyId(null)
        setSurveyContainerData({ title: '', description: '', is_active: true })
        setIsModalOpen(true)
    }

    const openEditSurveyModal = (survey: any) => {
        setIsEditingSurvey(true)
        setEditingSurveyId(survey.id)
        setSurveyContainerData({
            title: survey.title,
            description: survey.description,
            is_active: survey.is_active
        })
        setIsModalOpen(true)
    }

    // Activity & Scanner State
    // Activity & Scanner State
    const [activities, setActivities] = useState<any[]>([])
    const [activityForm, setActivityForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], points: 0 })
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
    const [scanResult, setScanResult] = useState<{ success: boolean, message: string, user?: any } | null>(null)

    // Activity Detail State
    const [showActivityDetail, setShowActivityDetail] = useState(false)
    const [activityDetail, setActivityDetail] = useState<any>(null)
    const [activeDetailTab, setActiveDetailTab] = useState<'completed' | 'pending'>('completed')

    // Survey State for Navigation
    const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null)

    const [users, setUsers] = useState<any[]>([])
    const [quests, setQuests] = useState<any[]>([])
    const [surveys, setSurveys] = useState<any[]>([])
    const [questions, setQuestions] = useState<any[]>([])
    const [rewards, setRewards] = useState<any[]>([])
    const [spots, setSpots] = useState<any[]>([])
    const [spotForm, setSpotForm] = useState({ name: '', description: '', points: '', maxClaims: '', expiresAt: '', clue: '' })
    const [selectedSpot, setSelectedSpot] = useState<any>(null)
    const [spotClaims, setSpotClaims] = useState<any[]>([])
    const [showSpotDetail, setShowSpotDetail] = useState(false)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)
    const [toggleLoadingSpotId, setToggleLoadingSpotId] = useState<string | null>(null)

    const router = useRouter()

    // Form State (User)
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        gender: ''
    })

    // Form State (Quest)
    const [questTitle, setQuestTitle] = useState('')
    const [questDesc, setQuestDesc] = useState('')
    const [questPoints, setQuestPoints] = useState('')
    const [questExpiresAt, setQuestExpiresAt] = useState('')
    const [questVerificationType, setQuestVerificationType] = useState('none') // New state


    // Form State (Survey Container)
    const [surveyContainerData, setSurveyContainerData] = useState({
        title: '',
        description: '',
        is_active: true
    })

    // Form State (Survey Question)
    const [questionData, setQuestionData] = useState({
        questionText: '',
        orderIndex: 0,
        options: [{ label: '', tags: '' }]
    })

    // Form State (Reward)
    const [rewardData, setRewardData] = useState({
        title: '',
        description: '',
        image_url: '',
        required_points: 0,
        max_claims: 0,
        type: 'reveal'
    })

    const [createLoading, setCreateLoading] = useState(false)
    const [error, setError] = useState('')

    // Point Adjustment State
    const [showPointsModal, setShowPointsModal] = useState(false)
    const [pointsTarget, setPointsTarget] = useState<{ id: string, name: string } | null>(null)
    const [adjustPointsData, setAdjustPointsData] = useState<{ points: string | number, reason: string }>({ points: '', reason: '' })
    const [isAdjusting, setIsAdjusting] = useState(false)

    // Step Adjustment State
    const [showStepsModal, setShowStepsModal] = useState(false)
    const [stepsTarget, setStepsTarget] = useState<{ id: string, name: string } | null>(null)
    const [adjustStepsData, setAdjustStepsData] = useState<{ steps: string | number, reason: string }>({ steps: '', reason: '' })

    // Reset Points State
    const [showResetModal, setShowResetModal] = useState(false)
    const [resetTarget, setResetTarget] = useState<{ id: string, name: string } | null>(null)
    const [isResetting, setIsResetting] = useState(false)


    // Search & Bulk Actions
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const toggleSelectAll = () => {
        if (selectedUserIds.length === filteredUsers.length) {
            setSelectedUserIds([])
        } else {
            setSelectedUserIds(filteredUsers.map(u => u.id))
        }
    }

    const toggleSelectUser = (id: string) => {
        if (selectedUserIds.includes(id)) {
            setSelectedUserIds(selectedUserIds.filter(uid => uid !== id))
        } else {
            setSelectedUserIds([...selectedUserIds, id])
        }
    }

    useEffect(() => {
        if (activeTab === 'users') fetchUsers()
        else if (activeTab === 'quests') fetchQuests()
        else if (activeTab === 'surveys') fetchSurveys()
        else if (activeTab === 'rewards') fetchRewards()
        else if (activeTab === 'activities') fetchActivities()
        else if (activeTab === 'spots') fetchSpots()
    }, [activeTab])

    useEffect(() => {
        if (selectedSurvey) {
            fetchQuestions(selectedSurvey.id)
        }
    }, [selectedSurvey])

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users/list')
            if (res.status === 403) {
                router.push('/dashboard')
                return
            }
            const data = await res.json()
            if (data.users) setUsers(data.users)
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }

    const fetchActivities = async () => {
        try {
            const res = await fetch('/api/admin/activities')
            const data = await res.json()
            setActivities(data)
        } catch (error) {
            console.error('Error fetching activities:', error)
        }
    }

    const handleCreateActivity = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/admin/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activityForm)
            })
            if (res.ok) {
                setIsModalOpen(false)
                setActivityForm({ title: '', date: new Date().toISOString().split('T')[0], points: 0 })
                fetchActivities()
            }
        } catch (error) {
            console.error('Error creating activity:', error)
        }
    }

    const handleScan = async (accessCodes: any[]) => {
        if (!accessCodes || accessCodes.length === 0) return
        const code = accessCodes[0].rawValue

        try {
            const res = await fetch('/api/admin/attendance/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activity_id: selectedActivityId,
                    access_code: code
                })
            })
            const data = await res.json()
            setScanResult({
                success: data.success || false,
                message: data.message || data.error,
                user: data.user
            })

            if (data.success) {
                // Refresh list to update counts
                fetchActivities()
                // Optional: Close scanner after success or keep open for next
                // setIsScannerOpen(false) 
            }

        } catch (error) {
            console.error('Scan Error:', error)
        }
    }



    const fetchQuests = async () => {
        try {
            const res = await fetch('/api/admin/quests/list')
            const data = await res.json()
            if (data.quests) setQuests(data.quests)
        } catch (e) { console.error(e) }
    }

    const fetchSurveys = async () => {
        try {
            const res = await fetch('/api/admin/surveys/list')
            const data = await res.json()
            if (data.surveys) setSurveys(data.surveys)
        } catch (e) { console.error(e) }
    }

    const fetchRewards = async () => {
        try {
            const res = await fetch('/api/admin/rewards/list')
            const data = await res.json()
            if (data.rewards) setRewards(data.rewards)
        } catch (e) { console.error(e) }
    }

    const fetchSpots = async () => {
        try {
            const res = await fetch('/api/admin/spots')
            const data = await res.json()
            if (data.spots) setSpots(data.spots)
        } catch (e) { console.error(e) }
    }

    const handleCreateSpot = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateLoading(true)
        try {
            const res = await fetch('/api/admin/spots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(spotForm)
            })
            const data = await res.json()
            if (res.ok) {
                success('QR Spot created!')
                setIsModalOpen(false)
                setSpotForm({ name: '', description: '', points: '', maxClaims: '', expiresAt: '', clue: '' })
                fetchSpots()
            } else {
                toastError(data.error || 'Failed to create spot')
            }
        } catch (e) {
            toastError('Error creating spot')
        } finally {
            setCreateLoading(false)
        }
    }

    const handleDeleteSpot = async (spotId: string) => {
        try {
            const res = await fetch(`/api/admin/spots?id=${spotId}`, { method: 'DELETE' })
            if (res.ok) {
                success('Spot deleted!')
                fetchSpots()
                // Close detail if currently viewing this spot
                if (selectedSpot?.id === spotId) {
                    setShowSpotDetail(false)
                    setSelectedSpot(null)
                }
            }
        } catch (e) {
            toastError('Failed to delete spot')
        }
    }

    const fetchSpotDetail = async (spotId: string) => {
        try {
            const res = await fetch(`/api/admin/spots/detail?id=${spotId}`)
            const data = await res.json()
            if (res.ok) {
                setSelectedSpot(data.spot)
                setSpotClaims(data.claims || [])
                setShowSpotDetail(true)
            }
        } catch (e) {
            toastError('Failed to fetch spot details')
        }
    }

    const exportSpotClaims = () => {
        if (!selectedSpot || spotClaims.length === 0) return

        const headers = ['No', 'Name', 'Username', 'Instagram', 'Claimed At']
        const rows = spotClaims.map((claim, idx) => [
            idx + 1,
            claim.full_name || '-',
            claim.username || '-',
            claim.instagram_username || '-',
            new Date(claim.claimed_at).toLocaleString('id-ID')
        ])

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedSpot.name}_claims_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Reward Detail State
    const [selectedReward, setSelectedReward] = useState<any>(null)
    const [rewardClaims, setRewardClaims] = useState<any[]>([])
    const [showRewardDetail, setShowRewardDetail] = useState(false)
    const [selectedQuest, setSelectedQuest] = useState<any>(null)
    const [questClaims, setQuestClaims] = useState<any[]>([])
    const [showQuestDetail, setShowQuestDetail] = useState(false)
    const [isEditingReward, setIsEditingReward] = useState(false)
    const [editingRewardId, setEditingRewardId] = useState<string | null>(null)

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopiedCode(code)
        setTimeout(() => setCopiedCode(null), 2000)
    }

    const downloadQR = (code: string, name: string) => {
        const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(code)}&size=400x400`
        const link = document.createElement('a')
        link.href = url
        link.download = `qr-spot-${name.replace(/\s+/g, '-').toLowerCase()}.png`
        link.click()
    }

    const fetchActivityDetail = async (activityId: string) => {
        try {
            setActiveDetailTab('completed')
            setShowActivityDetail(true)
            const res = await fetch(`/api/admin/activities/detail?id=${activityId}`)
            const data = await res.json()

            if (res.ok) {
                setActivityDetail(data)
            } else {
                toastError('Failed to fetch activity details')
            }
        } catch (e) {
            console.error(e)
            toastError('Error fetching activity details')
        }
    }

    const exportActivityPending = () => {
        if (!activityDetail || !activityDetail.pending || activityDetail.pending.length === 0) return

        const headers = ['No', 'Name', 'Username', 'Instagram']
        const rows = activityDetail.pending.map((u: any, idx: number) => [
            idx + 1,
            u.full_name || '-',
            u.username || '-',
            u.instagram || '-'
        ])

        const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${activityDetail.activity.title}_PENDING_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const fetchRewardDetail = async (rewardId: string) => {
        try {
            // Find reward info from existing list first
            const reward = rewards.find(r => r.id === rewardId)
            if (reward) setSelectedReward(reward)

            // Show loading or just open modal
            setShowRewardDetail(true)

            // Fetch claims
            const res = await fetch(`/api/admin/rewards/claims?rewardId=${rewardId}`)
            const data = await res.json()
            if (res.ok) {
                setRewardClaims(data.claims || [])
            } else {
                toastError('Failed to load claims history')
            }
        } catch (e) {
            toastError('Error fetching reward details')
            console.error(e)
        }
    }

    const handleEditReward = (reward: any) => {
        setRewardData({
            title: reward.title,
            description: reward.description,
            image_url: reward.image_url || '',
            required_points: reward.required_points,
            max_claims: reward.max_claims,
            type: reward.type || 'reveal'
        })
        setIsEditingReward(true)
        setEditingRewardId(reward.id)
        setActiveTab('rewards')
        setIsModalOpen(true)
    }

    const exportRewardClaims = () => {
        if (!selectedReward || rewardClaims.length === 0) return

        const headers = ['No', 'Name', 'Username', 'Instagram', 'Cost', 'Claimed At']
        const rows = rewardClaims.map((claim, idx) => [
            idx + 1,
            claim.full_name || '-',
            claim.username || '-',
            claim.instagram_username || '-',
            claim.cost || selectedReward.required_points || 0,
            new Date(claim.claimed_at).toLocaleString('id-ID')
        ])

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedReward.title}_claims_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const fetchQuestClaims = async (questId: string) => {
        try {
            const quest = quests.find(q => q.id === questId)
            if (quest) setSelectedQuest(quest)

            setShowQuestDetail(true)

            const res = await fetch(`/api/admin/quests/claims?questId=${questId}`)
            const data = await res.json()
            if (res.ok) {
                setQuestClaims(data.claims || [])
            } else {
                toastError('Failed to load quest claims')
            }
        } catch (e) {
            toastError('Error fetching quest details')
            console.error(e)
        }
    }

    const exportQuestClaims = () => {
        if (!selectedQuest || questClaims.length === 0) return

        const headers = ['No', 'Name', 'Username', 'Instagram', 'Points', 'Completed At']
        const rows = questClaims.map((claim, idx) => [
            idx + 1,
            claim.full_name || '-',
            claim.username || '-',
            claim.instagram_username || '-',
            claim.points || selectedQuest.points || 0,
            new Date(claim.completed_at).toLocaleString('id-ID')
        ])

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedQuest.title}_completions_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const fetchQuestions = async (surveyId: string) => {
        try {
            const res = await fetch('/api/admin/surveys/questions/list', {
                method: 'POST',
                body: JSON.stringify({ surveyId })
            })
            const data = await res.json()
            if (data.questions) setQuestions(data.questions)
        } catch (e) { console.error(e) }
    }

    const openPointsModal = (user: { id: string, name: string }) => {
        setPointsTarget(user)
        setAdjustPointsData({ points: '', reason: '' })
        setShowPointsModal(true)
    }

    const openBulkPointsModal = () => {
        setPointsTarget({ id: 'bulk', name: `${selectedUserIds.length} Users` })
        setAdjustPointsData({ points: '', reason: '' })
        setShowPointsModal(true)
    }

    const handleAdjustPoints = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!pointsTarget) return

        setIsAdjusting(true)
        try {
            if (pointsTarget.id === 'bulk') {
                await Promise.all(selectedUserIds.map(uid =>
                    fetch('/api/admin/users/points', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            targetUserId: uid,
                            points: Number(adjustPointsData.points),
                            reason: adjustPointsData.reason
                        })
                    }).then(res => { if (!res.ok) throw new Error('Failed') })
                ))
            } else {
                const res = await fetch('/api/admin/users/points', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetUserId: pointsTarget.id,
                        points: Number(adjustPointsData.points),
                        reason: adjustPointsData.reason
                    })
                })
                if (!res.ok) throw new Error('Failed to adjust points')
            }

            success('Points adjusted successfully!')
            setShowPointsModal(false)
            setAdjustPointsData({ points: '', reason: '' })
            setPointsTarget(null)
            setSelectedUserIds([]) // Clear selection
            fetchUsers()
        } catch (err: any) {
            console.error(err)
            toastError(err.message || 'Error adjusting points')
        } finally {
            setIsAdjusting(false)
        }
    }

    const handleAdjustSteps = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!stepsTarget) return

        setIsAdjusting(true)
        try {
            const res = await fetch('/api/admin/users/steps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: stepsTarget.id,
                    steps: Number(adjustStepsData.steps),
                    reason: adjustStepsData.reason
                })
            })

            if (!res.ok) throw new Error('Failed to adjust steps')

            success('Steps adjusted successfully!')
            setShowStepsModal(false)
            setAdjustStepsData({ steps: '', reason: '' })
            setStepsTarget(null)
            fetchUsers()
        } catch (err: any) {
            console.error(err)
            toastError(err.message || 'Error adjusting steps')
        } finally {
            setIsAdjusting(false)
        }
    }

    const openStepsModal = (user: { id: string, name: string }) => {
        setStepsTarget(user)
        setAdjustStepsData({ steps: '', reason: '' })
        setShowStepsModal(true)
    }

    const openResetModal = (user: { id: string, name: string }) => {
        setResetTarget(user)
        setShowResetModal(true)
    }

    const openBulkResetModal = () => {
        setResetTarget({ id: 'bulk', name: `${selectedUserIds.length} Users` })
        setShowResetModal(true)
    }

    const handleResetPoints = async (type: 'steps' | 'quests' | 'rewards' | 'all') => {
        if (!resetTarget) return

        // Removed native confirm. UI is explicit enough.

        setIsResetting(true)
        try {
            if (resetTarget.id === 'bulk') {
                await Promise.all(selectedUserIds.map(uid =>
                    fetch('/api/admin/users/reset', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetUserId: uid, type })
                    }).then(res => { if (!res.ok) throw new Error('Failed') })
                ))
            } else {
                const res = await fetch('/api/admin/users/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetUserId: resetTarget.id,
                        type
                    })
                })
                if (!res.ok) throw new Error('Failed to reset')
            }

            const typeText = type === 'all' ? 'Semua Poin' : (type === 'steps' ? 'Steps' : (type === 'rewards' ? 'Rewards' : 'Quests'))
            success(`Berhasil mereset ${typeText} untuk ${resetTarget.name}!`)

            setShowResetModal(false)
            setResetTarget(null)
            setSelectedUserIds([]) // Clear selection
            fetchUsers()
        } catch (err: any) {
            console.error(err)
            toastError(err.message || 'Gagal mereset poin')
        } finally {
            setIsResetting(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateLoading(true)
        setError('')

        try {
            let url = ''
            let body: any = {}

            if (activeTab === 'users') {
                url = '/api/admin/users/create'
                body = formData
            } else if (activeTab === 'quests') {
                url = '/api/admin/quests/create'
                body = {
                    title: questTitle,
                    description: questDesc,
                    points: parseInt(questPoints) || 0,
                    expires_at: questExpiresAt ? new Date(questExpiresAt).toISOString() : null,
                    verification_type: questVerificationType
                }
            } else if (activeTab === 'surveys' && !selectedSurvey) {
                // Create OR Update Survey Container
                if (isEditingSurvey && editingSurveyId) {
                    url = '/api/admin/surveys/update'
                    body = { id: editingSurveyId, ...surveyContainerData }
                } else {
                    url = '/api/admin/surveys/create'
                    body = surveyContainerData
                }
            } else if (activeTab === 'surveys' && selectedSurvey) {
                // Create Question
                url = '/api/admin/surveys/questions/create'
                body = {
                    surveyId: selectedSurvey.id,
                    ...questionData,
                    options: questionData.options.map(o => ({
                        ...o,
                        tags: o.tags.split(',').map(t => t.trim()).filter(Boolean)
                    }))
                }
            } else if (activeTab === 'rewards') {
                if (isEditingReward && editingRewardId) {
                    url = '/api/admin/rewards/update'
                    body = { id: editingRewardId, ...rewardData }
                } else {
                    url = '/api/admin/rewards/create'
                    body = rewardData
                }
            }

            const res = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (res.ok) {
                setIsModalOpen(false)
                if (activeTab === 'users') {
                    setFormData({ username: '', password: '', fullName: '', gender: '' })
                    fetchUsers()
                } else if (activeTab === 'quests') {
                    setQuestTitle('')
                    setQuestDesc('')
                    setQuestPoints('')
                    setQuestExpiresAt('')
                    setQuestVerificationType('none')
                    fetchQuests()
                } else if (activeTab === 'rewards') {
                    setRewardData({ title: '', description: '', image_url: '', required_points: 0, max_claims: 0, type: 'reveal' })
                    setIsEditingReward(false)
                    setEditingRewardId(null)
                    fetchRewards()
                } else if (!selectedSurvey) {
                    setSurveyContainerData({ title: '', description: '', is_active: true })
                    fetchSurveys()
                    success(isEditingSurvey ? 'Survey updated!' : 'Survey created!')
                } else {
                    setQuestionData({ questionText: '', orderIndex: questions.length + 1, options: [{ label: '', tags: '' }] })
                    fetchQuestions(selectedSurvey.id)
                }
            } else {
                setError(data.error || 'Failed to create')
            }
        } catch (e) {
            setError('Something went wrong')
        } finally {
            setCreateLoading(false)
        }
    }

    // Delete Modal State
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'user' | 'quest' | 'question' | 'survey' | 'reward' | 'activity', name: string } | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Handlers to open modal
    const promptDeleteUser = (id: string, username: string) => setDeleteTarget({ id, type: 'user', name: `@${username} ` })
    const promptDeleteQuest = (id: string, title: string) => setDeleteTarget({ id, type: 'quest', name: title })
    const promptDeleteSurvey = (id: string, title: string) => setDeleteTarget({ id, type: 'survey', name: title })
    const promptDeleteQuestion = (id: string, text: string) => setDeleteTarget({ id, type: 'question', name: `"${text.substring(0, 30)}..."` })
    const promptDeleteReward = (id: string, title: string) => setDeleteTarget({ id, type: 'reward', name: title })
    const promptDeleteActivity = (id: string, title: string) => setDeleteTarget({ id, type: 'activity', name: title })

    const performDelete = async () => {
        if (!deleteTarget) return
        setDeleteLoading(true)
        try {
            if (deleteTarget.type === 'activity') {
                const res = await fetch(`/api/admin/activities?id=${deleteTarget.id}`, { method: 'DELETE' })
                if (!res.ok) throw new Error('Failed to delete activity')
            } else {
                let url = ''
                if (deleteTarget.type === 'user') url = '/api/admin/users/delete'
                if (deleteTarget.type === 'quest') url = '/api/admin/quests/delete'
                if (deleteTarget.type === 'survey') url = '/api/admin/surveys/delete'
                if (deleteTarget.type === 'question') url = '/api/admin/surveys/questions/delete'
                if (deleteTarget.type === 'reward') url = '/api/admin/rewards/delete'

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: deleteTarget.id })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Failed to delete')
            }

            // Refresh Data
            if (deleteTarget.type === 'user') fetchUsers()
            if (deleteTarget.type === 'quest') fetchQuests()
            if (deleteTarget.type === 'survey') fetchSurveys()
            if (deleteTarget.type === 'question' && selectedSurvey) fetchQuestions(selectedSurvey.id)
            if (deleteTarget.type === 'reward') fetchRewards()
            if (deleteTarget.type === 'activity') fetchActivities()

            setDeleteTarget(null)
        } catch (e) {
            console.error('Delete failed', e)
            toastError(e instanceof Error ? e.message : 'Failed to delete item')
        } finally {
            setDeleteLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            >
                <ArrowLeft size={20} />
                Back to Dashboard
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                        <Shield className="text-[#FC4C02]" />
                        Admin Panel
                    </h1>
                    <p className="text-gray-400 text-sm md:text-base">Manage users, quests, and surveys.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto bg-[#FC4C02] hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={20} />
                    Add {activeTab === 'users' ? 'User' : activeTab === 'quests' ? 'Quest' : activeTab === 'rewards' ? 'Reward' : activeTab === 'activities' ? 'Activity' : activeTab === 'spots' ? 'QR Spot' : (!selectedSurvey ? 'Survey' : 'Question')}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 md:gap-4 mb-6 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => { setActiveTab('users'); setSelectedSurvey(null) }}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${activeTab === 'users' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'} `}
                >
                    <User size={18} /> Users
                </button>
                <button
                    onClick={() => { setActiveTab('quests'); setSelectedSurvey(null) }}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${activeTab === 'quests' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'} `}
                >
                    <Gift size={18} /> Daily Quests
                </button>
                <button
                    onClick={() => { setActiveTab('surveys'); setSelectedSurvey(null) }}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${activeTab === 'surveys' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'} `}
                >
                    <ClipboardList size={18} /> Surveys
                </button>
                <button
                    onClick={() => { setActiveTab('rewards'); setSelectedSurvey(null) }}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${activeTab === 'rewards' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'} `}
                >
                    <Gift size={18} /> Rewards
                </button>
                <button
                    onClick={() => { setActiveTab('activities'); setSelectedSurvey(null) }}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${activeTab === 'activities' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'} `}
                >
                    <Calendar size={18} /> Activities
                </button>
                <button
                    onClick={() => { setActiveTab('spots'); setSelectedSurvey(null) }}
                    className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${activeTab === 'spots' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'} `}
                >
                    <MapPin size={18} /> QR Spots
                </button>
            </div>

            {/* Users Table */}
            {activeTab === 'users' && (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search users by name or username..."
                                    className="w-full bg-black border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                />
                            </div>
                        </div>

                        {/* Bulk Actions Toolbar */}
                        {selectedUserIds.length > 0 && (
                            <div className="bg-[#FC4C02]/10 p-4 flex items-center justify-between border-b border-[#FC4C02]/20 animate-in fade-in slide-in-from-top-2">
                                <div className="text-[#FC4C02] font-bold text-sm">
                                    {selectedUserIds.length} Users Selected
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openBulkPointsModal()} // Need to implement
                                        className="px-4 py-2 bg-[#FC4C02] text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} /> Bulk Add Points
                                    </button>
                                    <button
                                        onClick={() => openBulkResetModal()} // Need to implement
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
                                            checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                                            onChange={toggleSelectAll}
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
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(user.id)}
                                                onChange={() => toggleSelectUser(user.id)}
                                                className="w-4 h-4 rounded border-gray-600 bg-black/50 text-[#FC4C02] focus:ring-[#FC4C02]"
                                            />
                                        </td>
                                        <td className="p-4 flex items-center gap-3">
                                            <img src={user.avatar_url} className="w-10 h-10 rounded-full" alt="" />
                                            <span className="font-medium">{user.full_name}</span>
                                        </td>
                                        <td className="p-4 font-mono text-gray-400">@{user.username}</td>
                                        <td className="p-4 font-mono text-[#FC4C02]">{user.access_code || '-'}</td>
                                        <td className="p-4">
                                            <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-full text-xs font-bold">
                                                Active
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {user.username !== 'admin_wam' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openPointsModal({ id: user.id, name: user.full_name || user.username || 'User' })}
                                                        title="Adjust Points"
                                                        className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
                                                    >
                                                        <Target size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => openStepsModal({ id: user.id, name: user.full_name || user.username || 'User' })}
                                                        title="Adjust Steps"
                                                        className="p-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors"
                                                    >
                                                        <Footprints size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => openResetModal({ id: user.id, name: user.full_name || user.username || 'User' })}
                                                        title="Reset Points"
                                                        className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors"
                                                    >
                                                        <RotateCcw size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => promptDeleteUser(user.id, user.username)}
                                                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {loading ? (
                            <div className="text-center text-gray-500 py-8">Loading...</div>
                        ) : users.map((user) => (
                            <div key={user.id} className="bg-[#1a1a1a] border border-white/10 p-4 rounded-xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <img src={user.avatar_url} className="w-10 h-10 rounded-full shrink-0 object-cover" alt="" />
                                    <div className="min-w-0">
                                        <div className="font-bold truncate">{user.full_name}</div>
                                        <div className="text-xs text-gray-500 font-mono truncate">@{user.username}</div>
                                        <div className="text-xs text-[#FC4C02] font-mono mt-1 bg-[#FC4C02]/10 inline-block px-1.5 py-0.5 rounded">
                                            {user.access_code || 'NO-CODE'}
                                        </div>
                                    </div>
                                </div>

                                {user.username !== 'admin_wam' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openPointsModal({ id: user.id, name: user.full_name || user.username || 'User' })}
                                            className="p-2 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg shrink-0 transition-colors"
                                        >
                                            <Target size={18} />
                                        </button>
                                        <button
                                            onClick={() => openStepsModal({ id: user.id, name: user.full_name || user.username || 'User' })}
                                            className="p-2 text-purple-500 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg shrink-0 transition-colors"
                                        >
                                            <Footprints size={18} />
                                        </button>
                                        <button
                                            onClick={() => openResetModal({ id: user.id, name: user.full_name || user.username || 'User' })}
                                            className="p-2 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg shrink-0 transition-colors"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                        <button
                                            onClick={() => openResetModal({ id: user.id, name: user.full_name || user.username || 'User' })}
                                            className="p-2 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg shrink-0 transition-colors"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                        <button
                                            onClick={() => promptDeleteUser(user.id, user.username)}
                                            className="p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg shrink-0 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Quests Table */}
            {
                activeTab === 'quests' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quests.map((quest) => (
                            <div
                                key={quest.id}
                                onClick={() => fetchQuestClaims(quest.id)}
                                className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-[#FC4C02] transition-colors group"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4 gap-4">
                                        <h3 className="text-xl font-bold flex-1 break-words">{quest.title}</h3>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-lg font-mono text-xs font-bold whitespace-nowrap">
                                                {quest.points} PTS
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    promptDeleteQuest(quest.id, quest.title)
                                                }}
                                                className="text-gray-500 hover:text-red-500 hover:bg-white/5 p-1.5 rounded-lg transition-colors"
                                                title="Delete Quest"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-3">{quest.description}</p>
                                </div>
                                <div className={`text-xs font-bold uppercase tracking-wider ${quest.is_active ? 'text-green-500' : 'text-red-500'} `}>
                                    {quest.is_active ? '● Active' : '● Inactive'}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Rewards Table */}
            {
                activeTab === 'rewards' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rewards.map((reward) => (
                            <div
                                key={reward.id}
                                onClick={() => fetchRewardDetail(reward.id)}
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
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleEditReward(reward)
                                                    }}
                                                    className="text-gray-500 hover:text-blue-500 hover:bg-white/5 p-1.5 rounded-lg transition-colors z-10"
                                                    title="Edit Reward"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        promptDeleteReward(reward.id, reward.title)
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
                            <div className="col-span-full text-center py-12 text-gray-500">
                                No rewards found. Create one to get started.
                            </div>
                        )}
                    </div>
                )
            }


            {
                activeTab === 'surveys' && (
                    <div className="space-y-4">
                        {/* Breadcrumbs for Survey Detail */}
                        {selectedSurvey && (
                            <div className="flex items-center gap-2 text-gray-400 mb-4 text-sm">
                                <button onClick={() => setSelectedSurvey(null)} className="hover:text-white flex items-center gap-1">
                                    <ArrowLeft size={14} /> Back to Surveys
                                </button>
                                <span className="text-gray-600">/</span>
                                <span className="text-[#FC4C02] font-bold">{selectedSurvey.title}</span>
                            </div>
                        )}

                        {!selectedSurvey ? (
                            /* Survey List */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {surveys.map((survey) => (
                                    <div
                                        key={survey.id}
                                        onClick={() => setSelectedSurvey(survey)}
                                        className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl hover:border-[#FC4C02] cursor-pointer transition-colors group flex flex-col justify-between h-full"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-2 gap-4">
                                                <h3 className="text-xl font-bold group-hover:text-[#FC4C02] transition-colors flex-1 break-words">{survey.title}</h3>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            router.push(`/dashboard/admin/survey/${survey.id}/report`)
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-blue-400 rounded-lg hover:bg-white/10 transition-colors z-20"
                                                        title="View Report"
                                                    >
                                                        <BarChart2 size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            openEditSurveyModal(survey)
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors z-20"
                                                        title="Edit Survey"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            promptDeleteSurvey(survey.id, survey.title)
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-red-500 rounded-lg hover:bg-white/10 transition-colors z-20"
                                                        title="Delete Survey"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            const link = `${window.location.origin}/survey/${survey.id}`
                                                            navigator.clipboard.writeText(link)
                                                            success('Survey link copied!')
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-blue-400 rounded-lg hover:bg-white/10 transition-colors z-20"
                                                        title="Copy Survey Link"
                                                    >
                                                        <Share2 size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-6 line-clamp-2 min-h-[2.5rem]">{survey.description}</p>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${survey.is_active ? 'text-green-500' : 'text-red-500'} `}>
                                                {survey.is_active ? '● Active' : '● Inactive'}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium group-hover:text-white transition-colors">
                                                Manage Questions <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {surveys.length === 0 && (
                                    <div className="col-span-full text-center py-12 text-gray-500">
                                        No surveys found. Create one to get started.
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Selected Survey - Questions List */
                            <div className="space-y-4">
                                <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 mb-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedSurvey.title}</h2>
                                        <p className="text-gray-400">{selectedSurvey.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Status</div>
                                        <div className={selectedSurvey.is_active ? 'text-green-500' : 'text-red-500'}>{selectedSurvey.is_active ? 'Active' : 'Inactive'}</div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest text-xs mb-4">Configured Questions</h3>

                                {questions.map((q) => (
                                    <div key={q.id} className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold flex gap-3">
                                                <span className="text-[#FC4C02] font-mono">#{q.order_index}</span>
                                                {q.question_text}
                                            </h3>
                                            <button
                                                onClick={() => promptDeleteQuestion(q.id, q.question_text)}
                                                className="text-red-500 text-xs hover:underline flex items-center gap-1"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {q.survey_options?.map((opt: any) => (
                                                <span key={opt.id} className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-sm text-gray-300">
                                                    {opt.label}
                                                    {opt.recommended_tags?.length > 0 && (
                                                        <span className="ml-2 text-xs text-[#FC4C02]">
                                                            Use: {opt.recommended_tags.join(', ')}
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {questions.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                                        No questions yet.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            {/* Activities Tab */}
            {activeTab === 'activities' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Manage Activities</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activities.map((activity) => (
                            <div
                                key={activity.id}
                                className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 hover:bg-white/5 transition-colors cursor-pointer group"
                                onClick={() => fetchActivityDetail(activity.id)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-white mb-1 group-hover:text-[#FC4C02] transition-colors">{activity.title}</h3>
                                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                                            <Calendar className="w-4 h-4" />
                                            {activity.activity_date}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                promptDeleteActivity(activity.id, activity.title)
                                            }}
                                            className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                            title="Delete Activity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium">
                                            {activity.attendance_count || 0} Present
                                        </div>
                                        {activity.points > 0 && (
                                            <span className="text-[#FC4C02] text-xs font-bold bg-[#FC4C02]/10 px-2 py-1 rounded-lg">
                                                +{activity.points} PTS
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedActivityId(activity.id)
                                        setIsScannerOpen(true)
                                        setScanResult(null)
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors z-10 relative"
                                >
                                    <Scan className="w-4 h-4" />
                                    Scan Attendance
                                </button>
                            </div>
                        ))}

                        {activities.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                No activities found. Create one to get started.
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* QR Spots Tab */}
            {activeTab === 'spots' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
                    {spots.map((spot) => (
                        <div
                            key={spot.id}
                            className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-[#FC4C02]/50 transition-colors group"
                            onClick={() => fetchSpotDetail(spot.id)}
                        >
                            {/* QR Code Preview */}
                            <div className="bg-white p-4 flex justify-center">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(spot.code)}&size=150x150`}
                                    alt={`QR Code for ${spot.name}`}
                                    className="w-32 h-32"
                                />
                            </div>

                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg">{spot.name}</h3>
                                    <span className="bg-[#FC4C02]/20 text-[#FC4C02] px-2 py-1 rounded-lg text-xs font-bold">
                                        +{spot.points} PTS
                                    </span>
                                </div>

                                {spot.description && (
                                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{spot.description}</p>
                                )}

                                <div className="flex flex-wrap gap-2 mb-4 text-xs text-gray-500">
                                    <span className="bg-white/5 px-2 py-1 rounded">
                                        Claims: {spot.claim_count || 0}{spot.max_claims > 0 ? `/${spot.max_claims}` : ''}
                                    </span>
                                    <button
                                        disabled={toggleLoadingSpotId === spot.id}
                                        onClick={async (e) => {
                                            e.stopPropagation()
                                            setToggleLoadingSpotId(spot.id)
                                            try {
                                                const res = await fetch('/api/admin/spots', {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ id: spot.id, is_active: !spot.is_active })
                                                })
                                                if (res.ok) {
                                                    // Refresh spots list
                                                    const spotsRes = await fetch('/api/admin/spots')
                                                    const spotsData = await spotsRes.json()
                                                    setSpots(spotsData.spots || [])
                                                    success(spot.is_active ? 'Spot deactivated!' : 'Spot activated!')
                                                }
                                            } catch (err) {
                                                toastError('Failed to toggle spot')
                                            } finally {
                                                setToggleLoadingSpotId(null)
                                            }
                                        }}
                                        className={`px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${spot.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}
                                    >
                                        {toggleLoadingSpotId === spot.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            spot.is_active ? 'Active' : 'Inactive'
                                        )}
                                    </button>
                                </div>

                                <div className="flex gap-2 mb-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(spot.code) }}
                                        className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-sm transition-colors"
                                    >
                                        {copiedCode === spot.code ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                        {copiedCode === spot.code ? 'Copied!' : 'Copy Code'}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); downloadQR(spot.code, spot.name) }}
                                        className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-sm transition-colors"
                                    >
                                        <Download size={14} />
                                        Download
                                    </button>
                                </div>

                                <div className="text-xs text-gray-600 font-mono mb-3 text-center bg-black py-2 rounded">
                                    {spot.code}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fetchSpotDetail(spot.id) }}
                                        className="flex-1 flex items-center justify-center gap-1 bg-[#FC4C02]/10 text-[#FC4C02] hover:bg-[#FC4C02]/20 py-2 rounded-lg text-sm transition-colors font-medium"
                                    >
                                        View Claims
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSpot(spot.id) }}
                                        className="flex items-center justify-center gap-1 text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg text-sm transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {spots.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No QR Spots yet.</p>
                            <p className="text-sm">Create one to let users earn points by scanning!</p>
                        </div>
                    )}
                </div>
            )
            }

            {/* Create Spot Modal */}
            <AnimatePresence>
                {isModalOpen && activeTab === 'spots' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl"
                        >
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-bold mb-6">Create QR Spot</h3>
                            <form onSubmit={handleCreateSpot} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Spot Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={spotForm.name}
                                        onChange={(e) => setSpotForm({ ...spotForm, name: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                        placeholder="e.g. Main Entrance"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Points</label>
                                    <input
                                        type="number"
                                        required
                                        value={spotForm.points}
                                        onChange={(e) => setSpotForm({ ...spotForm, points: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                        placeholder="10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Description (Optional)</label>
                                    <textarea
                                        value={spotForm.description}
                                        onChange={(e) => setSpotForm({ ...spotForm, description: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02] h-20 resize-none"
                                        placeholder="Scan this QR at the main entrance..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase flex justify-between">
                                        <span>Max Claims</span>
                                        <span className="text-gray-600 normal-case font-normal">(0 = Unlimited)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={spotForm.maxClaims}
                                        onChange={(e) => setSpotForm({ ...spotForm, maxClaims: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Expires At (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={spotForm.expiresAt}
                                        onChange={(e) => setSpotForm({ ...spotForm, expiresAt: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02] [&::-webkit-calendar-picker-indicator]:invert"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Clue (Optional)</label>
                                    <textarea
                                        value={spotForm.clue}
                                        onChange={(e) => setSpotForm({ ...spotForm, clue: e.target.value })}
                                        placeholder="Hint to help users find this spot..."
                                        rows={2}
                                        className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02] resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="w-full bg-[#FC4C02] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex justify-center"
                                >
                                    {createLoading ? <Loader2 className="animate-spin" /> : 'Create Spot'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Spot Detail Modal */}
            <AnimatePresence>
                {showSpotDetail && selectedSpot && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowSpotDetail(false); setSelectedSpot(null) }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
                        >
                            <button onClick={() => { setShowSpotDetail(false); setSelectedSpot(null) }} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>

                            <div className="mb-6">
                                <h3 className="text-2xl font-bold mb-1">{selectedSpot.name}</h3>
                                <p className="text-gray-400 text-sm">{selectedSpot.description || 'No description'}</p>
                                {selectedSpot.clue && (
                                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <p className="text-xs text-yellow-500 uppercase font-bold mb-1">Clue</p>
                                        <p className="text-yellow-200 text-sm">{selectedSpot.clue}</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-black/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-[#FC4C02]">+{selectedSpot.points}</p>
                                    <p className="text-xs text-gray-500 uppercase">Points</p>
                                </div>
                                <div className="bg-black/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold">{spotClaims.length}</p>
                                    <p className="text-xs text-gray-500 uppercase">Total Claims</p>
                                </div>
                                <button
                                    disabled={toggleLoadingSpotId === selectedSpot.id}
                                    onClick={async () => {
                                        setToggleLoadingSpotId(selectedSpot.id)
                                        try {
                                            const res = await fetch('/api/admin/spots', {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ id: selectedSpot.id, is_active: !selectedSpot.is_active })
                                            })
                                            if (res.ok) {
                                                // Update local state
                                                setSelectedSpot({ ...selectedSpot, is_active: !selectedSpot.is_active })
                                                // Refresh spots list
                                                const spotsRes = await fetch('/api/admin/spots')
                                                const spotsData = await spotsRes.json()
                                                setSpots(spotsData.spots || [])
                                                success(selectedSpot.is_active ? 'Spot deactivated!' : 'Spot activated!')
                                            }
                                        } catch (err) {
                                            toastError('Failed to toggle spot')
                                        } finally {
                                            setToggleLoadingSpotId(null)
                                        }
                                    }}
                                    className={`rounded-xl p-4 text-center transition-colors disabled:opacity-50 ${selectedSpot.is_active ? 'bg-green-500/20 hover:bg-green-500/30' : 'bg-red-500/20 hover:bg-red-500/30'}`}
                                >
                                    {toggleLoadingSpotId === selectedSpot.id ? (
                                        <Loader2 size={24} className="animate-spin mx-auto" />
                                    ) : (
                                        <p className={`text-2xl font-bold ${selectedSpot.is_active ? 'text-green-500' : 'text-red-500'}`}>
                                            {selectedSpot.is_active ? 'ON' : 'OFF'}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 uppercase">Status</p>
                                </button>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-gray-400 uppercase">Who Claimed</h4>
                                {spotClaims.length > 0 && (
                                    <button
                                        onClick={exportSpotClaims}
                                        className="flex items-center gap-1 text-[#FC4C02] text-sm hover:underline"
                                    >
                                        <Download size={14} />
                                        Export CSV
                                    </button>
                                )}
                            </div>

                            {spotClaims.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                    <p>No one has claimed this spot yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {spotClaims.map((claim, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-black/30 rounded-xl p-3">
                                            <img
                                                src={claim.avatar_url || '/avatar-placeholder.png'}
                                                alt={claim.full_name}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{claim.full_name || 'User'}</p>
                                                <p className="text-xs text-gray-500">@{claim.username || 'unknown'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">
                                                    {new Date(claim.claimed_at).toLocaleDateString('id-ID')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(claim.claimed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reward Detail Modal */}
            <AnimatePresence>
                {showRewardDetail && selectedReward && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRewardDetail(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
                        >
                            <button
                                onClick={() => setShowRewardDetail(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-6">
                                <h3 className="text-2xl font-bold mb-1">{selectedReward.title}</h3>
                                <p className="text-gray-400 text-sm">{selectedReward.description || 'No description'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-black/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-[#FC4C02]">{selectedReward.required_points}</p>
                                    <p className="text-xs text-gray-500 uppercase">Points Cost</p>
                                </div>
                                <div className="bg-black/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold">{rewardClaims.length}</p>
                                    <p className="text-xs text-gray-500 uppercase">Total Claims</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-gray-400 uppercase">Claims History</h4>
                                {rewardClaims.length > 0 && (
                                    <button
                                        onClick={exportRewardClaims}
                                        className="flex items-center gap-1 text-[#FC4C02] text-sm hover:underline"
                                    >
                                        <Download size={14} />
                                        Export CSV
                                    </button>
                                )}
                            </div>

                            {rewardClaims.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                    <p>No one has claimed this reward yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {rewardClaims.map((claim, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-black/30 rounded-xl p-3">
                                            <img
                                                src={claim.avatar_url || '/avatar-placeholder.png'}
                                                alt={claim.full_name}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{claim.full_name || 'User'}</p>
                                                <p className="text-xs text-gray-500">@{claim.username || 'unknown'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">
                                                    {new Date(claim.claimed_at).toLocaleDateString('id-ID')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(claim.claimed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Quest Detail Modal */}
            <AnimatePresence>
                {showQuestDetail && selectedQuest && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQuestDetail(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
                        >
                            <button
                                onClick={() => setShowQuestDetail(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-6">
                                <h3 className="text-2xl font-bold mb-1">{selectedQuest.title}</h3>
                                <p className="text-gray-400 text-sm">{selectedQuest.description || 'No description'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-black/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-yellow-500">{selectedQuest.points}</p>
                                    <p className="text-xs text-gray-500 uppercase">Points Reward</p>
                                </div>
                                <div className="bg-black/50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold">{questClaims.length}</p>
                                    <p className="text-xs text-gray-500 uppercase">Total Completions</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-gray-400 uppercase">Completion History</h4>
                                {questClaims.length > 0 && (
                                    <button
                                        onClick={exportQuestClaims}
                                        className="flex items-center gap-1 text-[#FC4C02] text-sm hover:underline"
                                    >
                                        <Download size={14} />
                                        Export CSV
                                    </button>
                                )}
                            </div>

                            {questClaims.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                    <p>No one has completed this quest yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {questClaims.map((claim, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-black/30 rounded-xl p-3">
                                            <img
                                                src={claim.avatar_url || '/avatar-placeholder.png'}
                                                alt={claim.full_name}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{claim.full_name || 'User'}</p>
                                                <p className="text-xs text-gray-500">@{claim.username || 'unknown'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">
                                                    {new Date(claim.completed_at).toLocaleDateString('id-ID')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(claim.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Modal */}
            <AnimatePresence>
                {isModalOpen && activeTab !== 'activities' && activeTab !== 'spots' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-xl font-bold mb-6">
                                {activeTab === 'users' ? 'Create New User'
                                    : activeTab === 'quests' ? 'Create Daily Quest'
                                        : activeTab === 'rewards' ? 'Create Reward'
                                            : !selectedSurvey ? 'Create New Survey'
                                                : 'Add Question'}
                            </h3>

                            <form onSubmit={handleCreate} className="space-y-4">
                                {activeTab === 'users' ? (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.fullName}
                                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Username</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Password</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Gender (Optional)</label>
                                            <select
                                                value={formData.gender}
                                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            >
                                                <option value="">Random (Any)</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                            </select>
                                        </div>
                                    </>
                                ) : activeTab === 'quests' ? (
                                    /* CREATE QUEST FORM */
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Quest Title</label>
                                            <input
                                                type="text"
                                                required
                                                value={questTitle}
                                                onChange={(e) => setQuestTitle(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                placeholder="e.g. Drink 2L Water"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Points</label>
                                            <input
                                                type="number"
                                                required
                                                value={questPoints}
                                                onChange={(e) => setQuestPoints(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Description</label>
                                            <textarea
                                                required
                                                value={questDesc}
                                                onChange={(e) => setQuestDesc(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02] h-24 resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Deadline (Optional)</label>
                                            <input
                                                type="datetime-local"
                                                value={questExpiresAt}
                                                onChange={(e) => setQuestExpiresAt(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02] [&::-webkit-calendar-picker-indicator]:invert"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Verification Type</label>
                                            <select
                                                value={questVerificationType}
                                                onChange={(e) => setQuestVerificationType(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            >
                                                <option value="none">None (Instant Claim)</option>
                                                <option value="instagram_username">Check Instagram Username</option>
                                                <option value="positive_message">Send Positive Message (AI Check)</option>
                                            </select>
                                        </div>
                                    </>
                                ) : activeTab === 'rewards' ? (
                                    /* CREATE REWARD FORM */
                                    <>
                                        {isEditingReward && (
                                            <div className="flex justify-between items-center mb-4 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                                <div className="text-blue-500 text-sm font-bold flex items-center gap-2">
                                                    <Edit size={16} />
                                                    Editing: {rewardData.title}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditingReward(false)
                                                        setEditingRewardId(null)
                                                        setRewardData({ title: '', description: '', image_url: '', required_points: 0, max_claims: 0, type: 'reveal' })
                                                    }}
                                                    className="text-xs text-blue-400 hover:text-white underline"
                                                >
                                                    Cancel Edit
                                                </button>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Reward Title</label>
                                            <input
                                                type="text"
                                                required
                                                value={rewardData.title}
                                                onChange={(e) => setRewardData({ ...rewardData, title: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                placeholder="e.g. Eco-Friendly Water Bottle"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Reward Type</label>
                                            <select
                                                value={rewardData.type}
                                                onChange={(e) => setRewardData({ ...rewardData, type: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            >
                                                <option value="reveal">Reveal (Always Visible)</option>
                                                <option value="progress">Progress (Hidden until Coins Enough)</option>
                                                <option value="mystery">Mystery (Hidden until Someone Claims)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Price (Coins)</label>
                                            <input
                                                type="number"
                                                value={rewardData.required_points}
                                                onChange={(e) => setRewardData({ ...rewardData, required_points: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase flex justify-between">
                                                <span>Max Claims</span>
                                                <span className="text-gray-600 normal-case font-normal">(0 = Unlimited)</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={rewardData.max_claims}
                                                onChange={(e) => setRewardData({ ...rewardData, max_claims: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Description</label>
                                            <textarea
                                                required
                                                value={rewardData.description}
                                                onChange={(e) => setRewardData({ ...rewardData, description: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02] h-24 resize-none"
                                                placeholder="Describe the reward..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Image URL (Optional)</label>
                                            <input
                                                type="text"
                                                value={rewardData.image_url}
                                                onChange={(e) => setRewardData({ ...rewardData, image_url: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </>
                                ) : !selectedSurvey ? (
                                    /* CREATE SURVEY CONTAINER FORM */
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Survey Title</label>
                                            <input
                                                type="text"
                                                required
                                                value={surveyContainerData.title}
                                                onChange={(e) => setSurveyContainerData({ ...surveyContainerData, title: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                placeholder="e.g. Weekly Wellness Check"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Description</label>
                                            <textarea
                                                required
                                                value={surveyContainerData.description}
                                                onChange={(e) => setSurveyContainerData({ ...surveyContainerData, description: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02] h-24 resize-none"
                                                placeholder="Briefly describe the purpose of this survey..."
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <input
                                                type="checkbox"
                                                id="survey-active"
                                                checked={surveyContainerData.is_active}
                                                onChange={(e) => setSurveyContainerData({ ...surveyContainerData, is_active: e.target.checked })}
                                                className="w-5 h-5 rounded border-gray-600 bg-black text-[#FC4C02] focus:ring-[#FC4C02]"
                                            />
                                            <label htmlFor="survey-active" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                                                Active Status
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    /* CREATE QUESTION FORM */
                                    <>
                                        <div className="bg-white/5 p-3 rounded-lg mb-4 text-sm text-gray-400">
                                            Adding question to: <span className="text-white font-bold">{selectedSurvey.title}</span>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Question Text</label>
                                            <input
                                                type="text"
                                                required
                                                value={questionData.questionText}
                                                onChange={(e) => setQuestionData({ ...questionData, questionText: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                                placeholder="e.g. How do you feel today?"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase flex justify-between">
                                                <span>Options</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setQuestionData({
                                                        ...questionData,
                                                        options: [...questionData.options, { label: '', tags: '' }]
                                                    })}
                                                    className="text-[#FC4C02] hover:underline"
                                                >
                                                    + Add Option
                                                </button>
                                            </label>
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                {questionData.options.map((opt, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Label (e.g. Good)"
                                                            required
                                                            value={opt.label}
                                                            onChange={(e) => {
                                                                const newOpts = [...questionData.options]
                                                                newOpts[idx].label = e.target.value
                                                                setQuestionData({ ...questionData, options: newOpts })
                                                            }}
                                                            className="flex-1 bg-black border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#FC4C02]"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Tags (comma sep)"
                                                            value={opt.tags}
                                                            onChange={(e) => {
                                                                const newOpts = [...questionData.options]
                                                                newOpts[idx].tags = e.target.value
                                                                setQuestionData({ ...questionData, options: newOpts })
                                                            }}
                                                            className="flex-1 bg-black border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#FC4C02]"
                                                        />
                                                        {questionData.options.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newOpts = questionData.options.filter((_, i) => i !== idx)
                                                                    setQuestionData({ ...questionData, options: newOpts })
                                                                }}
                                                                className="text-red-500 px-2 hover:bg-white/5 rounded"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {error && <p className="text-red-500 text-sm">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="w-full bg-[#FC4C02] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex justify-center"
                                >
                                    {createLoading ? <Loader2 className="animate-spin" /> : (
                                        isEditingSurvey && !selectedSurvey ? 'Update Survey'
                                            : isEditingReward && activeTab === 'rewards' ? 'Update Reward'
                                                : isEditingReward ? 'Update' : 'Create'
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >


            {/* Point Adjustment Modal */}
            <AnimatePresence>
                {
                    showPointsModal && pointsTarget && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowPointsModal(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl"
                            >
                                <h3 className="text-xl font-bold mb-4 text-white">Adjust Points</h3>
                                <p className="text-gray-400 mb-6 text-sm">
                                    Adjusting points for <span className="text-white font-bold">{pointsTarget.name}</span>
                                </p>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Points Amount</label>
                                        <div className="text-xs text-gray-500 mb-1">Use negative value to subtract</div>
                                        <input
                                            type="number"
                                            value={adjustPointsData.points}
                                            onChange={(e) => setAdjustPointsData({ ...adjustPointsData, points: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            placeholder="e.g. 100 or -50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Reason</label>
                                        <input
                                            type="text"
                                            value={adjustPointsData.reason}
                                            onChange={(e) => setAdjustPointsData({ ...adjustPointsData, reason: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#FC4C02]"
                                            placeholder="e.g. Manual Adjustment"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowPointsModal(false)}
                                        className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors font-bold"
                                        disabled={isAdjusting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAdjustPoints}
                                        disabled={isAdjusting || !adjustPointsData.points || !adjustPointsData.reason}
                                        className="px-4 py-2 rounded-lg bg-[#FC4C02] hover:bg-orange-600 text-white font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isAdjusting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }

            </AnimatePresence >

            {/* Reset Points Modal */}
            <AnimatePresence>
                {showResetModal && resetTarget && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowResetModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                                <RotateCcw className="text-[#FC4C02]" /> Reset Points
                            </h3>
                            <p className="text-gray-400 mb-6 text-sm">
                                Resetting points for <span className="text-white font-bold">{resetTarget.name}</span>.
                                <br />
                                <span className="text-red-500 font-bold block mt-2">⚠️ This action cannot be undone.</span>
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleResetPoints('steps')}
                                    disabled={isResetting}
                                    className="w-full py-3 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20 font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    {isResetting ? <Loader2 size={16} className="animate-spin" /> : <Footprints size={16} />}
                                    Reset Steps Only
                                </button>
                                <button
                                    onClick={() => handleResetPoints('quests')}
                                    disabled={isResetting}
                                    className="w-full py-3 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    {isResetting ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                                    Reset Quests Only
                                </button>
                                <button
                                    onClick={() => handleResetPoints('rewards')}
                                    disabled={isResetting}
                                    className="w-full bg-[#FC4C02]/10 hover:bg-[#FC4C02]/20 text-[#FC4C02] font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <Gift size={20} />
                                    Reset Rewards (Fix Negative)
                                </button>
                                <button
                                    onClick={() => handleResetPoints('all')}
                                    disabled={isResetting}
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {isResetting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={20} />}
                                    Reset Everything (All Data)
                                </button>
                            </div>

                            <button
                                onClick={() => setShowResetModal(false)}
                                className="w-full mt-4 text-gray-500 hover:text-white text-sm"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >

            {/* Create Activity Modal */}
            <AnimatePresence>
                {
                    isModalOpen && activeTab === 'activities' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.95 }}
                                className="bg-[#121212] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden"
                            >
                                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">New Activity</h2>
                                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateActivity} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Activity Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={activityForm.title}
                                            onChange={e => setActivityForm({ ...activityForm, title: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FC4C02]"
                                            placeholder="e.g. Morning Run"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={activityForm.date}
                                            onChange={e => setActivityForm({ ...activityForm, date: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FC4C02]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Points Reward (Optional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={activityForm.points}
                                            onChange={e => setActivityForm({ ...activityForm, points: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FC4C02]"
                                            placeholder="0"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-[#FC4C02] hover:bg-[#e04302] text-white font-bold py-3 rounded-xl transition-colors"
                                    >
                                        Create Activity
                                    </button>
                                </form>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* QR Scanner Modal */}
            <AnimatePresence>
                {
                    isScannerOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
                        >
                            <div className="w-full max-w-md bg-[#121212] rounded-3xl overflow-hidden border border-white/10 relative">
                                <button
                                    onClick={() => setIsScannerOpen(false)}
                                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                <div className="p-6 text-center">
                                    <h2 className="text-2xl font-bold mb-2">Scan QR Code</h2>
                                    <p className="text-gray-400 text-sm mb-6">Point camera at user's ID Card</p>

                                    <div className="rounded-xl overflow-hidden border-2 border-[#FC4C02]/50 shadow-[0_0_30px_rgba(252,76,2,0.2)] mb-6">
                                        <Scanner
                                            onScan={handleScan}
                                        />
                                    </div>

                                    {scanResult && (
                                        <div className={`p-4 rounded-xl border ${scanResult.success ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                                            <div className="font-bold flex items-center justify-center gap-2 mb-1">
                                                {scanResult.success ? <Shield className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                                {scanResult.success ? 'Success!' : 'Error'}
                                            </div>
                                            <p className="text-sm">{scanResult.message}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >




            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {
                    deleteTarget && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setDeleteTarget(null)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl"
                            >
                                <h3 className="text-xl font-bold mb-2 text-white">Confirm Deletion</h3>
                                <p className="text-gray-400 mb-6">
                                    Are you sure you want to delete <span className="text-white font-bold">{deleteTarget.name}</span>?
                                    <br />This action cannot be undone.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setDeleteTarget(null)}
                                        className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors font-bold"
                                        disabled={deleteLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={performDelete}
                                        disabled={deleteLoading}
                                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center gap-2"
                                    >
                                        {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                        Delete
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* Adjust Steps Modal */}
            <AnimatePresence>
                {
                    showStepsModal && stepsTarget && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowStepsModal(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl"
                            >
                                <h3 className="text-xl font-bold mb-4 text-white">Adjust Steps</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Adjusting steps for <span className="text-white font-bold">{stepsTarget.name}</span>.
                                    <br />Positive value adds steps, negative subtracts.
                                </p>

                                <form onSubmit={handleAdjustSteps} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Steps Adjustment</label>
                                        <input
                                            type="number"
                                            required
                                            value={adjustStepsData.steps}
                                            onChange={(e) => setAdjustStepsData({ ...adjustStepsData, steps: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-purple-500"
                                            placeholder="e.g. 500 or -200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Reason</label>
                                        <input
                                            type="text"
                                            required
                                            value={adjustStepsData.reason}
                                            onChange={(e) => setAdjustStepsData({ ...adjustStepsData, reason: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-purple-500"
                                            placeholder="e.g. Bonus challenge, Correction"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isAdjusting}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                    >
                                        {isAdjusting ? <Loader2 className="animate-spin" /> : <Footprints size={18} />}
                                        {isAdjusting ? 'Adjusting...' : 'Confirm Adjustment'}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* Activity Detail Modal */}
            <AnimatePresence>
                {
                    showActivityDetail && activityDetail && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                            >
                                {/* Header */}
                                <div className="p-6 border-b border-white/5 flex justify-between items-start bg-[#121212]">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">{activityDetail.activity.title}</h2>
                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                            <span className="flex items-center gap-1"><Calendar size={14} /> {activityDetail.activity.activity_date}</span>
                                            <span className="text-[#FC4C02] font-bold">+{activityDetail.activity.points} PTS</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowActivityDetail(false)}
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Compact Stats (No Cards) */}
                                <div className="flex items-center gap-8 px-6 py-4 border-b border-white/5 bg-black/20">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Completed</span>
                                        <span className="text-xl font-bold text-green-500 flex items-center gap-2">
                                            {activityDetail.stats.attended} <Check size={14} />
                                        </span>
                                    </div>
                                    <div className="w-px h-8 bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending</span>
                                        <span className="text-xl font-bold text-[#FC4C02] flex items-center gap-2">
                                            {activityDetail.stats.pending} <Target size={14} />
                                        </span>
                                    </div>
                                    <div className="w-px h-8 bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rate</span>
                                        <span className="text-xl font-bold text-blue-500">
                                            {activityDetail.stats.attendance_rate}%
                                        </span>
                                    </div>
                                </div>

                                {/* Navigation Tabs & Export */}
                                <div className="flex items-center justify-between border-b border-white/10 bg-[#121212] px-2">
                                    <div className="flex">
                                        <button
                                            onClick={() => setActiveDetailTab('completed')}
                                            className={`py-4 px-6 text-sm font-bold transition-colors relative flex items-center gap-2 ${activeDetailTab === 'completed' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <Check size={16} /> Completed
                                            {activeDetailTab === 'completed' && (
                                                <motion.div layoutId="detailTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FC4C02]" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setActiveDetailTab('pending')}
                                            className={`py-4 px-6 text-sm font-bold transition-colors relative flex items-center gap-2 ${activeDetailTab === 'pending' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <Target size={16} /> Pending
                                            {activeDetailTab === 'pending' && (
                                                <motion.div layoutId="detailTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FC4C02]" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Export Button (Visible for Pending Tab) */}
                                    {activeDetailTab === 'pending' && (
                                        <button
                                            onClick={exportActivityPending}
                                            className="mr-4 flex items-center gap-2 bg-[#FC4C02] hover:bg-[#e04502] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-[#FC4C02]/20"
                                        >
                                            <Download size={14} /> Export CSV
                                        </button>
                                    )}
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 overflow-y-auto bg-black/40 relative">
                                    {activeDetailTab === 'completed' ? (
                                        // COMPLETED VIEW (TABLE)
                                        <div className="min-w-full pb-6">
                                            {activityDetail.attendees.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                                    <Scan size={48} className="mb-4 opacity-50" />
                                                    <p>No attendees yet.</p>
                                                </div>
                                            ) : (
                                                <div className="w-full">
                                                    {/* Table Header */}
                                                    <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-[#1a1a1a]/95 sticky top-0 backdrop-blur-md z-10 border-b border-white/5">
                                                        <div className="col-span-5 md:col-span-6">User</div>
                                                        <div className="col-span-4 md:col-span-3">Instagram</div>
                                                        <div className="col-span-3 text-right">Scanned At</div>
                                                    </div>

                                                    {/* Table Rows */}
                                                    <div className="divide-y divide-white/5">
                                                        {activityDetail.attendees.map((user: any) => (
                                                            <div key={user.user_id} className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-white/5 transition-colors items-center group">
                                                                <div className="col-span-5 md:col-span-6 flex items-center gap-3 overflow-hidden">
                                                                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 border border-white/10 group-hover:border-[#FC4C02]/50 transition-colors">
                                                                        {user.avatar_url ? (
                                                                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <User size={16} className="w-full h-full p-1.5 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                    <div className="overflow-hidden min-w-0">
                                                                        <div className="text-sm font-bold text-white truncate group-hover:text-[#FC4C02] transition-colors">{user.full_name}</div>
                                                                        <div className="text-xs text-gray-500 truncate">@{user.username}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-4 md:col-span-3 overflow-hidden">
                                                                    {user.instagram ? (
                                                                        <a href={`https://instagram.com/${user.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate block hover:underline">
                                                                            {user.instagram.startsWith('@') ? user.instagram : `@${user.instagram}`}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-gray-600 text-xs">-</span>
                                                                    )}
                                                                </div>
                                                                <div className="col-span-3 text-right text-xs text-gray-400 font-mono">
                                                                    {new Date(user.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // PENDING VIEW (TABLE)
                                        <div className="min-w-full pb-6">
                                            {activityDetail.pending.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-green-500">
                                                    <Check size={48} className="mb-4 opacity-50" />
                                                    <p className="font-bold">All Users Completed!</p>
                                                </div>
                                            ) : (
                                                <div className="w-full">
                                                    {/* Table Header */}
                                                    <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-[#1a1a1a]/95 sticky top-0 backdrop-blur-md z-10 border-b border-white/5">
                                                        <div className="col-span-5 md:col-span-6">User</div>
                                                        <div className="col-span-4 md:col-span-3">Instagram</div>
                                                        <div className="col-span-3 text-right">Status</div>
                                                    </div>

                                                    <div className="divide-y divide-white/5">
                                                        {activityDetail.pending.map((user: any) => (
                                                            <div key={user.user_id} className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-white/5 transition-colors items-center group">
                                                                <div className="col-span-5 md:col-span-6 flex items-center gap-3 overflow-hidden">
                                                                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 border border-white/10 group-hover:border-[#FC4C02]/50 transition-colors">
                                                                        {user.avatar_url ? (
                                                                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <User size={16} className="w-full h-full p-1.5 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                    <div className="overflow-hidden min-w-0">
                                                                        <div className="text-sm font-bold text-white truncate group-hover:text-[#FC4C02] transition-colors">{user.full_name}</div>
                                                                        <div className="text-xs text-gray-500 truncate">@{user.username}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-4 md:col-span-3 overflow-hidden">
                                                                    {user.instagram ? (
                                                                        <a href={`https://instagram.com/${user.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate block hover:underline">
                                                                            {user.instagram.startsWith('@') ? user.instagram : `@${user.instagram}`}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-gray-600 text-xs">-</span>
                                                                    )}
                                                                </div>
                                                                <div className="col-span-3 text-right">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FC4C02] bg-[#FC4C02]/10 px-2 py-1 rounded-full border border-[#FC4C02]/20">
                                                                        Pending
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >
        </div >
    )
}
