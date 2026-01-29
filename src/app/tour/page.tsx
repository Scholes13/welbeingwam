import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TourLoginForm from '@/components/tour/TourLoginForm'

export default async function TourHome() {
  const cookieStore = await cookies()
  const participantId = cookieStore.get('participant_id')

  // Redirect to map if already logged in
  if (participantId) {
    redirect('/map')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black overflow-hidden relative">
      {/* Background Ambient */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FC4C02] rounded-full mix-blend-screen filter blur-[150px] opacity-15" />
        <div className="absolute bottom-[20%] left-[-10%] w-[400px] h-[400px] bg-emerald-600 rounded-full mix-blend-screen filter blur-[150px] opacity-15" />
      </div>

      <TourLoginForm />
    </main>
  )
}
