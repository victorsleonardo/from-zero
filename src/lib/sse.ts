export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'status'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

/**
 * Lê eventos "data: {...}" separados por linha em branco (Server-Sent Events).
 * Os pedaços da rede podem cortar um evento no meio; o resto fica guardado
 * até o próximo pedaço.
 */
export function createSseParser(onEvent: (event: ChatEvent) => void) {
  let buffer = '';
  return (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, '\n');
    let index = buffer.indexOf('\n\n');
    while (index !== -1) {
      const raw = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const data = raw
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (data) {
        try {
          onEvent(JSON.parse(data) as ChatEvent);
        } catch {
          // evento malformado: ignora
        }
      }
      index = buffer.indexOf('\n\n');
    }
  };
}
