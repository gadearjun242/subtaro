import LegalPage, { LegalSection } from '@/components/common/LegalPage'
import { APP_NAME } from '@/lib/config'

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="August 29, 2026">
      <LegalSection title="1. Acceptance of terms">
        <p>
          By creating an account or using {APP_NAME}, you agree to these terms. If
          you do not agree, please do not use the service.
        </p>
      </LegalSection>
      <LegalSection title="2. Acceptable use">
        <p>
          You agree only to upload content you own or have the right to process, and
          not to use the service for any unlawful purpose or to upload malicious
          files.
        </p>
      </LegalSection>
      <LegalSection title="3. Account responsibility">
        <p>
          You are responsible for keeping your login credentials secure and for all
          activity that happens under your account.
        </p>
      </LegalSection>
      <LegalSection title="4. Service availability">
        <p>
          Processing depends on third-party transcription infrastructure. Steps may
          occasionally fail or need to be resumed; we make a best effort to surface
          clear status and logs for every project.
        </p>
      </LegalSection>
      <LegalSection title="5. Termination">
        <p>
          You may deactivate or permanently delete your account at any time. We may
          suspend accounts that violate these terms.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
