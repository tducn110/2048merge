import {
  winkGame,
  getWinkInitPromise,
  resetWinkInit,
} from '../src/integrations/wink/client';
import { soundFx } from '../src/utils/audio';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}

async function run() {
  console.log('--- Testing Wink SDK v1 Integration (2048merge) ---');

  // Test 1: Standalone mode
  resetWinkInit();
  delete (globalThis as any).Wink;
  delete (globalThis as any).window;

  const standaloneSdk = await getWinkInitPromise();
  assert(standaloneSdk === undefined, 'Standalone mode resolves undefined when window.Wink is absent');

  const round = winkGame.startRound();
  assert(typeof round.roundId === 'string' && round.roundId.length > 0, 'startRound produces valid roundId');
  assert(winkGame.completeRound(round) === true, 'completeRound succeeds in standalone mode');
  assert(winkGame.completeRound(round) === false, 'completeRound prevents double-completion');

  const boardRes = await winkGame.refreshLeaderboard();
  assert(Array.isArray(boardRes.entries) && boardRes.entries.length === 0, 'refreshLeaderboard returns empty array in standalone mode');

  const pbRes = await winkGame.getPersonalBest();
  assert(pbRes === null, 'getPersonalBest returns null in standalone mode');

  const submitRes = await winkGame.submitFinalScore({ score: 1000 });
  assert(submitRes.entry === null && submitRes.isNewBest === false, 'submitFinalScore returns safe fallback in standalone mode');

  console.log('✔ Test 1: Standalone mode fallback passed');

  // Test 2: Connected mode
  let initCalled = false;
  let startCalled = false;
  let stopCalled = false;
  let submitCalledWith: any = null;
  const listeners: Record<string, Function> = {};

  const mockSdk = {
    init: async () => {
      initCalled = true;
      return mockSdk;
    },
    gameplayStart: () => {
      startCalled = true;
    },
    gameplayStop: () => {
      stopCalled = true;
    },
    submitScore: async (input: any) => {
      submitCalledWith = input;
      return {
        entry: {
          id: 'entry-123',
          userId: 'user-456',
          isAnonymous: false,
          displayName: 'Player One',
          score: input.score,
          playTime: null,
          rank: 1,
          createdAt: new Date().toISOString(),
        },
        isNewBest: true,
        previousBest: 500,
      };
    },
    getLeaderboard: async () => ({
      entries: [
        {
          id: 'entry-123',
          userId: 'user-456',
          isAnonymous: false,
          displayName: 'Player One',
          score: 2048,
          playTime: null,
          rank: 1,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      me: {
        id: 'entry-123',
        userId: 'user-456',
        isAnonymous: false,
        displayName: 'Player One',
        score: 2048,
        playTime: null,
        rank: 1,
        createdAt: new Date().toISOString(),
      },
    }),
    getPersonalBest: async () => ({
      me: {
        id: 'entry-123',
        userId: 'user-456',
        isAnonymous: false,
        displayName: 'Player One',
        score: 2048,
        playTime: null,
        rank: 1,
        createdAt: new Date().toISOString(),
      },
    }),
    can: (cap: string) => cap === 'getLeaderboard' || cap === 'submitScore' || cap === 'complete',
    on: (event: string, cb: Function) => {
      listeners[event] = cb;
      return () => {
        delete listeners[event];
      };
    },
    locale: 'vi',
    setLocale: (loc: string) => {
      mockSdk.locale = loc;
    },
    player: {
      isGuest: false,
      displayName: 'Player One',
    },
  };

  resetWinkInit();
  (globalThis as any).window = globalThis;
  (globalThis as any).Wink = mockSdk;

  const connectedSdk = await getWinkInitPromise();
  assert(connectedSdk !== undefined, 'Connected mode initializes window.Wink');
  assert(initCalled, 'Wink.init() was invoked');

  const connectedRound = winkGame.startRound();
  assert(startCalled, 'startRound invoked gameplayStart on SDK');

  winkGame.completeRound(connectedRound);
  assert(stopCalled, 'completeRound invoked gameplayStop on SDK');

  const connectedScore = await winkGame.submitFinalScore({ score: 2048, highestTile: 2048 });
  assert(submitCalledWith.score === 2048, 'submitScore received proper payload');
  assert(connectedScore.isNewBest === true, 'submitScore returned new best result');
  assert(winkGame.lastSubmittedEntryId === 'entry-123', 'lastSubmittedEntryId recorded');

  const connectedBoard = await winkGame.refreshLeaderboard({ force: true });
  assert(connectedBoard.entries.length === 1 && connectedBoard.entries[0].score === 2048, 'refreshLeaderboard retrieved real entries');

  const connectedPb = await winkGame.getPersonalBest();
  assert(connectedPb?.score === 2048, 'getPersonalBest retrieved personal best');

  console.log('✔ Test 2: Connected mode & Leaderboard API passed');

  // Test 3: Lifecycle handlers & Audio Contract
  let pauseTriggered = false;
  let resumeTriggered = false;
  let muteTriggered = false;
  let unmuteTriggered = false;
  let localeReceived = '';

  const unbind = winkGame.bindLifecycle({
    onPause: () => {
      pauseTriggered = true;
    },
    onResume: () => {
      resumeTriggered = true;
    },
    onMute: () => {
      muteTriggered = true;
    },
    onUnmute: () => {
      unmuteTriggered = true;
    },
    onLocale: (loc) => {
      localeReceived = loc;
    },
  });

  assert(localeReceived === 'vi', 'Initial locale delivered on bindLifecycle');

  listeners['pause']?.();
  assert(pauseTriggered, 'onPause fired on pause event');

  listeners['resume']?.();
  assert(resumeTriggered, 'onResume fired on resume event');

  listeners['mute']?.();
  assert(muteTriggered, 'onMute fired on mute event');

  listeners['unmute']?.();
  assert(unmuteTriggered, 'onUnmute fired on unmute event');

  listeners['locale']?.('en');
  assert(localeReceived === 'en', 'onLocale fired on locale event');

  unbind();

  console.log('✔ Test 3: Lifecycle handlers passed');

  // Test 4: Audio Contract (effectiveMuted = muted || hostMuted || hostPaused)
  soundFx.setHostMuted(false);
  soundFx.setHostPaused(false);
  if (soundFx.isMuted()) soundFx.toggleMute(); // Ensure player is unmuted
  assert(soundFx.isEffectiveMuted() === false, 'Audio is not muted initially');

  // Host mutes
  soundFx.setHostMuted(true);
  assert(soundFx.isEffectiveMuted() === true, 'Audio is muted when host mutes');

  // Host unmutes
  soundFx.setHostMuted(false);
  assert(soundFx.isEffectiveMuted() === false, 'Audio is unmuted when host unmutes');

  // Player mutes
  soundFx.toggleMute();
  assert(soundFx.isMuted() === true, 'Player muted');
  assert(soundFx.isEffectiveMuted() === true, 'Effective muted is true');

  // Host unmutes while player is muted -> MUST REMAIN MUTED
  soundFx.setHostMuted(false);
  assert(soundFx.isEffectiveMuted() === true, 'Player mute preference is preserved when host unmutes');

  // Player unmutes
  soundFx.toggleMute();
  assert(soundFx.isEffectiveMuted() === false, 'Player unmutes, audio restored');

  // Host pauses -> audio must pause
  soundFx.setHostPaused(true);
  assert(soundFx.isEffectiveMuted() === true, 'Host paused suppresses audio');

  soundFx.setHostPaused(false);
  assert(soundFx.isEffectiveMuted() === false, 'Host resumed restores audio');

  console.log('✔ Test 4: Audio Contract passed');

  console.log('ALL TESTS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
