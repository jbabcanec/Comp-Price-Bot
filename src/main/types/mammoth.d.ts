declare module 'mammoth' {
  interface ExtractTextResult {
    value: string;
    messages: any[];
  }

  interface ExtractOptions {
    buffer?: Buffer;
    path?: string;
  }

  export function extractRawText(options: ExtractOptions): Promise<ExtractTextResult>;
}