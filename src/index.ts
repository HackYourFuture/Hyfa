import { DefaultSlackClient } from './SlackClient';
import { DefaultLLMService } from './LLMService';
import { MemoryHistoryProvider } from './HistoryProvider';
import { Hyfa } from './Hyfa';
import dotenv from 'dotenv';

// Config
dotenv.config();
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN || '';
const LLM_API_ENDPOINT = process.env.LLM_API_ENDPOINT || '';
const LLM_API_TOKEN = process.env.LLM_API_TOKEN || '';

const main = async () => {
  // Validate required environment variables
  if (
    !SLACK_BOT_TOKEN ||
    !SLACK_SIGNING_SECRET ||
    !SLACK_APP_TOKEN ||
    !LLM_API_ENDPOINT ||
    !LLM_API_TOKEN
  ) {
    throw new Error('Missing required environment variables. Please check your .env file.');
  }

  const historyProvider = new MemoryHistoryProvider({ historySize: 20 });

  // Create LLM service
  const llmService = new DefaultLLMService({
    endpoint: LLM_API_ENDPOINT,
    authToken: LLM_API_TOKEN,
  });

  // Create Slack client
  const slackClient = new DefaultSlackClient({
    token: SLACK_BOT_TOKEN,
    signingSecret: SLACK_SIGNING_SECRET,
    appToken: SLACK_APP_TOKEN,
  });

  const hyfaClient = new Hyfa(slackClient, llmService, historyProvider);
  await hyfaClient.start();
  console.log('🟢 Hyfa bot started successfully');
};

main().catch((error) => {
  console.error('Error starting Hyfa bot:', error);
  process.exit(1);
});
