declare module "ffmpeg" {
  interface ExtractFrameOptions {
    frame_rate: number;
    file_name: string;
  }

  class Ffmpeg {
    constructor(videoPath: string);

    fnExtractFrameToJPG(
      outputDirectory: string,
      options: ExtractFrameOptions,
      callback: (error: Error | null, files?: string[]) => void,
    ): void;
  }

  export default Ffmpeg;
}
