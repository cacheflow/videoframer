
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

export interface ProcessingProgressEvent {
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