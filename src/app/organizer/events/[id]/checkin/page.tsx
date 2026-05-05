import { CheckInScanner } from '@/components/checkin/check-in-scanner'

interface CheckInPageProps {
  params: Promise<{ id: string }>
}

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { id } = await params

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Check-in</h1>
      <p className="mb-6 text-sm text-gray-500">
        Quét mã QR trên vé điện tử của người tham dự.
      </p>
      <CheckInScanner />
    </main>
  )
}
