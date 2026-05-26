// Career Hub AI gateway with weekly credit gating.
// Primary provider: Anthropic (Claude). Falls back to Lovable AI Gateway if Anthropic key missing.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Tool =
  | "resume_review"
  | "linkedin"
  | "personal_brand"
  | "outreach"
  | "interview_prep"
  | "job_strategy";

type Tier = "sonnet" | "haiku";

// Claude model ids (Anthropic Messages API).
const CLAUDE_MODELS: Record<Tier, string> = {
  sonnet: "claude-sonnet-4-5",
  haiku: "claude-haiku-4-5",
};

// Fallback Lovable AI model per tier (used only if ANTHROPIC_API_KEY is missing).
const FALLBACK_MODELS: Record<Tier, string> = {
  sonnet: "google/gemini-2.5-pro",
  haiku: "google/gemini-3-flash-preview",
};

const TOOL_PROMPTS: Record<
  Tool,
  { system: string; tier: Tier; maxTokens: number; title: (i: any) => string }
> = {
  resume_review: {
    tier: "sonnet",
    maxTokens: 4000,
    system:
      "You are an expert career coach for college students and early-career professionals. Review the user's resume and produce: (1) a Strengths section, (2) a Weaknesses / Red Flags section, (3) line-by-line Suggested Rewrites in a markdown table when applicable, (4) ATS keyword recommendations tailored to the target role if provided, (5) a final Polished Summary statement they can copy. Use clear markdown headings and bullet points. Be specific, kind, and actionable. Avoid generic advice.",
    title: (i) => `Resume review${i.targetRole ? ` — ${i.targetRole}` : ""}`,
  },
  linkedin: {
    tier: "haiku",
    maxTokens: 3000,
    system:
      "You are a LinkedIn profile optimization expert. Given the user's current LinkedIn content (headline, about, experience, or a full PDF export), produce: (1) 3 rewritten headline options, (2) a rewritten About section using a hook + value + proof + CTA structure, (3) up to 3 rewritten experience bullets with stronger action verbs and quantification, (4) keyword/skill suggestions, (5) a profile checklist (photo, banner, featured, etc.). Output in well-formatted markdown.",
    title: () => "LinkedIn optimization",
  },
  personal_brand: {
    tier: "haiku",
    maxTokens: 2500,
    system:
      "You are a personal branding strategist. Given the user's goals, audience, strengths, and field, produce: (1) a one-sentence personal brand statement, (2) 3 short-bio variants (Twitter/X 160 chars, LinkedIn headline ~120 chars, conference bio ~80 words), (3) 5 content pillars they could post about, (4) a values + voice cheat-sheet. Format in markdown.",
    title: (i) => `Personal brand${i.field ? ` — ${i.field}` : ""}`,
  },
  outreach: {
    tier: "haiku",
    maxTokens: 2000,
    system:
      "You are an expert at recruiter and alumni outreach for students. Given the contact context and the user's ask, produce 3 distinct cold-message variants (LinkedIn 300 chars, email 100-150 words, follow-up 60-80 words). Each variant should have a different angle (warm/curious, direct/value-first, mutual-connection). End with a 'Tips for this contact' section. Use markdown.",
    title: (i) => `Outreach${i.contactName ? ` — ${i.contactName}` : ""}`,
  },
  interview_prep: {
    tier: "sonnet",
    maxTokens: 4000,
    system:
      "You are an interview-prep coach. Given a role, company (optional), and job description, produce: (1) 8 likely behavioral questions with one-line guidance, (2) 5 role-specific technical/case questions, (3) a STAR-formatted draft answer template the user can customize for one of the behavioral questions using their background if provided, (4) 5 sharp questions the user should ask the interviewer. Format as markdown with clear headings.",
    title: (i) => `Interview prep${i.company ? ` — ${i.company}` : i.role ? ` — ${i.role}` : ""}`,
  },
  job_strategy: {
    tier: "haiku",
    maxTokens: 3000,
    system:
      "You are a job-search strategist for students and early-career professionals. Given goals, timeline, current status, and target roles, produce: (1) a 30/60/90-day action plan with weekly checkpoints, (2) a target-company list framework (criteria + how to source), (3) weekly application/outreach targets, (4) a tracking template (table with columns), (5) common pitfalls to avoid. Markdown formatted.",
    title: (i) => `Job strategy${i.targetRole ? ` — ${i.targetRole}` : ""}`,
  },
};

function buildUserPrompt(_tool: Tool, input: Record<string, any>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(input)) {
    if (v == null || v === "") continue;
    const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    parts.push(`### ${label}\n${String(v)}`);
  }
  return parts.join("\n\n") || "(no input provided)";
}

