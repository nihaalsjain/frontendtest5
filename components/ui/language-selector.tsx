'use client';

import { useState } from 'react';
import { Button } from './button';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'kn', label: 'Kannada' },
];

export default function LanguageSelector({ onSelect }: { onSelect: (lang: string) => void }) {
  const [selected, setSelected] = useState('en');

  const handleClick = (lang: string) => {
    setSelected(lang);
    onSelect(lang);
  };

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          onClick={() => handleClick(lang.code)}
          variant={selected === lang.code ? 'default' : 'outline'}
        >
          {lang.label}
        </Button>
      ))}
    </div>
  );
}
