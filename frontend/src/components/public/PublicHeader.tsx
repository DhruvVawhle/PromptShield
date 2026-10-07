"use client"

import { usePathname } from "next/navigation"
import { NavigationMenu } from "@/components/ui/navigation-menu"

const navItems = [
  { label: "How it works", href: "/#how-it-works", sectionId: "how-it-works" },
  { label: "Security", href: "/security" },
  { label: "Product", href: "/#product", sectionId: "product" },
  { label: "Architecture", href: "/architecture" },
  { label: "Resources", href: "/#resources", sectionId: "resources" },
] as const

export function PublicHeader() {
  const pathname = usePathname()

  return (
    <NavigationMenu
      items={navItems}
      signIn={{ label: "Sign In", href: "/login" }}
      cta={{ label: "Try PromptShield", href: "/login" }}
      brand={{ label: "PromptShield", href: "/" }}
      activePath={pathname ?? undefined}
    />
  )
}
