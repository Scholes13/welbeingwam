import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/LoginForm'

export default async function Home() {
  const cookieStore = await cookies()
  const session = cookieStore.get('strava_athlete_id')

  if (session) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black overflow-hidden relative">
      {/* Background Ambient */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FC4C02] rounded-full mix-blend-screen filter blur-[150px] opacity-15" />
        <div className="absolute bottom-[20%] left-[-10%] w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-[150px] opacity-15" />
      </div>

      <LoginForm />
    </main>
  )
}
