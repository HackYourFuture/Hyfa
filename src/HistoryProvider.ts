import { LLMMessage } from './LLMService';

export interface HistoryProvider {
  getHistory(slackID: string): Promise<LLMMessage[]>;
  pushHistory(slackID: string, message: LLMMessage): Promise<void>;
}

export class MemoryHistoryProvider implements HistoryProvider {
  private history = new Map<string, LLMMessage[]>();
  private readonly historySize: number;

  constructor(options: { historySize: number }) {
    this.historySize = options.historySize;
  }

  async getHistory(slackID: string): Promise<LLMMessage[]> {
    if (!this.history.has(slackID)) {
      this.history.set(slackID, []);
    }
    return this.history.get(slackID) ?? [];
  }

  async pushHistory(slackID: string, message: LLMMessage): Promise<void> {
    const messages = await this.getHistory(slackID);
    messages.push(message);

    // Keep only limited amount of message history.
    if (messages.length > this.historySize) {
      messages.splice(0, messages.length - this.historySize);
    }
  }
}
