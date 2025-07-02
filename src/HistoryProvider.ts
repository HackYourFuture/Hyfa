import { LLMMessage } from './LLMService';

export interface HistoryProvider {
  getHistory(slackID: string): Promise<LLMMessage[]>;
  pushHistory(slackID: string, messages: LLMMessage[]): Promise<void>;
}

export class MemoryHistoryProvider implements HistoryProvider {
  private history = new Map<string, LLMMessage[]>();
  private readonly historySize: number;

  constructor(options: { historySize: number }) {
    this.historySize = options.historySize;
  }

  async getHistory(slackID: string): Promise<LLMMessage[]> {
    const historyArray = this.history.get(slackID) ?? [];
    return [...historyArray];
  }

  async pushHistory(slackID: string, messages: LLMMessage[]): Promise<void> {
    const history = await this.getHistory(slackID);
    const updatedHistory = history.concat(...messages).slice(-this.historySize);
    this.history.set(slackID, updatedHistory);
  }
}
