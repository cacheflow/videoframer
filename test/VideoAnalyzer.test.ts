import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  VideoAnalyzer,
  type VideoAnalyzerOptions,
  type BatchResult,
  type InputTextContent,
} from "../dist/app.ts";

const createAnalyzer = (overrides: Partial<VideoAnalyzerOptions> = {}) =>
  new VideoAnalyzer({
    videoPath: "/tmp/video.mp4",
    apiKey: "test-key",
    framesDirectory: "/tmp/frames",
    ...overrides,
  });

test("creates batches without dropping a partial final batch", () => {
  const analyzer = createAnalyzer({ batchSize: 2 });

  assert.deepEqual(analyzer.createBatches(["a", "b", "c", "d", "e"]), [
    ["a", "b"],
    ["c", "d"],
    ["e"],
  ]);
  assert.deepEqual(analyzer.createBatches([]), []);
});

test("returns naturally sorted file paths capped by maxFrames", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "framewise-"));
  const framesDirectory = path.join(root, "frames");
  await mkdir(framesDirectory);
  await Promise.all(
    ["10_frame.jpg", "2_frame.jpg", "1_frame.jpg"].map((name) =>
      writeFile(path.join(framesDirectory, name), name),
    ),
  );
  await mkdir(path.join(framesDirectory, "ignored-directory"));

  const analyzer = createAnalyzer({ framesDirectory, maxFrames: 2 });

  assert.deepEqual(await analyzer.getFramePaths(), [
    path.join(framesDirectory, "1_frame.jpg"),
    path.join(framesDirectory, "2_frame.jpg"),
  ]);
});

test("prepares sequential multimodal content across batches", () => {
  const analyzer = createAnalyzer();

  assert.deepEqual(
    analyzer.prepareContentBatch(
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
  const analyzer = createAnalyzer();
  const requestedBatches: string[][] = [];
  const contents: any[] = [];
  const progress: number[] = [];

  analyzer.uploadFrameBatch = async (batch: string[]) => {
    requestedBatches.push(batch);
    return batch.map((filename) => ({ id: `id-${filename}`, filename }));
  };
  analyzer.createResponse = async (content: any) => {
    contents.push(content);
    return { output_text: `response-${contents.length}` };
  };

  const results = await analyzer.uploadBatches({
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
    results.map(({ batchIndex, frameCount, processedFrames, outputText }) => ({
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
  const analyzer = createAnalyzer({ batchSize: 2 });
  const calls: string[] = [];
  const events: [string, any][] = [];

  analyzer.prepareFramesDirectory = async () => {
    calls.push("prepare");
  };
  analyzer.extractFrames = async () => {
    calls.push("extract");
  };
  analyzer.getFramePaths = async () => ["1.jpg", "2.jpg", "3.jpg"];
  analyzer.uploadBatches = async ({
    batches,
    onUpload,
  }): Promise<BatchResult[]> => {
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

  analyzer.on("started", (payload) => events.push(["started", payload]));
  analyzer.on("progress", (payload) => events.push(["progress", payload]));
  analyzer.on("completed", (payload) => events.push(["completed", payload]));

  const result = await analyzer.analyze();
  const startedEvents = events.filter(([name]) => name === "started");
  const getEvents = (name: string) =>
    events.filter(([eventName]) => eventName === name);
  const processedFrames = getEvents("progress").map(
    ([, payload]) => payload.processedFrames,
  );
  assert.deepEqual(calls, ["prepare", "extract"]);
  assert.equal(result.totalFrames, 3);
  assert.equal(result.totalBatches, 2);

  assert.equal(startedEvents.length, 1);
  assert.equal(getEvents("progress").length, 3);
  assert.equal(getEvents("started").length, 1);
  assert.equal(getEvents("started").length, 1);

  assert.equal(processedFrames.length, 3);
  assert.equal(events.at(-1)?.[0], "completed");
});

test("emits and rethrows pipeline errors", async () => {
  const analyzer = createAnalyzer();
  const expected = new Error("frame extraction failed");
  let emitted: Error | undefined;

  analyzer.prepareFramesDirectory = async () => {};
  analyzer.extractFrames = async () => {
    throw expected;
  };
  analyzer.on("error", (error: Error) => {
    emitted = error;
  });

  await assert.rejects(analyzer.analyze(), expected);
  assert.equal(emitted, expected);
});
