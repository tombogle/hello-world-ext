import { useData, useDataProvider } from '@papi/frontend/react';
import { getErrorMessage, isPlatformError } from 'platform-bible-utils';

globalThis.webViewComponent = function HelloWorld() {
  const extensionVerseDataProvider = useDataProvider('helloWorld.quickVerse');

  const [latestExtensionVerseText] = useData<'helloWorld.quickVerse'>(
    extensionVerseDataProvider,
  ).Verse('latest', 'Loading latest Scripture text from Hello World...');

  return (
    <div className="tw-flex tw-flex-col tw-gap-4 tw-p-6">
      <div className="pr-twp tw-text-2xl tw-font-semibold tw-tracking-tight">
        Hello World <span className="tw-text-muted-foreground tw-font-normal">React</span>
      </div>
      <div>
        {isPlatformError(latestExtensionVerseText)
          ? getErrorMessage(latestExtensionVerseText)
          : latestExtensionVerseText}
      </div>
    </div>
  );
};
