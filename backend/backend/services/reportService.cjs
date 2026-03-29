/**
 * ECOS System Report Service
 * Generates daily, weekly, and monthly usage reports
 * Sends via SendGrid to gregory@linkedva.com
 */

const { sendEmail } = require('./emailService.cjs');

const REPORT_RECIPIENTS = [
  'gregory@linkedva.com',
  'rana@expertproject.com',
  'lucasjizmundo@gmail.com',
  'vaughan@expertproject.com',
];
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://expertconsultingos.com';

// ─── Test/Admin Account Exclusion ────────────────────────────────
// Exclude these from reporting to avoid skewing metrics.
// Matches: admin accounts, test accounts, @ecos.local, known internal emails
const EXCLUDED_EMAIL_PATTERNS = [
  '%@ecos.local',        // All seeded test accounts (rana-admin@ecos.local, etc.)
  '%test%@%',            // Any email with "test" in local part
  '%demo%@%',            // Demo accounts
  '%+%@%',              // Plus-alias reuse accounts (e.g. g20+growthwithg@gmail.com)
  '%@example.com',       // AI Vision test registrations
  '%@mailinator.com',    // Disposable email test accounts
];
const EXCLUDED_ROLES = ['admin'];  // Admin users excluded from usage reporting

// SQL fragment: filters api_usage_logs by excluding test users
// Use with: WHERE ... AND {fragment} — requires a JOIN to users table aliased as 'u'
const EXCLUDE_TEST_USERS_SQL = `
  u.role NOT IN ('admin')
  AND u.email NOT LIKE '%@ecos.local'
  AND u.email NOT LIKE '%test%@%'
  AND u.email NOT LIKE '%demo%@%'
  AND u.email NOT LIKE '%+%@%'
  AND u.email NOT LIKE '%@example.com'
  AND u.email NOT LIKE '%@mailinator.com'
`;

// Same but for direct users table queries (no join alias needed)
const EXCLUDE_TEST_USERS_DIRECT_SQL = `
  role NOT IN ('admin')
  AND email NOT LIKE '%@ecos.local'
  AND email NOT LIKE '%test%@%'
  AND email NOT LIKE '%demo%@%'
  AND email NOT LIKE '%+%@%'
  AND email NOT LIKE '%@example.com'
  AND email NOT LIKE '%@mailinator.com'
`;

// ─── Data Queries ──────────────────────────────────────────────

