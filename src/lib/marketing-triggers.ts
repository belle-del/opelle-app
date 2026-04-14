import { listActiveAutomationsByTrigger, createMessageLog } from "@/lib/db/marketing";
import { emitCommsEvent } from "@/lib/comms-events";

/**
 * Fire all active automation rules for a given trigger.
 * Called from service completion, appointment booking, and cron.
 * Fire-and-forget — never blocks the calling request.
 */
export async function fireAutomationsForTrigger(params: {
  workspaceId: string;
  trigger: string;
  clientId: string;
  context: Record<string, unknown>;
}): Promise<void> {
  try {
    const rules = await listActiveAutomationsByTrigger(params.workspaceId, params.trigger);
    if (rules.length === 0) return;

    for (const rule of rules) {
      // Check conditions (simple key-value match for MVP)
      if (!evaluateConditions(rule.conditions, params.context)) continue;

      // Fire the automation (respects delay_minutes = 0 for now, future: queue delayed sends)
      try {
        emitCommsEvent({
          event: `automation.${params.trigger}`,
          workspaceId: params.workspaceId,
          clientId: params.clientId,
          context: { ...params.context, automationName: rule.name },
          templateId: rule.templateId || undefined,
        });

        await createMessageLog({
          workspaceId: params.workspaceId,
          clientId: params.clientId,
          templateId: rule.templateId || undefined,
          source: "automation",
          channel: "in_app",
          metadata: { automationId: rule.id, automationName: rule.name, trigger: params.trigger },
        });
      } catch (err) {
        console.error(`[marketing-triggers] Failed to fire automation ${rule.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[marketing-triggers] fireAutomationsForTrigger error:", err);
  }
}

/**
 * Simple condition evaluator — checks if all condition key-value pairs
 * match the context. Returns true if no conditions set.
 */
function evaluateConditions(
  conditions: Record<string, unknown>,
  context: Record<string, unknown>,
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  for (const [key, value] of Object.entries(conditions)) {
    if (context[key] !== value) return false;
  }
  return true;
}
