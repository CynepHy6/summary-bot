import sbd from "npm:sbd@1.0.19";
import { encode } from "npm:gpt-3-encoder@1.1.4";

const DEFAULT_MAX_TOKENS = 4096;

export function arrayChunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function chunkTextByTokenLimit(
  text: string,
  limit = DEFAULT_MAX_TOKENS
): string[] {
  const sentences = sbd.sentences(cleanText(text));

  const result: string[] = [];
  let chunk = "";

  for (const sentence of sentences) {
    const encoded = encode(chunk + sentence);
    if (encoded.length <= limit) {
      chunk += sentence + " ";
    } else {
      result.push(chunk.trim());
      chunk = sentence + " ";
    }
  }

  if (chunk.length > 0) {
    result.push(chunk.trim());
  }

  return result;
}

export function lastTextByTokenLimit(
  text: string,
  limit = DEFAULT_MAX_TOKENS
): string {
  const sentences = sbd.sentences(cleanText(text));

  const result: string[] = [];
  let chunk = "";
  for (let i = sentences.length - 1; i > 0; i--) {
    const sentence = sentences[i];
    const encoded = encode(sentence + chunk);

    if (encoded.length <= limit) {
      chunk = " " + sentence + chunk;
    } else {
      result.unshift(chunk.trim());
      return result.join("");
    }
  }

  if (chunk.length > 0) {
    result.unshift(chunk.trim());
  }
  return result.join("");
}

function cleanText(text: string): string {
  return text.replace(/\[.*?\]\(.*?\)/g, "");
}

export function isTextExpensiveCost(
  text: string,
  limit = DEFAULT_MAX_TOKENS
): boolean {
  const tokens = encode(text);
  return tokens.length > limit;
}
