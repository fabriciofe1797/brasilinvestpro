import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

// Mapeamento de Price IDs do Stripe para planos internos
// ATENCAO: Substituir pelos Price IDs reais do Stripe Dashboard
const PRICE_TO_PLAN: Record<string, string> = {
  // Exemplo: 'price_1NqQ...': 'starter',
  // Os keys devem ser os Price IDs reais criados no Stripe
}

// Ordem dos planos para determinar from_plan
const PLAN_ORDER = ['free', 'starter', 'pro', 'master', 'elite']

function getPlanFromPriceId(priceId: string): string {
  if (PRICE_TO_PLAN[priceId]) return PRICE_TO_PLAN[priceId]
  // Fallback: tentar extrair do price ID (ex: price_starter_monthly -> starter)
  const match = priceId.match(/_(starter|pro|master|elite)_/i)
  return match ? match[1].toLowerCase() : 'starter'
}

async function getCurrentPlan(supabaseClient: any, userId: string): Promise<string> {
  const { data } = await supabaseClient
    .from('licenses')
    .select('plan_type')
    .eq('user_id', userId)
    .single()
  return data?.plan_type || 'free'
}

serve(async (req) => {
  // CORS headers para Stripe
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, stripe-signature',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // VERIFICACAO OBRIGATORIA: STRIPE_WEBHOOK_SECRET deve estar configurado
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!endpointSecret) {
    console.error('CRITICAL: STRIPE_WEBHOOK_SECRET not configured. Rejecting webhook.')
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.text()

    // Verificar assinatura criptografica do Stripe
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret,
      undefined,
      cryptoProvider
    )

    const supabaseClient = createClient(
      Deno.env.get('SB_URL') ?? '',
      Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''
    )

    // ============================================================
    // CHECKOUT.SESSION.COMPLETED — Pagamento inicial bem-sucedido
    // ============================================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.client_reference_id || session.metadata?.user_id
      const customerEmail = session.customer_details?.email

      if (!userId) {
        console.error('No userId in checkout session (client_reference_id or metadata.user_id)')
        return new Response(JSON.stringify({ error: 'No userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Determinar plano via metadata ou price ID
      let plan = session.metadata?.plan || 'starter'
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
      const priceId = lineItems.data[0]?.price?.id
      if (priceId && PRICE_TO_PLAN[priceId]) {
        plan = PRICE_TO_PLAN[priceId]
      }

      // Validar plano
      if (!PLAN_ORDER.includes(plan)) {
        plan = 'starter'
      }

      const startDate = new Date().toISOString()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)

      // Obter plano atual para registro de mudanca
      const currentPlan = await getCurrentPlan(supabaseClient, userId)

      const { error: licenseError } = await supabaseClient
        .from('licenses')
        .upsert({
          user_id: userId,
          plan_type: plan,
          start_date: startDate,
          end_date: endDate.toISOString(),
          payment_status: 'active',
          last_payment_date: startDate,
          auto_renew_flag: true,
        })

      if (licenseError) throw licenseError

      // Registrar mudanca de plano
      await supabaseClient.from('plan_changes').insert({
        user_id: userId,
        from_plan: currentPlan,
        to_plan: plan,
        reason: 'stripe_checkout_completed',
      })

      console.log(`License updated: user ${userId} -> ${plan} (from ${currentPlan})`)
    }

    // ============================================================
    // CUSTOMER.SUBSCRIPTION.UPDATED — Renovacao ou mudanca de plano
    // ============================================================
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      const userId = subscription.metadata?.user_id
      const status = subscription.status

      if (!userId) {
        console.error('No userId in subscription metadata')
        return new Response(JSON.stringify({ ok: true, note: 'no_user_id' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const currentPlan = await getCurrentPlan(supabaseClient, userId)
      const priceId = subscription.items?.data?.[0]?.price?.id
      let plan = currentPlan
      if (priceId && PRICE_TO_PLAN[priceId]) {
        plan = PRICE_TO_PLAN[priceId]
      }

      const paymentStatus = status === 'active' ? 'active' : status === 'past_due' ? 'past_due' : 'active'
      const endDate = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null

      const { error } = await supabaseClient
        .from('licenses')
        .upsert({
          user_id: userId,
          plan_type: plan,
          end_date: endDate,
          payment_status: paymentStatus,
          last_payment_date: new Date().toISOString(),
          auto_renew_flag: !subscription.cancel_at_period_end,
        })

      if (error) throw error

      if (plan !== currentPlan) {
        await supabaseClient.from('plan_changes').insert({
          user_id: userId,
          from_plan: currentPlan,
          to_plan: plan,
          reason: 'stripe_subscription_updated',
        })
      }

      console.log(`Subscription updated: user ${userId} -> ${plan} (${paymentStatus})`)
    }

    // ============================================================
    // CUSTOMER.SUBSCRIPTION.DELETED — Cancelamento
    // ============================================================
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const userId = subscription.metadata?.user_id

      if (!userId) {
        return new Response(JSON.stringify({ ok: true, note: 'no_user_id' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const currentPlan = await getCurrentPlan(supabaseClient, userId)

      // Downgrade para free com grace period de 3 dias
      const graceEnd = new Date()
      graceEnd.setDate(graceEnd.getDate() + 3)

      const { error } = await supabaseClient
        .from('licenses')
        .upsert({
          user_id: userId,
          plan_type: 'free',
          end_date: graceEnd.toISOString(),
          payment_status: 'expired',
          auto_renew_flag: false,
        })

      if (error) throw error

      await supabaseClient.from('plan_changes').insert({
        user_id: userId,
        from_plan: currentPlan,
        to_plan: 'free',
        reason: 'stripe_subscription_cancelled',
      })

      console.log(`Subscription cancelled: user ${userId} -> free (grace until ${graceEnd.toISOString()})`)
    }

    // ============================================================
    // INVOICE.PAYMENT_FAILED — Falha no pagamento
    // ============================================================
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      const userId = invoice.metadata?.user_id || invoice.customer_email

      if (userId) {
        await supabaseClient
          .from('licenses')
          .update({ payment_status: 'past_due' })
          .eq('user_id', userId)

        console.log(`Payment failed for user ${userId}`)
      }
    }

    // ============================================================
    // Resposta de sucesso para todos os eventos
    // ============================================================
    return new Response(JSON.stringify({ ok: true, event: event.type }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
