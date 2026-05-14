/**
 * Privacy Policy — GDPR-compliant version
 * Covers: identity of controller, legal bases, sub-processors,
 * data retention, international transfers, breach notification,
 * all 8 data-subject rights, and cookie policy.
 */

import { PageHead } from "@/components/PageHead";
import { Link } from "react-router-dom";

const Privacy = () => {
  return (
    <div className="min-h-screen pb-20 bg-white">
      <PageHead title="Privacy Policy" description="GDPR-compliant Privacy Policy for AIfacilitator — how we collect, use and protect your personal data." />

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-8 prose prose-gray">
        <h1>Privacy Policy</h1>
        <p className="text-gray-500 text-sm">
          Last updated: <strong>May 2026</strong> — Version 2.0
        </p>
        <p className="text-sm text-gray-600 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          This policy is written in compliance with the EU General Data Protection Regulation (GDPR) — Regulation (EU) 2016/679 — and applies to all users of AIfacilitator regardless of their country of residence.
        </p>

        {/* ── 1. Controller ── */}
        <h2>1. Data Controller</h2>
        <p>
          The data controller responsible for your personal data is:
        </p>
        <div className="bg-gray-50 rounded-xl px-5 py-4 text-sm not-prose">
          <p className="font-semibold text-gray-900">AIfacilitator</p>
          <p className="text-gray-600 mt-1">Website: <a href="https://aifacilitator.ai" className="text-indigo-600 hover:underline">aifacilitator.ai</a></p>
          <p className="text-gray-600">Contact: <a href="mailto:privacy@aifacilitator.ai" className="text-indigo-600 hover:underline">privacy@aifacilitator.ai</a></p>
          <p className="text-gray-500 mt-2 text-xs">For all data protection enquiries, including requests to exercise your rights, please use the email address above. We will respond within 30 days.</p>
        </div>

        {/* ── 2. Data we collect ── */}
        <h2>2. Personal Data We Collect</h2>
        <p>We collect the following categories of personal data:</p>
        <table className="text-sm w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2 px-3 font-semibold">Category</th>
              <th className="text-left py-2 px-3 font-semibold">Examples</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Account data</td>
              <td className="py-2 px-3 text-gray-600">Full name, email address, hashed password, profile picture</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Session content</td>
              <td className="py-2 px-3 text-gray-600">Workshop transcripts, AI-generated reports, facilitator configurations</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Payment data</td>
              <td className="py-2 px-3 text-gray-600">Billing name, last 4 digits of card (stored by Stripe — we never see full card numbers)</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Technical data</td>
              <td className="py-2 px-3 text-gray-600">IP address, browser type, device type, pages visited, session duration</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Security data</td>
              <td className="py-2 px-3 text-gray-600">Login timestamps, login IP addresses, authentication tokens</td>
            </tr>
          </tbody>
        </table>

        {/* ── 3. Legal bases ── */}
        <h2>3. Legal Bases for Processing (GDPR Art. 6)</h2>
        <p>We process your personal data only when we have a valid legal basis. The table below maps each processing activity to its legal basis:</p>
        <table className="text-sm w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2 px-3 font-semibold">Processing activity</th>
              <th className="text-left py-2 px-3 font-semibold">Legal basis</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Creating and managing your account</td>
              <td className="py-2 px-3 text-gray-600"><strong>Contract</strong> — Art. 6(1)(b): necessary to perform the service you signed up for</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Hosting and delivering workshop sessions</td>
              <td className="py-2 px-3 text-gray-600"><strong>Contract</strong> — Art. 6(1)(b)</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Processing payments via Stripe</td>
              <td className="py-2 px-3 text-gray-600"><strong>Contract</strong> — Art. 6(1)(b) + legal obligation for invoicing</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Sending transactional emails (password reset, verification)</td>
              <td className="py-2 px-3 text-gray-600"><strong>Contract</strong> — Art. 6(1)(b)</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Security logging and fraud prevention</td>
              <td className="py-2 px-3 text-gray-600"><strong>Legitimate interest</strong> — Art. 6(1)(f): protecting our platform and users</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Analytics (page views, usage patterns)</td>
              <td className="py-2 px-3 text-gray-600"><strong>Consent</strong> — Art. 6(1)(a): only after you accept analytics cookies</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Marketing emails and newsletters</td>
              <td className="py-2 px-3 text-gray-600"><strong>Consent</strong> — Art. 6(1)(a): only if you opted in</td>
            </tr>
          </tbody>
        </table>

        {/* ── 4. Sub-processors ── */}
        <h2>4. Sub-processors and Third-Party Services</h2>
        <p>
          We use the following third-party sub-processors to deliver the Service. Each has been assessed for GDPR compliance and has signed a Data Processing Agreement (DPA) or provides equivalent contractual guarantees.
        </p>
        <table className="text-sm w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2 px-3 font-semibold">Provider</th>
              <th className="text-left py-2 px-3 font-semibold">Purpose</th>
              <th className="text-left py-2 px-3 font-semibold">Data location</th>
              <th className="text-left py-2 px-3 font-semibold">Transfer safeguard</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Railway</td>
              <td className="py-2 px-3 text-gray-600">Backend hosting &amp; database</td>
              <td className="py-2 px-3 text-gray-600">US (AWS us-east-1)</td>
              <td className="py-2 px-3 text-gray-600">Standard Contractual Clauses (SCC)</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Vercel</td>
              <td className="py-2 px-3 text-gray-600">Frontend hosting &amp; CDN</td>
              <td className="py-2 px-3 text-gray-600">Global CDN (EU edge nodes available)</td>
              <td className="py-2 px-3 text-gray-600">SCC + DPA</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Stripe</td>
              <td className="py-2 px-3 text-gray-600">Payment processing &amp; billing</td>
              <td className="py-2 px-3 text-gray-600">US / EU</td>
              <td className="py-2 px-3 text-gray-600">SCC + PCI-DSS Level 1</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">OpenAI</td>
              <td className="py-2 px-3 text-gray-600">AI facilitation &amp; session generation</td>
              <td className="py-2 px-3 text-gray-600">US</td>
              <td className="py-2 px-3 text-gray-600">SCC + Data Processing Addendum (zero data retention API)</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Resend</td>
              <td className="py-2 px-3 text-gray-600">Transactional email delivery</td>
              <td className="py-2 px-3 text-gray-600">US</td>
              <td className="py-2 px-3 text-gray-600">SCC + DPA</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Google Analytics 4</td>
              <td className="py-2 px-3 text-gray-600">Usage analytics (consent-gated)</td>
              <td className="py-2 px-3 text-gray-600">US</td>
              <td className="py-2 px-3 text-gray-600">SCC + consent required before activation</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Microsoft Clarity</td>
              <td className="py-2 px-3 text-gray-600">Session heatmaps (consent-gated)</td>
              <td className="py-2 px-3 text-gray-600">US</td>
              <td className="py-2 px-3 text-gray-600">SCC + consent required before activation</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Crisp</td>
              <td className="py-2 px-3 text-gray-600">Live chat support</td>
              <td className="py-2 px-3 text-gray-600">EU (France)</td>
              <td className="py-2 px-3 text-gray-600">EU-based — no transfer</td>
            </tr>
          </tbody>
        </table>

        {/* ── 5. Data Retention ── */}
        <h2>5. Data Retention</h2>
        <p>We retain personal data only for as long as necessary for the purpose for which it was collected, or as required by law.</p>
        <table className="text-sm w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2 px-3 font-semibold">Data type</th>
              <th className="text-left py-2 px-3 font-semibold">Retention period</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Account data (active account)</td>
              <td className="py-2 px-3 text-gray-600">For the lifetime of your account</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Account data (after deletion)</td>
              <td className="py-2 px-3 text-gray-600">Immediately deleted upon account deletion request</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Session &amp; conversation history</td>
              <td className="py-2 px-3 text-gray-600">Anonymised upon account deletion (attributed to "Deleted User") — retained for other participants</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Password reset tokens</td>
              <td className="py-2 px-3 text-gray-600">1 hour (auto-expired)</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Email verification tokens</td>
              <td className="py-2 px-3 text-gray-600">1 hour (auto-expired)</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Login activity logs</td>
              <td className="py-2 px-3 text-gray-600">90 days, then automatically purged</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Security audit logs</td>
              <td className="py-2 px-3 text-gray-600">12 months (legal obligation for fraud investigation)</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Billing records (invoices)</td>
              <td className="py-2 px-3 text-gray-600">7 years (legal obligation — accounting law)</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Analytics data (GA4, Clarity)</td>
              <td className="py-2 px-3 text-gray-600">14 months (Google default), session-level for Clarity</td>
            </tr>
          </tbody>
        </table>

        {/* ── 6. Your Rights ── */}
        <h2>6. Your Rights Under GDPR (Art. 15–22)</h2>
        <p>As a data subject under the GDPR, you have the following rights. To exercise any of them, contact us at <a href="mailto:privacy@aifacilitator.ai" className="text-indigo-600 hover:underline">privacy@aifacilitator.ai</a>. We will respond within <strong>30 days</strong>.</p>
        <table className="text-sm w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2 px-3 font-semibold">Right</th>
              <th className="text-left py-2 px-3 font-semibold">What it means</th>
              <th className="text-left py-2 px-3 font-semibold">How to exercise it</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Access (Art. 15)</td>
              <td className="py-2 px-3 text-gray-600">Obtain a copy of all personal data we hold about you</td>
              <td className="py-2 px-3 text-gray-600">Email us</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Rectification (Art. 16)</td>
              <td className="py-2 px-3 text-gray-600">Correct inaccurate or incomplete data</td>
              <td className="py-2 px-3 text-gray-600">Update in <Link to="/profile" className="text-indigo-600 hover:underline">Profile settings</Link> or email us</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Erasure (Art. 17)</td>
              <td className="py-2 px-3 text-gray-600">Delete your account and all associated PII</td>
              <td className="py-2 px-3 text-gray-600">Use the <Link to="/settings" className="text-indigo-600 hover:underline">Danger Zone in Settings</Link> or email us</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Restriction (Art. 18)</td>
              <td className="py-2 px-3 text-gray-600">Restrict processing while a dispute is pending</td>
              <td className="py-2 px-3 text-gray-600">Email us</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Portability (Art. 20)</td>
              <td className="py-2 px-3 text-gray-600">Receive your data in a structured, machine-readable format (JSON/CSV)</td>
              <td className="py-2 px-3 text-gray-600">Email us</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Objection (Art. 21)</td>
              <td className="py-2 px-3 text-gray-600">Object to processing based on legitimate interest (e.g., analytics)</td>
              <td className="py-2 px-3 text-gray-600">Withdraw consent via cookie settings or email us</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Withdraw consent (Art. 7)</td>
              <td className="py-2 px-3 text-gray-600">Withdraw consent for analytics cookies at any time</td>
              <td className="py-2 px-3 text-gray-600">Click "Cookie Settings" in the footer</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Lodge a complaint (Art. 77)</td>
              <td className="py-2 px-3 text-gray-600">File a complaint with your national supervisory authority</td>
              <td className="py-2 px-3 text-gray-600">France: <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">CNIL</a> — EU list: <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">EDPB members</a></td>
            </tr>
          </tbody>
        </table>

        {/* ── 7. Cookies ── */}
        <h2>7. Cookies and Tracking Technologies</h2>
        <p>We use cookies and similar technologies. We distinguish between strictly necessary cookies (which do not require your consent) and optional cookies (which are only activated after you explicitly accept them via our cookie banner).</p>
        <table className="text-sm w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2 px-3 font-semibold">Category</th>
              <th className="text-left py-2 px-3 font-semibold">Cookies</th>
              <th className="text-left py-2 px-3 font-semibold">Consent required?</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Strictly necessary</td>
              <td className="py-2 px-3 text-gray-600">Authentication JWT, session token, CSRF protection</td>
              <td className="py-2 px-3 text-gray-600">No — essential for the service to function</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Analytics</td>
              <td className="py-2 px-3 text-gray-600">Google Analytics 4 (_ga, _gid), Microsoft Clarity</td>
              <td className="py-2 px-3 text-gray-600"><strong>Yes</strong> — only loaded after consent</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Advertising</td>
              <td className="py-2 px-3 text-gray-600">Google Ads (UET), Microsoft Ads (UET tag)</td>
              <td className="py-2 px-3 text-gray-600"><strong>Yes</strong> — only loaded after consent</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="py-2 px-3 font-medium">Support</td>
              <td className="py-2 px-3 text-gray-600">Crisp chat widget</td>
              <td className="py-2 px-3 text-gray-600">No — legitimate interest (customer support)</td>
            </tr>
          </tbody>
        </table>
        <p>You can change your cookie preferences at any time by clicking <strong>"Cookie Settings"</strong> in the footer of any page.</p>

        {/* ── 8. Security ── */}
        <h2>8. Security Measures (GDPR Art. 32)</h2>
        <p>
          We implement appropriate technical and organisational measures to protect your personal data, including: TLS/HTTPS encryption for all data in transit; AES-256 encryption at rest for the database; bcrypt password hashing (cost factor 12); JWT authentication with short-lived tokens (24-hour expiry); rate limiting to prevent brute-force attacks; and security audit logging for all authentication events.
        </p>

        {/* ── 9. Breach Notification ── */}
        <h2>9. Personal Data Breach Notification (GDPR Art. 33–34)</h2>
        <p>
          In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify the relevant supervisory authority (CNIL or equivalent) within <strong>72 hours</strong> of becoming aware of the breach, as required by GDPR Article 33. If the breach is likely to result in a <em>high risk</em> to your rights and freedoms, we will also notify you directly without undue delay, as required by GDPR Article 34.
        </p>

        {/* ── 10. Changes ── */}
        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. We will notify you of material changes by email (if you have an account) and by posting the updated policy on this page with a new "Last updated" date. We encourage you to review this policy periodically.
        </p>

        {/* ── 11. Contact ── */}
        <h2>11. Contact and Data Protection Enquiries</h2>
        <p>
          For any questions, concerns, or requests relating to this Privacy Policy or your personal data, please contact us at:
        </p>
        <div className="bg-gray-50 rounded-xl px-5 py-4 text-sm not-prose">
          <p className="font-semibold text-gray-900">AIfacilitator — Data Protection</p>
          <p className="text-gray-600 mt-1">Email: <a href="mailto:privacy@aifacilitator.ai" className="text-indigo-600 hover:underline">privacy@aifacilitator.ai</a></p>
          <p className="text-gray-500 mt-2 text-xs">We aim to respond to all data subject requests within 30 days. If you are not satisfied with our response, you have the right to lodge a complaint with your national supervisory authority.</p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
