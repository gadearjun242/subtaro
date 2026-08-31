import LegalPage, { LegalSection } from '@/components/common/LegalPage'
import { APP_NAME } from '@/lib/config'

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="August 29, 2026">
      <LegalSection title="1. What we collect">
        <p>
          When you create an account we store your name, email address and a hashed
          version of your password. When you upload media for processing, the file
          itself, its metadata (size, duration, format) and the resulting subtitle
          output are stored against your account.
        </p>
      </LegalSection>
      <LegalSection title="2. How we use your data">
        <p>
          Your uploads are used solely to run the transcription and subtitle
          generation pipeline you requested and to show you the results, your
          project history, and account analytics inside your dashboard.
        </p>
      </LegalSection>
      <LegalSection title="3. Storage & security">
        <p>
          Media files are stored with a third-party cloud storage provider under a
          per-user folder. Passwords are hashed before storage and access tokens are
          short-lived; refresh tokens are stored in an HTTP-only cookie that
          JavaScript cannot read.
        </p>
      </LegalSection>
      <LegalSection title="4. Your rights">
        <p>
          You can update your profile, change your password, deactivate your account,
          or permanently delete your account and associated project records at any
          time from Profile &amp; Settings.
        </p>
      </LegalSection>
      <LegalSection title="5. Contact">
        <p>Questions about this policy can be sent through the {APP_NAME} contact page.</p>
      </LegalSection>
    </LegalPage>
  )
}
