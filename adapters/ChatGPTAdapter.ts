import OpenAI from "openai";

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
    client: OpenAI
    model: String
    instructions: String[]
    
    constructor({
      apiKey,
      modelName,
    }: {
      apiKey: string,
      modelName?: string
    }) {
      
      this.instructions = [
        "You are an expert video analyst.",
        "The user will send sequential video frames.",
        "Treat them as one continuous video.",
        "Infer motion and changes between frames.",
        "Focus on changes over time.",
      ]

      this.client = new OpenAI({
        apiKey: apiKey
      });

      this.model = modelName || 'gpt-5.6'

      if (apiKey === undefined || apiKey === null || apiKey === void 0) {
        throw new Error(`API key is required. You passed ${typeof apiKey}.`)
      }
    }

    analyze(content: BatchContent[]) {
      return this.client.responses.create({
        model: this.model,
        instructions: this.instructions.join(" "),
        input: [ 
          {
            role: "user",
            content,
          },
        ],
      });
    }

    uploadFile(file: File) {
      if (file === undefined || file === null || file === void 0) {
        throw new Error(`File is required. You passed ${typeof file}.`)
      }
      return this.client.files.create({
        file,
        purpose: "user_data",
      });
    }
}

export default ChatGPTAdapter
