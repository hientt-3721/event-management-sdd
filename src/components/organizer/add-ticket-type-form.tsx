'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTicketType, deleteTicketType } from '@/features/events/actions'
import { Button } from '@/components/ui/button'
import type { EventWithTicketTypes } from '@/features/events/types'

interface AddTicketTypeFormProps {
  event: EventWithTicketTypes
}

export function AddTicketTypeForm({ event }: AddTicketTypeFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [deleting, startDeleteTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')

  function handleAdd() {
    setError(null)
    if (!name.trim() || !quantity) {
      setError('Tên và số lượng là bắt buộc.')
      return
    }
    startTransition(async () => {
      const result = await addTicketType(event.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        total_quantity: parseInt(quantity, 10),
      })
      if (result.error) {
        setError(result.error === 'EVENT_CANCELLED' ? 'Không thể thêm vé cho sự kiện đã huỷ.' : result.error)
      } else {
        setName('')
        setDescription('')
        setQuantity('')
        setShowForm(false)
        router.refresh()
      }
    })
  }

  function handleDelete(id: string) {
    startDeleteTransition(async () => {
      await deleteTicketType(id)
      router.refresh()
    })
  }

  if (event.status === 'cancelled') return null

  return (
    <div className="space-y-3">
      {event.ticket_types.map((tt) => (
        <div key={tt.id} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{tt.name}</p>
            {tt.description && <p className="text-sm text-gray-500">{tt.description}</p>}
            <p className="text-xs text-gray-400 mt-0.5">{tt.issued_count}/{tt.total_quantity} đã đăng ký</p>
          </div>
          {tt.issued_count === 0 && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDelete(tt.id)}
              loading={deleting}
            >
              Xoá
            </Button>
          )}
        </div>
      ))}

      {showForm ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
          <p className="text-sm font-medium text-indigo-800">Thêm loại vé mới</p>
          <input
            className="input-field w-full"
            placeholder="Tên loại vé *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <input
            className="input-field w-full"
            placeholder="Mô tả (tuỳ chọn)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
          <input
            className="input-field w-full"
            type="number"
            placeholder="Số lượng vé *"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} loading={pending}>Thêm vé</Button>
            <Button size="sm" variant="secondary" onClick={() => { setShowForm(false); setError(null) }}>Huỷ</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          + Thêm loại vé
        </button>
      )}
    </div>
  )
}
