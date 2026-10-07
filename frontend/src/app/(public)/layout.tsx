import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page text-foreground">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  )
}
