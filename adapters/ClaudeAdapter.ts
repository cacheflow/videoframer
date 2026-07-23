import Anthropic from "@anthropic-ai/sdk";
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

export interface UploadedFile {
  id: string;
  filename: string;
  data?: string;
}

class ClaudeAdapter {
  client: Anthropic;
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

    this.client = new Anthropic({
      apiKey,
    });

    this.model = model || "claude-3.5-sonnet";
    this.prompt = prompt || this.defaultPrompt.join(' ');
  }

  async uploadFile(file: ReadStream | File | any): Promise<UploadedFile> {
    if (file === undefined || file === null || file === void 0) {
      throw new Error(`File is required. You passed ${typeof file}.`);
    }

    let base64Data = "";
    let filename = "frame.jpg";
    const isFilelike = typeof file === "object" && file !== null && "path" in file;
    const isDataURI = typeof file === "object" && file !== null && typeof file[Symbol.asyncIterator] === "function";

    if (isFilelike) {
      filename = typeof file.path === "string" ? file.path : "frame.jpg";
    }

    if (isDataURI) {
      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(Buffer.from(chunk));
      }
      base64Data = Buffer.concat(chunks).toString("base64");
    } 
    
    else if (Buffer.isBuffer(file)) {
      base64Data = file.toString("base64");
    } 
    
    else if (typeof file === "string") {
      base64Data = file;
    }
    
    else if (typeof file === "object" && file !== null && "data" in file) {
      base64Data = String(file.data);
    }

    const id = base64Data || `claude-file-${Math.random().toString(36).substring(2, 9)}`;

    return {
      id,
      filename,
      data: base64Data,
    };
  }

  async analyze(content: BatchContent[]) {

    const formattedContent = content.map((item) => {
      if (item.type === "input_text") {
        return {
          type: "text" as const,
          text: item.text,
        };
      } 
      else {
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: "image/jpeg" as const,
            data: item.file_id.startsWith("data:") ? item.file_id.split(",")[1] : item.file_id,
          },
        };
      }
    });

    const prompt = this.prompt || this.defaultPrompt;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: Array.isArray(prompt) ? prompt.join(" ") : prompt,
      messages: [
        {
          role: "user",
          content: formattedContent,
        },
      ],
    });

    const outputText = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    return {
      output_text: outputText,
    };
  }
}

export default ClaudeAdapter;
