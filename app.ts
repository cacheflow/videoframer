import { EventEmitter } from "node:events";
import fs, { type ReadStream } from "node:fs";
import path from "node:path";
import ffmpeg from "ffmpeg";
import type {
  VideoframerOptions,
  UploadedFile,
  BatchContent,
  ProcessingStartedEvent,
  ModelResponse,
  AnalysisResult,
  BatchResult,
  ProcessingProgressEvent,
  UploadBatchesOptions,
} from "./types/app.d.ts";
import "dotenv/config";

import ModelAdapter from "./adapters/ModelAdapter.ts";

export class Videoframer extends EventEmitter {
  readonly model: string;
  readonly provider: string;
  readonly client: ModelAdapter;
  readonly videoPath: string;
  readonly prompt?: string;
  readonly framesDirectory: string;
  readonly frameRate: number;
  readonly batchSize: number;
  readonly maxFrames: number | "all";
  readonly keepFrames?: boolean;

  constructor({
    videoPath,
    provider = 'chatgpt',
    apiKey,
    framesDirectory,
    prompt,
    model = "gpt-5.6",
    frameRate = 1,
    batchSize = 5,
    maxFrames = 10,
    keepFrames = false,
  }: VideoframerOptions) {
    super();
    this.model = model;
    this.provider = provider;
    this.client = new ModelAdapter({
      apiKey,
      model,
      prompt,
      provider,
    });
    this.videoPath = videoPath;
    this.framesDirectory = framesDirectory;
    this.frameRate = frameRate;
    this.prompt = prompt;
    this.batchSize = batchSize;
    this.maxFrames = maxFrames;
    this.keepFrames = keepFrames;

    this.ensurePresent({
      data: apiKey,
      msg: `Error: It looks like apiKey is missing. You passed ${typeof apiKey}`,
    });
  }

  ensurePresent({ data, msg }: { data: unknown; msg: string }) {
    if (data === undefined || data === null || !data) {
      throw new Error(`${msg}`);
    }
  }

