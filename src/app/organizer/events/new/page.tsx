'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createEvent, addTicketType } from '@/features/events/actions'

interface TicketTypeInput {
  name: string
  description: string
  total_quantity: string
}

export default function NewEventPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketTypeInput[]>([
    { name: '', description: '', total_quantity: '100' },
  ])

  function addTicketTypeRow() {
    setTicketTypes((prev) => [...prev, { name: '', description: '', total_quantity: '100' }])
  }

  function removeTicketTypeRow(idx: number) {
    setTicketTypes((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateTicketType(idx: number, field: keyof TicketTypeInput, value: string) {
    setTicketTypes((prev) =>
      prev.map((tt, i) => (i === idx ? { ...tt, [field]: value } : tt))
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      setError(null)
      const eventInput = {
        name: fd.get('name') as string,
        description: fd.get('description') as string,
        start_at: new Date(fd.get('start_at') as string).toISOString(),
        end_at: new Date(fd.get('end_at') as string).toISOString(),
        location: fd.get('location') as string,
      }

      const result = await createEvent(eventInput)
      if (result.error) {
        setError('Không thể tạo sự kiện: ' + result.error)
        return
      }

      const eventId = result.data!.id
      for (const tt of ticketTypes) {
        if (!tt.name.trim()) continue
        await addTicketType(eventId, {
          name: tt.name,
          description: tt.description || undefined,
          total_quantity: parseInt(tt.total_quantity, 10),
        })
      }

      router.push(`/organizer/events/${eventId}`)
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Tạo sự kiện mới</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tên sự kiện *</label>
          <input name="name" required className="input-field" placeholder="VD: Tech Conference 2025" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả *</label>
          <textarea name="description" required rows={4} className="input-field" placeholder="Mô tả về sự kiện..." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Bắt đầu *</label>
            <input name="start_at" type="datetime-local" required className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Kết thúc *</label>
            <input name="end_at" type="datetime-local" required className="input-field" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Địa điểm *</label>
          <input name="location" required className="input-field" placeholder="VD: Hội trường A, 123 Nguyễn Huệ, TP.HCM" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Loại vé</h2>
            <button
              type="button"
              onClick={addTicketTypeRow}
              className="text-xs text-indigo-600 hover:underline"
            >
              + Thêm loại vé
            </button>
          </div>
          <div className="space-y-3">
            {ticketTypes.map((tt, idx) => (
              <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={tt.name}
                    onChange={(e) => updateTicketType(idx, 'name', e.target.value)}
                    placeholder="Tên loại vé *"
                    className="input-field flex-1"
                  />
                  <input
                    value={tt.total_quantity}
                    onChange={(e) => updateTicketType(idx, 'total_quantity', e.target.value)}
                    type="number"
                    min="1"
                    placeholder="Số lượng"
                    className="input-field w-24"
                  />
                  {ticketTypes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTicketTypeRow(idx)}
                      className="px-2 text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <input
                  value={tt.description}
                  onChange={(e) => updateTicketType(idx, 'description', e.target.value)}
                  placeholder="Mô tả loại vé (tuỳ chọn)"
                  className="input-field w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" loading={pending} className="flex-1">Tạo sự kiện</Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Hủy</Button>
        </div>
      </form>
    </main>
  )
}
