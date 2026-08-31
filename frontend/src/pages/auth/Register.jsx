import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input, Label, FieldError } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { apiError } from '@/lib/axios'

export default function Register() {
  const { register, isRegistering } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      toast.success('Account created — welcome!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(apiError(err, 'Unable to create your account'))
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Create your account</h1>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        Start generating subtitles in less than a minute.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            icon={User}
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jordan Lee"
            error={errors.name}
          />
          <FieldError>{errors.name}</FieldError>
        </div>

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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            icon={Lock}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 8 characters"
            error={errors.password}
          />
          <FieldError>{errors.password}</FieldError>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            icon={Lock}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Re-enter your password"
            error={errors.confirmPassword}
          />
          <FieldError>{errors.confirmPassword}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={isRegistering} size="lg">
          Create account <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Log in
        </Link>
      </p>
    </div>
  )
}
