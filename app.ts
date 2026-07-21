import dotenv from "dotenv";
import { EventEmitter } from "node:events";
import fs, { type ReadStream } from "node:fs";
import path from "node:path";
import ffmpeg from "ffmpeg";

import ChatGPTAdapter from "./adapters/ChatGPTAdapter.js";

dotenv.config();

export interface VideoAnalyzerOptions {
  videoPath: string;
  apiKey: string;
  framesDirectory: string;
  model?: string;
  frameRate?: number;
  batchSize?: number;
  maxFrames?: number;
}

export interface UploadedFile {
  id: string;
  filename: string;
}

export interface InputTextContent {
  type: "input_text";
  text: string;
}

export interface InputImageContent {
  type: "input_image";
  file_id: string;
}

export type BatchContent = InputTextContent | InputImageContent;

export interface ModelResponse {
  output_text: string;
}

export interface BatchResult {
  batchIndex: number;
  frameCount: number;
  processedFrames: number;
  outputText: string;
}

export interface UploadBatchesOptions {
  batches: string[][];
  onUpload?: (result: BatchResult) => void;
}

export interface ProcessingStartedEvent {
  startTime?: number;
  totalFrames?: number;
  totalBatches?: number;
  processedFrames?: number;
  processedBatches?: number;
}

export interface ProgressEvent {
  totalFrames: number;
  totalBatches: number;
  processedFrames: number;
  processedBatches: number;
}

export interface AnalysisResult {
  startTime: number;
  completedAt: number;
  durationMs: number;
  totalFrames: number;
  totalBatches: number;
  results: BatchResult[];
}

export class VideoAnalyzer extends EventEmitter {
  readonly model: string;
  readonly client: ChatGPTAdapter;
  readonly videoPath: string;
  readonly framesDirectory: string;
  readonly frameRate: number;
  readonly batchSize: number;
  readonly maxFrames: number;

  constructor({
    videoPath,
    apiKey,
    framesDirectory,
    model = "gpt-5.6",
    frameRate = 1,
    batchSize = 5,
    maxFrames = 10,
  }: VideoAnalyzerOptions) {
    super();
    this.model = model;
    this.client = new ChatGPTAdapter({ apiKey, modelName: model });
    this.videoPath = videoPath;
    this.framesDirectory = framesDirectory;
    this.frameRate = frameRate;
    this.batchSize = batchSize;
    this.maxFrames = maxFrames;

    this.ensure({
      data: videoPath,
      msg: `Error: It looks like videoPath is missing. You passed ${typeof videoPath}`
    })

    this.ensure({
      data: apiKey,
      msg: `Error: It looks like apiKey is missing. You passed ${typeof apiKey}`
    })

    this.ensure({
      data: framesDirectory,
      msg: `Error: It looks like frameDirectory is missing. You passed ${typeof framesDirectory}`
    })
  }

  ensure({data, msg}: {
    data: unknown
    msg: string
  }) {
    if (data === undefined || data === null || !data) {
      throw new Error(`${msg}`)
    }
  }

  analyze = async (): Promise<AnalysisResult> => {
    const startTime = performance.now();

    try {
      this.emit("processing_started", { startTime });

      await this.prepareFramesDirectory();
      await this.extractFrames();

      const framePaths = await this.getFramePaths();
      const batches = this.createBatches(framePaths);

      this.emit("processing_started", {
        totalFrames: framePaths.length,
        totalBatches: batches.length,
        processedFrames: 0,
        processedBatches: 0,
      });

      const onUpload = (result: BatchResult): void => {
        this.emit("progress", {
          totalFrames: framePaths.length,
          totalBatches: batches.length,
          processedFrames: result.processedFrames,
          processedBatches: result.batchIndex + 1,
        });
      };

      const results = await this.uploadBatches({ batches, onUpload });
      const completedAt = performance.now();
      const completed: AnalysisResult = {
        startTime,
        completedAt,
        durationMs: completedAt - startTime,
        totalFrames: framePaths.length,
        totalBatches: batches.length,
        results,
      };

      this.emit("completed", completed);
      return completed;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  };

  async uploadBatches({
    batches,
    onUpload,
  }: UploadBatchesOptions): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    let frameIndex = 0;
    let processedFrameCount = 0;

    for (const [batchIndex, framePathsBatch] of batches.entries()) {
      const uploadedFiles = await this.uploadFrameBatch(framePathsBatch);
      const { content, nextFrameIndex } = this.prepareBatchContent(
        uploadedFiles,
        frameIndex,
      );

      frameIndex = nextFrameIndex;

      const response = await this.createResponse(content);
      processedFrameCount += uploadedFiles.length;

      const result: BatchResult = {
        batchIndex,
        frameCount: uploadedFiles.length,
        processedFrames: processedFrameCount,
        outputText: response.output_text,
      };

      results.push(result);
      onUpload?.(result);
    }

    return results;
  }

  async prepareFramesDirectory(): Promise<void> {
    await fs.promises.rm(this.framesDirectory, {
      recursive: true,
      force: true,
    });
    await fs.promises.mkdir(this.framesDirectory, { recursive: true });
  }

  async extractFrames(): Promise<void> {
    const video = await new ffmpeg(this.videoPath);

    await new Promise<void>((resolve, reject) => {
      video.fnExtractFrameToJPG(
        this.framesDirectory,
        {
          frame_rate: this.frameRate,
          file_name: "%01d_frame_%t_%s",
        },
        (error: Error | null) => {
          if (error) {
            this.emit('error', error.toString())
            reject(error);
            return;
          }

          resolve();
        },
      );
    });
  }

  async getFramePaths(): Promise<string[]> {
    const entries = await fs.promises.readdir(this.framesDirectory, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isFile())
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { numeric: true }),
      )
      .slice(0, this.maxFrames)
      .map((entry) => path.join(this.framesDirectory, entry.name));
  }

  createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];

    for (let index = 0; index < items.length; index += this.batchSize) {
      batches.push(items.slice(index, index + this.batchSize));
    }

    return batches;
  }

  async uploadFile(file: ReadStream): Promise<UploadedFile> {
    return this.client.uploadFile(file);
  }

  async uploadFiles(files: ReadStream[]): Promise<UploadedFile[]> {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  async uploadFrameBatch(framePaths: string[]): Promise<UploadedFile[]> {
    return this.uploadFiles(
      framePaths.map((framePath) => fs.createReadStream(framePath)),
    );
  }

  prepareBatchContent(
    uploadedFiles: UploadedFile[],
    initialFrameIndex = 0,
  ): { content: BatchContent[]; nextFrameIndex: number } {
    let frameIndex = initialFrameIndex;
    const content: BatchContent[] = uploadedFiles.flatMap((file) => {
      frameIndex += 1;

      return [
        {
          type: "input_text",
          text: `Frame ${frameIndex} (${file.filename})`,
        },
        {
          type: "input_image",
          file_id: file.id,
        },
      ];
    });

    return { content, nextFrameIndex: frameIndex };
  }

  async createResponse(content: BatchContent[]): Promise<ModelResponse> {
    return this.client.analyze(content);
  }

  override on(
    event: "processing_started",
    listener: (event: ProcessingStartedEvent) => void,
  ): this;

  override on(event: "progress", listener: (event: ProgressEvent) => void): this;

  override on(
    event: "completed",
    listener: (event: AnalysisResult) => void,
  ): this;

  override on(event: "error", listener: (error: Error) => void): this;

  override on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}
