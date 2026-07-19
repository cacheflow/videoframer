import ModelAdapter from './ModelAdapter'
dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


class ClaudeAdapter extends ModelAdapter {
    constructor({
      modelName
    }) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.model = modelName || 'claude-opus-4-6'
    }

    async analyze() {
      const message = await this.client.messages.create({
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Hello, Claude' }],
        model: this.model,
      });
      return message;
    }
}

export default ClaudeAdapter