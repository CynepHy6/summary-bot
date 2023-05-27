import { MessageBody, Post } from "../interfaces.ts";
import { MattermostBotApiService } from "./mattermost-bot.api.service.ts";
import { OpenAiApiService } from "./open-ai.api.service.ts";

export class CommandService {
  constructor(
    private mattermostBot: MattermostBotApiService,
    private openAi: OpenAiApiService,
  ) {}

  async handle(body: MessageBody) {
    const command = body.text.replace(body.trigger_word, "").trim();
    const summaryCommands = ["plz!", "analyze!"];

    if (summaryCommands.includes(command)) {
      await this.runSummary(command, body.post_id, body.trigger_word);
    }
    return;
  }

  private async runSummary(command: string, postId: string, trigger: string) {
    let prefix = "#summary";
    let prompt = "follow-up, Кратко содержание обсуждения";
    if (command === "analyze!") {
      prefix = "#analysis";
      prompt =
        "Проанализируй обсуждение проблемы в треде между несколькими участниками по рабочему вопросу. Опиши основные аргументы каждого участника и их позицию по данной проблеме. Оцени, какие аргументы наиболее весомы и какие могут быть отброшены. Определи, было ли достигнуто согласие или общее понимание проблемы. Исходя из анализа, предложи возможное решение проблемы и опиши, как оно может быть реализовано";
    }
    const posts = await this.mattermostBot.getPostThread(
      postId,
      (post: Post) => !post.message.includes(trigger),
    );
    const { content, rootId, channelId } = await this.mattermostBot.getThreadInfo(posts);
    if (!content) {
      return;
    }
    await this.mattermostBot.cleanupThreadFromMe(posts);

    const stream = this.openAi.getAiAnswer(`${prompt}: "${content}"`);
    await this.mattermostBot.createThreadReplyStream(
      channelId,
      rootId,
      stream,
      prefix,
    );
  }
}
