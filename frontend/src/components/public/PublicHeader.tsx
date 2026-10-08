"use client"

import { usePathname } from "next/navigation"
import { NavigationMenu } from "@/components/ui/navigation-menu"
import { useAuth } from "@/components/auth/AuthProvider"

const navItems = [
  { label: "How it works", href: "/#how-it-works", sectionId: "how-it-works" },
  { label: "Security", href: "/security" },
  { label: "Product", href: "/#product", sectionId: "product" },
  { label: "Architecture", href: "/architecture" },
  { label: "Resources", href: "/#resources", sectionId: "resources" },
] as const

export function PublicHeader() {
  const pathname = usePathname()
  const { user, profile, loading, signOut } = useAuth()

  return (
    <NavigationMenu
      items={navItems}
      brand={{ label: "PromptShield", href: "/" }}
      activePath={pathname ?? undefined}
      user={user}
      profile={profile}
      loading={loading}
      onSignOut={signOut}
    />
  )
}
