declare module 'node-storage' {
  export default class Storage {
    constructor(filename: string);
    get(key: string, defaultValue?: any): any;
    put(key: string, value: any): void;
    remove(key: string): void;
    clear(): void;
    exists(key: string): boolean;
  }
}