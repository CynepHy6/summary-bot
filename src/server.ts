import { serve } from "./deps.ts";
import { MessageBody } from "./interfaces.ts";
import { CommandService } from "./services/command.service.ts";
import { MattermostBotApiService } from "./services/mattermost-bot.api.service.ts";
import { OpenAiApiService } from "./services/open-ai.api.service.ts";

const port = +Deno.env.get("PORT")!;
const webhookToken = Deno.env.get("MM_BOT_WH_TOKEN");

const mattermostBot = new MattermostBotApiService(
  Deno.env.get("MM_BOT_TOKEN")!,
  Deno.env.get("MM_HOST")!,
);
const openAi = new OpenAiApiService(Deno.env.get("OPEN_AI_KEY")!);
const commander = new CommandService(mattermostBot, openAi);

async function handler(req: Request): Promise<Response> {
  const body: MessageBody = await req.json();
  if (body?.token !== webhookToken) {
    console.error("invalid webhook token");
    return new Response(null, { status: 401 });
  }

  await commander.handle(body);

  return new Response(null);
}

serve(handler, { port });
