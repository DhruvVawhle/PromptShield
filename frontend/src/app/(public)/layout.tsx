import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page text-foreground">
      <PublicHeader />
      <div className="pt-[68px]">{children}</div>
      <PublicFooter />
    </div>
  )
}
