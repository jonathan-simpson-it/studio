import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { connect } from "@/lib/db/connect"
import { User } from "@/lib/db/models/core"
import { verifyPassword, hashPassword } from "@/lib/auth/password"
import { validateInviteCode } from "@/lib/auth/invite"

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connect()

        const user = await User.findOne({ email: credentials.email as string })
        if (!user) return null

        const valid = await verifyPassword(credentials.password as string, user.passwordHash)
        if (!valid) return null

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.full_name || user.email.split("@")[0] || "User",
          image: user.avatar_url || null,
        }
      },
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'profile',
            'email',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/gmail.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { origin, pathname } = nextUrl

      if (pathname.startsWith('/api/') && !isLoggedIn) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (!isLoggedIn && pathname !== "/login" && pathname !== "/register") {
        const redirectUrl = new URL("/login", origin)
        redirectUrl.searchParams.set("redirect", pathname)
        return Response.redirect(redirectUrl)
      }

      return true
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" || account?.provider === "google") {
        await connect()

        const p = profile as any
        const provider = account.provider
        const providerId = String(p.sub || p.id)
        const providerEmail = p.email
        const avatarUrl = p.picture || p.avatar_url

        // Fields to update based on provider
        const providerFields: Record<string, any> = {
          [`${provider}_id`]: providerId,
        }
        if (provider === "github") {
          providerFields.github_username = p.login
        }
        if (provider === "google") {
          providerFields.google_email = providerEmail
          if (account.refresh_token) {
            providerFields.google_refresh_token = account.refresh_token
          }
        }

        // 1. Already linked this provider account
        const existingByProvider = await User.findOne({ [`${provider}_id`]: providerId })
        if (existingByProvider) {
          if (avatarUrl && avatarUrl !== existingByProvider.avatar_url) {
            const avatarProvider = existingByProvider.avatar_provider
            if (!avatarProvider || avatarProvider === provider) {
              await User.findByIdAndUpdate(existingByProvider._id, { avatar_url: avatarUrl })
            }
          }
          user.id = existingByProvider._id.toString()
          return true
        }

        // 2. User exists with same email — auto-link
        if (providerEmail) {
          const existingByEmail = await User.findOne({ email: providerEmail })
          if (existingByEmail) {
            const updateData: Record<string, any> = { ...providerFields }
            if (avatarUrl && !existingByEmail.avatar_provider) {
              updateData.avatar_url = avatarUrl
              updateData.avatar_provider = provider
            }
            await User.findByIdAndUpdate(existingByEmail._id, updateData)
            user.id = existingByEmail._id.toString()
            return true
          }
        }

        // 2.5. Already signed in — link this Google account
        try {
          const currentSession = await auth()
          if (currentSession?.user?.id) {
            const currentUser = await User.findById(currentSession.user.id)
            if (currentUser) {
              const updateData: Record<string, any> = { ...providerFields }
              if (avatarUrl) {
                updateData.avatar_url = avatarUrl
                updateData.avatar_provider = provider
              }
              await User.findByIdAndUpdate(currentUser._id, updateData)
              user.id = currentUser._id.toString()
              return true
            }
          }
        } catch {
          // Session not available — skip
        }

        // 3. New user — check invite code cookie
        try {
          const { cookies } = await import("next/headers")
          const cookieStore = await cookies()
          const inviteCookie = cookieStore.get("invite_code")

          if (inviteCookie?.value && validateInviteCode(inviteCookie.value)) {
            const placeholderHash = await hashPassword(crypto.randomUUID())
            const email = providerEmail || `${provider}-${providerId}@placeholder.studio`
            const name = p.name || p.login || ""
            const newUser = await User.create({
              email,
              passwordHash: placeholderHash,
              full_name: name,
              avatar_url: avatarUrl || null,
              avatar_provider: provider,
              ...providerFields,
              role: "founder",
              timezone: "Asia/Hong_Kong",
              default_hourly_rate: 0,
              created_at: new Date(),
            })
            user.id = newUser._id.toString()
            return true
          }
        } catch {
          // Cookie not available — skip
        }

        return `/register?error=${provider}_not_linked`
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
