import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Home() {
  const cookieStore = await cookies()
  const participantSession = cookieStore.get('participant_id')

  // If logged in as City Tour participant, go to map
  if (participantSession) {
    redirect('/map')
  }

  // Otherwise, redirect to tour registration
  redirect('/tour')
}
