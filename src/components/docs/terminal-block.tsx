'use client'

import { useState } from 'react'

interface TerminalBlockProps {
  command: string
  language?: string
}

export function TerminalBlock({ command, language = 'bash' }: TerminalBlockProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative rounded-xl bg-gray-950 px-4 py-3 font-mono text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-xs text-gray-500">{language}</span>
      </div>
      <pre className="overflow-x-auto text-emerald-400 whitespace-pre-wrap break-all">
        <span className="select-none text-gray-500 mr-2">$</span>
        {command}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
        aria-label="Copy command"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )
}
