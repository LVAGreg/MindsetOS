/**
 * Email Service - SendGrid Integration for ExpertOS
 * Handles transactional emails with modern, mobile-first design
 */

const https = require('https');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'rana@expertconsultingos.com';
const FROM_NAME = process.env.FROM_NAME || 'Rana';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://expertconsultingos.com';
const LOGO_URL = `${FRONTEND_URL}/expertas-logo.png`;

// Brand colors
const BRAND = {
  primary: '#fcc824',      // Gold
  primaryDark: '#e5b420',  // Darker gold for hover
  dark: '#1a1a2e',         // Dark background
  text: '#333333',         // Main text
  textLight: '#666666',    // Secondary text
  textMuted: '#999999',    // Muted text
  background: '#f8f9fa',   // Light background
  white: '#ffffff',
  success: '#10b981',      // Green
  purple: '#667eea',       // Purple for password reset
};

/**
 * Base email template wrapper with ExpertOS branding
 */
function getEmailWrapper(content, options = {}) {
  const {
    headerColor = BRAND.primary,
    headerText = '',
    showLogo = true
  } = options;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ExpertOS</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-spacing: 0; }
    td { padding: 0; }
    img { border: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: ${BRAND.background}; padding: 40px 0; }
    .main { max-width: 600px; background-color: ${BRAND.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); }
    @media screen and (max-width: 600px) {
      .main { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 24px !important; }
    }
  </style>
