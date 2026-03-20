'use client'

import React from 'react'

interface SubtitleTextRendererProps {
  html: string
  className?: string
}

export function SubtitleTextRenderer({ html, className = '' }: SubtitleTextRendererProps) {
  return (
    <span
      className={`subtitle-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
