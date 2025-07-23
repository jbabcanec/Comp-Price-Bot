declare module 'eml-parser' {
  interface ParsedEmail {
    subject?: string;
    from?: string;
    to?: string;
    date?: string;
    text?: string;
    html?: string;
    textBody?: string;
    htmlBody?: string;
    attachments?: Array<{
      name?: string;
      filename?: string;
      data?: Buffer;
      contentType?: string;
    }>;
  }

  export function parseEml(content: string): Promise<ParsedEmail>;
  export function parseMsg(buffer: Buffer): Promise<ParsedEmail>;
}