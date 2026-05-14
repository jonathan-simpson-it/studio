"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { registerUser } from "@/lib/db/actions/settings"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  useEffect(() => {
    const error = searchParams.get("error")
    if (error === "github_not_linked") {
      toast.error("GitHub account not linked to any user. Register with an invite code first.")
    }
  }, [searchParams])

  if (status === "loading") {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (status === "authenticated") return null

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await registerUser({ email, password, full_name: fullName, invite_code: inviteCode })
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        toast.error("Account created but sign-in failed. Please log in.")
        router.push("/login")
        return
      }
      toast.success("Account created!")
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleGithubSignup() {
    if (!inviteCode.trim()) {
      toast.error("Enter your invite code first")
      return
    }

    setGithubLoading(true)

    try {
      const res = await fetch("/api/auth/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      })
      const data = await res.json()
      if (!data.valid) {
        toast.error("Invalid invite code")
        setGithubLoading(false)
        return
      }

      document.cookie = `invite_code=${encodeURIComponent(inviteCode)}; path=/; max-age=600; samesite=lax`
      await signIn("github", { redirect: true })
    } catch {
      toast.error("Failed to start GitHub sign-in")
      setGithubLoading(false)
    }
  }

  async function handleGoogleSignup() {
    if (!inviteCode.trim()) {
      toast.error("Enter your invite code first")
      return
    }

    setGoogleLoading(true)

    try {
      const res = await fetch("/api/auth/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      })
      const data = await res.json()
      if (!data.valid) {
        toast.error("Invalid invite code")
        setGoogleLoading(false)
        return
      }

      document.cookie = `invite_code=${encodeURIComponent(inviteCode)}; path=/; max-age=600; samesite=lax`
      await signIn("google", { redirect: true })
    } catch {
      toast.error("Failed to start Google sign-in")
      setGoogleLoading(false)
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name</Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Your Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite_code">Founder Invite Code</Label>
        <Input
          id="invite_code"
          type="text"
          placeholder="Enter your invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGithubSignup}
        disabled={githubLoading}
      >
        {githubLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        )}
        {githubLoading ? "Connecting to GitHub…" : "Sign up with GitHub"}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignup}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        {googleLoading ? "Connecting to Google…" : "Sign up with Google"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
