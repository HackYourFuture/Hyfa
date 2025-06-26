import { SlackClient, SlackMessage, SlackMessageEvent } from './SlackClient';
import { LLMMessage, LLMService } from './LLMService';
import { HistoryProvider } from './HistoryProvider';

export class Hyfa {
  private counter = 0;
  constructor(
    private readonly slackClient: SlackClient,
    private readonly llmService: LLMService,
    private readonly historyProvider: HistoryProvider
  ) {}

  async start(): Promise<void> {
    // Set up message handlers
    this.slackClient.onDirectMessage(async (message) => {
      try {
        await this.directMessageHandler(message);
        this.counter++;
        console.log(`✅ Processed direct message. Total messages: ${this.counter}`);
      } catch (error) {
        console.error('❌ Error in direct message handler:', error);
      }
    });

    this.slackClient.onGroupMessageTag(async (message) => {
      try {
        await this.groupMessageHandler(message);
        this.counter++;
        console.log(`✅ Processed group message. Total messages: ${this.counter}`);
      } catch (error) {
        console.error('❌ Error in group message handler:', error);
      }
    });

    // Start the Slack client
    await this.slackClient.start();
  }

  private async directMessageHandler(message: SlackMessageEvent): Promise<void> {
    if (!message.text?.trim()) {
      return;
    }

    if (message.thread_ts) {
      await this.slackClient.sendMessage(
        message.channel,
        "I'm sorry, but I cannot respond to messages in threads. Please send a direct message instead.",
        message.thread_ts
      );
      return;
    }

    let typingIndicatorTS: string | undefined = await this.slackClient.sendTypingIndicator(
      message.channel
    );

    // Safety timeout to delete typing indicator after 60 seconds
    // This is to ensure that if the message is stuck or error occurs, we still clean up the typing indicator
    setTimeout(() => {
      if (typingIndicatorTS) {
        this.slackClient.deleteTypingIndicator(message.channel, typingIndicatorTS);
        typingIndicatorTS = undefined;
      }
    }, 60000);

    // Get conversation history for this user
    const history = await this.historyProvider.getHistory(message.user);

    // Generate response from LLM
    let LLMResponse = await this.llmService.generate(message.text, history);
    LLMResponse = this.formatResponse(LLMResponse);

    // Add message to history
    await this.historyProvider.pushHistory(message.user, {
      role: 'user',
      content: message.text,
    });
    await this.historyProvider.pushHistory(message.user, {
      role: 'assistant',
      content: LLMResponse,
    });

    // Send response to user
    await this.slackClient.sendMessage(message.channel, LLMResponse, message.thread_ts);

    // Delete typing indicator
    if (typingIndicatorTS) {
      await this.slackClient.deleteTypingIndicator(message.channel, typingIndicatorTS);
      typingIndicatorTS = undefined;
    }
  }

  private async groupMessageHandler(message: SlackMessageEvent): Promise<void> {
    if (!message.text?.trim()) {
      return;
    }

    console.log('Received group message:', message);
    if (message.thread_ts) {
      // get the thread messages
      const threadMessages = await this.slackClient.getThreadMessages(
        message.channel,
        message.thread_ts,
        20
      );

      // 2. map messages to LLM format
      const history: LLMMessage[] = threadMessages
        .map((msg) => this.convertToLLMMessage(msg, this.slackClient.botUserId))
        .reverse();

      // 3. Generate response from LLM
      let LLMResponse = await this.llmService.generate(message.text, history);
      LLMResponse = this.formatResponse(LLMResponse);

      // 4. Send response to the channel
      await this.slackClient.sendMessage(message.channel, LLMResponse, message.thread_ts);
      return;
    }

    // 1. Get last 20 messages from the channel
    const channelHistory = await this.slackClient.getChannelHistory(message.channel, 20);

    // 2. map messages to LLM format.
    const history: LLMMessage[] = channelHistory
      .map((msg) => this.convertToLLMMessage(msg, this.slackClient.botUserId))
      .reverse();

    // 3. Generate response from LLM
    let LLMResponse = await this.llmService.generate(message.text, history);
    LLMResponse = this.formatResponse(LLMResponse);

    // 4. Send response to the channel
    await this.slackClient.sendMessage(message.channel, LLMResponse, message.thread_ts);
  }

  private formatResponse(response: string) {
    // Replace **bold** with *bold* for Slack compatibility
    let formattedResponse = response.replace(/\*\*(.+)\*\*/g, '*$1*');

    // Remove language tags from code blocks (Not supported in Slack)
    formattedResponse = formattedResponse.replace(/```([^`]+?)\n/g, '*$1*:\n```\n');
    return formattedResponse;
  }

  private convertToLLMMessage(
    message: SlackMessageEvent | SlackMessage,
    botUserID: string = ''
  ): LLMMessage {
    return {
      role: message.user === botUserID ? 'assistant' : 'user',
      content: message.text || '',
    };
  }
}
