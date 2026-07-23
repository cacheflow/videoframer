import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
class GeminiAdapter {
    ai;
    model;
    prompt;
    defaultPrompt;
    constructor({ apiKey, model, prompt, }) {
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
        this.ai = new GoogleGenAI({ apiKey });
        this.model = model || "gemini-2.5-flash";
        this.prompt = prompt || this.defaultPrompt.join(' ');
    }
    async uploadFile(file) {
        if (file === undefined || file === null || file === void 0) {
            throw new Error(`File is required. You passed ${typeof file}.`);
        }
        let base64Data = "";
        let filename = "frame.jpg";
        if (typeof file === "object" && file !== null && "path" in file) {
            filename = typeof file.path === "string" ? file.path : "frame.jpg";
        }
        if (typeof file === "object" && file !== null && typeof file[Symbol.asyncIterator] === "function") {
            const chunks = [];
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
        const id = base64Data || `gemini-${uuidv4()}`;
        return {
            id,
            filename,
            data: base64Data,
            mimeType: "image/jpeg",
        };
    }
    async analyze(content) {
        const parts = [];
        const prompt = this.prompt || this.defaultPrompt;
        for (const item of content) {
            if (item.type === "input_text") {
                parts.push({ text: item.text });
            }
            else {
                const rawData = item.file_id.startsWith("data:") ? item?.file_id?.split(",")[1] : item?.file_id;
                parts.push({
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: rawData,
                    },
                });
            }
        }
        const response = await this.ai.models.generateContent({
            model: this.model,
            contents: parts,
            config: {
                systemInstruction: Array.isArray(prompt) ? prompt.join(" ") : prompt,
            },
        });
        return {
            output_text: response.text || "",
        };
    }
}
export default GeminiAdapter;
