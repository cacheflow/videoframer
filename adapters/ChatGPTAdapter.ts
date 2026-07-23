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
  readonly models: string[] = [
     "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5.6",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    'o1',
    "o1-pro",
    'o3',
    "o3-pro",
    "o4-mini",
   ]
    client: OpenAI;
    model: string;
    prompt: string;
    defaultPrompt: string[];
    
    constructor({
      apiKey,
      model,
      prompt,
    }: {
      apiKey: string;
      model?: string;
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

      this.model = model || "gpt-5.6";
      this.prompt = prompt || this.defaultPrompt.join(' ');
    }

    static get model(): string | null {
      return this.model;
    }

    static get prompt(): string | null {
      return this.prompt;
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

