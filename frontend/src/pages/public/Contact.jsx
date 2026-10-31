import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Mail, Send, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { Input, Label, Textarea, FieldError } from '@/components/ui/Input'
import Card from '@/components/ui/Card'
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
    <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
      <div>
        <span className="premium-eyebrow"><Sparkles className="h-3.5 w-3.5" /> We’re here to help</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Let’s make your
          <br />
          <span className="text-gradient">next cut better.</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-slate-500 dark:text-slate-400">
          Questions, feedback, or need a hand? Send a note and the Subtaro team will get back to you.
        </p>
        <div className="mt-8 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-500/15 bg-brand-500/10 text-brand-500">
            <Mail className="h-5 w-5" />
          </span>
          A real person is ready to help.
        </div>
      </div>

      <Card className="p-6 sm:p-9">
        <form onSubmit={onSubmit} className="space-y-5">
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
      </Card>
    </div>
  )
}
