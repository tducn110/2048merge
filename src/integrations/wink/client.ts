export interface WinkRound {
  readonly roundId: string;
  readonly startedAtMs: number;
}

export interface WinkLifecycleHandlers {
  onPause?: () => void;
  onResume?: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
  onLocale?: (locale: string) => void;
}

export interface WinkLeaderboardEntry {
  id: string;
  userId: string | null;
  isAnonymous: boolean;
  displayName: string | null;
  score: number;
  playTime: number | null;
  rank: number;
  createdAt: string | null;
}

export interface WinkLeaderboardResponse {
  entries: WinkLeaderboardEntry[];
  total?: number;
  me?: WinkLeaderboardEntry | null;
}

export interface WinkSubmitScoreResponse {
  entry: WinkLeaderboardEntry | null;
  isNewBest: boolean;
  previousBest: number | null;
}

export interface WinkCapabilities {
  getLeaderboard: boolean;
  submitScore: boolean;
  complete: boolean;
}

export interface WinkState {
  phase: 'booting' | 'ready_anonymous' | 'ready_authenticated' | 'error';
  displayName: string | null;
}

interface WinkApi {
  init?(): Promise<WinkApi | void>;
  gameplayStart?(): void;
  gameplayStop?(): void;
  complete?(input: any): void;
  submitScore?(input: any): Promise<any>;
  getLeaderboard?(options?: any): Promise<any>;
  getPersonalBest?(): Promise<any>;
  locale?: string;
  setLocale?: (locale: string) => void;
  on?(event: string, listener: (arg?: any) => void): () => void;
  can?(capability: string): boolean;
  player?: {
    isGuest: boolean;
    displayName: string | null;
  };
}

declare global {
  interface Window {
    Wink?: WinkApi;
  }
}

let globalInitPromise: Promise<WinkApi> | null = null;
let boundWinkInstance: unknown = null;
let cachedSdk: WinkApi | null = null;

export function resetWinkInit(): void {
  globalInitPromise = null;
  boundWinkInstance = null;
  cachedSdk = null;
}

export function getWinkInitPromise(): Promise<WinkApi> {
  const currentWink = typeof window !== "undefined" ? window.Wink : undefined;
  if (!globalInitPromise || boundWinkInstance !== currentWink) {
    boundWinkInstance = currentWink;
    if (typeof window !== "undefined" && window.Wink?.init) {
      globalInitPromise = window.Wink.init().then((res) => {
        cachedSdk = (res || window.Wink) as WinkApi;
        return cachedSdk;
      }).catch(() => {
        cachedSdk = window.Wink as WinkApi;
        return cachedSdk;
      });
    } else {
      cachedSdk = (typeof window !== "undefined" ? window.Wink : undefined) as WinkApi;
      globalInitPromise = Promise.resolve(cachedSdk);
    }
  }
  return globalInitPromise;
}

function newRoundId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `round-${Date.now().toString(16)}-${random}`;
}

const DENIED: WinkCapabilities = Object.freeze({
  getLeaderboard: false,
  submitScore: false,
  complete: false,
});

export class WinkGameIntegration {
  #completedRounds = new Set<string>();
  #disposers: Array<() => void> = [];
  #stateListeners: Array<(state: WinkState) => void> = [];

  constructor() {
    getWinkInitPromise().then(() => this.#notifyState());
  }

  get #sdk(): WinkApi | null {
    return cachedSdk || (typeof window !== "undefined" ? window.Wink : null) as WinkApi | null;
  }

