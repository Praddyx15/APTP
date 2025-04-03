/**
 * Type declarations for external modules without proper TypeScript definitions
 */

declare module 'stopword' {
  export function removeStopwords(words: string[]): string[];
}

declare module 'compromise-paragraphs' {
  const plugin: any;
  export default plugin;
}

declare module 'node-storage' {
  export class Storage {
    constructor(location: string);
    get(key: string): any;
    put(key: string, value: any): void;
    remove(key: string): void;
  }
}

// Fix for compromise library
declare module 'compromise' {
  // Function declaration
  function nlp(text: string): NlpInstance;
  
  // NlpInstance type with common methods
  interface NlpInstance {
    match(pattern: string): NlpInstance;
    out(format: string): any;
    text(): string;
    json(): any[];
    sentences(): NlpInstance;
    paragraphs(): NlpInstance;
    dates(): NlpInstance;
    places(): NlpInstance;
    people(): NlpInstance;
    organizations(): NlpInstance;
    length: number;
  }
  
  namespace nlp {
    function extend(plugin: any): void;
  }
  
  export default nlp;
}

// Fix for multer middleware
declare namespace Express {
  interface Request {
    file?: {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    };
    files?: {
      [fieldname: string]: Express.Multer.File[] | undefined;
    } | Express.Multer.File[];
  }
}