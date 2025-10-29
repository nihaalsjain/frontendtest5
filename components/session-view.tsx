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
    const [diagnosticData, setDiagnosticData] = useState<string>(''); // Store diagnostic data from API
    const { messages, send } = useChatAndTranscription();
    const room = useRoomContext();

    useDebugMode({
      // FIX: NODE_ENV (not NODE_END)
      enabled: process.env.NODE_ENV !== 'production',
    });

    // Fetch diagnostic data from the new API
    const fetchDiagnosticData = async () => {
      try {
        console.log('🌐 Fetching diagnostic data from API...');

        // Use environment variable for API URL, fallback to localhost for development
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001';
        const apiUrl = `${apiBaseUrl}/api/diagnostic-data`;

        console.log('🌐 API URL:', apiUrl);
        const response = await fetch(apiUrl);

        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            console.log('✅ API Response received:', result.data);
            // Convert API response to format expected by TextOutputPanel
            const formattedData = JSON.stringify(result.data);
            setDiagnosticData(formattedData);
            console.log('✅ Diagnostic data updated:', formattedData.substring(0, 200) + '...');
            return true;
          } else {
            console.log('📭 No diagnostic data available in API response');
            return false;
          }
        } else {
          console.log('⚠️ API response not ok:', response.status, response.statusText);
          return false;
        }
      } catch (error) {
        console.error('❌ Failed to fetch diagnostic data:', error);
        return false;
      }
    };

    // Monitor messages and fetch diagnostic data when new assistant messages arrive
    useEffect(() => {
      const assistantMessages = messages.filter((msg) => !msg.from?.isLocal);

      if (assistantMessages.length > 0) {
        console.log('📨 New message detected, checking for diagnostic data...');

        // Small delay to ensure backend has processed and stored the data
        const timeoutId = setTimeout(() => {
          fetchDiagnosticData();
        }, 1000); // 1 second delay

        return () => clearTimeout(timeoutId);
      }
    }, [messages]);

    async function handleSendMessage(message: string) {
      await send(message);
    }

    // Get the latest text content for the diagnostic report panel
    // NEW: Use diagnostic data from API instead of parsing messages
    const getLatestTextContent = (): string => {
      console.log('🔍 getLatestTextContent: Using diagnostic data from API');
      console.log('🔍 Current diagnostic data length:', diagnosticData.length);

      if (diagnosticData) {
        console.log(
          '✅ Returning diagnostic data from API:',
          diagnosticData.substring(0, 200) + '...'
        );
        return diagnosticData;
      }

      console.log('📭 No diagnostic data available, showing empty state');
      return '';
    };

    // Derive chat display messages (now expecting simple voice-friendly text)
    const displayMessages = messages.map((m) => {
      if (typeof m.message === 'string') {
        // NEW: Backend now returns only voice-friendly text, no JSON parsing needed
        console.log('📝 Processing message for chat display:', m.message.substring(0, 100));

        // Legacy support: Try to parse structured JSON if present (backwards compatibility)
        try {
          const parsed = JSON.parse(m.message);
          if (parsed && parsed.voice_output) {
            console.log('✅ Found legacy voice_output in message');
            return { ...m, message: parsed.voice_output };
          }
        } catch {}

        // Legacy support: VOICE|||TEXT pattern -> display voice portion in chat
        const match = m.message.match(/^VOICE:([\s\S]*?)\|\|\|TEXT:[\s\S]*$/);
        if (match) {
          console.log('✅ Found legacy VOICE|||TEXT pattern');
          return { ...m, message: match[1].trim() };
        }

        // NEW: Default behavior - message is already voice-friendly
        console.log('✅ Using message as-is (voice-friendly format)');
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
