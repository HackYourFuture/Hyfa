import { App } from '@slack/bolt';
import { GenericMessageEvent, ConversationsHistoryResponse } from '@slack/web-api';

export type SlackMessage = NonNullable<ConversationsHistoryResponse['messages']>[0];
export type SlackMessageEvent = GenericMessageEvent;
export type MessageHandler = (message: SlackMessageEvent) => void;

export interface SlackClient {
  botUserId?: string;
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
  botUserId: string | undefined;
  private readonly app: App;

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
      if (this.shouldProcessMessage(slackMessage, ['im'])) {
        console.debug(
          `✅ [D] subtype:${slackMessage.subtype} channel:${slackMessage.channel} channel_type:${
            slackMessage.channel_type
          } user:${slackMessage.user} msg_length:${slackMessage.text?.length ?? 0}`
        );
        handler(slackMessage);
      } else {
        console.debug(
          `❌ [D] subtype:${slackMessage.subtype} channel:${slackMessage.channel} channel_type:${
            slackMessage.channel_type
          } user:${slackMessage.user} msg_length:${slackMessage.text?.length ?? 0}`
        );
      }
    });
  }

  onGroupMessageTag(handler: MessageHandler): void {
    this.app.message(async ({ message }) => {
      const slackMessage = message as GenericMessageEvent;
      const supportedChannelTypes = ['group', 'mpim', 'channel'];
      if (this.shouldProcessMessage(slackMessage, supportedChannelTypes, `<@${this.botUserId}>`)) {
        console.debug(
          `✅ [G] subtype:${slackMessage.subtype} channel:${slackMessage.channel} channel_type:${
            slackMessage.channel_type
          } user:${slackMessage.user} msg_length:${slackMessage.text?.length ?? 0}`
        );
        handler(slackMessage);
      } else {
        console.debug(
          `❌ [G] subtype:${slackMessage.subtype} channel:${slackMessage.channel} channel_type:${
            slackMessage.channel_type
          } user:${slackMessage.user} msg_length:${slackMessage.text?.length ?? 0}`
        );
      }
    });
  }

  async getChannelHistory(channelId: string, limit: number): Promise<SlackMessage[]> {
    const result = await this.app.client.conversations.history({
      channel: channelId,
      limit: limit * 2, // Fetch more messages to ensure we have enough after filtering
    });

    const slackMessages = (result.messages ?? []) as SlackMessage[];

    // Return messages that have text and aren't system subtypes
    return slackMessages.filter((msg) => msg.text?.trim() && !msg.subtype).slice(-limit);
  }

  async getThreadMessages(
    channelId: string,
    threadTs: string,
    limit: number = 50
  ): Promise<SlackMessage[]> {
    const result = await this.app.client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit,
    });

    const slackMessages = (result.messages ?? []) as SlackMessage[];

    // Return messages that have text and aren't system subtypes
    return slackMessages.filter((msg) => msg.text?.trim() && !msg.subtype).slice(-limit);
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

  private shouldProcessMessage(
    slackMessage: GenericMessageEvent,
    channelTypes: string[],
    textIncludes?: string
  ): boolean {
    if (
      slackMessage.subtype === 'bot_message' ||
      slackMessage.subtype === 'message_changed' ||
      slackMessage.subtype === 'message_deleted' ||
      slackMessage.user === this.botUserId
    ) {
      return false;
    }

    if (!channelTypes.includes(slackMessage.channel_type) || !slackMessage.text) {
      return false;
    }

    // Check if the message is a thread reply and the bot is the thread starter
    const isThreadReplyToBot =
      slackMessage.thread_ts && slackMessage.parent_user_id === this.botUserId;

    if (textIncludes && !slackMessage.text.includes(textIncludes) && !isThreadReplyToBot) {
      return false;
    }
    return true;
  }
}
