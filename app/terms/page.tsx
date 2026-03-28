import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-2xl border-2 p-8 md:p-12" style={{ borderColor: '#fcc824' }}>

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-block mb-6 text-sm hover:opacity-80" style={{ color: '#fcc824' }}>
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Terms & Conditions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Last Updated: March 28, 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">

          {/* Introduction */}
          <section>
            <p>
              These terms and conditions outline the rules and regulations for the use of MindsetOS — Mindset Operating System,
              located at <a href="https://mindset.show" className="font-medium" style={{ color: '#fcc824' }}>https://mindset.show</a>.
            </p>
            <p>
              By accessing this website and using our AI-powered mindset coaching services, we assume you accept these terms and conditions.
              Do not continue to use MindsetOS if you do not agree to all of the terms and conditions stated on this page.
            </p>
            <p>
              The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice: "Client", "You"
              and "Your" refers to you, the person accessing this website and using our services. "The Company", "Ourselves", "We", "Our"
              and "Us", refers to MindsetOS. "Party", "Parties", or "Us", refers to both the Client and ourselves. All terms
              refer to the offer, acceptance and consideration of payment necessary to undertake the process of our assistance to the Client
              in the most appropriate manner for the express purpose of meeting the Client's needs in respect of provision of AI mindset coaching
              services, in accordance with and subject to, prevailing law of the United States.
            </p>
          </section>

          {/* AI Services */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">AI-Powered Services</h2>
            <p>
              MindsetOS provides AI-powered mindset coaching assistance through various specialized agents. By using our services, you acknowledge and agree to the following:
            </p>

            <h3 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">AI Output Limitations & Disclaimers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Informational Purposes Only</strong>: All AI-generated content is provided for informational and mindset coaching purposes only and should not be relied upon as professional, legal, financial, medical, or tax advice</li>
              <li><strong>No Warranty</strong>: We make no representations or warranties regarding the accuracy, completeness, reliability, or suitability of AI-generated content for any purpose</li>
              <li><strong>User Responsibility</strong>: You are solely responsible for reviewing, validating, and verifying all AI-generated recommendations before implementing them in your business</li>
              <li><strong>Human Oversight Required</strong>: AI outputs require human review and should not be used as the sole basis for business, legal, or financial decisions</li>
              <li><strong>Potential Errors</strong>: AI systems may produce inaccurate, incomplete, outdated, or misleading information (commonly known as "hallucinations")</li>
            </ul>

            <h3 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">Third-Party AI Models & Dependencies</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>External AI Providers</strong>: Our service utilizes third-party AI models (including but not limited to OpenAI, Anthropic, and Perplexity) which are subject to their respective terms of service</li>
              <li><strong>Model Availability</strong>: We do not guarantee continuous availability of any specific AI model and reserve the right to change, update, or discontinue models at any time</li>
              <li><strong>Third-Party Limitations</strong>: We are not responsible for errors, limitations, downtime, or changes made by third-party AI providers</li>
              <li><strong>API Dependencies</strong>: Service functionality depends on third-party APIs which may experience interruptions, rate limits, or performance degradation beyond our control</li>
            </ul>

            <h3 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">Intellectual Property & Content Ownership</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Your Content Ownership</strong>: You retain ownership of content you input into the system and content you create with AI assistance</li>
              <li><strong>License Grant</strong>: You grant MindsetOS a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content for purposes of service improvement, AI model training, and platform functionality</li>
              <li><strong>AI Training Data</strong>: Your conversations and interactions may be used to improve AI models and service quality, subject to our Privacy Policy</li>
              <li><strong>No Ownership of AI Outputs</strong>: AI-generated content may not be unique and similar outputs may be generated for other users</li>
            </ul>

            <h3 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">Prohibited AI Uses</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generate content that violates laws, regulations, or third-party rights</li>
              <li>Create harmful, threatening, harassing, defamatory, or illegal content</li>
              <li>Attempt to manipulate, jailbreak, or circumvent AI safety measures</li>
              <li>Use AI outputs to impersonate individuals or organizations</li>
              <li>Generate spam, phishing, fraudulent, or deceptive content</li>
              <li>Reverse engineer, extract, or replicate AI models or proprietary algorithms</li>
              <li>Use automated tools to scrape, harvest, or exfiltrate AI-generated data</li>
            </ul>

            <h3 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">Limitation of Liability for AI Services</h3>
            <p>
              <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW</strong>, MindsetOS shall not be liable for any damages arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Inaccurate, incomplete, or misleading AI-generated content</li>
              <li>Business decisions made based on AI recommendations</li>
              <li>Financial losses resulting from implementation of AI-generated strategies</li>
              <li>Third-party AI model errors, limitations, or failures</li>
              <li>Unavailability or performance degradation of AI services</li>
              <li>Data loss, corruption, or unauthorized access related to AI processing</li>
            </ul>

            <h3 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">User Indemnification</h3>
            <p>
              You agree to indemnify, defend, and hold harmless MindsetOS and our affiliates from any claims, damages, losses, or expenses arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use or misuse of AI-generated content</li>
              <li>Your violation of these terms or applicable laws</li>
              <li>Content you submit that infringes third-party rights</li>
              <li>Your reliance on AI recommendations without proper human oversight</li>
              <li>Claims by third parties affected by your use of our AI services</li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Cookies</h2>
            <p>
              We employ the use of cookies. By accessing MindsetOS, you agreed to use cookies in agreement with our Privacy Policy.
              Most interactive websites use cookies to retrieve user details for each visit. Cookies are used by our website to
              enable functionality and make it easier for people visiting our website.
            </p>
          </section>

          {/* License */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">License</h2>
            <p>
              Unless otherwise stated, MindsetOS and/or its licensors own the intellectual property rights for
              all material on MindsetOS. All intellectual property rights are reserved. You may access this from MindsetOS for your own
              personal use subject to restrictions set in these terms and conditions.
            </p>
            <p className="font-semibold mt-4">You must not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Republish material from MindsetOS</li>
              <li>Sell, rent or sub-license material from MindsetOS</li>
              <li>Reproduce, duplicate or copy material from MindsetOS</li>
              <li>Redistribute content from MindsetOS</li>
              <li>Attempt to reverse engineer, decompile, or extract AI model logic</li>
              <li>Use automated tools to scrape or harvest data from our services</li>
            </ul>
          </section>

          {/* User Content */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">User Content & Comments</h2>
            <p>
              Parts of this website offer an opportunity for users to create content, conversations, and interact with AI agents.
              MindsetOS does not filter, edit, publish or review user content prior to its storage on our systems.
            </p>
            <p>
              User content does not reflect the views and opinions of MindsetOS, its agents and/or affiliates. To the extent permitted
              by applicable laws, MindsetOS shall not be liable for user content or for any liability, damages or expenses caused as a
              result of any use of and/or posting of user content.
            </p>
            <p>
              MindsetOS reserves the right to monitor all content and to remove any content which can be considered inappropriate,
              offensive, or causes breach of these Terms and Conditions.
            </p>
            <p className="font-semibold mt-4">You warrant and represent that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are entitled to post content on our platform and have all necessary licenses and consents</li>
              <li>Your content does not infringe any intellectual property right, including copyright, patent or trademark</li>
              <li>Your content does not contain defamatory, libelous, offensive, indecent or unlawful material</li>
              <li>Your content will not be used to solicit or promote unlawful activity</li>
              <li>You will not use our AI services to generate harmful, illegal, or unethical content</li>
            </ul>
            <p className="mt-4">
              You hereby grant MindsetOS a non-exclusive license to use, reproduce, edit and authorize others to use any of your content
              for the purposes of service improvement, training AI models, and platform functionality.
            </p>
          </section>

          {/* Data Usage */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Data Usage & Privacy</h2>
            <p>
              Your use of MindsetOS is also governed by our Privacy Policy. We collect and process data including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (email, name, profile details)</li>
              <li>Conversation history with AI agents</li>
              <li>Usage analytics and interaction patterns</li>
              <li>API usage logs and token consumption</li>
            </ul>
            <p className="mt-4">
              We use this data to provide, improve, and personalize our services. Conversation data may be used to improve AI
              model performance. For more details, please review our Privacy Policy.
            </p>
          </section>

          {/* Coaching & Support Access */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Coaching & Support Access</h2>
            <p>
              As part of our mindset coaching programs, authorized coaches and support staff may access your portal
              to assist you during coaching sessions. By using MindsetOS, you acknowledge and agree to the following:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Coach Portal Access</strong>: Your assigned coach or support team member may access your MindsetOS account during scheduled coaching sessions to provide guidance, review your progress, and assist with agent configurations</li>
              <li><strong>View-Only by Default</strong>: Coach access is view-only unless you explicitly grant edit permissions during a session</li>
              <li><strong>Session-Based</strong>: Coach access is limited to active coaching sessions and does not persist indefinitely. Access is revoked when the session ends</li>
              <li><strong>Confidentiality</strong>: Coaches are bound by confidentiality obligations and will not share, distribute, or use your data outside the scope of your coaching engagement</li>
              <li><strong>Notification</strong>: You will be notified when a coach accesses your portal, and you may end the session at any time</li>
              <li><strong>Opt-Out</strong>: You may request to opt out of coach portal access by contacting support, though this may limit the effectiveness of coaching sessions</li>
            </ul>
          </section>

          {/* Payment & Billing */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Payment & Billing</h2>
            <p>
              If you subscribe to paid services, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate billing information</li>
              <li>Pay all fees associated with your usage</li>
              <li>Accept that fees are based on API usage and token consumption</li>
              <li>Understand that token pricing may vary by AI model used</li>
              <li>Be responsible for all charges incurred under your account</li>
            </ul>
            <p className="mt-4">
              We reserve the right to modify pricing with 30 days notice to active users.
            </p>
          </section>

          {/* Service Availability */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Service Availability</h2>
            <p>
              We strive to provide reliable service, but cannot guarantee:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Uninterrupted access to our platform</li>
              <li>Error-free operation of AI agents</li>
              <li>Availability of specific AI models at all times</li>
              <li>Preservation of all historical data indefinitely</li>
            </ul>
            <p className="mt-4">
              We reserve the right to modify, suspend, or discontinue any part of our service with reasonable notice.
            </p>
          </section>

          {/* Prohibited Uses */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Prohibited Uses</h2>
            <p className="font-semibold">You may not use MindsetOS to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generate content that violates laws or regulations</li>
              <li>Create harmful, threatening, or harassing content</li>
              <li>Attempt to bypass security measures or rate limits</li>
              <li>Share login credentials or API keys with unauthorized parties</li>
              <li>Use our services to compete with or replicate our platform</li>
              <li>Generate spam, phishing, or fraudulent content</li>
              <li>Violate intellectual property rights of others</li>
            </ul>
          </section>

          {/* Hyperlinking */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Hyperlinking to Our Content</h2>
            <p>
              The following organizations may link to our website without prior written approval: government agencies, search engines,
              news organizations, and online directory distributors.
            </p>
            <p className="mt-4">
              These organizations may link to our home page or content so long as the link: (a) is not deceptive; (b) does not falsely
              imply sponsorship or endorsement; and (c) fits within the context of the linking party's site.
            </p>
            <p className="mt-4">
              No use of MindsetOS's logo or other artwork will be allowed for linking without a trademark license agreement.
            </p>
          </section>

          {/* Content Liability */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Content Liability</h2>
            <p>
              We shall not be held responsible for any content that appears through use of our services. You agree to protect and
              defend us against all claims arising from content you generate or share using our platform.
            </p>
          </section>

          {/* Reservation of Rights */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Reservation of Rights</h2>
            <p>
              We reserve the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Modify these terms and conditions at any time</li>
              <li>Suspend or terminate accounts that violate these terms</li>
              <li>Refuse service to anyone for any reason</li>
              <li>Change pricing, features, or service offerings</li>
              <li>Monitor usage for compliance and security purposes</li>
            </ul>
            <p className="mt-4">
              Continued use of our service after changes constitutes acceptance of modified terms.
            </p>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Disclaimer</h2>
            <p>
              To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating
              to our website and the use of this website.
            </p>
            <p className="mt-4 font-semibold">Nothing in this disclaimer will:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Limit or exclude our or your liability for death or personal injury</li>
              <li>Limit or exclude our or your liability for fraud or fraudulent misrepresentation</li>
              <li>Limit any of our or your liabilities in any way that is not permitted under applicable law</li>
              <li>Exclude any of our or your liabilities that may not be excluded under applicable law</li>
            </ul>
            <p className="mt-4">
              The limitations and prohibitions of liability set in this section govern all liabilities arising under the disclaimer,
              including liabilities arising in contract, in tort and for breach of statutory duty.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its
              conflict of law provisions.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">Contact Us</h2>
            <p>
              If you have any questions about these Terms & Conditions, please contact us at:{' '}
              <a href="mailto:hello@mindset.show" className="font-medium" style={{ color: '#fcc824' }}>
                hello@mindset.show
              </a>
            </p>
          </section>

          {/* Parent Company */}
          <section className="mt-8 pt-6 border-t border-gray-300 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              MindsetOS — Mindset Operating System is operated by MindsetOS Pty. Ltd.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Copyright © 2026 MindsetOS | All rights reserved.
            </p>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-6 border-t border-gray-300 dark:border-gray-600">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/" className="hover:opacity-80" style={{ color: '#fcc824' }}>
              Home
            </Link>
            <Link href="/privacy" className="hover:opacity-80" style={{ color: '#fcc824' }}>
              Privacy Policy
            </Link>
            <Link href="/register" className="hover:opacity-80" style={{ color: '#fcc824' }}>
              Register
            </Link>
            <Link href="/login" className="hover:opacity-80" style={{ color: '#fcc824' }}>
              Login
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
