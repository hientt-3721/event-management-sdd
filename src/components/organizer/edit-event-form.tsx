'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { updateEvent } from '@/features/events/actions'

interface EditEventFormProps {
  event: {
    id: string
    name: string
    description: string
    start_at: string
    end_at: string
    location: string
    banner_image_url?: string | null
  }
}

function toDatetimeLocal(iso: string) {
  // Convert ISO string to datetime-local input format (YYYY-MM-DDTHH:mm)
  return iso.slice(0, 16)
}

const errorMessages: Record<string, string> = {
  UNAUTHENTICATED: 'Bạn cần đăng nhập.',
  FORBIDDEN: 'Bạn không có quyền chỉnh sửa sự kiện này.',
  NOT_FOUND: 'Sự kiện không tồn tại.',
  EVENT_CANCELLED: 'Không thể chỉnh sửa sự kiện đã huỷ.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại.',
}

export function EditEventForm({ event }: EditEventFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      setError(null)
      setSuccess(false)

      const bannerUrl = (fd.get('banner_image_url') as string).trim()
      const result = await updateEvent(event.id, {
        name: fd.get('name') as string,
        description: fd.get('description') as string,
        start_at: new Date(fd.get('start_at') as string).toISOString(),
        end_at: new Date(fd.get('end_at') as string).toISOString(),
        location: fd.get('location') as string,
        ...(bannerUrl ? { banner_image_url: bannerUrl } : {}),
      })

      if (result.error) {
        setError(errorMessages[result.error] ?? `Lỗi: ${result.error}`)
      } else {
        setSuccess(true)
        router.push(`/organizer/events/${event.id}`)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Tên sự kiện *</label>
        <input
          name="name"
          required
          defaultValue={event.name}
          className="input-field"
          placeholder="VD: Tech Conference 2025"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả *</label>
        <textarea
          name="description"
          required
          rows={5}
          defaultValue={event.description}
          className="input-field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Bắt đầu *</label>
          <input
            name="start_at"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocal(event.start_at)}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Kết thúc *</label>
          <input
            name="end_at"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocal(event.end_at)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Địa điểm *</label>
        <input
          name="location"
          required
          defaultValue={event.location}
          className="input-field"
          placeholder="VD: Hội trường A, 123 Nguyễn Huệ, TP.HCM"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          URL ảnh bìa (tuỳ chọn)
        </label>
        <input
          name="banner_image_url"
          type="url"
          defaultValue={event.banner_image_url ?? ''}
          className="input-field"
          placeholder="https://..."
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-600">
          Đã lưu thay đổi!
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={pending} className="flex-1">
          Lưu thay đổi
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={pending}
        >
          Huỷ
        </Button>
      </div>
    </form>
  )
}
