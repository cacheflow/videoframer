import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { mock } from "node:test";
import { Videoframer } from "../dist/esm/app.js";

import type {
  VideoframerOptions,
  BatchResult,
  InputTextContent,
  UploadBatchesOptions,
  ProcessingStartedEvent,
  ProcessingProgressEvent,
  AnalysisResult,
} from "../types/app.js";

mock.method(fs, "existsSync", (filePath: any) => {
  const p = String(filePath);
  if (p === "nonexistent.mp4" || p === "nonexistent-frames") {
    return false;
  }
  return true;
});

const createVideoframer = (overrides: Partial<VideoframerOptions> = {}) =>
  new Videoframer({
    videoPath: "/tmp/video.mp4",
    apiKey: "test-key",
    framesDirectory: "/tmp/frames",
    provider: "chatgpt",
    prompt: "Analyze the video frames.",
    ...overrides,
  });

test("creates batches without dropping a partial final batch", () => {
  const videoframer = createVideoframer({ batchSize: 2 });

  assert.deepEqual(videoframer.createBatches(["a", "b", "c", "d", "e"]), [
    ["a", "b"],
    ["c", "d"],
    ["e"],
  ]);
  assert.deepEqual(videoframer.createBatches([]), []);
});

test("returns naturally sorted file paths capped by maxFrames", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "videoframer-"));
  const framesDirectory = path.join(root, "frames");
  await mkdir(framesDirectory);
  await Promise.all(
    ["10_frame.jpg", "2_frame.jpg", "1_frame.jpg"].map((name) =>
      writeFile(path.join(framesDirectory, name), name),
    ),
  );
  await mkdir(path.join(framesDirectory, "ignored-directory"));

  const videoframer = createVideoframer({ framesDirectory, maxFrames: 2 });

  assert.deepEqual(await videoframer.getFramePaths(), [
    path.join(framesDirectory, "1_frame.jpg"),
    path.join(framesDirectory, "2_frame.jpg"),
  ]);
});

test("prepares sequential multimodal content across batches", () => {
  const videoframer = createVideoframer();

  assert.deepEqual(
    videoframer.prepareContentBatch(
      [
        { id: "file-1", filename: "one.jpg" },
        { id: "file-2", filename: "two.jpg" },
      ],
      3,
    ),
    {
      content: [
        { type: "input_text", text: "Frame 4 (one.jpg)" },
        { type: "input_image", file_id: "file-1" },
        { type: "input_text", text: "Frame 5 (two.jpg)" },
        { type: "input_image", file_id: "file-2" },
      ],
      nextFrameIndex: 5,
    },
  );
});

test("uploads batches sequentially and reports cumulative progress", async () => {
  const videoframer = createVideoframer();
  const requestedBatches: string[][] = [];
  const contents: any[] = [];
  const progress: number[] = [];

  videoframer.uploadFrameBatch = async (batch: string[]) => {
    requestedBatches.push(batch);
    return batch.map((filename) => ({ id: `id-${filename}`, filename }));
  };
  videoframer.createResponse = async (content: any) => {
    contents.push(content);
    return { output_text: `response-${contents.length}` };
  };

  const results = await videoframer.uploadBatches({
    batches: [["one.jpg", "two.jpg"], ["three.jpg"]],
    onUpload: (result: BatchResult) => progress.push(result.processedFrames),
  });

  assert.deepEqual(requestedBatches, [["one.jpg", "two.jpg"], ["three.jpg"]]);
  assert.equal(
    (contents[1][0] as InputTextContent).text,
    "Frame 3 (three.jpg)",
  );
  assert.deepEqual(progress, [2, 3]);
  assert.deepEqual(
    results.map(({ batchIndex, frameCount, processedFrames, outputText }: BatchResult) => ({
      batchIndex,
      frameCount,
      processedFrames,
      outputText,
    })),
    [
      {
        batchIndex: 0,
        frameCount: 2,
        processedFrames: 2,
        outputText: "response-1",
      },
      {
        batchIndex: 1,
        frameCount: 1,
        processedFrames: 3,
        outputText: "response-2",
      },
    ],
  );
});

test("runs the pipeline and emits lifecycle events", async () => {
  const videoframer = createVideoframer({ batchSize: 2 });
  const calls: string[] = [];
  const events: [string, any][] = [];

  videoframer.prepareFramesDirectory = async () => {
    calls.push("prepare");
  };
  videoframer.extractFrames = async () => {
    calls.push("extract");
  };
  videoframer.getFramePaths = async () => ["1.jpg", "2.jpg", "3.jpg"];
  videoframer.uploadBatches = async ({
    batches,
    onUpload,
  }: UploadBatchesOptions): Promise<BatchResult[]> => {
    assert.deepEqual(batches, [["1.jpg", "2.jpg"], ["3.jpg"]]);
    onUpload?.({
      batchIndex: 0,
      frameCount: 2,
      processedFrames: 2,
      outputText: "done",
    });
    onUpload?.({
      batchIndex: 1,
      frameCount: 1,
      processedFrames: 3,
      outputText: "done",
    });
    return [
      { batchIndex: 0, frameCount: 2, processedFrames: 2, outputText: "done" },
    ];
  };

  videoframer.on("started", (payload: ProcessingStartedEvent) => events.push(["started", payload]));
  videoframer.on("progress", (payload: ProcessingProgressEvent) => events.push(["progress", payload]));
  videoframer.on("completed", (payload: AnalysisResult) => events.push(["completed", payload]));

  const result = await videoframer.analyze();
  const startedEvents = events.filter(([name]) => name === "started");
  const getEvents = (name: string) =>
    events.filter(([eventName]) => eventName === name);
  const processedFrames = getEvents("progress").map(
    ([, payload]) => payload.processedFrames,
  );
  assert.deepEqual(calls, ["prepare", "extract"]);
  assert.equal(result.totalFrames, 3);

  assert.equal(startedEvents.length, 1);
  assert.equal(getEvents("progress").length, 3);
  assert.equal(getEvents("started").length, 1);
  assert.equal(getEvents("started").length, 1);

  assert.equal(processedFrames.length, 3);
  assert.equal(events.at(-1)?.[0], "completed");
});

test("emits and rethrows pipeline errors", async () => {
  const videoframer = createVideoframer();
  const expected = new Error("frame extraction failed");
  let emitted: Error | undefined;

  videoframer.prepareFramesDirectory = async () => {};
  videoframer.extractFrames = async () => {
    throw expected;
  };
  videoframer.on("error", (error: Error) => {
    emitted = error;
  });

  await assert.rejects(videoframer.analyze(), expected);
  assert.equal(emitted, expected);
});

test("throws an error if the video file does not exist", async () => {
  const videoframer = createVideoframer({ videoPath: "nonexistent.mp4" });
  await assert.rejects(
    videoframer.analyze(),
    /Error: Video file does not exist at path nonexistent.mp4/,
  );
});

test("creates frames directory if it does not exist", async () => {
  const videoframer = createVideoframer({ framesDirectory: "./test-frames" });
  await videoframer.prepareFramesDirectory();
  assert.ok(fs.existsSync(path.resolve("./test-frames")));
});

test("throws an error if frames directory is nullish", async () => {
  const videoframer = createVideoframer({
    videoPath: "nonexistent.mp4",
    framesDirectory: undefined,
  });

  await assert.rejects(
    videoframer.analyze(),
    /Error: It looks like framesDirectory is missing. You passed undefined/,
  );
});
