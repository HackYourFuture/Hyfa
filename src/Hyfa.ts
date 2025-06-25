import { SlackClient, SlackMessageEvent } from './SlackClient';
import { LLMService } from './LLMService';
import { HistoryProvider } from './HistoryProvider';

export class Hyfa {
  constructor(
    private readonly slackClient: SlackClient,
    private readonly llmService: LLMService,
    private readonly historyProvider: HistoryProvider
  ) {}

  async start(): Promise<void> {
    // Set up message handlers
    this.slackClient.onDirectMessage(this.setupDirectMessageHandler.bind(this));
    this.slackClient.onGroupMessageTag(this.setupGroupMessageHandler.bind(this));

    // Start the Slack client
    await this.slackClient.start();
  }

  private async setupDirectMessageHandler(message: SlackMessageEvent): Promise<void> {
    if (!message.text?.trim()) {
      return;
    }

    if (message.thread_ts) {
      await this.slackClient.sendMessage(
        message.user,
        "I'm sorry, but I cannot respond to messages in threads. Please send a direct message instead. ",
        message.thread_ts
      );
      return;
    }

    console.log(`Received direct message from ${message.user}: ${message.text}`);
    try {
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
      const LLMResponse = await this.llmService.generate(message.text, history);

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
      await this.slackClient.sendMessage(message.user, LLMResponse, message.thread_ts);

      // Delete typing indicator
      if (typingIndicatorTS) {
        await this.slackClient.deleteTypingIndicator(message.channel, typingIndicatorTS);
        typingIndicatorTS = undefined;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  private async setupGroupMessageHandler(message: SlackMessageEvent): Promise<void> {
    console.log(`Received group message in ${message.channel}: ${message.text}`);
  }
}
