import { DefaultSlackClient } from "./SlackClient";
import { DefaultLLMService } from "./LLMService";
import { MemoryHistoryProvider } from "./HistoryProvider";
import { Hyfa } from "./Hyfa";

// Slack API tokens
const SLACK_BOT_TOKEN = "";
const SLACK_SIGNING_SECRET = "";
const SLACK_APP_TOKEN = "xapp-";

// LLM API endpoint and token
const LLM_API_ENDPOINT =
  "https://jx75gknsovolc7w6nwh4ortw.agents.do-ai.run/api/v1/chat/completions";
const LLM_API_TOKEN = "";

const main = async () => {
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
  console.log("🟢 Hyfa bot started successfully");
};

main().catch((error) => {
  console.error("Error starting Hyfa bot:", error);
  process.exit(1);
});
