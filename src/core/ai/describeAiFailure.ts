import type { GroqProxyError } from '@/core/ai/groqProxyClient';

/**
 * Every AI-call failure previously showed an identical generic message
 * regardless of cause — a missing GROQ_API_KEY on the deployment
 * looked exactly the same as a transient network blip, which cost
 * real debugging time to actually diagnose. Each reason gets its own
 * honest, specific, actionable message. Shared between
 * SyllabusUploadCard (assignment extraction) and CourseDetailScreen
 * (reading-to-notes summarization) — same underlying failure modes,
 * same messages, phrased generically enough ("couldn't be processed
 * right now") to fit either context without needing a caller-supplied
 * default per call site.
 */
export function describeAiFailure(reason: GroqProxyError['reason'] | null): string {
  switch (reason) {
    case 'not_configured':
      return "The AI service isn't set up on this deployment yet — GROQ_API_KEY needs to be added in Vercel's Project Settings → Environment Variables, then redeployed. This isn't something you can fix from inside the app.";
    case 'rate_limited':
      return "Too many requests right now — wait a minute and try again.";
    case 'network_error':
      return "Couldn't reach the AI service — check your connection and try again.";
    case 'upstream_error':
      return "The AI service is temporarily unavailable — try again in a moment.";
    case 'invalid_request':
      return "That couldn't be processed — try a shorter section, or a different file.";
    default:
      return "Couldn't process that just now — try again in a moment.";
  }
}
