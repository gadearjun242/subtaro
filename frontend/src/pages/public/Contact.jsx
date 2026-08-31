import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Mail, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { Input, Label, Textarea, FieldError } from '@/components/ui/Input'
import { contactApi } from '@/api/contact.api'
import { apiError } from '@/lib/axios'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})

  const mutation = useMutation({
    mutationFn: () => contactApi.submit(form),
    onSuccess: (res) => {
      toast.success(res?.message || "Thanks — we'll get back to you soon.")
      setForm({ name: '', email: '', message: '' })
    },
    onError: (err) => toast.error(apiError(err, 'Unable to send your message right now')),
  })

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
    if (form.message.trim().length < 5) e.message = 'Message is too short'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <Mail className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Get in touch
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Questions, feedback, or need a hand? Send us a message.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
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
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            error={errors.email}
          />
          <FieldError>{errors.email}</FieldError>
        </div>
        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="How can we help?"
            error={errors.message}
          />
          <FieldError>{errors.message}</FieldError>
        </div>
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          <Send className="h-4 w-4" /> Send message
        </Button>
      </form>
    </div>
  )
}
