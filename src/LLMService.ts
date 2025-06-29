export type LLMMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export interface LLMService {
  generate(prompt: string, context: LLMMessage[]): Promise<string>;
}

export class DefaultLLMService implements LLMService {
  constructor(private readonly options: { endpoint: string; authToken: string }) {}

  async generate(prompt: string, context: LLMMessage[] = []): Promise<string> {
    const data = await this.sendRequest(prompt, context);
    let aiResponse = data.choices[0].message.content;

    if (aiResponse.includes('\n</think>\n')) {
      aiResponse = data.choices[0].message.content.split('</think>')[1].trim();
    }
    return aiResponse;
  }

  private async sendRequest(prompt: string, context: LLMMessage[] = []): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.options.authToken}`,
    };

    const message: LLMMessage = { role: 'user', content: prompt };

    const body = JSON.stringify({
      messages: context.concat([message]),
      stream: false,
      include_functions_info: false,
      include_retrieval_info: false,
      include_guardrails_info: false,
    });

    const response = await fetch(this.options.endpoint, { method: 'POST', headers, body });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }
}
