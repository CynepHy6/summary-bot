import { config, serve } from "./deps.ts";
import { MattermostApiService } from "./services/mattermost.api.service.ts";
import { OpenAiApiService } from "./services/open-ai.api.service.ts";

config({ path: "../.env", export: true });

const port = +Deno.env.get("PORT")!;
const webhookToken = Deno.env.get("MM_BOT_WH_TOKEN");

const mattermost = new MattermostApiService(
  Deno.env.get("MM_BOT_TOKEN")!,
  Deno.env.get("MM_HOST")!,
);
const openAi = new OpenAiApiService(Deno.env.get("OPEN_AI_KEY")!);

async function handler(req: Request): Promise<Response> {
  const body = await req.json();
  if (body?.token !== webhookToken) {
    console.error("invalid webhook token");
    return new Response(null, { status: 401 });
  }

  const command = body.text.replace(body.trigger_word, "").trim();
  await runCommand(command, body.post_id, body.trigger_word);

  return new Response(null);
}

serve(handler, { port });

async function runCommand(command: string, postId: string, trigger: string) {
  const commands = ["plz!", "analyze!"];
  if (!commands.includes(command)) {
    return;
  }
  let prompt = "follow-up, Кратко содержание обсуждения";
  if (command === "analyze!") {
    prompt =
      "Проанализируйте обсуждение проблемы в треде между несколькими участниками по рабочему вопросу. Опишите основные аргументы каждого участника и их позицию по данной проблеме. Оцените, какие аргументы наиболее весомы и какие могут быть отброшены. Определите, было ли достигнуто согласие или общее понимание проблемы. Исходя из анализа, предложите возможное решение проблемы и опишите, как оно может быть реализовано";
  }
  const { content, rootId, channelId } = await mattermost.getThreadInfo(
    postId,
    trigger,
  );

  if (!content) {
    return;
  }

  const stream = openAi.getAiAnswer(`${prompt}: "${content}"`);
  await mattermost.createThreadReplyStream(channelId, rootId, stream);
}
