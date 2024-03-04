import { serve } from "./deps.ts";
import { MessageBody } from "./interfaces.ts";
import { CommandService } from "./services/command.service.ts";
import { MattermostBotApiService } from "./services/mattermost-bot.api.service.ts";
import { ChatAiApiService } from "./services/chat-ai.api.service.ts";

// https://vsegpt.ru/Docs/ModelsNew
const chatAiModel = "mistralai/mixtral-8x7b-instruct";
const chatAiMaxTokens = 32768;

const chatAiBaseUrl = Deno.env.get("CHAT_AI_BASE_URL")!;
const chatAiKey = Deno.env.get("CHAT_AI_KEY")!;

const port = +Deno.env.get("PORT")!;
const webhookToken = Deno.env.get("MM_BOT_WH_TOKEN");

const mattermostBot = new MattermostBotApiService(
  Deno.env.get("MM_BOT_TOKEN")!,
  Deno.env.get("MM_HOST")!
);
const chatAi = new ChatAiApiService(chatAiKey, chatAiBaseUrl, chatAiModel);
const commander = new CommandService(mattermostBot, chatAi, chatAiMaxTokens);

async function handler(req: Request): Promise<Response> {
  let body: MessageBody | null = null;
  try {
    body = await req.json();
  } catch {
    console.error("json parse error", await req.text());
  }
  if (!body) {
    console.error("invalid body");
    return new Response(null, { status: 401 });
  }
  if (body?.token !== webhookToken) {
    console.error("invalid webhook token");
    return new Response(null, { status: 401 });
  }

  await commander.handle(body);

  return new Response(null);
}

serve(handler, { port });
