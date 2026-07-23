export type FramerateOptions = "all" | -1 | 0;

export interface VideoframerOptions {
  videoPath: string;
  apiKey: string;
  provider: string;
  prompt?: string;
  framesDirectory: string;
  model?: string;
  frameRate?: number;
  batchSize?: number;
  maxFrames?: number | "all";
  keepFrames?: boolean;
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
  processedFrames?: number;
  processedBatches?: number;
}

export interface ProcessingProgressEvent {
  startTime?: number;
  totalFrames?: number;
  processedFrames?: number;
  processedBatches?: number;
}

export interface ProgressEvent {
  totalFrames: number;
  processedFrames: number;
  processedBatches: number;
}

export interface AnalysisResult {
  startTime: number;
  completedAt: number;
  durationMs: number;
  totalFrames: number;
  results: BatchResult[];
}
