import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Camera, KeyRound, ShieldAlert, UserCircle2, Loader2 } from 'lucide-react'
import { userApi } from '@/api/user.api'
import { uploadApi } from '@/api/upload.api'
import { useAuth } from '@/context/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Avatar from '@/components/common/Avatar'
import { Input, Label, FieldError } from '@/components/ui/Input'
import { apiError } from '@/lib/axios'

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
  { id: 'security', label: 'Security', icon: KeyRound },
  { id: 'danger', label: 'Danger zone', icon: ShieldAlert },
]

export default function Profile() {
  const [tab, setTab] = useState('profile')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-4 pb-3 text-sm font-semibold transition-colors ${
              tab === id
                ? id === 'danger'
                  ? 'border-red-500 text-red-600'
                  : 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'danger' && <DangerTab />}
    </div>
  )
}

function ProfileTab() {
  const { user, refetchMe } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [name, setName] = useState(user?.name || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (payload) => userApi.updateProfile(payload),
    onSuccess: () => {
      toast.success('Profile updated')
      refetchMe()
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err) => toast.error(apiError(err, 'Unable to update profile')),
  })

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const uploadRes = await uploadApi.uploadFile(file)
      await userApi.updateProfile({ avatar: uploadRes.data.file.url })
      toast.success('Avatar updated')
      refetchMe()
    } catch (err) {
      toast.error(apiError(err, 'Unable to upload avatar'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar name={user?.name} src={user?.avatar} size="xl" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md hover:bg-brand-500 disabled:cursor-not-allowed dark:border-slate-900"
          >
            {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name}</p>
          <p className="text-xs text-slate-400">{user?.email}</p>
          <p className="mt-1 text-xs text-slate-400">Click the camera icon to change your avatar</p>
        </div>
      </div>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim().length < 2) {
            toast.error('Name must be at least 2 characters')
            return
          }
          updateMutation.mutate({ name: name.trim() })
        }}
      >
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user?.email || ''} disabled className="opacity-60" />
          <p className="mt-1.5 text-xs text-slate-400">Email changes aren't supported yet.</p>
        </div>
        <Button type="submit" loading={updateMutation.isPending}>
          Save changes
        </Button>
      </form>
    </Card>
  )
}

function SecurityTab() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})

  const mutation = useMutation({
    mutationFn: userApi.changePassword,
    onSuccess: () => {
      toast.success('Password changed. Please log in again on other devices.')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (err) => toast.error(apiError(err, 'Unable to change password')),
  })

  const validate = () => {
    const e = {}
    if (!form.currentPassword) e.currentPassword = 'Required'
    if (form.newPassword.length < 8) e.newPassword = 'At least 8 characters'
    if (form.confirmPassword !== form.newPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <Card className="p-6 sm:p-8">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Change password</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        You'll be signed out of other devices after changing your password.
      </p>
      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (validate()) mutation.mutate(form)
        }}
      >
        <div>
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            error={errors.currentPassword}
          />
          <FieldError>{errors.currentPassword}</FieldError>
        </div>
        <div>
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            error={errors.newPassword}
          />
          <FieldError>{errors.newPassword}</FieldError>
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
          />
          <FieldError>{errors.confirmPassword}</FieldError>
        </div>
        <Button type="submit" loading={mutation.isPending}>
          Update password
        </Button>
      </form>
    </Card>
  )
}

function DangerTab() {
  const { logout } = useAuth()
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const deactivateMutation = useMutation({
    mutationFn: () => userApi.deactivateAccount({ password }),
    onSuccess: async () => {
      toast.success('Account deactivated')
      setDeactivateOpen(false)
      await logout()
    },
    onError: (err) => toast.error(apiError(err, 'Unable to deactivate account')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => userApi.deleteAccount({ password, confirmation }),
    onSuccess: async () => {
      toast.success('Account deleted')
      setDeleteOpen(false)
      await logout()
    },
    onError: (err) => toast.error(apiError(err, 'Unable to delete account')),
  })

  return (
    <>
      <Card className="border-amber-200 p-6 dark:border-amber-500/30 sm:p-8">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Deactivate account</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Temporarily disable your account. You can contact support to reactivate it later.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => setDeactivateOpen(true)}>
          Deactivate account
        </Button>
      </Card>

      <Card className="mt-6 border-red-200 p-6 dark:border-red-500/30 sm:p-8">
        <h3 className="text-base font-bold text-red-600 dark:text-red-400">Delete account</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Permanently delete your account and all project records. This cannot be undone.
        </p>
        <Button variant="danger" className="mt-5" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </Card>

      <Modal
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        title="Deactivate your account?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button loading={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate()}>
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">Confirm your password to continue.</p>
        <div className="mt-4">
          <Label htmlFor="deactivate-password">Password</Label>
          <Input id="deactivate-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Permanently delete account"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              Delete forever
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This will permanently delete your account and every project record. Type{' '}
          <strong>DELETE MY ACCOUNT</strong> to confirm.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="delete-password">Password</Label>
            <Input id="delete-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="delete-confirm">Confirmation</Label>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
