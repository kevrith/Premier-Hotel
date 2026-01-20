/**
 * HTML Sanitization Utility
 * SECURITY: Prevents XSS attacks by sanitizing user-generated HTML
 * Uses DOMPurify to remove potentially malicious code
 */

import DOMPurify from 'dompurify';
import { useState, useCallback } from 'react';

/**
 * Sanitize HTML to prevent XSS attacks
 *
 * @param dirty - Potentially unsafe HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML safe for rendering
 *
 * @example
 * ```tsx
 * const userInput = '<img src=x onerror=alert(1)>';
 * const safe = sanitizeHtml(userInput);
 * // Result: '<img src="x">' (onerror removed)
 * ```
 */
export function sanitizeHtml(
  dirty: string,
  options?: any
): string {
  // Default configuration for maximum security
  const defaultConfig: any = {
    ALLOWED_TAGS: [
      // Text formatting
      'b', 'i', 'u', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Paragraphs and line breaks
      'p', 'br', 'hr',
      // Lists
      'ul', 'ol', 'li',
      // Links (sanitized)
      'a',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      // Containers
      'div', 'span',
      // Quotes and code
      'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: [
      // Links
      'href', 'title', 'target', 'rel',
      // Classes and IDs (for styling)
      'class', 'id',
      // ARIA attributes (for accessibility)
      'role', 'aria-label', 'aria-describedby',
      // Table attributes
      'colspan', 'rowspan',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
  };

  // Merge default config with user options
  const config = { ...defaultConfig, ...options };

  // Sanitize and return
  return DOMPurify.sanitize(dirty, config) as unknown as string;
}

/**
 * Sanitize plain text (removes ALL HTML tags)
 * Use this for names, titles, and other text that should never contain HTML
 *
 * @param dirty - Potentially unsafe string
 * @returns Plain text with all HTML removed
 *
 * @example
 * ```tsx
 * const userName = sanitizePlainText('<script>alert(1)</script>John Doe');
 * // Result: 'John Doe'
 * ```
 */
export function sanitizePlainText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize HTML for rich text editor output
 * Allows more HTML tags suitable for formatted content
 *
 * @param dirty - Potentially unsafe HTML from rich text editor
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeRichText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      // All basic formatting
      'b', 'i', 'u', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'a',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'div', 'span',
      'blockquote', 'code', 'pre',
      // Images (with src sanitization)
      'img',
      // Additional formatting
      'center', 'align',
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'rel',
      'class', 'id', 'style', // Allow inline styles for rich text
      'role', 'aria-label', 'aria-describedby',
      'colspan', 'rowspan',
      'src', 'alt', 'width', 'height', // For images
      'align', // For text alignment
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize URL to prevent javascript: and data: URI XSS
 *
 * @param url - Potentially malicious URL
 * @returns Safe URL or empty string if dangerous
 *
 * @example
 * ```tsx
 * const safeUrl = sanitizeUrl('javascript:alert(1)');
 * // Result: '' (blocked)
 *
 * const validUrl = sanitizeUrl('https://example.com');
 * // Result: 'https://example.com' (allowed)
 * ```
 */
export function sanitizeUrl(url: string): string {
  const sanitized = DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Check if URL is safe
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'sms:'];
  try {
    const urlObj = new URL(sanitized, window.location.href);
    if (!safeProtocols.includes(urlObj.protocol)) {
      return ''; // Block dangerous protocols
    }
    return sanitized;
  } catch {
    // Invalid URL, return empty string
    return '';
  }
}

/**
 * React component wrapper for sanitized HTML
 * Use this to safely render user-generated HTML in React
 *
 * @example
 * ```tsx
 * <SafeHtml html={userGeneratedContent} />
 *
 * // Or with custom sanitization
 * <SafeHtml
 *   html={richTextContent}
 *   sanitize={sanitizeRichText}
 * />
 * ```
 */
interface SafeHtmlProps {
  html: string;
  className?: string;
  sanitize?: (dirty: string) => string;
}

export function SafeHtml({
  html,
  className,
  sanitize = sanitizeHtml
}: SafeHtmlProps) {
  const cleanHtml = sanitize(html);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

/**
 * Hook for sanitizing form input in real-time
 *
 * @example
 * ```tsx
 * const [value, setValue] = useSanitizedInput('');
 *
 * <input
 *   value={value}
 *   onChange={(e) => setValue(e.target.value)}
 * />
 * ```
 */
export function useSanitizedInput(
  initialValue: string = '',
  sanitizeFn: (value: string) => string = sanitizePlainText
) {
  const [value, setValueInternal] = useState(sanitizeFn(initialValue));

  const setValue = useCallback((newValue: string) => {
    setValueInternal(sanitizeFn(newValue));
  }, [sanitizeFn]);

  return [value, setValue] as const;
}

/**
 * Sanitize object properties recursively
 * Useful for sanitizing entire API responses or form data
 *
 * @param obj - Object with potentially unsafe string values
 * @param sanitizeFn - Sanitization function to apply
 * @returns Object with all strings sanitized
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sanitizeFn: (value: string) => string = sanitizePlainText
): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeFn(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeFn(item) : item
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, sanitizeFn);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Configuration for different content types
 */
export const SANITIZE_CONFIGS = {
  // For customer names, emails, etc.
  STRICT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  // For comments, descriptions
  BASIC: {
    ALLOWED_TAGS: ['b', 'i', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  // For rich content (blog posts, etc.)
  RICH: {
    ALLOWED_TAGS: [
      'b', 'i', 'u', 'strong', 'em', 'p', 'br', 'h1', 'h2', 'h3',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    KEEP_CONTENT: true,
  },
} as const;

export default {
  sanitizeHtml,
  sanitizePlainText,
  sanitizeRichText,
  sanitizeUrl,
  sanitizeObject,
  SafeHtml,
  useSanitizedInput,
  SANITIZE_CONFIGS,
};
