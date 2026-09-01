import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — A Good Man",
  description: "Privacy policy for Be One (A Good Man).",
};

const SUPPORT_EMAIL = "bostonrbijold@gmail.com";
const LAST_UPDATED = "September 1, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-mobile px-6 py-10">
        <Link href="/" className="font-mono text-xs text-dim hover:text-muted transition-colors">
          ← Back
        </Link>

        <h1 className="font-heading text-3xl text-text leading-tight mt-6 mb-1">
          Privacy Policy for Be One
        </h1>
        <p className="font-mono text-[11px] text-dim mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 font-body text-sm text-muted leading-relaxed">
          <section>
            <p>
              Be One (&ldquo;the app,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) is a personal
              habit, routine, and character-tracking app. This policy explains what data we
              collect, why, and how it&rsquo;s handled.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-text mb-3">Information We Collect</h2>
            <p className="mb-3">
              <span className="text-text font-medium">Account information.</span> When you sign
              in with Google, we receive your name, email address, and profile picture from
              Google to create and identify your account. We do not receive or store your
              Google password.
            </p>
            <p className="mb-3">
              If you create an account with email and password instead, we store your name,
              email address, and a securely hashed version of your password — we never store
              or have access to your password itself.
            </p>
            <p className="mb-3">
              <span className="text-text font-medium">Content you create.</span> Everything you
              enter in the app — routines, habits, goals, milestones, todos, timer logs, and
              virtue check-ins — is stored so the app can show it back to you and calculate your
              analytics (streaks, pacing, weekly reviews, etc.).
            </p>
            <p className="mb-2 text-text font-medium">We do not collect:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li>Location data</li>
              <li>
                Biometric data (Face ID/Touch ID are used only for local device unlock, if
                enabled, and never transmitted to us)
              </li>
              <li>Health data</li>
              <li>Advertising identifiers</li>
              <li>
                Contacts, photos, or camera data beyond anything you explicitly choose to attach
                (if applicable)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl text-text mb-3">How We Use Your Information</h2>
            <p>
              We use the information above only to operate the app for you: authenticating your
              account, storing and displaying your routines/habits/goals/virtues, and computing
              your personal analytics. We do not sell your data, and we do not use it for
              advertising or cross-app tracking.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-text mb-3">Data Sharing</h2>
            <p className="mb-2">
              We share data with the following third parties only as needed to run the app:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-1 mb-3">
              <li>
                <span className="text-text font-medium">Google</span> — for sign-in
                authentication (OAuth).
              </li>
              <li>
                <span className="text-text font-medium">Our hosting/database providers</span>{" "}
                (e.g., Vercel, MongoDB Atlas) — to store and serve your data securely. These
                providers do not use your data for their own purposes.
              </li>
            </ul>
            <p>We do not sell or rent your personal information to anyone.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-text mb-3">Data Retention &amp; Deletion</h2>
            <p>
              Your data is retained for as long as your account is active. To request deletion
              of your account and all associated data, contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gold hover:underline">
                {SUPPORT_EMAIL}
              </a>
              . We will delete your data within a reasonable timeframe of a verified request.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-text mb-3">Security</h2>
            <p>
              We use industry-standard practices (encrypted connections, access-controlled
              databases) to protect your information. No system is 100% secure, but we take
              reasonable steps to safeguard your data.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-text mb-3">Children&rsquo;s Privacy</h2>
            <p>
              Be One is not directed at children under 13, and we do not knowingly collect data
              from children under 13.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-text mb-3">Changes to This Policy</h2>
            <p>
              We may update this policy occasionally. Material changes will be reflected by
              updating the &ldquo;Last updated&rdquo; date above.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl text-text mb-3">Contact</h2>
            <p>
              Questions about this policy or your data can be sent to{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gold hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
