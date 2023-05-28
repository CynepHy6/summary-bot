export function arrayChunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
}
  
import sbd from 'npm:sbd@1.0.19';

export function splitText(text: string, limit = 2000): string[] {
  const sentences = sbd.sentences(text); // разделим текст на предложения

  const result: string[] = [];
  let chunk = '';

  for (const sentence of sentences) {
    if (chunk.length + sentence.length <= limit) {
      chunk += sentence + ' '; // добавляем предложение в текущий кусок
    } else {
      result.push(chunk.trim()); // добавляем текущий кусок в результат и начинаем новый
      chunk = sentence + ' ';
    }
  }

  if (chunk.length > 0){ // добавляем последний кусок в результат (если он есть)
    result.push(chunk.trim());
  }

  return result;
}