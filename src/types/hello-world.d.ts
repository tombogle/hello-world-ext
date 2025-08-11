declare module 'hello-world' {
  import type { DataProviderDataType, IDataProvider } from '@papi/core';

  /** Network event that informs subscribers when the command `helloWorld.doStuff` is run */
  export type DoStuffEvent = {
    /** How many times the extension has run the command `helloWorld.doStuff` */
    count: number;
  };

  export type ExtensionVerseSetData = string | { text: string; isHeresy: boolean };

  export type ExtensionVerseDataTypes = {
    Verse: DataProviderDataType<string, string | undefined, ExtensionVerseSetData>;
    Heresy: DataProviderDataType<string, string | undefined, string>;
    Chapter: DataProviderDataType<[book: string, chapter: number], string | undefined, never>;
  };

  export type ExtensionVerseDataProvider = IDataProvider<ExtensionVerseDataTypes>;
}

declare module 'papi-shared-types' {
  import type { ExtensionVerseDataProvider } from 'hello-world';

  export interface CommandHandlers {
    'helloWorld.doStuff': (message: string) => {
      response: string;
      occurrence: number;
    };
  }

  export interface DataProviders {
    'helloWorld.quickVerse': ExtensionVerseDataProvider;
  }
}
