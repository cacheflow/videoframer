import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import { EventEmitter } from "events";
import ffmpeg from "ffmpeg";
import path from "path";

import ChatGPTAdapter from "./ChatGPTAdapter.js"
// import labResolver from './resolvers/labResolver.js'

// import ModelAdapter from './adapters/ModelAdapter.js'

dotenv.config();

const OPEN_API_KEY = process.env.OPEN_API_KEY;

const client = new OpenAI({
  apiKey: OPEN_API_KEY,
});

export class VideoAnalyzer extends EventEmitter {
  constructor({
    videoPath,
    apiKey,
    framesDirectory,
    model = "gpt-5.6",
    frameRate = 1,
    batchSize = 5,
    maxFrames = 10,
  }) {
    super();
    this.model = model
    this.client = new ChatGPTAdapter({
      apiKey: apiKey,
      modelName: model,
    });
    this.videoPath = videoPath;
    this.framesDirectory = framesDirectory;
    this.frameRate = frameRate;
    this.batchSize = batchSize;
    this.maxFrames = maxFrames;

    // this.on("start", () => {
    //   void this.run();
    // });
  }

  // async start() {
  //   return this.run();
  // }

  analyze = async () => {
    const {maxFrames} = this;
    console.log('maxFrames is ', maxFrames)
    const startTime = performance.now();
    try {
      this.emit("processing_started", { startTime });

      await this.prepareFramesDirectory();
      await this.extractFrames();

      const framePaths = await this.getFramePaths();
      console.log('framePaths is ', framePaths)
      const batches = this.createBatches(framePaths);

      this.emit("progress", {
        totalFrames: framePaths.length,
        totalBatches: batches.length,
        processedFrames: 0,
        processedBatches: 0,
      });

      const onUpload = (result) => {
        this.emit("progress", {
          totalFrames: framePaths.length,
          totalBatches: batches.length,
          processedFrames: result.processedFrames,
          processedBatches: result.batchIndex + 1,
        });
      };


      const results = await this.uploadBatches({batches, framePaths, onUpload});

      const completedAt = performance.now();
      const completed = {
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
  }

  async uploadBatches({batches, framePaths, onUpload}) {
    const results = [];
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

      const result = {
        batchIndex,
        frameCount: uploadedFiles.length,
        processedFrames: response,
        outputText: response.output_text,
      };

      results.push(result);
      
      if (onUpload) {
        onUpload(result);
      }
    }
    return results;
  }

  async prepareFramesDirectory() {
    await fs.promises.rm(this.framesDirectory, {
      recursive: true,
      force: true,
    });

    await fs.promises.mkdir(this.framesDirectory, {
      recursive: true,
    });
  }

  async extractFrames() {
    const video = await new ffmpeg(this.videoPath);

    await new Promise((resolve, reject) => {
      video.fnExtractFrameToJPG(
        this.framesDirectory,
        {
          frame_rate: this.frameRate,
          file_name: "%01d_frame_%t_%s",
        },
        (error, files) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(files);
        },
      );
    });
  }

  async getFramePaths() {
    const {framesDirectory, maxFrames: maxFrames} = this;
    const entries = await fs.promises.readdir(framesDirectory, {
      withFileTypes: true,
    });
    
    const files = entries.filter((entry) => entry.isFile());
    
    const sortedFiles = files.sort((left, right) => {
      return left.name.localeCompare(right.name, undefined, { numeric: true });
    })

    return sortedFiles.slice(0, maxFrames)
      .map((entry) => path.join(framesDirectory, entry.name));
  }

  createBatches(items) {
    const batches = [];

    for (let index = 0; index < items.length; index += this.batchSize) {
      batches.push(items.slice(index, index + this.batchSize));
    }

    return batches;
  }

  async uploadFile(file) {
    return client?.files?.create({
      file,
      purpose: "user_data",
    });
  }

  async uploadFiles(files) {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  async uploadFrameBatch(framePaths) {
    const streams = framePaths.map((framePath) =>
      fs.createReadStream(framePath),
    );

    return this.uploadFiles(streams);
  }

  prepareBatchContent(uploadedFiles, initialFrameIndex = 0) {
    let frameIndex = initialFrameIndex;

    const content = uploadedFiles.flatMap((file) => {
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

    return {
      content,
      nextFrameIndex: frameIndex,
    };
  }

  async createResponse(content) {
    const modelClient = this.client?.client;
    return modelClient.responses.create({
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

const videoAnalyzer = new VideoAnalyzer({
  videoPath: '/Users/lexalexander/Documents/framewise/future-lil-demon.mp4',
  framesDirectory: "./frames",
  maxFrames: 100,
  batchSize: 10,
  model: 'gpt-5.6',
  apiKey: process.env.OPEN_API_KEY
});

videoAnalyzer.on('progress', (data) => {
  console.log('Progress:', data);
});

videoAnalyzer.on('completed', (data) => {
  console.log('completed:', data);
});

void videoAnalyzer.analyze();

