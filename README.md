# Framewise

**Analyze videos with multimodal AI, one frame at a time.**

Framewise is a Node.js library for extracting representative frames from video and sending them to multimodal AI models as one continuous visual sequence.

Give Framewise a video, a model, and a question. It handles frame extraction, ordering, batching, uploads, and model communication.

```js
const analysis = await framewise.analyze("./video.mp4", {
  prompt: "Describe the important actions and changes in this video.",
});

console.log(analysis.output);
```

## Why Framewise?

Most multimodal APIs understand images, but application developers work with videos.

Turning a video into useful model input means handling several separate concerns:

* Converting video formats
* Extracting frames
* Preserving chronological order
* Avoiding unnecessary frames
* Uploading files
* Staying within provider limits
* Constructing a useful multimodal prompt
* Tracking progress and failures

Framewise puts that pipeline behind one JavaScript API.

## Features

* Extract ordered frames from local video files
* Analyze frames as one continuous video
* Select the multimodal model during initialization
* Ask custom questions about a video
* Receive lifecycle and processing events
* Control frame sampling and output quality
* Use a provider-independent API
* Clean up temporary frames and uploaded files
* Built for Node.js and server-side applications

## Installation

```bash
npm install framewise
```

Framewise uses FFmpeg for video processing. Make sure FFmpeg is installed and available in your system path.

### macOS

```bash
brew install ffmpeg
```

### Ubuntu and Debian

```bash
sudo apt update
sudo apt install ffmpeg
```

### Verify your installation

```bash
ffmpeg -version
```

## Quick start

```js
import Framewise from "framewise";

const framewise = new Framewise({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-5.6",
});

const result = await framewise.analyze("./videos/dog.mp4", {
  prompt: [
    "Analyze this video as one continuous sequence.",
    "Describe the important actions.",
    "Call out meaningful changes between frames.",
  ].join(" "),
});

console.log(result.output);
```

## Environment variables

```bash
OPENAI_API_KEY=your-api-key
```

Avoid committing API keys to source control.

```js
const framewise = new Framewise({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-5.6",
});
```

## Model selection

Choose the model when creating the Framewise client.

```js
const framewise = new Framewise({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-5.6",
});
```

Framewise maps known model names to the appropriate provider adapter.

```js
const framewise = new Framewise({
  model: "gpt-5.6",
  apiKey: process.env.OPENAI_API_KEY,
});
```

Initial releases support OpenAI multimodal models. Additional provider adapters are planned.

## Analyze a video

```js
const result = await framewise.analyze("./video.mp4", {
  prompt: "Summarize what happens in this video.",
});
```

### With frame controls

```js
const result = await framewise.analyze("./video.mp4", {
  prompt: "Identify each major action in chronological order.",
  frameInterval: 2,
  maxFrames: 40,
  outputDirectory: "./frames",
});
```

| Option            | Type          | Description                             |
| ----------------- | ------------- | --------------------------------------- |
| `prompt`          | `string`      | Instructions sent to the model          |
| `frameInterval`   | `number`      | Time between sampled frames, in seconds |
| `maxFrames`       | `number`      | Maximum number of frames to analyze     |
| `outputDirectory` | `string`      | Directory used for extracted frames     |
| `cleanup`         | `boolean`     | Remove generated files after analysis   |
| `signal`          | `AbortSignal` | Cancel an active analysis               |

## Progress events

Video analysis can involve extraction, uploads, and model processing. Framewise exposes lifecycle events so applications can report progress without waiting silently for the final response.

```js
const analysis = framewise.analyze("./video.mp4", {
  prompt: "Describe what happens in the video.",
});

analysis.on("processing_started", ({ startTime }) => {
  console.log("Analysis started:", startTime);
});

analysis.on("frames_extracted", ({ frameCount }) => {
  console.log(`Extracted ${frameCount} frames`);
});

analysis.on("upload_progress", ({ completed, total }) => {
  console.log(`Uploaded ${completed} of ${total}`);
});

analysis.on("processing_completed", ({ duration }) => {
  console.log(`Finished in ${duration}ms`);
});

analysis.on("error", (error) => {
  console.error(error);
});

const result = await analysis;
```

## Example prompts

### General summary

```js
const result = await framewise.analyze("./video.mp4", {
  prompt: `
    Treat these frames as one continuous video.
    Summarize what happens in chronological order.
    Focus on meaningful actions and changes.
  `,
});
```

### Motion analysis

```js
const result = await framewise.analyze("./video.mp4", {
  prompt: `
    Infer motion and changes between consecutive frames.
    Identify the main subject.
    Describe where the subject moves and what actions it performs.
  `,
});
```

