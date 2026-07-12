import { describe, expect, it } from 'vitest';
import { renderPreview } from '../src/services/email';

describe('Email Template Parser Engine', () => {
  it('Should replace defined variables with sample text in preview mode', () => {
    const html = '<p>Hello {{name}}, your booking {{ booking_ref }} is confirmed.</p>';
    const result = renderPreview(html, ['name', 'booking_ref']);
    
    expect(result).toBe('<p>Hello [Sample name], your booking [Sample booking_ref] is confirmed.</p>');
  });

  it('Should handle excessive whitespace inside curly braces', () => {
    const html = '<p>Total: {{   amount   }}</p>';
    const result = renderPreview(html, ['amount']);
    
    expect(result).toBe('<p>Total: [Sample amount]</p>');
  });

  it('Should automatically replace undeclared variables with sample text', () => {
    const html = '<p>Dear {{ unknown_var }}</p>';
    // We pass empty variables list, but it should still catch it
    const result = renderPreview(html, []);
    
    expect(result).toBe('<p>Dear [Sample unknown_var]</p>');
  });

  it('Should safely return empty string if HTML is empty', () => {
    const result = renderPreview('', ['test']);
    expect(result).toBe('');
  });
});
