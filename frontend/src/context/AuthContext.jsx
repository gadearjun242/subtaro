import { createContext, useContext, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { tokenStore } from '@/lib/tokenStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()

  // Have we tried the silent-refresh-on-load flow yet?
  const [bootReady, setBootReady] = useState(false)
  const [bootAuthenticated, setBootAuthenticated] = useState(false)

  // ------------------------------------------------------------------
  // On first mount: try to exchange the httpOnly refresh cookie for a
  // fresh access token. If that succeeds we know it's worth calling
  // GET /auth/me next; if it fails we go straight to "logged out".
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        const res = await authApi.refresh()
        const token = res?.data?.accessToken
        if (!token) throw new Error('no token')
        tokenStore.set(token)
        if (!cancelled) setBootAuthenticated(true)
      } catch {
        tokenStore.clear()
        if (!cancelled) setBootAuthenticated(false)
      } finally {
        if (!cancelled) setBootReady(true)
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  // ------------------------------------------------------------------
  // GET /auth/me — the source of truth for "who is logged in".
  // Only runs once the silent refresh attempt has resolved and
  // succeeded, so we never call it with a stale/missing token.
  // ------------------------------------------------------------------
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await authApi.me()
      return res.data.user
    },
    enabled: bootReady && bootAuthenticated,
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    const onForcedLogout = () => {
      tokenStore.clear()
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
    }
    window.addEventListener('auth:logout', onForcedLogout)
    return () => window.removeEventListener('auth:logout', onForcedLogout)
  }, [queryClient])

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      tokenStore.set(res.data.accessToken)
      queryClient.setQueryData(['auth', 'me'], res.data.user)
      setBootAuthenticated(true)
    },
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      tokenStore.set(res.data.accessToken)
      queryClient.setQueryData(['auth', 'me'], res.data.user)
      setBootAuthenticated(true)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      tokenStore.clear()
      setBootAuthenticated(false)
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.clear()
    },
  })

  const isLoading = !bootReady || (bootAuthenticated && meQuery.isLoading)
  const user = meQuery.data || null
  const isAuthenticated = Boolean(user)

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    refetchMe: meQuery.refetch,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
