import { cache } from 'react';
import { type ClassValue, clsx } from 'clsx';
import { Room } from 'livekit-client';
import { twMerge } from 'tailwind-merge';
import type { ReceivedChatMessage, TextStreamData } from '@livekit/components-react';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import type { AppConfig, SandboxConfig, StructuredMessage, WebSource, YouTubeVideo } from './types';

export const CONFIG_ENDPOINT = process.env.NEXT_PUBLIC_APP_CONFIG_ENDPOINT;
export const SANDBOX_ID = process.env.SANDBOX_ID;

export const THEME_STORAGE_KEY = 'theme-mode';
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function transcriptionToChatMessage(
  textStream: TextStreamData,
  room: Room
): ReceivedChatMessage {
  // Extract voice_output for TTS to prevent diagnostic_report from being spoken
  let processedText = textStream.text;

  try {
    // Try to parse as structured JSON
    const parsed = JSON.parse(textStream.text);
    if (parsed && parsed.voice_output && typeof parsed.voice_output === 'string') {
      // Use only voice_output for TTS - this prevents the entire diagnostic_report from being spoken
      processedText = parsed.voice_output;
      console.log('🔊 TTS: Extracted voice_output for TTS:', processedText);
    }
  } catch {
    // Not JSON, use original text
  }

  return {
    id: textStream.streamInfo.id,
    timestamp: textStream.streamInfo.timestamp,
    message: processedText, // This now contains only voice_output for TTS
    from:
      textStream.participantInfo.identity === room.localParticipant.identity
        ? room.localParticipant
        : Array.from(room.remoteParticipants.values()).find(
            (p) => p.identity === textStream.participantInfo.identity
          ),
  };
}

export function createRichTextOutput(textOutput: {
  content: string;
  web_sources?: WebSource[];
  youtube_videos?: YouTubeVideo[];
}): string {
  // Use a more robust method to handle markdown-like content and convert it to HTML.
  // For now, we'll focus on replacing newlines and rendering the structured data.
  let html = `<div class="prose prose-sm max-w-none">${textOutput.content.replace(/\n/g, '<br />')}</div>`;

  if (textOutput.web_sources && textOutput.web_sources.length > 0) {
    html += '<h3 class="mt-4 mb-2 text-base font-semibold">Sources</h3>';
    html += '<ul class="list-disc list-inside space-y-1">';
    textOutput.web_sources.forEach((source) => {
      html += `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${source.title}</a></li>`;
    });
    html += '</ul>';
  }

  if (textOutput.youtube_videos && textOutput.youtube_videos.length > 0) {
    html += '<h3 class="mt-4 mb-2 text-base font-semibold">Related Videos</h3>';
    html += '<div class="grid grid-cols-2 gap-2 pt-2">';
    textOutput.youtube_videos.forEach((video) => {
      // Ensure thumbnail exists before creating the img tag
      const thumbnailUrl =
        video.thumbnail || `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`;
      html += `
        <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="block group">
          <div class="aspect-video overflow-hidden rounded-lg border">
            <img src="${thumbnailUrl}" alt="${video.title}" class="w-full h-full object-cover transition-transform group-hover:scale-105" />
          </div>
          <p class="text-xs mt-1 text-gray-600 dark:text-gray-400">${video.title}</p>
        </a>
      `;
    });
    html += '</div>';
  }

  return html;
}

export function parseStructuredMessage(message: string): StructuredMessage {
  try {
    // The message from the backend should be a JSON string.
    const parsed = JSON.parse(message);

    // Check if the parsed object has the expected structure.
    if (
      parsed.voice_output &&
      parsed.diagnostic_report &&
      typeof parsed.diagnostic_report.content === 'string'
    ) {
      return {
        voice_output: parsed.voice_output,
        text_output: parsed.diagnostic_report, // Map diagnostic_report to text_output for compatibility
        html_output: createRichTextOutput(parsed.diagnostic_report),
      };
    }
  } catch {
    // If it's not a valid JSON or doesn't match the structure, treat it as plain text.
    console.warn('Message is not a valid structured message, treating as plain text:', message);
  }

  // Fallback for plain text messages or malformed JSON.
  return {
    voice_output: message,
    text_output: { content: message },
    html_output: `<div class="prose prose-sm max-w-none">${message.replace(/\n/g, '<br />')}</div>`,
  };
}

// https://react.dev/reference/react/cache#caveats
// > React will invalidate the cache for all memoized functions for each server request.
export const getAppConfig = cache(async (headers: Headers): Promise<AppConfig> => {
  if (CONFIG_ENDPOINT) {
    const sandboxId = SANDBOX_ID ?? headers.get('x-sandbox-id') ?? '';

    try {
      if (!sandboxId) {
        throw new Error('Sandbox ID is required');
      }

      const response = await fetch(CONFIG_ENDPOINT, {
        cache: 'no-store',
        headers: { 'X-Sandbox-ID': sandboxId },
      });

      const remoteConfig: SandboxConfig = await response.json();
      const config: AppConfig = { ...APP_CONFIG_DEFAULTS };

      for (const [key, entry] of Object.entries(remoteConfig)) {
        if (entry === null) continue;
        if (
          key in config &&
          typeof config[key as keyof AppConfig] === entry.type &&
          typeof config[key as keyof AppConfig] === typeof entry.value
        ) {
          // @ts-expect-error I'm not sure quite how to appease TypeScript, but we've thoroughly checked types above
          config[key as keyof AppConfig] = entry.value as AppConfig[keyof AppConfig];
        }
      }

      return config;
    } catch (error) {
      console.error('ERROR: getAppConfig() - lib/utils.ts', error);
    }
  }

  return APP_CONFIG_DEFAULTS;
});