### Structured output

```js
const result = await framewise.analyze("./video.mp4", {
  prompt: `
    Analyze the video and return JSON with this shape:

    {
      "summary": "string",
      "subjects": ["string"],
      "actions": [
        {
          "description": "string",
          "approximateTime": "string"
        }
      ],
      "notableChanges": ["string"]
    }
  `,
});
```

### Security footage

```js
const result = await framewise.analyze("./camera.mp4", {
  prompt: `
    Describe every significant event in chronological order.
    Note when people or vehicles enter and leave the scene.
    Do not infer identity or intent from appearance alone.
  `,
});
```

### Product and UX review

```js
const result = await framewise.analyze("./screen-recording.mp4", {
  prompt: `
    Review this product walkthrough.
    Identify the user flow, interface changes, errors,
    confusing transitions, and possible usability issues.
  `,
});
```

## How it works

Framewise runs a small video-processing pipeline:

```text
Video
  │
  ▼
Inspect metadata
  │
  ▼
Select timestamps
  │
  ▼
Extract ordered frames
  │
  ▼
Upload or encode frames
  │
  ▼
Build multimodal request
  │
  ▼
Analyze with selected model
  │
  ▼
Return result
```

Every frame is labeled and placed in chronological order.

```text
Frame 1 — 00:00
Frame 2 — 00:02
Frame 3 — 00:04
```

The model is instructed to interpret the frames as observations from the same continuous video rather than unrelated images.

## Frame sampling

Sending every frame from a video would be slow, expensive, and usually unnecessary.

A 30-second video recorded at 30 frames per second contains approximately 900 frames. Many of those frames are nearly identical.

Framewise samples the video so the model receives enough temporal information to understand what changed without processing every frame.

For videos with rapid motion, use a shorter interval:

```js
{
  frameInterval: 0.5
}
```

For long videos with slower changes, use a longer interval:

```js
{
  frameInterval: 5
}
```

Frame sampling is a tradeoff:

* More frames preserve more detail.
* Fewer frames reduce latency and model cost.
* Uniform sampling is predictable.
* Scene-aware sampling can preserve important transitions more efficiently.

## Error handling

```js
try {
  const result = await framewise.analyze("./video.mp4", {
    prompt: "Summarize this video.",
  });

  console.log(result.output);
} catch (error) {
  if (error.code === "VIDEO_NOT_FOUND") {
    console.error("The requested video does not exist.");
  } else if (error.code === "FFMPEG_NOT_FOUND") {
    console.error("FFmpeg is not installed or cannot be found.");
  } else if (error.code === "MODEL_REQUEST_FAILED") {
    console.error("The model provider rejected the request.");
  } else {
    console.error(error);
  }
}
```

## Supported inputs

Framewise is designed to support common formats that FFmpeg can decode, including:

* MP4
* MOV
* WebM
* AVI
* MKV

Actual codec support depends on the FFmpeg installation available in your environment.

## Use cases

Framewise can power:

* Video summaries
* Security-footage review
* Sports and motion analysis
* Product-demo analysis
* Accessibility descriptions
* Content moderation workflows
* Manufacturing inspection
* Animal behavior analysis
* Screen-recording and UX review
* Video search and indexing
* Dataset annotation

## Provider architecture

Framewise uses adapters to keep its public API independent from individual model SDKs.

```text
Framewise
  ├── OpenAI adapter
  ├── Anthropic adapter
  ├── Google adapter
  └── Additional adapters
```

Model providers do not expose identical interfaces. Framewise normalizes their differences while preserving provider-specific capabilities where useful.

## Roadmap

* OpenAI multimodal analysis
* Anthropic Claude support
* Google Gemini support
* Streaming analysis events
* URL and readable-stream inputs
* Scene-change detection
* Automatic frame selection
* Concurrent upload controls
* Structured-output helpers
* Video metadata in model context
* Audio transcription
* Combined audio and visual analysis
* Custom provider adapters

## Requirements

* Node.js 20 or newer
* FFmpeg
* An API key for the selected model provider

## Development

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/framewise.git
cd framewise
```

Install dependencies:

```bash
npm install
```

Run the test suite:

```bash
npm test
```

## Contributing

Contributions are welcome.

Before opening a pull request:

1. Create a focused branch.
2. Add or update tests.
3. Run the test suite.
4. Explain the behavior being changed.
5. Avoid unrelated formatting changes.

For larger features, open an issue first so the implementation can be discussed before substantial work begins.

## License

MIT

---

Built for developers who want to understand video without building an entire media-processing pipeline first.
