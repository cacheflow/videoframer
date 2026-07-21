import OpenAI from "openai";
import type { ReadStream } from "node:fs";

type BatchContent =
  | {
      type: "input_text";
      text: string;
    }
  | {
      type: "input_image";
      file_id: string;
    };

class ChatGPTAdapter {
    client: OpenAI;
    model: string;
    prompt: string;
    defaultPrompt: string[];
    
    constructor({
      apiKey,
      modelName,
      prompt,
    }: {
      apiKey: string;
      modelName?: string;
      prompt: string;
    }) {
      if (apiKey === undefined || apiKey === null || apiKey === void 0) {
        throw new Error(`API key is required. You passed ${typeof apiKey}.`);
      }

      this.defaultPrompt = [
        "You are an expert video analyst.",
        "The user will send sequential video frames.",
        "Treat them as one continuous video.",
        "Infer motion and changes between frames.",
        "Focus on changes over time.",
      ];

      this.client = new OpenAI({
        apiKey: apiKey,
      });

      this.model = modelName || "gpt-5.6";
      this.prompt = prompt;
    }

    analyze(content: BatchContent[]) {
      const prompt = this.prompt || this.defaultPrompt;
      return this.client.responses.create({
        model: this.model,
        instructions: Array.isArray(prompt) ? prompt.join(' ') : prompt,
        input: [ 
          {
            role: "user",
            content: content as any,
          },
        ],
      });
    }

    uploadFile(file: ReadStream | File | any) {
      if (file === undefined || file === null || file === void 0) {
        throw new Error(`File is required. You passed ${typeof file}.`);
      }
      return this.client.files.create({
        file: file as any,
        purpose: "user_data",
      });
    }
}

export default ChatGPTAdapter;

