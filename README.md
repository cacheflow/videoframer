# Videoframer

Analyze video with multimodal AI, one frame at a time.

Videoframer is a Node.js library that extracts chronologically ordered frames from
a local video, groups them into batches, and sends them to OpenAI, Anthropic, or
Google multimodal models.

## Features

- Extract JPEG frames from video with FFmpeg
- Preserve natural frame order across model requests
- Limit frames and tune extraction rate and batch size
- Select OpenAI, Anthropic, or Google models through one API
- Receive typed lifecycle and progress events
- Remove generated frames automatically or keep them for inspection
- Import as a native ESM package
- Use bundled TypeScript declarations

## Requirements

- Node.js 20 or newer
- FFmpeg available on your system `PATH`
- An API key for the selected model provider

Install FFmpeg on macOS:

```bash
brew install ffmpeg
```

Install FFmpeg on Ubuntu or Debian:

```bash
sudo apt update
sudo apt install ffmpeg
```

Verify the installation:

```bash
ffmpeg -version
```

## Installation

```bash
npm install videoframer
```

Videoframer is an ESM package:

```js
import { Videoframer } from "videoframer";
```

TypeScript resolves the bundled declarations automatically through the package
export map.

## Quick start

```js
import { Videoframer } from "videoframer";

const videoframer = new Videoframer({
  videoPath: "./videos/demo.mp4",
  framesDirectory: "./tmp/frames",
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1-mini",
  prompt: [
    "Analyze these frames as one continuous video.",
    "Summarize the important actions and changes in chronological order.",
  ].join(" "),
  frameRate: 1,
  batchSize: 5,
  maxFrames: 20,
});

videoframer.on("progress", (progress) => {
  console.log(
    `Processed ${progress.processedFrames} of ${progress.totalFrames} frames`,
  );
});

const analysis = await videoframer.analyze();

for (const batch of analysis.results) {
  console.log(batch.outputText);
}
```

Videoframer creates `framesDirectory` when necessary. It clears and recreates the
directory before extraction, then removes it after analysis unless `keepFrames`
is enabled.

## Configuration

Pass these options to `new Videoframer(options)`:

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `videoPath` | `string` | Yes | — | Path to the local video file |
| `framesDirectory` | `string` | Yes | — | Directory used for extracted frames |
| `apiKey` | `string` | Yes | — | API key for the selected provider |
| `provider` | `string` | Yes | `"chatgpt"` at runtime | Provider name or alias |
| `prompt` | `string` | Yes | Provider prompt when empty | Instructions used for every batch |
| `model` | `string` | No | `"gpt-5.6"` | Model name used to resolve an adapter |
| `frameRate` | `number` | No | `1` | FFmpeg frame extraction rate |
| `batchSize` | `number` | No | `5` | Frames sent in each sequential request |
| `maxFrames` | `number \| "all"` | No | `10` | Maximum number of naturally sorted frames to process |
| `keepFrames` | `boolean` | No | `false` | Keep the extracted-frame directory after analysis |

Set `maxFrames` to `"all"`, `0`, `-1`, or `Infinity` to process every extracted
frame.

The extraction rate and frame limit are separate controls. A higher
`frameRate` extracts more frames per second; `maxFrames` caps how many of those
frames are sent to the provider.

## Providers and models

Videoframer resolves adapters from the model name and provider alias.

| Provider | Accepted aliases | Recognized model families |
| --- | --- | --- |
| OpenAI | `openai`, `oai`, `chatgpt` | `gpt-*`, `o*` |
| Anthropic | `anthropic`, `claude` | `claude-*` |
| Google | `google`, `gemini` | `gemini-*` |

Examples:

```js
const openaivideoframer = new Videoframer({
  videoPath: "./video.mp4",
  framesDirectory: "./tmp/openai-frames",
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1-mini",
  prompt: "Summarize the video in chronological order.",
});

const claudevideoframer = new Videoframer({
  videoPath: "./video.mp4",
  framesDirectory: "./tmp/claude-frames",
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-sonnet-4",
  prompt: "Describe the important visual changes.",
});

const geminivideoframer = new Videoframer({
  videoPath: "./video.mp4",
  framesDirectory: "./tmp/gemini-frames",
  provider: "google",
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  prompt: "Identify the main actions in order.",
});
```

Do not commit provider API keys to source control.

## Analysis result

`analyze()` resolves to:

```ts
interface AnalysisResult {
  startTime: number;
  completedAt: number;
  durationMs: number;
  totalFrames: number;
  totalBatches: number;
  results: Array<{
    batchIndex: number;
    frameCount: number;
    processedFrames: number;
    outputText: string;
  }>;
}
```

Each batch produces its own model response. Frame labels continue across
batches, and requests run sequentially.

```js
const result = await videoframer.analyze();
const combinedOutput = result.results
  .map((batch) => batch.outputText)
  .join("\n\n");
```

## Events

Attach listeners before calling `analyze()`:

```js
videoframer.on("started", ({ startTime }) => {
  console.log("Started:", startTime);
});

videoframer.on("progress", (event) => {
  console.log({
    totalFrames: event.totalFrames,
    totalBatches: event.totalBatches,
    processedFrames: event.processedFrames,
    processedBatches: event.processedBatches,
  });
});

videoframer.on("completed", (result) => {
  console.log(`Completed in ${result.durationMs}ms`);
});

videoframer.on("error", (error) => {
  console.error("Analysis failed:", error);
});

await videoframer.analyze();
```

| Event | Emitted when |
| --- | --- |
| `started` | Input paths have been validated and processing begins |
| `progress` | Batches are initialized and after each batch completes |
| `completed` | Every batch has been processed |
| `error` | Frame extraction or another pipeline operation fails |

An error is emitted and then rethrown, so callers can use both an event listener
and `try`/`catch`:

```js
try {
  await videoframer.analyze();
} catch (error) {
  console.error(error);
}
```

## How it works

```text
Local video
  -> extract JPEG frames with FFmpeg
  -> naturally sort and limit frames
  -> split frames into ordered batches
  -> upload or encode each batch
  -> send each batch to the selected model
  -> return per-batch output and timing data
  -> remove extracted frames unless keepFrames is true
```

Each image is preceded by a text label such as `Frame 4 (4_frame.jpg)` so frame
numbers remain continuous across batches.

## Development

Install dependencies:

```bash
npm install
```

Run the type checker:

```bash
npm run typecheck
```

Run the build and tests:

```bash
npm test
```

Build the publishable `dist` package:

```bash
npm run build
```

Preview the files included in the npm package:

```bash
npm pack --dry-run
```

## License

ISC
