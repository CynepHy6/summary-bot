import { TextLineStream } from "../deps.ts";
import { Message } from "../interfaces.ts";

export class ChatAiApiService {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private model: string
  ) {}

  async *getStream(prompt: string): AsyncGenerator<string> {
    const stream = this.getCompletionStream({
      messages: [
        {
          role: "system",
          content: "answer only in Russian and text format",
        },
        { role: "user", content: prompt },
      ],
    });

    for await (const token of stream) {
      yield token;
    }
  }

  // копипаста из https://github.com/lideming/openai-chat-stream
  private async *getCompletionStream(options: {
    messages: Message[];
    params?: {
      temperature?: number;
      top_p?: number;
      stop?: string | string[];
      max_tokens?: number;
      presence_penalty?: number;
      frequency_penalty?: number;
      logit_bias?: number;
      user?: string;
    };
    onFinished?: (reason: string) => void;
  }) {
    const resp = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + this.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        stream: true,
        ...options.params,
      }),
    });

    if (!resp.ok) {
      const json = await resp.json();
      if (json.error) {
        throw new Error(`API error ${json.error.code}`);
      } else {
        console.error(json);
        throw new Error(`Unknown API response`);
      }
    }

    for await (const json of this.readStreamAsEvents(resp.body!)) {
      const { delta, finish_reason } = json.choices[0];
      const { content } = delta;
      if (finish_reason) {
        options.onFinished?.(finish_reason);
        break;
      }
      if (content) {
        yield content as string;
      }
    }
  }

  private async *readStreamAsEvents(stream: ReadableStream<Uint8Array>) {
    for await (const text of this.readStreamAsTextLines(stream)) {
      if (!text) continue;
      if (text === "data: [DONE]") break;
      if (!text.startsWith("data: "))
        throw new Error("Unexpected text: " + text);
      const json = JSON.parse(text.slice(6));
      yield json;
    }
  }

  private async *readStreamAsTextLines(stream: ReadableStream<Uint8Array>) {
    const linesReader = stream
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .getReader();
    while (true) {
      const { value, done } = await linesReader.read();
      if (done) break;
      yield value;
    }
  }
}
