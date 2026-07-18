import dotenv from "dotenv";
import ffmpeg from "ffmpeg";
import OpenAI from "openai";
import fs from "fs";
import { EventEmitter } from "events";
import path from "path";

dotenv.config();

const OPEN_API_KEY = process.env.OPEN_API_KEY;

const client = new OpenAI({
  apiKey: OPEN_API_KEY,
});

const uploadFile = async (file) => {
  return await client.files.create({
    file: file,
    purpose: "user_data",
  });
};

const createResponse = async (content) => {
  const opts = {
    model: "gpt-5.6",
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
        content: content,
      },
    ],
  };

  return await client.responses.create(opts);
};

const uploadFiles = async (files) => {
  return await Promise.all(files.map(async (file) => uploadFile(file)));
};

const analyzeVideo = () => {
  const eventEmitter = new EventEmitter();
  eventEmitter.on("start", async () => {
    try {
      const startTime = performance.now();
      eventEmitter.emit("processing_started", { startTime });
      const dirPath = "/Users/lexalexander/Documents/framewise/frames";
      await fs.promises.rmdir(dirPath, { recursive: true });
      const ffmpegProcess = new ffmpeg(
        "/Users/lexalexander/Documents/framewise/future-lil-demon.mp4",
      );

      ffmpegProcess.then(function (video) {
        video
          .fnExtractFrameToJPG(
            "/Users/lexalexander/Documents/framewise/frames",
            {
              frame_rate: 1,
              file_name: "%01d_frame_%t_%s",
            },
            async (error, files) => {
              
              const entries = fs.readdirSync(dirPath, { withFileTypes: true });
              const arrEntries = Array.from(entries).slice(0, 10);
              const filePaths = arrEntries.map((entry) =>
                path.join(dirPath, entry.name),
              );
              const analyzeFileBatches = [];
              const contentArr = [];

              const prearedFiles = [];
              const preparedBatches = [];
              const defaultBatchSize = 5;
              const totalFrames = filePaths.length;
              const totalBatches = Math.ceil(filePaths.length / defaultBatchSize)
              const progress = {
                totalFrames: totalFrames,
                totalBatches: totalBatches,
              };  

              eventEmitter.emit("progress", {
                totalFrames: totalFrames,
                totalBatches: totalBatches,
              });

              while (filePaths.length !== 0) {
                const currentFilePaths = filePaths.splice(0, 5);
                const currentReadStreams = currentFilePaths.map((filePath) =>
                  fs.createReadStream(filePath),
                );
                const createdFiles = await uploadFiles(currentReadStreams);

                prearedFiles.push(createdFiles);
              }

              let currentIndex = 0;

              while (prearedFiles.length !== 0) {
                const uploadedBatch = prearedFiles.shift();

                const content = uploadedBatch.flatMap((file) => [
                  {
                    type: "input_text",
                    text: `Frame ${++currentIndex} (${file.filename})`,
                  },
                  {
                    type: "input_image",
                    file_id: file.id,
                  },
                ]);
                console.log("Prepared content for batch:", content);
                preparedBatches.push(content);
              }

              for (const [batchIndex, content] of preparedBatches.entries()) {
                const response = await createResponse(content);

                eventEmitter.emit("processed", {
                  batchIndex,
                  frameCount: content.length / 2,
                  processedFrames: response,
                  outputText: response.output_text,
                });
              }
            },
          )
      });
      return {
        hello: 'world'
      }
    } 

    catch (err) {
      console.log("err is ", err);
    }
  });

  return eventEmitter;
};


const analyzeVideoEmitter = analyzeVideo();

analyzeVideoEmitter.on('progress', (data) => {
  console.log('Progress:', data);
});

analyzeVideoEmitter.on('processed', (data) => {
  console.log('processed:', data);
});


analyzeVideoEmitter.on('completed', (data) => {
  console.log("data is completed ", data)
})

analyzeVideoEmitter.on('wow', (data) => {
  console.log("", data)
})

analyzeVideoEmitter.emit('start');
analyzeVideoEmitter.on('processing_started', (data) => {
  console.log('Processing started:', data);
});