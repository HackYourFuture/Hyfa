import { App } from '@slack/bolt';
import { GenericMessageEvent, ConversationsHistoryResponse } from '@slack/web-api';

export type SlackMessage = NonNullable<ConversationsHistoryResponse['messages']>;
export type SlackMessageEvent = GenericMessageEvent;
export type MessageHandler = (message: SlackMessageEvent) => void;

export interface SlackClient {
  start(): Promise<void>;
  onDirectMessage(handler: MessageHandler): void;
  onGroupMessageTag(handler: MessageHandler): void;
  getChannelHistory(channelId: string, limit: number): Promise<SlackMessage[]>;
  getThreadMessages(channelId: string, threadTs: string, limit?: number): Promise<SlackMessage[]>;
  sendMessage(channelId: string, text: string, threadTs?: string | undefined): Promise<void>;
  sendTypingIndicator(channelId: string): Promise<string>;
  deleteTypingIndicator(channelId: string, ts: string): Promise<void>;
}

export class DefaultSlackClient {
  private readonly app: App;
  private botUserId: string | undefined;
  constructor(options: { token: string; signingSecret: string; appToken: string }) {
    this.app = new App({
      socketMode: true,
      token: options.token,
      signingSecret: options.signingSecret,
      appToken: options.appToken,
    });
  }

  async start(): Promise<void> {
    const authResult = await this.app.client.auth.test();
    this.botUserId = authResult.user_id;
    await this.app.start();
  }

  onDirectMessage(handler: MessageHandler): void {
    this.app.message(async ({ message }) => {
      const slackMessage = message as GenericMessageEvent;

      if (
        slackMessage.subtype === 'bot_message' ||
        slackMessage.subtype === 'message_changed' ||
        slackMessage.subtype === 'message_deleted' ||
        slackMessage.user === this.botUserId
      ) {
        return;
      }

      if (slackMessage.channel_type === 'im' && slackMessage.text) {
        handler(slackMessage);
      }
    });
  }

  onGroupMessageTag(handler: MessageHandler): void {
    this.app.message(async ({ message }) => {
      const slackMessage = message as GenericMessageEvent;

      if (
        slackMessage.subtype === 'bot_message' ||
        slackMessage.subtype === 'message_changed' ||
        slackMessage.subtype === 'message_deleted' ||
        slackMessage.user === this.botUserId
      ) {
        return;
      }

      if (
        slackMessage.channel_type === 'group' &&
        slackMessage.text &&
        slackMessage.text.includes(`<@${this.botUserId}>`)
      ) {
        handler(slackMessage);
      }
    });
  }

  async getChannelHistory(channelId: string, limit: number): Promise<SlackMessage[]> {
    const result = await this.app.client.conversations.history({
      channel: channelId,
      limit,
    });
    if (!result.messages) {
      return [];
    }

    return result.messages as SlackMessage[];
  }

  async getThreadMessages(
    channelId: string,
    threadTs: string,
    limit: number = 100
  ): Promise<SlackMessage[]> {
    const result = await this.app.client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit,
    });

    if (!result.messages) {
      return [];
    }

    return result.messages as SlackMessage[];
  }

  async sendMessage(channelId: string, text: string, threadTs?: string | undefined): Promise<void> {
    await this.app.client.chat.postMessage({
      channel: channelId,
      text,
      thread_ts: threadTs,
    });
  }

  async sendTypingIndicator(channelId: string): Promise<string> {
    const message = await this.app.client.chat.meMessage({
      channel: channelId,
      text: '_is typing..._',
    });

    if (!message.ts) {
      console.warn('Failed to send typing indicator');
    }

    return message.ts ?? '';
  }

  async deleteTypingIndicator(channelId: string, ts: string): Promise<void> {
    await this.app.client.chat.delete({ channel: channelId, ts });
  }
}