  startRound(): WinkRound {
    if (this.#sdk?.gameplayStart) {
      try { this.#sdk.gameplayStart(); } catch {}
    }
    return Object.freeze({
      roundId: newRoundId(),
      startedAtMs: Date.now(),
    });
  }

  completeRound(
    round: WinkRound,
    extra: { playDurationMs?: number; [key: string]: unknown } = {},
  ): boolean {
    if (this.#completedRounds.has(round.roundId)) {
      return false;
    }
    this.#completedRounds.add(round.roundId);

    const { playDurationMs, ...rest } = extra;
    const duration = Math.max(0, Math.round(playDurationMs ?? Date.now() - round.startedAtMs));

    if (this.#sdk?.gameplayStop) {
      this.#sdk.gameplayStop();
    } else if (this.#sdk?.complete) {
      this.#sdk.complete({ roundId: round.roundId, playDurationMs: duration, ...rest });
    }
    return true;
  }

  lastSubmittedEntryId: string | null = null;
  #leaderboardInFlight: Promise<WinkLeaderboardResponse> | null = null;
  #lastLeaderboardFetchAtMs = 0;

  async submitFinalScore(input: { score: number; playTime?: number; [key: string]: unknown }): Promise<WinkSubmitScoreResponse> {
    const sdk = await getWinkInitPromise();
    if (!sdk?.can?.('submitScore') || !sdk?.submitScore) {
      return { entry: null, isNewBest: false, previousBest: null };
    }
    try {
      const res = await sdk.submitScore(input);
      if (res && res.entry) {
        this.lastSubmittedEntryId = res.entry.id;
      }
      return {
        entry: res?.entry || null,
        isNewBest: res?.isNewBest || false,
        previousBest: res?.previousBest || null,
      };
    } catch (err) {
      console.warn("[WinkIntegration] submitScore error", err);
      return { entry: null, isNewBest: false, previousBest: null };
    }
  }

  async getPersonalBest(): Promise<WinkLeaderboardEntry | null> {
    const sdk = await getWinkInitPromise();
    if (sdk?.can?.('getLeaderboard') && sdk?.getPersonalBest) {
      try {
        const res = await sdk.getPersonalBest();
        return res?.me ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }

  async refreshLeaderboard(options?: { limit?: number; offset?: number; force?: boolean }): Promise<WinkLeaderboardResponse> {
    const sdk = await getWinkInitPromise();
    const getLeaderboardFn = sdk?.getLeaderboard;
    if (!sdk?.can?.('getLeaderboard') || !getLeaderboardFn) {
      return { entries: [], total: 0, me: null };
    }

    if (this.#leaderboardInFlight) {
      return this.#leaderboardInFlight;
    }

    const now = Date.now();
    if (!options?.force && now - this.#lastLeaderboardFetchAtMs < 1500) {
      return { entries: [], total: 0, me: null };
    }

    this.#leaderboardInFlight = (async () => {
      try {
        const res = await getLeaderboardFn({ limit: options?.limit ?? 10, offset: options?.offset });
        this.#lastLeaderboardFetchAtMs = Date.now();
        return {
          entries: res?.entries || [],
          total: res?.total,
          me: res?.me,
        };
      } catch (err) {
        console.warn("[WinkIntegration] getLeaderboard error", err);
        return { entries: [], total: 0, me: null };
      } finally {
        this.#leaderboardInFlight = null;
      }
    })();

    return this.#leaderboardInFlight;
  }

  get capabilities(): WinkCapabilities {
    if (!this.#sdk?.can) return DENIED;
    return {
      getLeaderboard: Boolean(this.#sdk.can('getLeaderboard')),
      submitScore: Boolean(this.#sdk.can('submitScore')),
      complete: Boolean(this.#sdk.can('complete') || true),
    };
  }

  get state(): WinkState | null {
    if (!this.#sdk) return null;
    const isGuest = this.#sdk.player?.isGuest ?? true;
    return {
      phase: isGuest ? 'ready_anonymous' : 'ready_authenticated',
      displayName: this.#sdk.player?.displayName ?? null,
    };
  }

  get displayName(): string | null {
    return this.state?.displayName ?? null;
  }

  bindLifecycle(handlers: WinkLifecycleHandlers): () => void {
    const cleanups: Array<() => void> = [];
    const sdk = this.#sdk;
    if (sdk?.on) {
      if (handlers.onPause) cleanups.push(sdk.on('pause', handlers.onPause));
      if (handlers.onResume) cleanups.push(sdk.on('resume', handlers.onResume));
      if (handlers.onMute) cleanups.push(sdk.on('mute', handlers.onMute));
      if (handlers.onUnmute) cleanups.push(sdk.on('unmute', handlers.onUnmute));
      if (handlers.onLocale) {
        cleanups.push(sdk.on('locale', (loc: unknown) => {
          if (typeof loc === 'string') handlers.onLocale?.(loc);
        }));
      }
    }

    if (sdk?.locale && handlers.onLocale) {
      handlers.onLocale(sdk.locale);
    }

    return () => {
      for (const cleanup of cleanups) {
        try { cleanup(); } catch {}
      }
    };
  }

  setLocale(locale: string): void {
    if (this.#sdk?.setLocale) {
      try {
        this.#sdk.setLocale(locale);
      } catch {}
    }
  }

  #notifyState() {
    const s = this.state;
    if (!s) return;
    for (const listener of this.#stateListeners) {
      try { listener(s); } catch {}
    }
  }
}

export const winkGame = new WinkGameIntegration();