async function queryUsage(pool, interval) {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) as total_requests,
      COUNT(DISTINCT a.user_id) as unique_users,
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens,
      COALESCE(ROUND(SUM(cost_usd)::numeric, 2), 0) as total_cost,
      COALESCE(ROUND(AVG(cost_usd)::numeric, 4), 0) as avg_cost_per_request,
      COALESCE(ROUND(AVG(output_tokens)::numeric, 0), 0) as avg_output_tokens,
      COALESCE(ROUND(AVG(latency_ms)::numeric, 0), 0) as avg_latency_ms,
      COUNT(CASE WHEN a.status != 'success' THEN 1 END) as error_count
    FROM api_usage_logs a
    JOIN users u ON a.user_id = u.id
    WHERE a.created_at >= NOW() - INTERVAL '${interval}'
      AND ${EXCLUDE_TEST_USERS_SQL}
  `);
  return rows[0];
}

async function queryDailyBreakdown(pool, interval) {
  const { rows } = await pool.query(`
    SELECT
      DATE(a.created_at) as day,
      COUNT(*) as requests,
      COUNT(DISTINCT a.user_id) as users,
      ROUND(SUM(a.cost_usd)::numeric, 2) as cost
    FROM api_usage_logs a
    JOIN users u ON a.user_id = u.id
    WHERE a.created_at >= NOW() - INTERVAL '${interval}'
      AND ${EXCLUDE_TEST_USERS_SQL}
    GROUP BY DATE(a.created_at) ORDER BY day DESC
  `);
  return rows;
}

async function queryAgentUsage(pool, interval) {
  const { rows } = await pool.query(`
    SELECT
      a.agent_id,
      COUNT(*) as requests,
      COUNT(DISTINCT a.user_id) as unique_users,
      ROUND(SUM(a.cost_usd)::numeric, 2) as cost,
      ROUND(AVG(a.output_tokens)::numeric, 0) as avg_output
    FROM api_usage_logs a
    JOIN users u ON a.user_id = u.id
    WHERE a.created_at >= NOW() - INTERVAL '${interval}'
      AND ${EXCLUDE_TEST_USERS_SQL}
    GROUP BY a.agent_id ORDER BY requests DESC
  `);
  return rows;
}

async function queryTopUsers(pool, interval, limit = 10) {
  const { rows } = await pool.query(`
    SELECT
      u.first_name, u.email, u.membership_tier,
      COUNT(a.id) as requests,
      ROUND(SUM(a.cost_usd)::numeric, 2) as cost,
      MAX(a.created_at) as last_active
    FROM api_usage_logs a
    JOIN users u ON a.user_id = u.id
    WHERE a.created_at >= NOW() - INTERVAL '${interval}'
      AND ${EXCLUDE_TEST_USERS_SQL}
    GROUP BY u.first_name, u.email, u.membership_tier
    ORDER BY requests DESC LIMIT ${limit}
  `);
  return rows;
}

async function queryModelUsage(pool, interval) {
  const { rows } = await pool.query(`
    SELECT
      a.model_id,
      COUNT(*) as requests,
      ROUND(SUM(a.cost_usd)::numeric, 2) as cost,
      ROUND(AVG(a.latency_ms)::numeric, 0) as avg_latency
    FROM api_usage_logs a
    JOIN users u ON a.user_id = u.id
    WHERE a.created_at >= NOW() - INTERVAL '${interval}'
      AND ${EXCLUDE_TEST_USERS_SQL}
    GROUP BY a.model_id ORDER BY cost DESC
  `);
  return rows;
}

async function queryDAU(pool, interval) {
  const { rows } = await pool.query(`
    SELECT
      DATE(a.created_at) as day,
      COUNT(DISTINCT a.user_id) as dau
    FROM api_usage_logs a
    JOIN users u ON a.user_id = u.id
    WHERE a.created_at >= NOW() - INTERVAL '${interval}'
      AND ${EXCLUDE_TEST_USERS_SQL}
    GROUP BY DATE(a.created_at) ORDER BY day DESC
  `);
  return rows;
}

async function queryUserStats(pool) {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) as total_users,
      COUNT(CASE WHEN membership_tier = 'trial' THEN 1 END) as trial_users,
      COUNT(CASE WHEN membership_tier = 'foundations' THEN 1 END) as foundations_users,
      COUNT(CASE WHEN membership_tier = 'client_fast_start' THEN 1 END) as cfs_users,
      COUNT(CASE WHEN membership_tier = '5in30' THEN 1 END) as fivein30_users,
      COUNT(CASE WHEN stripe_subscription_id IS NOT NULL THEN 1 END) as stripe_subscribers
    FROM users
    WHERE ${EXCLUDE_TEST_USERS_DIRECT_SQL}
  `);
  return rows[0];
}

async function queryNewUsers(pool, interval) {
  const { rows } = await pool.query(`
    SELECT COUNT(*) as new_users
    FROM users WHERE created_at >= NOW() - INTERVAL '${interval}'
      AND ${EXCLUDE_TEST_USERS_DIRECT_SQL}
  `);
  return rows[0].new_users;
}

async function queryPreviousUsage(pool, interval) {
  // Get previous period for comparison (e.g. if interval is 1 day, get the day before)
  const intervalMap = { '1 day': '2 days', '7 days': '14 days', '30 days': '60 days' };
  const doubleInterval = intervalMap[interval] || '2 days';
  const { rows } = await pool.query(`
    SELECT
      ROUND(SUM(a.cost_usd)::numeric, 2) as cost,
      COUNT(*) as requests,
      COUNT(DISTINCT a.user_id) as users
    FROM api_usage_logs a
    JOIN users u ON a.user_id = u.id
    WHERE a.created_at >= NOW() - INTERVAL '${doubleInterval}'
      AND a.created_at < NOW() - INTERVAL '${interval}'
      AND ${EXCLUDE_TEST_USERS_SQL}
  `);
  return rows[0];
}

