"use client"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { IconLoader2 } from "@tabler/icons-react"
import { HeroPage } from "@/components/custom/HeroPage"
import { CustomStickyBanner } from "@/components/custom/CustomStickyBanner"

export default function HomePage() {
  const { user, loading, isAuthenticated, signInWithGoogle } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, user, router])

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error("Sign in failed:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 text-white animate-spin" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Redirecting to dashboard...</div>
      </div>
    )
  }

  return (
    <div className="relative flex w-full flex-col overflow-y-auto">
      <CustomStickyBanner />
      <HeroPage />
    </div>
  )
}
