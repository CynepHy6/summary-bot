import { splitText } from "../helpers.ts";
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
    const summaryCommands = ["plz!"];

    if (summaryCommands.includes(command)) {
      await this.runSummary(body.post_id, body.trigger_word);
    }
    return;
  }

  private async runSummary(postId: string, trigger: string) {
    const prefix = "#summary";
    const prompt = "tl;dr";

    const posts = await this.mattermostBot.getPostThread(
      postId,
      (post: Post) => !post.message.includes(trigger),
    );
    const { content, rootId, channelId } = await this.mattermostBot.getThreadInfo(posts);
    if (!content) {
      return;
    }
    await this.mattermostBot.cleanupThreadFromMe(posts);
    
    const cunkedContent = splitText(content);
    const streams = cunkedContent.map(
      (content) => this.openAi.getAiAnswer(`${prompt}: "${content}"`),
    )

    const result = await this.mattermostBot.createThreadReplyStream(
      channelId,
      rootId,
      streams,
      prefix,
    );
    if (result) {
      const {summary, replyId} = result
      // для очень длинного текста краткое содержание краткого содержания
      // TODO зарефакторить это
      const cunkedContent = splitText(summary);
      const streams = cunkedContent.map(
        (content) => this.openAi.getAiAnswer(`${prompt}: "${content}"`),
      )
      await this.mattermostBot.createThreadReplyStream(
        channelId,
        rootId,
        streams,
        prefix,
        replyId
      );
    }
  }
}