</head>
<body>
  <center class="wrapper">
    <table class="main" width="600" cellpadding="0" cellspacing="0" role="presentation">
      <!-- Logo Header -->
      ${showLogo ? `
      <tr>
        <td style="padding: 24px 40px 16px; text-align: center; background-color: ${BRAND.white};">
          <img src="${LOGO_URL}" alt="ExpertOS" width="80" style="display: block; margin: 0 auto;" />
          <div style="height: 2px; background: ${BRAND.primary}; width: 40px; margin: 12px auto 0;"></div>
        </td>
      </tr>
      ` : ''}

      <!-- Header Text -->
      ${headerText ? `
      <tr>
        <td style="padding: 24px 40px 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${BRAND.dark}; line-height: 1.3;">
            ${headerText}
          </h1>
        </td>
      </tr>
      ` : ''}

      <!-- Content -->
      <tr>
        <td class="content" style="padding: 32px 40px;">
          ${content}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 24px 40px; background-color: ${BRAND.background}; border-top: 1px solid #eee;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="text-align: center;">
                <p style="margin: 0 0 8px; font-size: 13px; color: ${BRAND.textMuted};">
                  Cheers, Rana
                </p>
                <p style="margin: 0 0 12px; font-size: 12px; color: ${BRAND.textMuted};">
                  <a href="${FRONTEND_URL}" style="color: ${BRAND.primary}; text-decoration: none;">ExpertOS</a>
                  &nbsp;|&nbsp;
                  <a href="https://www.linkedin.com/in/b2bmarketingstrategies/" style="color: ${BRAND.primary}; text-decoration: none;">LinkedIn</a>
                </p>
                <p style="margin: 0; font-size: 11px; color: #bbb;">
                  Built for consultants who want to scale
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `;
}

/**
 * Create a CTA button
 */
function getButton(text, url, color = BRAND.primary) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding: 24px 0; text-align: center;">
          <a href="${url}" style="display: inline-block; background-color: ${color}; color: ${color === BRAND.primary ? BRAND.dark : BRAND.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(252, 200, 36, 0.3);">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Send email via SendGrid API
 */
function sendEmail({ to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    if (!SENDGRID_API_KEY) {
      console.error('❌ [EMAIL] SENDGRID_API_KEY not configured');
      reject(new Error('Email service not configured'));
      return;
    }

    const requestBody = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [
        ...(text ? [{ type: 'text/plain', value: text }] : []),
        { type: 'text/html', value: html }
      ],
      tracking_settings: {
        click_tracking: { enable: false },
        open_tracking: { enable: false }
      }
    });

    const options = {
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ [EMAIL] Sent to ${to}: ${subject}`);
          resolve({ success: true, statusCode: res.statusCode });
        } else {
          console.error(`❌ [EMAIL] Failed (${res.statusCode}):`, data);
          reject(new Error(`SendGrid error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ [EMAIL] Request error:', error);
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

// ============================================================
// TRANSACTIONAL EMAILS
// ============================================================

/**
 * Send email verification email to new user
 */
async function sendVerificationEmail(email, verificationToken, name = '') {
  const displayName = name || email.split('@')[0];
  const verifyLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      Hey ${displayName},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Thanks for signing up for ExpertOS! Just one quick step to get started.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Click the button below to verify your email address:
    </p>

    ${getButton('Verify Email', verifyLink, BRAND.success)}

    <div style="margin: 24px 0; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid ${BRAND.primary};">
      <p style="margin: 0; font-size: 14px; color: ${BRAND.text};">
        This link expires in 24 hours.
      </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 14px; color: ${BRAND.textMuted}; line-height: 1.6;">
      Didn't sign up for ExpertOS? Just ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="margin: 0; font-size: 12px; color: ${BRAND.textMuted}; word-break: break-all;">
      Link not working? Copy this: <a href="${verifyLink}" style="color: ${BRAND.success};">${verifyLink}</a>
    </p>
  `;

  const html = getEmailWrapper(content, { headerText: 'Verify Your Email' });

  return sendEmail({
    to: email,
    subject: 'Verify your email - ExpertOS',
    html,
    text: `Hey ${displayName}, verify your email for ExpertOS: ${verifyLink} (expires in 24 hours)`
  });
}

/**
 * Send welcome email to new user
 */
async function sendWelcomeEmail(email, name = '') {
  const displayName = name || email.split('@')[0];

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      Hey ${displayName},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      You're in. ExpertOS is now yours.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      I built this for consultants who are tired of guessing what works. Inside, you've got AI agents that'll help you nail your offer, write promo copy that actually converts, and build campaigns you can run this week.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      First move? Complete your onboarding. Takes about 5 minutes and unlocks everything.
    </p>

    ${getButton('Get Started', `${FRONTEND_URL}/dashboard`)}

    <p style="margin: 24px 0 0; font-size: 14px; color: ${BRAND.textMuted};">
      Got questions? Just reply to this email. I read every one.
    </p>
  `;

  const html = getEmailWrapper(content, { headerText: "You're In" });

  return sendEmail({
    to: email,
    subject: "You're in - let's build something",
    html,
    text: `Hey ${displayName}, you're in. ExpertOS is now yours. Get started at ${FRONTEND_URL}/dashboard`
  });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, resetToken, name = '') {
  const displayName = name || email.split('@')[0];
  const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      Hey ${displayName},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Someone (hopefully you) asked to reset your password.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Click below to pick a new one:
    </p>

    ${getButton('Reset Password', resetLink, BRAND.purple)}

    <div style="margin: 24px 0; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid ${BRAND.primary};">
      <p style="margin: 0; font-size: 14px; color: ${BRAND.text};">
        This link dies in 1 hour. Security thing.
      </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 14px; color: ${BRAND.textMuted}; line-height: 1.6;">
      Wasn't you? Ignore this and nothing changes.
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="margin: 0; font-size: 12px; color: ${BRAND.textMuted}; word-break: break-all;">
      Link not working? Copy this: <a href="${resetLink}" style="color: ${BRAND.purple};">${resetLink}</a>
    </p>
  `;

  const html = getEmailWrapper(content, { headerText: 'Password Reset' });

  return sendEmail({
    to: email,
    subject: 'Reset your password',
    html,
    text: `Reset your ExpertOS password: ${resetLink} (expires in 1 hour)`
  });
}

/**
 * Send onboarding completion email
 */
async function sendOnboardingCompleteEmail(email, name = '') {
  const displayName = name || email.split('@')[0];

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      ${displayName}, you did it.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Onboarding done. All your AI agents are unlocked and know who you are, who you serve, and what you're building.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      This is where it gets fun.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Start with <strong>Money Model Mapper</strong> to nail your core offer. Then use <strong>Offer Invitation Architect</strong> to turn it into copy people actually respond to. Finally, <strong>Promo Planner</strong> gives you a 10-day campaign ready to run.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Three conversations. Weeks of work done.
    </p>

    ${getButton('Start Building', FRONTEND_URL, BRAND.success)}
  `;

  const html = getEmailWrapper(content, { headerText: 'All Unlocked' });

  return sendEmail({
    to: email,
    subject: 'All agents unlocked',
    html,
    text: `${displayName}, onboarding complete. All agents unlocked. Start building at ${FRONTEND_URL}`
  });
}

// ============================================================
// ONBOARDING SEQUENCE EMAILS
// ============================================================

/**
 * Day 1 - Quick Start Guide
 */
async function sendQuickStartEmail(email, name = '') {
  const displayName = name || email.split('@')[0];

  const content = `
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: ${BRAND.text}; font-weight: 600;">
        Day 1 of 5
      </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      ${displayName},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      15 minutes. That's all you need today.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      First, finish your profile. Add your expertise and who you want to work with. Takes 2 minutes.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Then open Money Model Mapper and have a quick chat. Tell it about your business. Ask it to help you define your ideal client.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      By tomorrow, you'll have clarity most consultants spend months chasing.
    </p>

    ${getButton('Let\'s Go', FRONTEND_URL)}
  `;

  const html = getEmailWrapper(content, { headerText: '15 Minutes Today' });

  return sendEmail({
    to: email,
    subject: '15 minutes changes everything',
    html,
    text: `${displayName}, 15 minutes today. Finish your profile and chat with Money Model Mapper. Visit ${FRONTEND_URL}`
  });
}

