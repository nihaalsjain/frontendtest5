import type { TranscriptionSegment } from 'livekit-client';

export interface CombinedTranscription extends TranscriptionSegment {
  role: 'assistant' | 'user';
  receivedAtMediaTimestamp: number;
  receivedAt: number;
}
export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;
}

export interface SandboxConfig {
  [key: string]:
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }
    | { type: 'boolean'; value: boolean }
    | null;
}

export interface WebSource {
  url: string;
  title: string;
}

export interface YouTubeVideo {
  url: string;
  title: string;
  thumbnail: string;
  video_id: string;
}
export interface StructuredMessage {
  voice_output: string;
  text_output: {
    content: string;
    web_sources?: WebSource[];
    youtube_videos?: YouTubeVideo[];
    has_external_sources?: boolean;
  };
  html_output: string;
}
