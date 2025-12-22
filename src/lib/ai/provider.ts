import { flags } from "@/lib/flags";
import type { AiInput, AiResult, AiTask } from "@/lib/ai/types";
import { runEmbeddedTask } from "@/lib/ai/embedded";

export const runAiTask = async (
  task: AiTask,
  input?: AiInput
): Promise<AiResult> => {
  if (!flags.EMBEDDED_AI_ENABLED) {
    throw new Error("Embedded AI is disabled.");
  }

  return runEmbeddedTask(task, input);
};