/**
 * Day 3 - Meet Your Agents
 */
async function sendMeetAgentsEmail(email, name = '') {
  const displayName = name || email.split('@')[0];

  const content = `
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: ${BRAND.text}; font-weight: 600;">
        Day 3 of 5
      </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      ${displayName},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Quick rundown of your agents and when to use them:
    </p>

    <p style="margin: 0 0 12px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      <strong>Money Model Mapper</strong> - Start here. Helps you figure out exactly who you serve and what you're offering. Without this, everything else is guesswork.
    </p>

    <p style="margin: 0 0 12px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      <strong>Offer Invitation Architect</strong> - Takes your offer and writes copy that makes people want it. Headlines, hooks, full invitations.
    </p>

    <p style="margin: 0 0 12px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      <strong>Promo Planner</strong> - Builds you a 10-day campaign. 30 messages across social, DM, and email. Copy-paste ready.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Use them in that order. Each one builds on the last.
    </p>

    ${getButton('Pick an Agent', FRONTEND_URL)}
  `;

  const html = getEmailWrapper(content, { headerText: 'Your Agents' });

  return sendEmail({
    to: email,
    subject: 'Which agent should you use first?',
    html,
    text: `${displayName}, here's when to use each agent. Start with Money Model Mapper. Visit ${FRONTEND_URL}`
  });
}

/**
 * Inactivity reminder (7 days)
 */
async function sendInactivityEmail(email, name = '', daysInactive = 7) {
  const displayName = name || email.split('@')[0];

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      ${displayName},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Been ${daysInactive} days. Life gets busy, I get it.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      But here's the thing. Every day without a clear offer and a system to promote it is a day you're leaving money on the table.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      I'm not trying to guilt you. I'm just saying - the AI agents are sitting there ready to do the heavy lifting. You just have to show up.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      20 minutes could change your next month.
    </p>

    ${getButton('Pick Up Where You Left Off', FRONTEND_URL)}

    <p style="margin: 24px 0 0; font-size: 14px; color: ${BRAND.textMuted};">
      Stuck on something? Reply and tell me. I'll point you in the right direction.
    </p>
  `;

  const html = getEmailWrapper(content, { headerText: 'Been a Minute' });

  return sendEmail({
    to: email,
    subject: '20 minutes could change your month',
    html,
    text: `${displayName}, been ${daysInactive} days. The agents are ready when you are. Visit ${FRONTEND_URL}`
  });
}

/**
 * Milestone - First conversation
 */
async function sendFirstConversationEmail(email, name = '', agentName = 'an AI agent') {
  const displayName = name || email.split('@')[0];

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      ${displayName},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      First chat with ${agentName}. Done.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Here's something most people don't realize: these agents get better the more you talk to them. They remember your key decisions, your preferences, your business context.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      So the first conversation? That's foundation work. The second and third are where things start clicking.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Keep going.
    </p>

    ${getButton('Back to It', FRONTEND_URL, BRAND.success)}
  `;

  const html = getEmailWrapper(content, { headerText: 'First One Down' });

  return sendEmail({
    to: email,
    subject: 'First chat done - now keep going',
    html,
    text: `${displayName}, first chat with ${agentName} complete. Keep going at ${FRONTEND_URL}`
  });
}

/**
 * Send password reset notification when admin resets a user's password
 */
