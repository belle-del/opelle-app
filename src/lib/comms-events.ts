import { dispatchComms } from "@/lib/kernel";

export async function emitCommsEvent(params: {
  event: string;
  workspaceId: string;
  clientId: string;
  context: Record<string, unknown>;
  templateId?: string;
  body?: string;
}) {
  // Fire-and-forget — never block the calling route
  dispatchComms({
    event: params.event,
    workspace_id: params.workspaceId,
    client_id: params.clientId,
    context: params.context,
    template_id: params.templateId,
    body: params.body,
  }).catch((err) => {
    console.error(`Failed to dispatch comms event ${params.event}:`, err);
  });
}
