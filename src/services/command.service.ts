import { MessageBody } from "../interfaces.ts";
import { MattermostApiService } from "./mattermost.api.service.ts";
import { OpenAiApiService } from "./open-ai.api.service.ts";

export class CommandService {
  constructor(
    private mattermost: MattermostApiService,
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
        "Проанализируйте обсуждение проблемы в треде между несколькими участниками по рабочему вопросу. Опишите основные аргументы каждого участника и их позицию по данной проблеме. Оцените, какие аргументы наиболее весомы и какие могут быть отброшены. Определите, было ли достигнуто согласие или общее понимание проблемы. Исходя из анализа, предложите возможное решение проблемы и опишите, как оно может быть реализовано";
    }
    const { content, rootId, channelId } = await this.mattermost.getThreadInfo(
      postId,
      trigger,
    );

    if (!content) {
      return;
    }

    const stream = this.openAi.getAiAnswer(`${prompt}: "${content}"`);
    await this.mattermost.createThreadReplyStream(
      channelId,
      rootId,
      stream,
      prefix,
    );
  }
}