async function sendPasswordResetByAdminEmail(email, name = '', temporaryPassword) {
  const displayName = name || email.split('@')[0];

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      Hey ${displayName},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Your password has been reset by an administrator.
    </p>

    <div style="margin: 24px 0; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
      <p style="margin: 0 0 8px; font-size: 14px; color: ${BRAND.textMuted};">Your temporary password:</p>
      <p style="margin: 0; font-size: 24px; font-family: monospace; font-weight: bold; color: ${BRAND.dark}; letter-spacing: 2px;">
        ${temporaryPassword}
      </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Please log in with this password and change it to something you'll remember.
    </p>

    ${getButton('Log In Now', `${FRONTEND_URL}/login`, BRAND.purple)}

    <div style="margin: 24px 0; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid ${BRAND.primary};">
      <p style="margin: 0; font-size: 14px; color: ${BRAND.text};">
        <strong>Security tip:</strong> Change this password immediately after logging in.
      </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 14px; color: ${BRAND.textMuted}; line-height: 1.6;">
      If you didn't request this, please contact support immediately.
    </p>
  `;

  const html = getEmailWrapper(content, { headerText: 'Password Reset' });

  return sendEmail({
    to: email,
    subject: 'Your password has been reset',
    html,
    text: `Hey ${displayName}, your password has been reset. Your temporary password is: ${temporaryPassword}. Please log in and change it immediately. Visit ${FRONTEND_URL}/login`
  });
}

/**
 * Generate a random password
 */
function generateRandomPassword(length = 12) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  // Ensure at least one of each type
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += special.charAt(Math.floor(Math.random() * special.length));

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Milestone - Money Model created
 */
async function sendMoneyModelCreatedEmail(email, name = '') {
  const displayName = name || email.split('@')[0];

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      ${displayName},
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Your Money Model is done. This is bigger than you think.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      You now know exactly who you serve, what transformation you deliver, and how you do it differently. Most consultants never get this clear. They stay vague forever and wonder why clients don't bite.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Not you. Not anymore.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Next step: take this to <strong>Offer Invitation Architect</strong>. It'll turn your Money Model into copy that makes people want to work with you. Headlines, hooks, full promotional invitations.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      You're one conversation away from having promo copy ready to post.
    </p>

    ${getButton('Build Your Offer Copy', FRONTEND_URL)}
  `;

  const html = getEmailWrapper(content, { headerText: 'Money Model Complete' });

  return sendEmail({
    to: email,
    subject: 'Money Model done - now let\'s write copy',
    html,
    text: `${displayName}, Money Model complete. Next: Offer Invitation Architect to write your promo copy. Visit ${FRONTEND_URL}`
  });
}

/**
 * Payment confirmation + welcome email for Client Fast Start purchase
 */
async function sendPaymentConfirmationEmail(email, name = '', { plan = 'weekly', amount = null } = {}) {
  const displayName = name || email.split('@')[0];
  const isWeekly = plan === 'weekly';
  const displayAmount = amount ? `$${(amount / 100).toFixed(2)}` : (isWeekly ? '$87.00' : '$750.00');
  const planDescription = isWeekly ? '$87/wk billed weekly' : '$750 one-time (12 weeks)';

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: ${BRAND.text}; line-height: 1.5;">
      ${displayName}, welcome to Client Fast Start.
    </p>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Your payment went through. You're officially in.
    </p>

    <!-- Receipt Box -->
    <div style="margin: 24px 0; padding: 20px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: ${BRAND.dark};">Payment Receipt</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding: 4px 0; font-size: 14px; color: ${BRAND.textLight};">Client Fast Start</td>
          <td style="padding: 4px 0; font-size: 14px; color: ${BRAND.dark}; text-align: right; font-weight: 600;">${displayAmount}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.textMuted};">Plan</td>
          <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.textMuted}; text-align: right;">${planDescription}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      Here's what's unlocked for you right now:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 20px;">
      <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text};">&#10003;&nbsp;&nbsp;12 AI-Powered Implementation Modules</td></tr>
      <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text};">&#10003;&nbsp;&nbsp;Full Access to Expert OS &mdash; 9 AI Agents</td></tr>
      <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text};">&#10003;&nbsp;&nbsp;Plug-and-Play Offer Frameworks &amp; Templates</td></tr>
      <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text};">&#10003;&nbsp;&nbsp;Weekly LIVE Coaching Sessions</td></tr>
      <tr><td style="padding: 6px 0; font-size: 15px; color: ${BRAND.text};">&#10003;&nbsp;&nbsp;Expert Arena Community &amp; Implementation Support</td></tr>
    </table>

    <p style="margin: 0 0 16px; font-size: 16px; color: ${BRAND.textLight}; line-height: 1.6;">
      First move? Log in and complete your onboarding. Takes 5 minutes and your agents will know exactly who you are and what you're building.
    </p>

    ${getButton('Get Started Now', `${FRONTEND_URL}/dashboard`, BRAND.success)}

    <p style="margin: 24px 0 0; font-size: 14px; color: ${BRAND.textMuted};">
      Questions about your subscription or need help? Reply to this email &mdash; I read every one.
    </p>
  `;

  const html = getEmailWrapper(content, { headerText: "You're In" });

  return sendEmail({
    to: email,
    subject: "Payment confirmed - welcome to Client Fast Start",
    html,
    text: `${displayName}, payment confirmed (${displayAmount}). Welcome to Client Fast Start. Your agents are ready. Get started at ${FRONTEND_URL}/dashboard`
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordResetByAdminEmail,
  sendOnboardingCompleteEmail,
  sendQuickStartEmail,
  sendMeetAgentsEmail,
  sendInactivityEmail,
  sendFirstConversationEmail,
  sendMoneyModelCreatedEmail,
  sendPaymentConfirmationEmail,
  generateRandomPassword,
};
