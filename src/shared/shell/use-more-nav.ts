'use client'

import { useMemo } from 'react'
import { useResources } from '@/shared/resources'
import { menuResourceKeys, type MenuLink } from './admin-menu'
import { useShellMenu } from './use-shell-data'

export type NavSection = MenuLink & { label: string; nested?: boolean }

const KEYS = menuResourceKeys()

// Pages that live under More keep every More area in the sidebar, with the open area's pages beneath it.
export function useMoreNav(
  activeId: string,
  sections: readonly NavSection[],
): { label: string; sections: readonly NavSection[] } | null {
  const menu = useShellMenu()
  const { text } = useResources(KEYS)
  return useMemo(() => {
    const more = menu.layout.more
    const owner = more.find(
      entry => entry.id === activeId || entry.children.some(child => child.id === activeId),
    )
    if (!owner) return null
    const label = (link: MenuLink) => {
      if (!link.labelKey) return link.fallback
      const value = text(link.labelKey)
      return !value.trim() || value === link.labelKey ? link.fallback : value
    }
    const flat = more.flatMap<NavSection>(entry => {
      const top = { ...entry, label: label(entry) }
      if (entry.id !== owner.id || entry.children.length < 2) return [top]
      const children = entry.children.map(child => ({
        ...child,
        label: sections.find(section => section.id === child.id)?.label ?? label(child),
        nested: true,
      }))
      return [top, ...children]
    })
    return { label: label({ ...owner, labelKey: 'More', fallback: 'More' }), sections: flat }
  }, [menu.layout.more, activeId, sections, text])
}