  async isDirectory(path: string): Promise<boolean> {
    try {
      const pathStats = (await fs.promises.stat(path));
      return pathStats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  async assertSafeFramesDir(framesDirectory: string) {
    const resolvedDirectory = path.resolve(framesDirectory);
    const isDirectory = await this.isDirectory(resolvedDirectory);

    if (!isDirectory) {
      await fs.promises.mkdir(resolvedDirectory);
    }

    const stats = await fs.promises.lstat(resolvedDirectory);

    if (!stats.isSymbolicLink()) {
      throw new Error(
        `Frames directory cannot be a symbolic link: ${resolvedDirectory}`,
      );
    }

    const cwd = await fs.promises.realpath(process.cwd());

    const canonicalDirectory = await fs.promises.realpath(resolvedDirectory);


    const relativeCanonicalDir = path.relative(cwd, canonicalDirectory);

    const parentDir = relativeCanonicalDir === "" || relativeCanonicalDir == "..";
    const childDir = !parentDir && !relativeCanonicalDir.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeCanonicalDir);

    if (!childDir) {
      throw new Error(`Frames directory must be a child of the current working directory`);
    }

  }

  analyze = async (): Promise<any> => {
    const { framesDirectory, videoPath, keepFrames } = this;

    try {
      this.ensurePresent({
        data: videoPath,
        msg: `Error: It looks like videoPath is missing. You passed ${typeof videoPath}`,
      });

      this.ensurePresent({
        data: framesDirectory,
        msg: `Error: It looks like framesDirectory is missing. You passed ${typeof framesDirectory}`,
      });


      if (!fs.existsSync(videoPath)) {
        throw new Error(
          `Error: Video file does not exist at path ${videoPath}`,
        );
      }


      await this.prepareFramesDirectory();
      await this.extractFrames();

      const framePaths = await this.getFramePaths();

      return this.analyzeFrames(framePaths)
      
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  };

  async removeFramesDirectory(): Promise<void> {
    const { framesDirectory } = this;
    try {
      await fs.promises.rm(framesDirectory, {
        recursive: true,
        force: true,
      });
    } catch (cleanupError) {
      console.warn(`Failed to clean up frames directory: ${cleanupError}`);
    }
  }

  async analyzeFrames(framePaths: string[]) {
    for(let i = 0; i < framePaths.length; i+=1) {
      if (!fs.existsSync(framePaths[i])) {
         throw new Error(
          `Error: Video frame paths do not exist at path ${framePaths}`,
        );
      }
    }
    const startTime = performance.now();
    const batches = this.createBatches(framePaths);

      this.emit("started", {
        startTime,
        totalFrames: framePaths.length,
        processedFrames: 0,
        processedBatches: 0,
      });

      const onUpload = (result: BatchResult): void => {

        this.emit("progress", {
          totalFrames: framePaths.length,
          result: result,
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
        results,
      };

      this.emit("completed", completed);

      return completed;
  }

  async uploadBatches({
    batches,
    onUpload,
  }: UploadBatchesOptions): Promise<BatchResult[]> {

    const results: BatchResult[] = [];
    let frameIndex = 0;
    let processedFrameCount = 0;

    for (const [batchIndex, framePathsBatch] of batches.entries()) {
      const uploadedFiles = await this.uploadFrameBatch(framePathsBatch);
      const { content, nextFrameIndex } = this.prepareContentBatch(
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
    const framesDirectory = this.framesDirectory;

    await this.assertSafeFramesDir(framesDirectory);

    const resolvedFramesDirectory = path.resolve(framesDirectory);

    if (fs.existsSync(resolvedFramesDirectory)) {
      await fs.promises.rm(resolvedFramesDirectory, {
        recursive: true,
        force: true,
      });
    }

    else {
      console.log('creating')
      await fs.promises.mkdir(resolvedFramesDirectory, { recursive: true });  
      console.log('created ', fs.existsSync(resolvedFramesDirectory), resolvedFramesDirectory)
    }
  }

  async extractFrames(): Promise<void> {
    const { videoPath, framesDirectory, frameRate, maxFrames } = this;

    if (!videoPath) {
      throw new Error(`Error: Video path is not set.`);
    }

    const video = await new ffmpeg(videoPath);

    const videoOpts: any = {
      frame_rate: frameRate,
      file_name: "%01d_frame_%t_%s",
    }

    if (typeof maxFrames === 'number') {
      videoOpts.number = maxFrames;
    }

    return new Promise<void>((resolve, reject) => {
      video.fnExtractFrameToJPG(
        framesDirectory,
        videoOpts,
        (error: Error | null, files?: string[] | undefined) => {
          if (error) {
            this.emit("error", error.toString());
            reject(error);
            return;
          }

          console.log('files are ', files)

          resolve();
        },
      );
    });
  }

  async getFramePaths(): Promise<string[]> {
    const entries = await fs.promises.readdir(this.framesDirectory, {
      withFileTypes: true,
    });

    const sortedPaths = entries
      .filter((entry) => entry.isFile())
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { numeric: true }),
      )
      .map((entry) => path.join(this.framesDirectory, entry.name));

    const { maxFrames } = this;

    const allFrames =
      maxFrames === "all" ||
      maxFrames === 0 ||
      maxFrames === -1 ||
      maxFrames === Infinity;

    if (allFrames) {
      return sortedPaths;
    }

    return sortedPaths.slice(0, maxFrames || sortedPaths.length);
  }

  createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];
    const { batchSize } = this;

    for (let index = 0; index < items.length; index += batchSize) {
      batches.push(items.slice(index, index + batchSize));
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

  prepareContentBatch(
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
    event: "started",
    listener: (event: ProcessingStartedEvent) => void,
  ): this;

  override on(
    event: "progress",
    listener: (event: ProcessingProgressEvent) => void,
  ): this;

  override on(
    event: "completed",
    listener: (event: AnalysisResult) => void,
  ): this;

  override on(event: "error", listener: (error: Error) => void): this;

  override on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}