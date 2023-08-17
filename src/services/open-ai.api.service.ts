import { getCompletionStream } from "../deps.ts";

export class OpenAiApiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *getStream(prompt: string): AsyncGenerator<string> {
    const stream = getCompletionStream({
      apiKey: this.apiKey,
      messages: [
        {
          "role": "system",
          "content":
            "You are assistant who replies with a clear and concise summary to every message. You answer only in Russian",
        },
        { "role": "user", "content": prompt },
      ],
    });

    for await (const token of stream) {
      yield token;
    }
  }
}
