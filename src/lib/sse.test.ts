import { describe, expect, it } from 'vitest';

import { createSseParser, type ChatEvent } from './sse';

describe('createSseParser', () => {
  it('junta eventos cortados entre pedaços da rede', () => {
    const events: ChatEvent[] = [];
    const parse = createSseParser((e) => events.push(e));
    parse('data: {"type":"status","text":"Consultando"}\n\ndata: {"type":"te');
    parse('xt","text":"Olá"}\n\n');
    parse('data: {"type":"done"}\r\n\r\n');
    expect(events).toEqual([
      { type: 'status', text: 'Consultando' },
      { type: 'text', text: 'Olá' },
      { type: 'done' },
    ]);
  });

  it('ignora linhas que não são dados e JSON quebrado', () => {
    const events: ChatEvent[] = [];
    const parse = createSseParser((e) => events.push(e));
    parse(': comentário\n\ndata: {quebrado}\n\ndata: {"type":"done"}\n\n');
    expect(events).toEqual([{ type: 'done' }]);
  });
});
