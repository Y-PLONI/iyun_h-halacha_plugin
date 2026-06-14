/// <reference types="vite/client" />

// קבצי .docx מיובאים כמחרוזת base64 (ראה docxBase64 ב-vite.config.ts)
declare module '*.docx' {
  const base64: string;
  export default base64;
}

// mammoth (browser build) — הצהרה מינימלית, אין טיפוסים מובנים בחבילה.
declare module 'mammoth/mammoth.browser.min.js' {
  interface ConvertResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  const mammoth: {
    convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
  };
  export default mammoth;
}
