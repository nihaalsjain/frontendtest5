import { useState } from 'react';
import { Camera, ChevronDown, Mic } from 'lucide-react';

interface WelcomeProps {
  disabled: boolean;
  startButtonText: string;
  onStartCall: () => void;
  language: 'en' | 'kn' | 'hi' | 'ta' | null; // allow null
  onLanguageChange: (lang: 'en' | 'kn' | 'hi' | 'ta') => void;
  voiceBase: 'Voice Assistant' | 'Live Assistant';
  onVoiceBaseChange: (base: 'Voice Assistant' | 'Live Assistant') => void;
}

export const Welcome = ({
  disabled,
  onStartCall,
  language,
  onLanguageChange,
  voiceBase,
  onVoiceBaseChange,
  ref,
}: React.ComponentProps<'div'> & WelcomeProps) => {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'ta', label: 'தமிழ்' },
  ];

  const selectedLang = languages.find((l) => l.code === language);

  return (
    <div
      ref={ref}
      inert={disabled}
      className="fixed inset-0 z-10 mx-auto flex h-svh flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-slate-900 text-center"
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 blur-3xl"></div>

      {/* Main Content Wrapper */}
      <div className="flex w-full flex-col items-center justify-center">
        {/* Combined Logo Section with Glowing Ring */}
        <div className="relative mb-12 flex flex-col items-center justify-center">
          <div className="relative flex h-80 w-80 items-center justify-center">
            {/* Animated Glowing Ring */}
            <div className="absolute inset-0 animate-pulse rounded-full">
              {/* Outer glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 opacity-20 blur-xl"></div>

              {/* Main ring with rotation */}
              <div className="absolute inset-4 animate-spin rounded-full border-4 border-transparent bg-transparent [animation-duration:8s]">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 opacity-80 blur-sm"></div>
              </div>

              {/* Sharp ring overlay */}
              <div className="absolute inset-6 rounded-full border-2 border-cyan-400 opacity-90 shadow-lg shadow-cyan-400/50"></div>

              {/* Inner subtle glow */}
              <div className="absolute inset-8 rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 opacity-10"></div>
            </div>

            {/* Content inside the ring */}
            <div className="relative z-10 text-center">
              {/* Allion.ai Branding */}
              <div className="-mt-4 text-center">
                <div className="flex items-center justify-center">
                  <span className="ml-4 text-4xl font-bold tracking-wide text-white">
                    Allion.ai
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h1 className="mb-12 text-lg font-medium text-gray-200 drop-shadow-sm">
          {language === 'kn'
            ? 'ಮೆಕ್ಯಾನಿಕ್‌ನ ವಿಶ್ವಾಸಾರ್ಹ ಸಹ-ಪೈಲಟ್'
            : language === 'hi'
              ? 'मैकेनिक का विश्वसनीय सह-पायलट'
              : language === 'ta'
                ? 'மேக்கானிக்கிற்கான நம்பத்தகுந்த துணை விமானி'
                : "Mechanic's Trusted Co-Pilot"}
        </h1>

        {/* Main Content */}
        <div className="z-10 w-full max-w-md space-y-6">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-white/20 bg-white/10 px-4 py-4 text-left font-medium text-gray-200 shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-white/15"
              disabled={disabled}
            >
              {selectedLang ? selectedLang.label : 'Select Language'}
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-200 ${
                  isLanguageDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isLanguageDropdownOpen && (
              <div className="absolute top-full right-0 left-0 z-20 mt-2 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang.code as 'en' | 'kn' | 'hi' | 'ta');
                      setIsLanguageDropdownOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-gray-50"
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assistant Type Toggle */}
          <div className="flex rounded-lg border border-white/20 bg-white/70 p-1 backdrop-blur-md">
            <button
              onClick={() => onVoiceBaseChange('Voice Assistant')}
              disabled={!language}
              className={`flex-1 rounded-md px-4 py-3 text-sm font-medium transition-all duration-200 ${
                voiceBase === 'Voice Assistant' && language
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              } ${!language ? 'cursor-not-allowed' : ''}`}
            >
              {language === 'kn'
                ? 'ಧ್ವನಿ ಸಹಾಯಕ'
                : language === 'hi'
                  ? 'ध्वनि सहायक'
                  : language === 'ta'
                    ? 'குரல் உதவியாளர்'
                    : 'VOICE ASSISTANT'}
            </button>
            <button
              onClick={() => onVoiceBaseChange('Live Assistant')}
              disabled={!language}
              className={`flex-1 rounded-md px-4 py-3 text-sm font-medium transition-all duration-200 ${
                voiceBase === 'Live Assistant' && language
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              } ${!language ? 'cursor-not-allowed' : ''}`}
            >
              {language === 'kn'
                ? 'ಲೈವ್ ಸಹಾಯಕ'
                : language === 'hi'
                  ? 'लाइव सहायक'
                  : language === 'ta'
                    ? 'நேரடி உதவியாளர்'
                    : 'LIVE ASSISTANT'}
            </button>
          </div>

          {/* Start Call Button */}
          <button
            onClick={onStartCall}
            disabled={!language || disabled}
            className="flex w-full transform items-center justify-center space-x-3 rounded-lg bg-gradient-to-r from-purple-400 to-indigo-500 px-6 py-4 text-lg font-semibold tracking-wider text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-purple-500 hover:to-indigo-600 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-purple-400"
          >
            {voiceBase === 'Voice Assistant' ? (
              <Mic className="h-5 w-5" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            <span>
              {language === 'kn'
                ? 'ಕರೆ ಪ್ರಾರಂಭಿಸಿ'
                : language === 'hi'
                  ? 'कॉल शुरू करें'
                  : language === 'ta'
                    ? 'அழைப்பை தொடங்குக'
                    : 'Start Call'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
