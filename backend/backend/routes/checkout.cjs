/**
 * Stripe Checkout Routes for Client Fast Start
 *
 * Endpoints:
 *   POST /api/checkout/create-session  — Create Stripe Checkout session (subscription or one-time)
 *   POST /api/checkout/webhook         — Stripe webhook handler
 *   GET  /api/admin/subscriptions      — List all subscriptions (admin)
 *   POST /api/admin/subscriptions/:id/cancel — Cancel a subscription (admin)
 *   GET  /api/admin/subscriptions/:id  — Get subscription details (admin)
 */

let stripe = null;

function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

function registerCheckoutRoutes(handleRoute, pool, corsHeaders, authenticateToken, ADMIN_SECRET) {

  // POST /api/checkout/create-session
  handleRoute('POST', '/api/checkout/create-session', async (req, res, body) => {
    const stripeClient = getStripe();
    if (!stripeClient) {
      res.writeHead(503, corsHeaders);
      res.end(JSON.stringify({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' }));
      return;
    }

    const { plan, firstName, lastName, email, phone, coupon } = body;

    if (!email || !firstName || !lastName) {
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: 'firstName, lastName, and email are required.' }));
      return;
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://frontend-production-0e49.up.railway.app';

    try {
      // Find or create Stripe customer
      const existingCustomers = await stripeClient.customers.list({ email, limit: 1 });
      let customer;
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripeClient.customers.create({
          email,
          name: `${firstName} ${lastName}`,
          phone: phone || undefined,
          metadata: {
            source: 'ecos_checkout',
            plan_type: plan || 'weekly',
          },
        });
      }

      let sessionParams;

      if (plan === 'upfront') {
        // One-time $750 payment
        sessionParams = {
          customer: customer.id,
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Client Fast Start — 12-Week Upfront',
                description: 'Full access: 12 modules, 9 AI agents, live coaching, bonuses ($7,250 value)',
              },
              unit_amount: 75000, // $750.00
            },
            quantity: 1,
          }],
          success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${FRONTEND_URL}/checkout?canceled=true`,
          metadata: {
            plan_type: 'upfront',
            first_name: firstName,
            last_name: lastName,
          },
        };
      } else {
        // Weekly $87 subscription
        sessionParams = {
          customer: customer.id,
          mode: 'subscription',
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Client Fast Start — Weekly',
                description: 'Full access: 12 modules, 9 AI agents, live coaching, bonuses ($7,250 value)',
              },
              unit_amount: 8700, // $87.00
              recurring: {
                interval: 'week',
              },
            },
            quantity: 1,
          }],
          success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${FRONTEND_URL}/checkout?canceled=true`,
          metadata: {
            plan_type: 'weekly',
            first_name: firstName,
            last_name: lastName,
          },
        };
      }

      // Apply coupon if provided
      if (coupon) {
        try {
          const promoCodes = await stripeClient.promotionCodes.list({ code: coupon, active: true, limit: 1 });
          if (promoCodes.data.length > 0) {
            sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
          }
        } catch (e) {
          console.warn('Coupon lookup failed:', e.message);
        }
      }

      const session = await stripeClient.checkout.sessions.create(sessionParams);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ url: session.url, sessionId: session.id }));
    } catch (err) {
      console.error('Stripe checkout error:', err);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  // POST /api/checkout/webhook — Stripe Webhook
  handleRoute('POST', '/api/checkout/webhook', async (req, res, rawBody) => {
    const stripeClient = getStripe();
    if (!stripeClient) {
      res.writeHead(503, corsHeaders);
      res.end(JSON.stringify({ error: 'Stripe not configured' }));
      return;
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: 'Webhook secret not configured' }));
      return;
    }

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }

    console.log(`[Stripe Webhook] Event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const customerEmail = session.customer_details?.email || session.customer_email;
          const planType = session.metadata?.plan_type || 'weekly';

          if (customerEmail) {
            // Update user membership in DB
            await pool.query(
              `UPDATE users SET
                membership_tier = 'client_fast_start',
                stripe_customer_id = $1,
                stripe_subscription_id = $2,
                payment_plan = $3,
                updated_at = NOW()
              WHERE LOWER(email) = LOWER($4)`,
              [
                session.customer,
                session.subscription || null,
                planType,
                customerEmail,
              ]
            );
            console.log(`[Stripe] Activated Client Fast Start for ${customerEmail} (${planType})`);
          }
          break;
        }

        case 'customer.subscription.deleted':
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const customerId = subscription.customer;

          if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            await pool.query(
              `UPDATE users SET
                membership_tier = 'expired',
                updated_at = NOW()
              WHERE stripe_customer_id = $1`,
              [customerId]
            );
            console.log(`[Stripe] Membership expired for customer ${customerId}`);
          } else if (subscription.status === 'active') {
            await pool.query(
              `UPDATE users SET
                membership_tier = 'client_fast_start',
                updated_at = NOW()
              WHERE stripe_customer_id = $1`,
              [customerId]
            );
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          console.warn(`[Stripe] Payment failed for customer ${invoice.customer}`);
          break;
        }
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ received: true }));
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Webhook processing failed' }));
    }
  });

  // ============================================================
  // Admin Subscription Management
  // ============================================================

  // GET /api/admin/subscriptions — List all subscriptions
  handleRoute('GET', '/api/admin/subscriptions', async (req, res) => {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== ADMIN_SECRET) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const result = await pool.query(`
        SELECT
          u.id, u.email, u.first_name, u.last_name,
          u.membership_tier, u.payment_plan,
          u.stripe_customer_id, u.stripe_subscription_id,
          u.created_at, u.updated_at
        FROM users u
        WHERE u.stripe_customer_id IS NOT NULL
          OR u.membership_tier IN ('client_fast_start', 'trial', 'trial_expired')
        ORDER BY u.updated_at DESC
      `);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ subscriptions: result.rows, count: result.rowCount }));
    } catch (err) {
      console.error('Admin subscriptions error:', err);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  // GET /api/admin/subscriptions/:id — Get subscription detail from Stripe
  handleRoute('GET', '/api/admin/subscriptions/detail', async (req, res, _body, query) => {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== ADMIN_SECRET) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const stripeClient = getStripe();
    if (!stripeClient) {
      res.writeHead(503, corsHeaders);
      res.end(JSON.stringify({ error: 'Stripe not configured' }));
      return;
    }

    const subId = query.subscription_id;
    if (!subId) {
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: 'subscription_id required' }));
      return;
    }

    try {
      const subscription = await stripeClient.subscriptions.retrieve(subId);
      const customer = await stripeClient.customers.retrieve(subscription.customer);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          plan: subscription.items.data[0]?.plan,
        },
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
        },
      }));
    } catch (err) {
      console.error('Subscription detail error:', err);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  // POST /api/admin/subscriptions/cancel — Cancel a subscription
  handleRoute('POST', '/api/admin/subscriptions/cancel', async (req, res, body) => {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== ADMIN_SECRET) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const stripeClient = getStripe();
    if (!stripeClient) {
      res.writeHead(503, corsHeaders);
      res.end(JSON.stringify({ error: 'Stripe not configured' }));
      return;
    }

    const { subscription_id, immediate } = body;
    if (!subscription_id) {
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: 'subscription_id required' }));
      return;
    }

    try {
      let result;
      if (immediate) {
        result = await stripeClient.subscriptions.cancel(subscription_id);
      } else {
        result = await stripeClient.subscriptions.update(subscription_id, {
          cancel_at_period_end: true,
        });
      }

      // Update DB
      if (immediate) {
        await pool.query(
          `UPDATE users SET membership_tier = 'expired', updated_at = NOW() WHERE stripe_subscription_id = $1`,
          [subscription_id]
        );
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        subscription: {
          id: result.id,
          status: result.status,
          cancel_at_period_end: result.cancel_at_period_end,
        },
      }));
    } catch (err) {
      console.error('Cancel subscription error:', err);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

module.exports = { registerCheckoutRoutes };
