/**
 * Synchronous parser for previewing templates in the UI without a database roundtrip.
 * This is isolated from the main email service to avoid importing server-only modules 
 * (like next/headers via supabase/server) into Client Components.
 */
export function renderPreview(html: string, variables: string[]): string {
  if (!html) return '';
  
  // Replace declared variables with dummy values
  let previewHtml = html;
  variables.forEach(v => {
    const regex = new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, 'g');
    previewHtml = previewHtml.replace(regex, `[Sample ${v}]`);
  });

  // Replace any undeclared variables left over
  previewHtml = previewHtml.replace(/\{\{\s*([\w]+)\s*\}\}/g, `[Sample $1]`);
  
  return previewHtml;
}
