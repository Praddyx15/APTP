declare module 'pdf-parse';
declare module 'mammoth';
declare module 'tesseract.js' {
  export interface WorkerOptions {
    logger?: (message: any) => void;
    langPath?: string;
    [key: string]: any;
  }

  export interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
      lines: any[];
      words: any[];
      symbols: any[];
      [key: string]: any;
    };
  }

  export interface Worker {
    loadLanguage(lang: string): Promise<Worker>;
    initialize(lang: string): Promise<Worker>;
    recognize(image: string | ArrayBuffer | Buffer): Promise<RecognizeResult>;
    terminate(): Promise<void>;
    [key: string]: any;
  }

  export function createWorker(options?: WorkerOptions): Promise<Worker>;

  export interface Scheduler {
    addWorker(worker: Worker): Scheduler;
    addJob(job: any): Promise<any>;
    terminate(): Promise<void>;
  }

  export function createScheduler(): Scheduler;
}

declare module 'jsdom' {
  export class JSDOM {
    constructor(html: string);
    window: Window;
  }
}