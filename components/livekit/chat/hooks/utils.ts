import * as React from 'react';
import type { MessageFormatter, ReceivedChatMessage } from '@livekit/components-react';

// Types for structured content
interface WebSource {
  url: string;
  title: string;
}

interface YouTubeVideo {
  url: string;
  title: string;
  thumbnail: string;
  video_id: string;
}

interface StructuredTextData {
  content: string;
  web_sources?: WebSource[];
  youtube_videos?: YouTubeVideo[];
  has_external_sources?: boolean;
}

interface VoiceTextResponse {
  voice_output: string;
  text_output: StructuredTextData;
}

// Parse the special VOICE:content|||TEXT:content format
const parseStructuredMessage = (
  message: string
): { voice: string; text: string; isStructured: boolean } => {
  // First try to parse as direct JSON from backend
  try {
    const jsonData = JSON.parse(message) as VoiceTextResponse;
    if (jsonData.voice_output && jsonData.text_output) {
      return {
        voice: jsonData.voice_output,
        text: JSON.stringify(jsonData.text_output),
        isStructured: true,
      };
    }
  } catch {
    // Not direct JSON, try the VOICE|||TEXT format
  }

  // Try the VOICE|||TEXT format
  const structuredPattern = /^VOICE:([\s\S]*?)\|\|\|TEXT:([\s\S]*)$/;
  const match = message.match(structuredPattern);

  if (match) {
    const voiceContent = match[1];
    const textContent = match[2];

    return {
      voice: voiceContent,
      text: textContent,
      isStructured: true,
    };
  }

  return {
    voice: message,
    text: message,
    isStructured: false,
  };
};

// Create rich HTML content for structured text output
const createRichTextOutput = (textContent: string): string => {
  // Since backend now sends plain text with markdown, we'll process it directly
  let html = `<div class="diagnostic-content prose prose-sm max-w-none">`;

  // Enhanced formatting for diagnostic reports and point-wise content
  const formattedContent = textContent
    // Bold section headers (including **text**)
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="text-lg block mt-4 mb-2 text-blue-700 dark:text-blue-400">$1</strong>'
    )
    // Format bullet points (• character)
    .replace(/^• (.+)$/gm, '<li class="ml-4 mb-2 list-disc">$1</li>')
    // Format numbered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-2 list-decimal">$2</li>')
    // Handle markdown links [text](url)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors">$1</a>'
    )
    // Handle image markdown ![alt](url)
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-2 shadow-sm" loading="lazy" />'
    )
    // Convert plain URLs to clickable links
    .replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors break-all">$1</a>'
    )
    // Convert line breaks to HTML
    .replace(/\n/g, '<br>');

  html += `<div class="main-content text-gray-800 dark:text-gray-200 leading-relaxed">${formattedContent}</div>`;
  html += `</div>`;

  return html;
};

// Enhanced message formatter to handle URLs and structured content
const enhancedMessageFormatter = (message: string): string => {
  // Handle YouTube links and web URLs
  let formattedMessage = message;

  // Convert markdown-style links to HTML
  formattedMessage = formattedMessage.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors">$1</a>'
  );

  // Convert plain URLs to clickable links
  formattedMessage = formattedMessage.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors break-all">$1</a>'
  );

  // Convert **text** to bold
  formattedMessage = formattedMessage.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>'
  );

  // Format bullet points (• character)
  formattedMessage = formattedMessage.replace(
    /^• (.+)$/gm,
    '<li class="ml-4 mb-1 list-disc">$1</li>'
  );

  // Format numbered lists
  formattedMessage = formattedMessage.replace(
    /^(\d+)\. (.+)$/gm,
    '<li class="ml-4 mb-1 list-decimal">$2</li>'
  );

  // Handle image markdown ![alt](url)
  formattedMessage = formattedMessage.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-2 shadow-sm" loading="lazy" />'
  );

  // Preserve line breaks
  formattedMessage = formattedMessage.replace(/\n/g, '<br>');

  return formattedMessage;
};

export const useChatMessage = (entry: ReceivedChatMessage, messageFormatter?: MessageFormatter) => {
  const formattedMessage = React.useMemo(() => {
    const rawMessage = entry.message;

    // Parse the message to check if it's structured
    const { text, isStructured } = parseStructuredMessage(rawMessage);

    if (isStructured) {
      // For structured messages, we only show the TEXT part in chat
      // The VOICE part is used by TTS (handled by LiveKit)
      return createRichTextOutput(text);
    }

    // For regular messages, use the provided formatter or enhanced formatter
    if (messageFormatter) {
      const result = messageFormatter(rawMessage);
      return typeof result === 'string' ? result : rawMessage;
    }

    return enhancedMessageFormatter(rawMessage);
  }, [entry.message, messageFormatter]);

  const hasBeenEdited = !!entry.editTimestamp;
  const time = new Date(entry.timestamp);
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  const name = entry.from?.name && entry.from.name !== '' ? entry.from.name : entry.from?.identity;

  return { message: formattedMessage, hasBeenEdited, time, locale, name };
};