// ─── Formatting Helpers ────────────────────────────────────────

function formatCost(val) {
  return `$${parseFloat(val || 0).toFixed(2)}`;
}

function formatNumber(val) {
  return parseInt(val || 0).toLocaleString();
}

function formatTokens(val) {
  const n = parseInt(val || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function changeIndicator(current, previous) {
  const c = parseFloat(current || 0);
  const p = parseFloat(previous || 0);
  if (p === 0) return '<span style="color:#6b7280;">—</span>';
  const pct = ((c - p) / p * 100).toFixed(0);
  if (pct > 0) return `<span style="color:#10b981;">↑${pct}%</span>`;
  if (pct < 0) return `<span style="color:#ef4444;">↓${Math.abs(pct)}%</span>`;
  return '<span style="color:#6b7280;">→ 0%</span>';
}

function agentDisplayName(agentId) {
  const names = {
    'ecos-super-agent': 'ExpertAI (Super Agent)',
    'mmm-5in30': 'Money Model Maker',
    'offer-invitation-architect': 'Offer Invitation Architect',
    'content-catalyst': 'Content Catalyst',
    'client-onboarding': 'Client Onboarding',
    'presentation-printer': 'Presentation Printer',
    'linkedin-events-builder': 'LinkedIn Events Builder',
    'email-promo-engine': 'Email Promo Engine',
    'qualification-call-builder': 'Qualification Call Builder',
    'promo-planner': 'Promo Planner',
    'fast-fix-finder': 'Fast Fix Finder',
  };
  return names[agentId] || agentId;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Email Templates ───────────────────────────────────────────

function buildEmailHTML({ period, periodLabel, usage, prevUsage, agents, topUsers, models, dau, dailyBreakdown, userStats, newUsers, insights }) {
  const now = new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const errorRate = usage.total_requests > 0 ? ((usage.error_count / usage.total_requests) * 100).toFixed(1) : '0.0';

  const agentRows = agents.map(a => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${agentDisplayName(a.agent_id)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:center;">${formatNumber(a.requests)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:center;">${a.unique_users}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${formatCost(a.cost)}</td>
    </tr>
  `).join('');

  const userRows = topUsers.map((u, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${i + 1}. ${u.first_name || 'Unknown'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${u.email}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:center;">${formatNumber(u.requests)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${formatCost(u.cost)}</td>
    </tr>
  `).join('');

  const modelRows = models.map(m => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${m.model_id}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:center;">${formatNumber(m.requests)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:center;">${m.avg_latency}ms</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${formatCost(m.cost)}</td>
    </tr>
  `).join('');

  const dauSpark = dau.slice(0, 7).reverse().map(d => `
    <td style="padding:4px 8px;text-align:center;font-size:12px;">
      <div style="font-weight:600;color:#1f2937;">${d.dau}</div>
      <div style="color:#9ca3af;font-size:10px;">${formatDate(d.day)}</div>
    </td>
  `).join('');

  const insightItems = insights.map(i => `
    <li style="margin-bottom:8px;font-size:13px;color:#374151;">
      <strong style="color:#1f2937;">${i.icon}</strong> ${i.text}
    </li>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:680px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1f2937,#111827);border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#fcc824;margin-bottom:4px;">Expert<span style="color:white;">OS</span></div>
      <div style="font-size:18px;font-weight:600;color:white;margin-bottom:4px;">${periodLabel} System Report</div>
      <div style="font-size:13px;color:#9ca3af;">${now}</div>
    </div>

    <!-- KPI Cards -->
    <div style="background:white;padding:24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:12px;text-align:center;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#1f2937;">${formatNumber(usage.total_requests)}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Requests</div>
            <div style="font-size:12px;margin-top:2px;">${changeIndicator(usage.total_requests, prevUsage.requests)}</div>
          </td>
          <td style="padding:12px;text-align:center;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#1f2937;">${usage.unique_users}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Active Users</div>
            <div style="font-size:12px;margin-top:2px;">${changeIndicator(usage.unique_users, prevUsage.users)}</div>
          </td>
          <td style="padding:12px;text-align:center;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#059669;">${formatCost(usage.total_cost)}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total Cost</div>
            <div style="font-size:12px;margin-top:2px;">${changeIndicator(usage.total_cost, prevUsage.cost)}</div>
          </td>
          <td style="padding:12px;text-align:center;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#1f2937;">${errorRate}%</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Error Rate</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Secondary KPIs -->
    <div style="background:#f9fafb;padding:16px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px;text-align:center;font-size:12px;">
            <span style="color:#6b7280;">Avg Latency:</span> <strong>${usage.avg_latency_ms}ms</strong>
          </td>
          <td style="padding:8px;text-align:center;font-size:12px;">
            <span style="color:#6b7280;">Avg Output:</span> <strong>${formatNumber(usage.avg_output_tokens)} tokens</strong>
          </td>
          <td style="padding:8px;text-align:center;font-size:12px;">
            <span style="color:#6b7280;">Cost/Request:</span> <strong>${formatCost(usage.avg_cost_per_request)}</strong>
          </td>
          <td style="padding:8px;text-align:center;font-size:12px;">
            <span style="color:#6b7280;">New Users:</span> <strong>${newUsers}</strong>
          </td>
        </tr>
      </table>
    </div>

    <!-- DAU Sparkline -->
    <div style="background:white;padding:16px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <div style="font-size:13px;font-weight:600;color:#1f2937;margin-bottom:8px;">Daily Active Users</div>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>${dauSpark}</tr></table>
    </div>

    <!-- Insights -->
    <div style="background:#fffbeb;padding:20px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <div style="font-size:14px;font-weight:600;color:#92400e;margin-bottom:12px;">Insights & Recommendations</div>
      <ul style="margin:0;padding-left:20px;">${insightItems}</ul>
    </div>

    <!-- Agent Usage -->
    <div style="background:white;padding:20px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <div style="font-size:14px;font-weight:600;color:#1f2937;margin-bottom:12px;">Agent Usage</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Agent</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Requests</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Users</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Cost</th>
        </tr>
        ${agentRows}
      </table>
    </div>

    <!-- Model Usage -->
    <div style="background:#f9fafb;padding:20px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <div style="font-size:14px;font-weight:600;color:#1f2937;margin-bottom:12px;">Model Performance</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr style="background:white;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Model</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Requests</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Avg Latency</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Cost</th>
        </tr>
        ${modelRows}
      </table>
    </div>

    <!-- Top Users -->
    <div style="background:white;padding:20px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <div style="font-size:14px;font-weight:600;color:#1f2937;margin-bottom:12px;">Top Users</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Name</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Email</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Requests</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Cost</th>
        </tr>
        ${userRows}
      </table>
    </div>

    <!-- User Base -->
    <div style="background:#f9fafb;padding:20px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <div style="font-size:14px;font-weight:600;color:#1f2937;margin-bottom:12px;">User Base</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#1f2937;">${userStats.total_users}</div>
            <div style="font-size:11px;color:#6b7280;">Total</div>
          </td>
          <td style="padding:8px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#3b82f6;">${userStats.foundations_users}</div>
            <div style="font-size:11px;color:#6b7280;">Foundations</div>
          </td>
          <td style="padding:8px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#f59e0b;">${userStats.trial_users}</div>
            <div style="font-size:11px;color:#6b7280;">Trial</div>
          </td>
          <td style="padding:8px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#10b981;">${userStats.cfs_users}</div>
            <div style="font-size:11px;color:#6b7280;">Client Fast Start</div>
          </td>
          <td style="padding:8px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#8b5cf6;">${userStats.stripe_subscribers}</div>
            <div style="font-size:11px;color:#6b7280;">Stripe Subs</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#1f2937;border-radius:0 0 12px 12px;padding:20px 24px;text-align:center;">
      <div style="font-size:12px;color:#9ca3af;">
        ExpertOS System Report &middot; <a href="${FRONTEND_URL}/admin" style="color:#fcc824;text-decoration:none;">Admin Dashboard</a>
      </div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">
        Automated report &middot; ${period}
      </div>
    </div>

  </div>
</body>
</html>`;
}

// ─── Insight Generation ────────────────────────────────────────

function generateInsights(usage, prevUsage, agents, models, dau, userStats) {
  const insights = [];

  // Cost trend
  const costChange = prevUsage.cost > 0 ? ((usage.total_cost - prevUsage.cost) / prevUsage.cost * 100).toFixed(0) : 0;
  if (costChange > 20) {
    insights.push({ icon: '💰', text: `Cost increased ${costChange}% vs previous period. Review heavy users or consider model optimization.` });
  } else if (costChange < -20) {
    insights.push({ icon: '💰', text: `Cost decreased ${Math.abs(costChange)}% vs previous period. Good efficiency trend.` });
  }

  // High-cost agent
  if (agents.length > 0) {
    const topAgent = agents[0];
    const costPct = usage.total_cost > 0 ? (topAgent.cost / usage.total_cost * 100).toFixed(0) : 0;
    if (costPct > 50) {
      insights.push({ icon: '🤖', text: `${agentDisplayName(topAgent.agent_id)} accounts for ${costPct}% of costs (${formatCost(topAgent.cost)}). May benefit from prompt optimization.` });
    }
  }

  // Input/output ratio — context bloat check
  const ratio = usage.total_input_tokens > 0 ? (usage.total_output_tokens / usage.total_input_tokens) : 0;
  if (ratio < 0.01) {
    insights.push({ icon: '📊', text: `Input-to-output ratio is very low (${(ratio * 100).toFixed(2)}%). Context payloads may be oversized — consider trimming system prompts or conversation history.` });
  }

  // Latency
  if (usage.avg_latency_ms > 3000) {
    insights.push({ icon: '⚡', text: `Average latency is ${usage.avg_latency_ms}ms — above 3s threshold. Consider caching or lighter models for simple queries.` });
  }

  // Error rate
  const errorRate = usage.total_requests > 0 ? (usage.error_count / usage.total_requests * 100) : 0;
  if (errorRate > 2) {
    insights.push({ icon: '🚨', text: `Error rate is ${errorRate.toFixed(1)}% — investigate failing requests.` });
  } else if (errorRate === 0) {
    insights.push({ icon: '✅', text: `Zero errors this period. System running clean.` });
  }

  // DAU trend
  if (dau.length >= 3) {
    const recent = dau.slice(0, 3).reduce((s, d) => s + parseInt(d.dau), 0) / 3;
    const older = dau.length >= 6 ? dau.slice(3, 6).reduce((s, d) => s + parseInt(d.dau), 0) / 3 : recent;
    if (recent > older * 1.3) {
      insights.push({ icon: '📈', text: `Daily active users trending up — ${recent.toFixed(0)} avg (recent 3 days) vs ${older.toFixed(0)} (prior).` });
    } else if (recent < older * 0.7) {
      insights.push({ icon: '📉', text: `Daily active users trending down — ${recent.toFixed(0)} avg vs ${older.toFixed(0)} prior. Consider engagement campaigns.` });
    }
  }

  // Model cost split
  const sonnetModel = models.find(m => m.model_id && m.model_id.includes('sonnet'));
  if (sonnetModel && usage.total_cost > 0) {
    const sonnetPct = (sonnetModel.cost / usage.total_cost * 100).toFixed(0);
    insights.push({ icon: '🧠', text: `Sonnet handles ${sonnetPct}% of cost (${formatCost(sonnetModel.cost)}). Haiku handles routing/classification cheaply.` });
  }

  // User growth
  if (parseInt(userStats.trial_users) > 0) {
    insights.push({ icon: '🎯', text: `${userStats.trial_users} trial users active — conversion opportunity for Client Fast Start.` });
  }

  if (insights.length === 0) {
    insights.push({ icon: '✅', text: 'System performing within normal parameters. No anomalies detected.' });
  }

  return insights;
}

// ─── Report Generators ─────────────────────────────────────────

async function generateReport(pool, period) {
  const intervalMap = { daily: '1 day', weekly: '7 days', monthly: '30 days' };
  const labelMap = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
  const userLimitMap = { daily: 5, weekly: 10, monthly: 15 };

  const interval = intervalMap[period];
  const label = labelMap[period];
  const userLimit = userLimitMap[period];

  const [usage, prevUsage, agents, topUsers, models, dau, userStats, newUsers, dailyBreakdown] = await Promise.all([
    queryUsage(pool, interval),
    queryPreviousUsage(pool, interval),
    queryAgentUsage(pool, interval),
    queryTopUsers(pool, interval, userLimit),
    queryModelUsage(pool, interval),
    queryDAU(pool, interval),
    queryUserStats(pool),
    queryNewUsers(pool, interval),
    queryDailyBreakdown(pool, interval),
  ]);

  const insights = generateInsights(usage, prevUsage, agents, models, dau, userStats);

  const html = buildEmailHTML({
    period: `${label} Report`,
    periodLabel: label,
    usage,
    prevUsage,
    agents,
    topUsers,
    models,
    dau,
    dailyBreakdown,
    userStats,
    newUsers: newUsers || '0',
    insights,
  });

  return { html, usage, label };
}

async function sendReport(pool, period) {
  try {
    const { html, usage, label } = await generateReport(pool, period);
    const subject = `ExpertOS ${label} Report — ${formatCost(usage.total_cost)} | ${formatNumber(usage.total_requests)} requests | ${usage.unique_users} users`;
    const text = `ExpertOS ${label} Report: ${formatNumber(usage.total_requests)} requests, ${usage.unique_users} active users, ${formatCost(usage.total_cost)} total cost.`;

    const results = await Promise.all(
      REPORT_RECIPIENTS.map(to => sendEmail({ to, subject, html, text }).catch(err => {
        console.error(`[Report] Failed to send to ${to}:`, err.message);
        return false;
      }))
    );

    console.log(`[Report] ${label} report sent to ${REPORT_RECIPIENTS.length} recipients`, results.every(r => r) ? 'ALL SUCCESS' : 'PARTIAL');
    return results.every(r => r);
  } catch (err) {
    console.error(`[Report] Failed to send ${period} report:`, err.message);
    return false;
  }
}

async function sendCustomEmail(recipients, subject, html, text) {
  const targets = recipients || REPORT_RECIPIENTS;
  const results = await Promise.all(
    targets.map(to => sendEmail({ to, subject, html, text }).catch(err => {
      console.error(`[Report] Failed to send to ${to}:`, err.message);
      return false;
    }))
  );
  return results.every(r => r);
}

// ─── Scheduler ─────────────────────────────────────────────────

function startReportScheduler(pool) {
  console.log('[Report Scheduler] Starting report scheduler...');
  console.log(`[Report Scheduler] Reports will be sent to: ${REPORT_RECIPIENTS.join(', ')}`);

  // Check every minute
  setInterval(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon
    const utcDate = now.getUTCDate();

    // Daily: 7:00 AM AEST = 21:00 UTC (previous day)
    if (utcHour === 21 && utcMinute === 0) {
      console.log('[Report Scheduler] Triggering daily report...');
      sendReport(pool, 'daily');
    }

    // Weekly: Monday 7:00 AM AEST = Sunday 21:00 UTC
    if (utcDay === 0 && utcHour === 21 && utcMinute === 0) {
      console.log('[Report Scheduler] Triggering weekly report...');
      sendReport(pool, 'weekly');
    }

    // Monthly: 1st of month 7:00 AM AEST = last day of prev month 21:00 UTC or 1st at 21:00
    if (utcDate === 1 && utcHour === 21 && utcMinute === 0) {
      console.log('[Report Scheduler] Triggering monthly report...');
      sendReport(pool, 'monthly');
    }
  }, 60 * 1000); // Check every 60 seconds

  console.log('[Report Scheduler] Schedule:');
  console.log('  Daily   — 7:00 AM AEST (21:00 UTC)');
  console.log('  Weekly  — Monday 7:00 AM AEST');
  console.log('  Monthly — 1st of month 7:00 AM AEST');
}

module.exports = {
  generateReport,
  sendReport,
  startReportScheduler,
  sendCustomEmail,
  REPORT_RECIPIENTS,
};
