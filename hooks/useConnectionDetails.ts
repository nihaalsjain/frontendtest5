import { useCallback } from 'react';
import type { ConnectionDetails } from '@/app/api/connection-details/route';

export type Language = 'en' | 'kn' | 'hi' | 'ta';
export type VoiceBase = 'Voice Assistant' | 'Live Assistant';
export default function useConnectionDetails() {
  // Pass the selected language to the token endpoint
  const fetchConnectionDetails = useCallback(
    async (
      language: Language = 'en',
      voiceBase: VoiceBase = 'Voice Assistant'
    ): Promise<ConnectionDetails> => {
      const url = new URL(
        process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details',
        window.location.origin
      );
      url.searchParams.set('language', language);
      url.searchParams.set('voiceBase', voiceBase);

      try {
        const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as ConnectionDetails;
      } catch (error) {
        console.error('Error fetching connection details:', error);
        throw new Error('Error fetching connection details!');
      }
    },
    []
  );

  return { fetchConnectionDetails };
}