function mondayUtc(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  userPrompt: string,
  maxTokens: number,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!resp.ok) {
    return { ok: false, status: resp.status, body: await resp.text() };
  }
  const data = await resp.json();
  const text = (data?.content ?? [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
  return { ok: true, text };
}

async function callLovable(
  apiKey: string,
  model: string,
  system: string,
  userPrompt: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) return { ok: false, status: resp.status, body: await resp.text() };
  const data = await resp.json();
  const text = (data?.choices?.[0]?.message?.content ?? "").trim();
  return { ok: true, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!ANTHROPIC_API_KEY && !LOVABLE_API_KEY) {
      return json({ error: "No AI provider configured" }, 500);
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => null);
    const tool = body?.tool as Tool;
    const input = (body?.input ?? {}) as Record<string, any>;
    if (!tool || !TOOL_PROMPTS[tool]) return json({ error: "Invalid tool" }, 400);
    if (typeof input !== "object") return json({ error: "Invalid input" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const week = mondayUtc();

    // Weekly credit gate (this IS our rate limit)
    const { count: usedCount, error: countErr } = await admin
      .from("career_credit_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("week_start", week);
    if (countErr) return json({ error: "Failed to read credits" }, 500);

    let consumedGrantId: string | null = null;
    const weeklyAvailable = (usedCount ?? 0) < 1;

    if (!weeklyAvailable) {
      const { data: grant } = await admin
        .from("career_credit_grants")
        .select("id, remaining, expires_at")
        .eq("user_id", userId)
        .gt("remaining", 0)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!grant) {
        return json(
          { error: "no_credits", message: "You've used your AI credit for this week. Resets Monday." },
          402,
        );
      }
      consumedGrantId = grant.id;
      const { error: decErr } = await admin
        .from("career_credit_grants")
        .update({ remaining: grant.remaining - 1 })
        .eq("id", grant.id)
        .gt("remaining", 0);
      if (decErr) return json({ error: "Failed to consume grant" }, 500);
    } else {
      const { error: insErr } = await admin.from("career_credit_usage").insert({
        user_id: userId,
        tool,
        week_start: week,
      });
      if (insErr) return json({ error: "Failed to reserve credit" }, 500);
    }

    const cfg = TOOL_PROMPTS[tool];
    const userPrompt = buildUserPrompt(tool, input);

    let usedModel = "";
    let output = "";

    if (ANTHROPIC_API_KEY) {
      usedModel = CLAUDE_MODELS[cfg.tier];
      const r = await callClaude(ANTHROPIC_API_KEY, usedModel, cfg.system, userPrompt, cfg.maxTokens);
      if (!r.ok) {
        console.error("Anthropic error", r.status, r.body);
        // Try Lovable AI fallback before refunding
        if (LOVABLE_API_KEY && r.status >= 500) {
          usedModel = FALLBACK_MODELS[cfg.tier];
          const fr = await callLovable(LOVABLE_API_KEY, usedModel, cfg.system, userPrompt);
          if (fr.ok) {
            output = fr.text;
          } else {
            await refund(admin, userId, week, consumedGrantId);
            return mapProviderError(r.status);
          }
        } else {
          await refund(admin, userId, week, consumedGrantId);
          return mapProviderError(r.status);
        }
      } else {
        output = r.text;
      }
    } else if (LOVABLE_API_KEY) {
      usedModel = FALLBACK_MODELS[cfg.tier];
      const r = await callLovable(LOVABLE_API_KEY, usedModel, cfg.system, userPrompt);
      if (!r.ok) {
        await refund(admin, userId, week, consumedGrantId);
        return mapProviderError(r.status);
      }
      output = r.text;
    }

    if (!output) {
      await refund(admin, userId, week, consumedGrantId);
      return json({ error: "empty_response" }, 500);
    }

    const { data: run, error: runErr } = await admin
      .from("career_ai_runs")
      .insert({
        user_id: userId,
        tool,
        title: cfg.title(input).slice(0, 120),
        input,
        output,
        model: usedModel,
      })
      .select("id, created_at, title")
      .single();
    if (runErr) console.error("run insert error", runErr);

    return json({
      ok: true,
      run_id: run?.id,
      title: run?.title,
      output,
      model: usedModel,
      used_grant: !!consumedGrantId,
    });
  } catch (e) {
    console.error("career-ai error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function mapProviderError(status: number) {
  if (status === 429) return json({ error: "rate_limited", message: "AI is busy, try again in a minute." }, 429);
  if (status === 401 || status === 403) return json({ error: "ai_auth", message: "AI provider auth error. Contact an admin." }, 500);
  if (status === 402) return json({ error: "payment_required", message: "AI credits depleted. Contact an admin." }, 402);
  return json({ error: "ai_error" }, 500);
}

async function refund(admin: any, userId: string, week: string, grantId: string | null) {
  try {
    if (grantId) {
      const { data: g } = await admin
        .from("career_credit_grants")
        .select("remaining")
        .eq("id", grantId)
        .maybeSingle();
      if (g) {
        await admin
          .from("career_credit_grants")
          .update({ remaining: g.remaining + 1 })
          .eq("id", grantId);
      }
    } else {
      await admin
        .from("career_credit_usage")
        .delete()
        .eq("user_id", userId)
        .eq("week_start", week);
    }
  } catch (e) {
    console.error("refund failed", e);
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
