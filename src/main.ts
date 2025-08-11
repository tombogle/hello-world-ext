import { VerseRef } from '@sillsdev/scripture';
import papi, { DataProviderEngine, logger } from '@papi/backend';
import type {
  DataProviderUpdateInstructions,
  ExecutionActivationContext,
  IDataProviderEngine,
  IWebViewProvider,
  SavedWebViewDefinition,
  WebViewDefinition,
} from '@papi/core';
import helloWorld from './web-views/hello-world.web-view?inline';
import helloWorldReactStyles from './web-views/hello-world.scss?inline';
import helloWorldHtml from './web-views/hello-world-html.web-view.html?inline';
import type {
  DoStuffEvent,
  ExtensionVerseDataTypes,
  ExtensionVerseSetData,
 } from 'hello-world';

// Although not (currently) a requirement, beginning with the lowerCamelCase version of the
// extension, followed by a period, is a good idea to ensure uniqueness
const reactWebViewType = 'helloWorld.react';

/** Simple WebView provider that provides React WebViews when PAPI requests them */
const reactWebViewProvider: IWebViewProvider = {
  async getWebView(savedWebView: SavedWebViewDefinition): Promise<WebViewDefinition | undefined> {
    if (savedWebView.webViewType !== reactWebViewType)
      throw new Error(
        `${reactWebViewType} provider received request to provide a ${savedWebView.webViewType} WebView`,
      );
    return {
      ...savedWebView,
      title: 'Hello World React',
      content: helloWorld,
      styles: helloWorldReactStyles,
    };
  },
};

const htmlWebViewType = 'helloWorld.html';

/** Simple WebView provider that provides HTML WebViews when PAPI requests them */
const htmlWebViewProvider: IWebViewProvider = {
  async getWebView(savedWebView: SavedWebViewDefinition): Promise<WebViewDefinition | undefined> {
    if (savedWebView.webViewType !== htmlWebViewType)
      throw new Error(
        `${reactWebViewType} provider received request to provide a ${savedWebView.webViewType} web view`,
      );
    return {
      ...savedWebView,
      title: 'Hello World HTML',
      contentType: 'html',
      content: helloWorldHtml,
    };
  },
};

