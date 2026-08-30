import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Autenticacao obrigatoria: apenas o scheduler (ou operador com CRON_SECRET) pode executar
  // esta funcao DESTRUTIVA (downgrade de planos). Sem isso qualquer pessoa na internet poderia
  // derrubar todos os planos pagos para "free" (OWASP A07).
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "");
  if (!cronSecret || bearer !== cronSecret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(url, key);
  const now = new Date();
  const today = now.toISOString();
  const { data: licenses, error } = await client.from("licenses").select("*");
  if (error) return new Response(JSON.stringify({ ok: false, error: "license_query_failed" }), { status: 500 });

  const msDay = 24 * 60 * 60 * 1000;
  const toQueue: Array<{ user_id: string; template: string; metadata: Record<string, any> }> = [];

  for (const lic of licenses ?? []) {
    const end = lic.end_date ? new Date(lic.end_date).getTime() : null;
    const daysLeft = end ? Math.ceil((end - now.getTime()) / msDay) : null;

    if (end) {
      if (daysLeft === 7 || daysLeft === 5 || daysLeft === 3 || daysLeft === 1) {
        toQueue.push({ user_id: lic.user_id, template: "expiry_reminder", metadata: { days_left: daysLeft, plan: lic.plan_type } });
      }
      if (now.getTime() > end) {
        const grace = end + 3 * msDay;
        if (now.getTime() <= grace) {
          if (lic.payment_status !== "past_due") {
            await client.from("licenses").update({ payment_status: "past_due" }).eq("user_id", lic.user_id);
          }
        } else {
          if (lic.plan_type !== "free") {
            await client.from("plan_changes").insert({ user_id: lic.user_id, from_plan: lic.plan_type, to_plan: "free", reason: "expired" });
          }
          await client.from("licenses").update({ plan_type: "free", payment_status: "expired" }).eq("user_id", lic.user_id);
        }
      }
    }
  }

  if (toQueue.length > 0) {
    for (const m of toQueue) {
      await client.from("email_queue").insert({ user_id: m.user_id, template: m.template, metadata: m.metadata });
    }
  }

  return new Response(JSON.stringify({ ok: true, queued: toQueue.length, date: today }), { headers: { "Content-Type": "application/json" }, status: 200 });
});
