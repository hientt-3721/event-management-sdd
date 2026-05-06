'use client'

import { useState } from 'react'

interface DemoAccount {
  role: string
  email: string
  password: string
  description: string
}

interface DemoAccountsProps {
  accounts: DemoAccount[]
  title?: string
}

export function DemoAccounts({ accounts, title }: DemoAccountsProps) {
  const [visible, setVisible] = useState<Record<number, boolean>>({})

  function toggle(idx: number) {
    setVisible((v) => ({ ...v, [idx]: !v[idx] }))
  }

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-semibold text-gray-700">{title}</h3>}
      {accounts.map((account, idx) => (
        <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {account.role}
            </span>
            <span className="text-xs text-gray-400">{account.description}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-20 text-xs text-gray-500">Email</span>
              <code className="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                {account.email}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-xs text-gray-500">Password</span>
              <code className="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                {visible[idx] ? account.password : '•'.repeat(account.password.length)}
              </code>
              <button
                onClick={() => toggle(idx)}
                className="text-xs text-gray-400 hover:text-gray-600"
                aria-label={visible[idx] ? 'Hide password' : 'Show password'}
              >
                {visible[idx] ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
