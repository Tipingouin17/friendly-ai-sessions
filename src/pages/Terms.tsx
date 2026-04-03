/**
 * Terms
 *
 * Page for the AIfacilitator application.
 */

import { PageHead } from "@/components/PageHead";

const Terms = () => {
  return (
    <div className="min-h-screen pb-16 bg-white">
      <PageHead title="Terms of Service" description="Terms of Service for AIfacilitator" />
      <div className="max-w-3xl mx-auto px-4 prose prose-gray">
        <h1>Terms of Service</h1>
        <p className="text-gray-500 text-sm">Last updated: March 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using AIfacilitator ("the Service"), you agree to be bound by these Terms of Service.
          If you do not agree to these terms, please do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          AIfacilitator provides AI-powered workshop facilitation tools that enable users to create,
          manage, and participate in interactive sessions. The Service includes AI facilitators,
          session management, reporting, and collaboration features.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for
          all activities that occur under your account. You must provide accurate and complete
          information when creating an account.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>
          You agree not to use the Service for any unlawful purpose or in any way that could damage,
          disable, or impair the Service. You must not attempt to gain unauthorized access to any
          part of the Service.
        </p>

        <h2>5. Subscription and Payments</h2>
        <p>
          Certain features of the Service require a paid subscription. Subscription fees are billed
          in advance on a monthly or annual basis. You may cancel your subscription at any time,
          but refunds are subject to our refund policy.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          Content generated during your sessions belongs to you. The Service, including its software,
          design, and branding, remains the intellectual property of AIfacilitator.
        </p>

        <h2>7. Privacy</h2>
        <p>
          Your use of the Service is also governed by our Privacy Policy. Please review our
          Privacy Policy to understand our practices.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          The Service is provided "as is" without warranties of any kind. AIfacilitator shall not
          be liable for any indirect, incidental, or consequential damages arising from your use
          of the Service.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. We will notify users of any
          material changes via email or through the Service.
        </p>

        <h2>10. Contact</h2>
        <p>
          If you have any questions about these Terms, please contact us at{" "}
          <a href="mailto:support@aifacilitator.com" className="text-primary">
            support@aifacilitator.com
          </a>.
        </p>
      </div>
    </div>
  );
};

export default Terms;
