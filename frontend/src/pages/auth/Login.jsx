import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input, Label, FieldError } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { apiError } from '@/lib/axios'

export default function Login() {
  const { login, isLoggingIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    try {
      await login(form)
      toast.success('Welcome back!')
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      toast.error(apiError(err, 'Invalid email or password'))
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Welcome back</h1>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        Log in to keep working on your subtitle projects.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            error={errors.email}
          />
          <FieldError>{errors.email}</FieldError>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            icon={Lock}
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            error={errors.password}
          />
          <FieldError>{errors.password}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={isLoggingIn} size="lg">
          Log in <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Sign up free
        </Link>
      </p>
    </div>
  )
}
