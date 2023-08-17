import {
  chunkTextByTokenLimit,
  isTextExpensiveCost,
  lastTextByTokenLimit,
} from "../command.helper.ts";
import { MessageBody, Post } from "../interfaces.ts";
import { MattermostBotApiService } from "./mattermost-bot.api.service.ts";
import { OpenAiApiService } from "./open-ai.api.service.ts";

enum Command {
  Plz = "plz!",
  Last = "last!",
  Prompt = "prompt:",
}

export class CommandService {
  constructor(
    private mattermostBot: MattermostBotApiService,
    private openAi: OpenAiApiService,
  ) {}

  async handle(body: MessageBody) {
    const command = body.text.replace(body.trigger_word, "").trim();

    if (command === Command.Plz) {
      await this.createThreadSummary(body.post_id, body.trigger_word);
    }
    if (command === Command.Last) {
      await this.createThreadSummaryLast(body.post_id, body.trigger_word);
    }
    if (command.startsWith(Command.Prompt)) {
      await this.createPromptReply(body.post_id, command);
    }

    return;
  }
  private async createPromptReply(postId: string, text: string): Promise<void> {
    const prompt = text.replace(Command.Prompt, "");
    const post = await this.mattermostBot.getPost(postId);
    const channelId = post.channel_id;
    const rootId = post.root_id;

    if (isTextExpensiveCost(prompt)) {
      return;
    }
    const prefix = "```\n" + prompt + "\n```\n";
    const reply = await this.mattermostBot.createThreadReply(
      channelId,
      rootId,
      prefix,
    );
    const stream = this.openAi.getStream(prompt);
    await this.mattermostBot.createThreadReplyStream(
      channelId,
      rootId,
      [stream],
      prefix,
      reply.id,
    );
  }

  private async createThreadSummary(postId: string, trigger: string) {
    const prefix = "#summary: ";
    const prompt = (content: string) => `${content}\n TLDR:`;

    const posts = await this.mattermostBot.getPostThread(
      postId,
      (post: Post) => !post.message.includes(trigger),
    );
    const { content, rootId, channelId } = await this.mattermostBot
      .getThreadInfo(posts);
    if (!content) {
      return;
    }
    await this.mattermostBot.cleanupThreadFromMe(posts, prefix);

    const chunkedContent = chunkTextByTokenLimit(content);
    const streams = chunkedContent.map(
      (content) => this.openAi.getStream(prompt(content)),
    );

    const result = await this.mattermostBot.createThreadReplyStream(
      channelId,
      rootId,
      streams,
      prefix,
    );
    if (result) {
      const { summary, replyId } = result;
      // для очень длинного текста краткое содержание краткого содержания
      // TODO зарефакторить это
      const chunkedContent = chunkTextByTokenLimit(summary);
      const streams = chunkedContent.map(
        (content) => this.openAi.getStream(prompt(content)),
      );
      await this.mattermostBot.createThreadReplyStream(
        channelId,
        rootId,
        streams,
        prefix,
        replyId,
      );
    }
  }
  private async createThreadSummaryLast(postId: string, trigger: string) {
    const prefix = "#summary: ";
    const prompt = (content: string) => `${content}\n TLDR:`;

    const posts = await this.mattermostBot.getPostThread(
      postId,
      (post: Post) => !post.message.includes(trigger),
    );
    const { content, rootId, channelId } = await this.mattermostBot
      .getThreadInfo(posts);
    if (!content) {
      return;
    }
    await this.mattermostBot.cleanupThreadFromMe(posts, prefix);

    const lastContent = lastTextByTokenLimit(content);
    const stream = this.openAi.getStream(prompt(lastContent));

    await this.mattermostBot.createThreadReplyStream(
      channelId,
      rootId,
      [stream],
      prefix,
    );
  }
}
