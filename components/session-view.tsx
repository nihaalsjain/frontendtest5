'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  type AgentState,
  type ReceivedChatMessage,
  useRoomContext,
  useVoiceAssistant,
} from '@livekit/components-react';
import { toastAlert } from '@/components/alert-toast';
import { AgentControlBar } from '@/components/livekit/agent-control-bar/agent-control-bar';
import { ChatEntry } from '@/components/livekit/chat/chat-entry';
import { ChatMessageView } from '@/components/livekit/chat/chat-message-view';
import { MediaTiles } from '@/components/livekit/media-tiles';
import { TextOutputPanel } from '@/components/livekit/text-output-panel';
import useChatAndTranscription from '@/hooks/useChatAndTranscription';
import { useDebugMode } from '@/hooks/useDebug';
import type { AppConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

function isAgentAvailable(agentState: AgentState) {
  return agentState == 'listening' || agentState == 'thinking' || agentState == 'speaking';
}

export interface SessionViewProps {
  appConfig: AppConfig;
  disabled: boolean;
  sessionStarted: boolean;
  /** UI language for labels/subtitles/etc. */
  language: 'en' | 'kn' | 'hi' | 'ta';
}

/** Full props including native <main> attributes */
export type SessionViewComponentProps = React.ComponentProps<'main'> & SessionViewProps;

export const SessionView = React.forwardRef<HTMLElement, SessionViewComponentProps>(
  ({ appConfig, disabled, sessionStarted, ...mainProps }, ref) => {
    const { state: agentState } = useVoiceAssistant();
    const [chatOpen, setChatOpen] = useState(false);
    const [textOutputOpen, setTextOutputOpen] = useState(false);
    const { messages, send } = useChatAndTranscription();
    const room = useRoomContext();

    useDebugMode({
      // FIX: NODE_ENV (not NODE_END)
      enabled: process.env.NODE_ENV !== 'production',
    });

    async function handleSendMessage(message: string) {
      await send(message);
    }

    // Get the latest text content for the diagnostic report panel
    // Behavior: Always return the most recent diagnostic_report when available (Option A)
    const getLatestTextContent = (): string => {
      const assistantMessages = messages.filter((msg) => !msg.from?.isLocal);
      console.log(
        '🔍 getLatestTextContent: Total messages:',
        messages.length,
        'Assistant messages:',
        assistantMessages.length
      );

      if (assistantMessages.length === 0) return '';
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      const raw = lastMessage.message;
      if (typeof raw !== 'string') return '';

      console.log('🔍 getLatestTextContent: Raw message (first 200 chars):', raw.substring(0, 200));
      console.log('🔍 getLatestTextContent: Raw message type:', typeof raw, 'Length:', raw.length);

      // Try to parse as new structured JSON with diagnostic_report
      try {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.diagnostic_report &&
          typeof parsed.diagnostic_report.content === 'string'
        ) {
          // Return the diagnostic_report object as a JSON string (frontend panel will parse)
          const result = JSON.stringify(parsed.diagnostic_report);
          console.log('✅ Found diagnostic_report:', result);
          return result;
        }
      } catch {}

      // Try legacy structured JSON with text_output
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.text_output && typeof parsed.text_output.content === 'string') {
          const result = JSON.stringify(parsed.text_output);
          console.log('✅ Found text_output (legacy):', result);
          return result;
        }
      } catch {}

      // Pattern VOICE:...|||TEXT:...
      const voiceTextMatch = raw.match(/^VOICE:([\s\S]*?)\|\|\|TEXT:([\s\S]*)$/);
      if (voiceTextMatch) {
        const textSegment = voiceTextMatch[2];
        // textSegment itself may be JSON with diagnostic_report
        try {
          const parsedText = JSON.parse(textSegment);
          // Check for diagnostic_report structure
          if (
            parsedText &&
            parsedText.diagnostic_report &&
            typeof parsedText.diagnostic_report.content === 'string'
          ) {
            console.log(
              '✅ Found VOICE|||TEXT with diagnostic_report:',
              JSON.stringify(parsedText.diagnostic_report)
            );
            return JSON.stringify(parsedText.diagnostic_report);
          }
          // Legacy: check for direct content
          if (parsedText && typeof parsedText.content === 'string') {
            console.log('✅ Found VOICE|||TEXT with direct content:', JSON.stringify(parsedText));
            return JSON.stringify(parsedText); // normalized
          }
        } catch {
          // If it's plain text, return as-is (legacy)
          return textSegment;
        }
      }

      // If nothing structured found, return empty string so diagnostics panel can keep previous content
      return '';
    };

    // Derive chat display messages (show voice_output for TTS content)
    const displayMessages = messages.map((m) => {
      if (typeof m.message === 'string') {
        // Try new structured JSON format first
        try {
          const parsed = JSON.parse(m.message);
          if (parsed && parsed.voice_output) {
            // Prefer voice_output for chat display (short TTS-friendly text)
            return { ...m, message: parsed.voice_output };
          }
        } catch {}

        // Try legacy structured JSON format
        try {
          const parsed = JSON.parse(m.message);
          if (parsed && parsed.voice_output) {
            return { ...m, message: parsed.voice_output };
          }
        } catch {}

        // VOICE|||TEXT pattern -> display voice portion in chat
        const match = m.message.match(/^VOICE:([\s\S]*?)\|\|\|TEXT:[\s\S]*$/);
        if (match) {
          return { ...m, message: match[1].trim() };
        }
      }
      return m;
    });

    useEffect(() => {
      if (sessionStarted) {
        const timeout = setTimeout(() => {
          if (!isAgentAvailable(agentState)) {
            const reason =
              agentState === 'connecting'
                ? 'Agent did not join the room. '
                : 'Agent connected but did not complete initializing. ';

            toastAlert({
              title: 'Session ended',
              description: (
                <p className="w-full">
                  {reason}
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://docs.livekit.io/agents/start/voice-ai/"
                    className="whitespace-nowrap underline"
                  >
                    See quickstart guide
                  </a>
                  .
                </p>
              ),
            });
            room.disconnect();
          }
        }, 10_000);

        return () => clearTimeout(timeout);
      }
    }, [agentState, sessionStarted, room]);

    const { supportsChatInput, supportsVideoInput, supportsScreenShare } = appConfig;
    const capabilities = { supportsChatInput, supportsVideoInput, supportsScreenShare };

    return (
      <main
        ref={ref}
        // you can consume `language` here for localized strings if needed
        {...mainProps}
        inert={disabled}
        className={cn(!chatOpen && 'max-h-svh overflow-hidden', mainProps.className)}
      >
        <ChatMessageView
          className={cn(
            'mx-auto min-h-svh w-full max-w-2xl px-3 pt-32 pb-40 transition-[opacity,translate] duration-300 ease-out md:px-0 md:pt-36 md:pb-48',
            chatOpen ? 'translate-y-0 opacity-100 delay-200' : 'translate-y-20 opacity-0'
          )}
        >
          <div className="space-y-3 whitespace-pre-wrap">
            <AnimatePresence>
              {displayMessages.map((message: ReceivedChatMessage) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 1, height: 'auto', translateY: 0.001 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <ChatEntry hideName entry={message} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ChatMessageView>

        <div className="bg-background fixed top-0 right-0 left-0 h-32 md:h-36">
          {/* skrim */}
          <div className="from-background absolute bottom-0 left-0 h-12 w-full translate-y-full bg-gradient-to-b to-transparent" />
        </div>

        <MediaTiles chatOpen={chatOpen} />

        <div className="bg-background fixed right-0 bottom-0 left-0 z-50 px-3 pt-2 pb-3 md:px-12 md:pb-12">
          <motion.div
            key="control-bar"
            initial={{ opacity: 0, translateY: '100%' }}
            animate={{
              opacity: sessionStarted ? 1 : 0,
              translateY: sessionStarted ? '0%' : '100%',
            }}
            transition={{ duration: 0.3, delay: sessionStarted ? 0.5 : 0, ease: 'easeOut' }}
          >
            <div className="relative z-10 mx-auto w-full max-w-2xl">
              {appConfig.isPreConnectBufferEnabled && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: sessionStarted && messages.length === 0 ? 1 : 0,
                    transition: {
                      ease: 'easeIn',
                      delay: messages.length > 0 ? 0 : 0.8,
                      duration: messages.length > 0 ? 0.2 : 0.5,
                    },
                  }}
                  aria-hidden={messages.length > 0}
                  className={cn(
                    'absolute inset-x-0 -top-12 text-center',
                    sessionStarted && messages.length === 0 && 'pointer-events-none'
                  )}
                >
                  <p className="animate-text-shimmer inline-block !bg-clip-text text-sm font-semibold text-transparent">
                    {/* you can localize this using `language` */}
                    Agent is listening, ask it a question
                  </p>
                </motion.div>
              )}

              <AgentControlBar
                capabilities={capabilities}
                onChatOpenChange={setChatOpen}
                onTextOutputToggle={setTextOutputOpen}
                onSendMessage={handleSendMessage}
              />
            </div>
            {/* skrim */}
            <div className="from-background border-background absolute top-0 left-0 h-12 w-full -translate-y-full bg-gradient-to-t to-transparent" />
          </motion.div>
        </div>

        {/* Text Output Panel */}
        <TextOutputPanel
          isOpen={textOutputOpen}
          onClose={() => setTextOutputOpen(false)}
          textContent={getLatestTextContent()}
        />
      </main>
    );
  }
);
SessionView.displayName = 'SessionView';
