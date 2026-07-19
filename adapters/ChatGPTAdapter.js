import OpenAI from "openai";

class ChatGPTAdapter {
    constructor({
      apiKey,
      modelName,
    }) {
      this.client = new OpenAI({
        apiKey: apiKey
      });
      this.model = modelName || 'gpt-5.6'
    }

    analyze(content) {
      return this.client.responses.create({
        model: this.model,
        instructions: [
            "You are an expert video analyst.",
            "The user will send sequential video frames.",
            "Treat them as one continuous video.",
            "Infer motion and changes between frames.",
            "Focus on changes over time.",
        ].join(" "),
        input: [ 
          {
            role: "user",
            content,
          },
        ],
      });
    }
}

export default ChatGPTAdapter