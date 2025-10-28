import { headers } from 'next/headers';
import { getAppConfig } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const hdrs = await headers();
  const { companyName, logo, logoDark } = await getAppConfig(hdrs);

  return (
    <>
      <header className="fixed top-0 left-10 z-50 hidden w-full flex-row justify-between p-6 md:flex">
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://www.bosch.in/"
          className="scale-300 transition-transform duration-300 hover:scale-410"
        >
          <img src={logo} alt={`${companyName} Logo`} className="block size-15 dark:hidden" />
          <img
            src={logoDark ?? logo}
            alt={`${companyName} Logo`}
            className="hidden size-15 dark:block"
          />
        </a>
      </header>
      {children}
    </>
  );
}
