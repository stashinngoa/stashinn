import { createClient } from '../supabase/server';

export interface RenderedEmail {
  subject: string;
  html: string;
}

/**
 * Fetches an email template by slug and replaces {{variables}} with the provided payload.
 * Missing variables will fall back to an empty string.
 */
export async function renderTemplate(slug: string, payload: Record<string, string>): Promise<RenderedEmail> {
  const supabase = await createClient();

  const { data: template, error } = await supabase
    .from('email_templates')
    .select('subject, body_html, is_active')
    .eq('slug', slug)
    .single();

  if (error || !template) {
    throw new Error(`Template not found for slug: ${slug}`);
  }

  if (!template.is_active) {
    throw new Error(`Template ${slug} is inactive and cannot be rendered.`);
  }

  // Parse subject
  const parsedSubject = template.subject.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_: string, key: string) => {
    return payload[key] || '';
  });

  // Parse HTML
  const parsedHtml = template.body_html.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_: string, key: string) => {
    return payload[key] || '';
  });

  return {
    subject: parsedSubject,
    html: parsedHtml
  };
}
