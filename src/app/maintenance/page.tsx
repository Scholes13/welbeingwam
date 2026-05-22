import { getMaintenanceSettings } from '@/lib/maintenance'

export default async function MaintenancePage() {
  const maintenance = await getMaintenanceSettings()

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-8 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-orange-300">
          Maintenance Mode
        </div>
        <h1 className="text-4xl font-black tracking-tight md:text-6xl">
          We will be back soon.
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-300 md:text-lg">
          {maintenance.message}
        </p>
        <p className="mt-8 text-sm text-gray-500">
          Please refresh this page in a few minutes.
        </p>
      </div>
    </main>
  )
}
