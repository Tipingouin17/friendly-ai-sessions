
import { PageHead } from "@/components/PageHead";

const Privacy = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-white">
      <PageHead title="Privacy Policy" description="Privacy Policy for AIfacilitator" />
      <div className="max-w-3xl mx-auto px-4 prose prose-gray">
        <h1>Privacy Policy</h1>
        <p className="text-gray-500 text-sm">Last updated: March 2026</p>

        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as when you create an account,
          participate in sessions, or contact us. This includes your name, email address, and
          session content.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>
          We use the information we collect to provide, maintain, and improve the Service,
          to communicate with you, and to personalize your experience. We may also use
          aggregated, anonymized data for analytics purposes.
        </p>

        <h2>3. Data Storage and Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your
          personal data against unauthorized access, alteration, disclosure, or destruction.
          Your data is stored on secure servers with encryption at rest and in transit.
        </p>

        <h2>4. Session Data</h2>
        <p>
          Content generated during workshop sessions is stored securely and is accessible
          only to session participants and the session host. Session reports are generated
          using AI and are stored according to your subscription plan's retention policy.
        </p>

        <h2>5. Third-Party Services</h2>
        <p>
          We may use third-party services for payment processing, analytics, and AI
          processing. These services have their own privacy policies and we encourage
          you to review them.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          We retain your personal data for as long as your account is active or as needed
          to provide you with the Service. You may request deletion of your data at any time
          by contacting us.
        </p>

        <h2>7. Your Rights</h2>
        <p>
          You have the right to access, correct, or delete your personal data. You may also
          request a copy of your data in a portable format. To exercise these rights, please
          contact us at the address below.
        </p>

        <h2>8. Cookies</h2>
        <p>
          We use cookies and similar technologies to maintain your session, remember your
          preferences, and understand how you use the Service. You can control cookie
          settings through your browser.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any
          changes by posting the new policy on this page and updating the "Last updated" date.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at{" "}
          <a href="mailto:support@aifacilitator.com" className="text-primary">
            support@aifacilitator.com
          </a>.
        </p>
      </div>
    </div>
  );
};

export default Privacy;