class QuickVerseDataProviderEngine
  extends DataProviderEngine<ExtensionVerseDataTypes>
  implements IDataProviderEngine<ExtensionVerseDataTypes>
{
  verses: { [scrRef: string]: { text: string; isChanged?: boolean } } = {};

  /** Latest updated verse reference */
  latestVerseRef = 'JHN 11:35';

  usfmDataProviderPromise = papi.projectDataProviders.get(
    'platformScripture.USFM_Verse',
    '32664dc3288a28df2e2bb75ded887fc8f17a15fb',
  );

  /** Number of times any verse has been modified by a user this session */
  heresyCount = 0;

  /** @param heresyWarning string to prefix heretical data */
  constructor(public heresyWarning: string) {
    // `DataProviderEngine`'s constructor currently does nothing, but TypeScript requires that we
    // call it.
    super();

    this.heresyWarning = this.heresyWarning ?? 'heresyCount =';
  }

    @papi.dataProviders.decorators.ignore
  async setInternal(
    selector: string,
    data: ExtensionVerseSetData,
  ): Promise<DataProviderUpdateInstructions<ExtensionVerseDataTypes>> {
    // Just get notifications of updates with the 'notify' selector. Nothing to change
    if (selector === 'notify') return false;

    // You can't change scripture from just a string. You have to tell us you're a heretic
    if (typeof data === 'string' || data instanceof String) return false;

    // Only heretics change Scripture, so you have to tell us you're a heretic
    if (!data.isHeresy) return false;

    // If there is no change in the verse text, don't update
    if (data.text === this.verses[this.#getSelector(selector)].text) return false;

    // Update the verse text, track the latest change, and send an update
    this.verses[this.#getSelector(selector)] = {
      text: data.text,
      isChanged: true,
    };
    if (selector !== 'latest') this.latestVerseRef = this.#getSelector(selector);
    this.heresyCount += 1;
    // Update all data types, so Verse and Heresy in this case
    return '*';
  }

  #getSelector(selector: string) {
    const selectorL = selector.toLowerCase().trim();
    return selectorL === 'latest' ? this.latestVerseRef : selectorL;
  }

    async setVerse(verseRef: string, data: ExtensionVerseSetData) {
    return this.setInternal(verseRef, data);
  }

  async getVerse(verseRef: string) {
    // Just get notifications of updates with the 'notify' selector
    if (verseRef === 'notify') return undefined;
    const selector = this.#getSelector(verseRef);

    // Look up the cached data first
    let responseVerse = this.verses[selector];

    // If we don't already have the verse cached, cache it
    if (!responseVerse) {
      // Fetch the verse, cache it, and return it
      try {
        const usfmDataProvider = await this.usfmDataProviderPromise;
        if (!usfmDataProvider) throw Error('Unable to get USFM data provider');
        const verseData = usfmDataProvider.getVerseUSFM(new VerseRef(selector));
        responseVerse = { text: (await verseData) ?? `${selector} not found` };
        // Cache the verse text, track the latest cached verse, and send an update
        this.verses[selector] = responseVerse;
        this.latestVerseRef = selector;
        this.notifyUpdate();
      } catch (e) {
        responseVerse = {
          text: `Failed to fetch ${selector} from USFM data provider! Reason: ${e}`,
        };
      }
    }

    if (responseVerse.isChanged) {
      // Remove any previous heresy warning from the beginning of the text so they don't stack
      responseVerse.text = responseVerse.text.replace(/^\[.* \d*\] /, '');
      return `[${this.heresyWarning} ${this.heresyCount}] ${responseVerse.text}`;
    }
    return responseVerse.text;
  }

    async setHeresy(verseRef: string, verseText: string) {
    return this.setInternal(verseRef, { text: verseText, isHeresy: true });
  }

  async getHeresy(verseRef: string) {
    return this.getVerse(verseRef);
  }

  // Does nothing, so we don't need to use `this`
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  async setChapter() {
    // We are not supporting setting chapters now, so don't update anything
    return false;
  }

  async getChapter(chapterInfo: [book: string, chapter: number]) {
    const [book, chapter] = chapterInfo;
    return this.getVerse(`${book} ${chapter}`);
  }
}

export async function activate(context: ExecutionActivationContext): Promise<void> {
  logger.info('Tom - Hello World is activating!');

  const reactWebViewProviderPromise = papi.webViewProviders.registerWebViewProvider(
    reactWebViewType,
    reactWebViewProvider,
  );

  const htmlWebViewProviderPromise = papi.webViewProviders.registerWebViewProvider(
    htmlWebViewType,
    htmlWebViewProvider,
  );

  // Create WebViews or open an existing webview if one already exists for this type
  // Note: here, we are using `existingId: '?'` to indicate we do not want to create a new webview
  // if one already exists. The webview that already exists could have been created by anyone
  // anywhere; it just has to match `webViewType`. See `hello-someone.ts` for an example of keeping
  // an existing webview that was specifically created by `hello-someone`.
  // In real extensions, WebViews are often opened in response to user actions, such as selecting a
  // menu item, rather than automatically during activation. This tutorial opens the WebView
  // directly to simplify testing and demonstration.
  papi.webViews.openWebView(reactWebViewType, undefined, { existingId: '?' });
  papi.webViews.openWebView(htmlWebViewType, undefined, { existingId: '?' });

  // Emitter to tell subscribers how many times we have done stuff
  const onDoStuffEmitter = papi.network.createNetworkEventEmitter<DoStuffEvent>(
      'helloWorld.doStuff',
  );

  let doStuffCount = 0;
  const doStuffCommandPromise = papi.commands.registerCommand(
    'helloWorld.doStuff',
    (message: string) => {
      doStuffCount += 1;
      // Inform subscribers of the update
      onDoStuffEmitter.emit({ count: doStuffCount });

      // Respond to the sender of the command with the news
      return {
        response: `The template did stuff ${doStuffCount} times! ${message}`,
        occurrence: doStuffCount,
      };
    },
  );

  const engine = new QuickVerseDataProviderEngine("heresyCount =");

  const quickVerseDataProviderPromise = papi.dataProviders.registerEngine(
	  "helloWorld.quickVerse",
	  engine
  );

  context.registrations.add(
    await reactWebViewProviderPromise,
    await htmlWebViewProviderPromise,
    onDoStuffEmitter,
    await doStuffCommandPromise,
    await quickVerseDataProviderPromise
  );

  logger.info('Hello World is finished activating!');
}

export async function deactivate() {
  logger.info('Extension template is deactivating!');
  return true;
}
