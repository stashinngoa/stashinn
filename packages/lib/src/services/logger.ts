/**
 * Centralized Error Logger & Alerting Integration
 * 
 * In a production environment, this would be wired up to Sentry or Datadog.
 * For now, it provides a centralized interface for capturing exceptions and 
 * critical business logic failures.
 */

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, context || '');
  },

  warn: (message: string, context?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, context || '');
  },

  error: (error: Error | string, context?: Record<string, any>) => {
    const message = typeof error === 'string' ? error : error.message;
    console.error(`[ERROR] ${message}`, context || '');
    
    // TODO: Initialize Sentry here if NEXT_PUBLIC_SENTRY_DSN is available
    // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //   Sentry.captureException(error, { extra: context });
    // }
  },

  // Specialized method for critical payment/settlement failures that require immediate alerting
  critical: (message: string, error: Error | any, context?: Record<string, any>) => {
    console.error(`[CRITICAL ALERT] ${message}`, error, context || '');
    // In production, this might trigger a PagerDuty alert or send a Slack webhook
    // e.g. sendSlackAlert(`URGENT: ${message}\nError: ${error.message}`);
  }
};
