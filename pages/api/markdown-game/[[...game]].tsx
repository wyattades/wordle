import { renderToStaticMarkup } from 'react-dom/server';
import { Redis } from '@upstash/redis';

import { Game, LetterState } from 'lib/game';
import { getRandomWord, isValidWord } from 'lib/wordBank';
import { buildRouter } from 'lib/router';

const redis = new Redis({
  url: process.env.UPSTASH_URL!,
  token: process.env.UPSTASH_TOKEN!,
});

type Ctx = {
  game: Game;
  saveAndRedirect: () => Promise<void>;
  sendSvg: (element: React.ReactElement) => void;
};

const isDev = process.env.NODE_ENV === 'development';

const COLORS = {
  green: '#25731a',
  yellow: '#d1c302',
  red: '#e01616',
  base: '#333',
  active_row: '#555',
};

const syncState = new (class {
  cacheAt = 0;
  cached: string | null = null;

  async get() {
    if (Date.now() - this.cacheAt < 600) {
      return this.cached;
    } else {
      this.cached = null;
      this.cacheAt = 0;
    }

    this.cacheAt = Date.now();
    return (this.cached = await redis.get('wordle-state'));
  }

  async set(val: string) {
    this.cacheAt = 0;
    this.cached = null;
    await redis.set('wordle-state', val, {
      ex: 60 * 10, // expire in 10 minutes
    });
  }
})();

export default buildRouter<Ctx>(
  {
    '/press-key/:letter': async (ctx) => {
      const letter = ctx.params.letter!.toUpperCase();

      console.log('add letter:', letter);

      ctx.game.addLetter(letter);

      await ctx.saveAndRedirect();
    },
    '/press-backspace': async (ctx) => {
      ctx.game.backspace();

      await ctx.saveAndRedirect();
    },
    '/press-submit': async (ctx) => {
      await ctx.game.submit();

      await ctx.saveAndRedirect();
    },

    '/assets/board': (ctx) => {
      const finishedState = ctx.game.finishedState();

      const asGrid = ctx.game.asGrid();

      const hasMessage = !!finishedState || ctx.game.invalidSubmit;

      ctx.sendSvg(
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          version="1.1"
          fontFamily="sans-serif"
          width={Game.width * 44}
          height={Game.height * 44 + (hasMessage ? 60 : 0)}
        >
          {finishedState ? (
            <text
              x="50%"
              y="30"
              fill={finishedState === 'lost' ? COLORS.red : COLORS.green}
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize="20"
            >
              {finishedState.toUpperCase()}!
            </text>
          ) : ctx.game.invalidSubmit ? (
            <text
              x="50%"
              y="30"
              fill={COLORS.red}
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize="20"
            >
              Word not in word list
            </text>
          ) : null}

          {asGrid.map((row, y) => {
            return (
              <g
                key={y}
                transform={`translate(0, ${y * 44 + (hasMessage ? 60 : 0)})`}
              >
                {row.map(({ letter, state }, x) => {
                  const fill =
                    state === LetterState.ActiveRow
                      ? COLORS.active_row
                      : state === LetterState.Correct
                      ? COLORS.green
                      : state === LetterState.CorrectLetter
                      ? COLORS.yellow
                      : COLORS.base;

                  return (
                    <g key={x} transform={`translate(${x * 44}, 0)`}>
                      <rect x="0" y="0" width="40" height="40" fill={fill} />
                      <text
                        x="20"
                        y="20"
                        dominantBaseline="middle"
                        textAnchor="middle"
                        fontSize="20"
                        fill="white"
                      >
                        {letter}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>,
      );
    },
    '/assets/key/:letter': (ctx) => {
      const letter = ctx.params.letter!.toUpperCase();

      const state = ctx.game.keyboardLetterState(letter);

      const fill =
        state === LetterState.Correct
          ? COLORS.green
          : state === LetterState.CorrectLetter
          ? COLORS.yellow
          : COLORS.base;

      ctx.sendSvg(
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          version="1.1"
          fontFamily="sans-serif"
          opacity={state === LetterState.Incorrect ? 0.6 : 1}
          fill={fill}
          width={44}
          height={44}
        >
          <rect x="0" y="0" width="40" height="40" fill="#333" />
          <text
            x="20"
            y="20"
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="20"
            fill="white"
          >
            {letter}
          </text>
        </svg>,
      );
    },
  },
  '/api/markdown-game',
  async ({ req, res }) => {
    const data = await syncState.get();

    const game = new Game(isValidWord);
    if (!game.decode(data)) game.init(getRandomWord());

    const ctx: Ctx = {
      game,
      sendSvg: (element) => {
        res
          .setHeader('cache-control', 'no-cache,max-age=0')
          .setHeader('content-type', 'image/svg+xml')
          .send(renderToStaticMarkup(element));
      },
      saveAndRedirect: async () => {
        let referer: string | undefined;
        try {
          const parsed = req.headers.referer
            ? new URL(req.headers.referer)
            : null;
          if (parsed?.pathname && parsed.pathname !== '/')
            referer = parsed.href;
        } catch {}

        // console.log('referer:', referer);

        await syncState.set(game.encode());

        res.redirect(
          referer ||
            (isDev
              ? 'http://localhost:3001/test'
              : 'https://github.com/wyattades'),
        );
      },
    };

    return ctx;
  },
);
