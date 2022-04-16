import type { NextApiRequest, NextApiResponse } from 'next';
import { match as matchRoute } from 'path-to-regexp';
import { renderToStaticMarkup } from 'react-dom/server';
import Cookies from 'cookies';

import { Game, LetterState } from 'lib/game';
import { getRandomWord, isValidWord } from 'lib/wordBank';

type Ctx = {
  req: NextApiRequest;
  res: NextApiResponse;
  params: Record<string, string>;
  game: Game;
  saveAndRedirect: () => void;
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

const routes: Record<string, (ctx: Ctx) => Promise<void> | void> = {
  '/press-key/:letter': (ctx) => {
    const letter = ctx.params.letter?.toUpperCase();

    console.log('add letter:', letter);

    ctx.game.addLetter(letter);

    ctx.saveAndRedirect();
  },
  '/press-backspace': (ctx) => {
    ctx.game.backspace();

    ctx.saveAndRedirect();
  },
  '/press-submit': async (ctx) => {
    await ctx.game.submit();

    ctx.saveAndRedirect();
  },

  '/assets/board': (ctx) => {
    const finishedState = ctx.game.finishedState();

    const asGrid = ctx.game.asGrid();

    ctx.sendSvg(
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        version="1.1"
        fontFamily="sans-serif"
        width={Game.width * 44}
        height={Game.height * 44 + (finishedState ? 100 : 0)}
      >
        {finishedState ? (
          <text
            x="50%"
            y="50"
            fill={finishedState === 'lost' ? COLORS.red : COLORS.green}
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="30"
          >
            {finishedState.toUpperCase()}
          </text>
        ) : ctx.game.invalidSubmit ? (
          <text
            x="50%"
            y="50"
            fill={COLORS.red}
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="30"
          >
            Word not in word list
          </text>
        ) : null}

        {asGrid.map((row, y) => {
          return (
            <g
              key={y}
              transform={`translate(0, ${y * 44 + (finishedState ? 100 : 0)})`}
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
    const letter = ctx.params.letter?.toUpperCase();

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
};

const handlers = Object.entries(routes).map(([pattern, handler]) => ({
  match: matchRoute<Record<string, string>>('/api/markdown-game' + pattern),
  handler,
}));

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const url = req.url!;

  for (const h of handlers) {
    const m = h.match(url);
    if (m) {
      const cookies = new Cookies(req, res, {
        secure: !isDev,
      });

      const cookieState = cookies.get('wordle-state') || null;

      const game =
        Game.decode(cookieState, isValidWord) ||
        new Game(isValidWord, getRandomWord());

      const ctx: Ctx = {
        req,
        res,
        game,
        params: m.params,
        sendSvg: (element) => {
          res
            .setHeader('cache-control', 'no-cache,max-age=0')
            .setHeader('content-type', 'image/svg+xml')
            .send(renderToStaticMarkup(element));
        },
        saveAndRedirect: () => {
          let referer: string | undefined;
          try {
            const parsed = req.headers.referer
              ? new URL(req.headers.referer)
              : null;
            if (parsed?.pathname && parsed.pathname !== '/')
              referer = parsed.href;
          } catch {}

          console.log('referer:', referer);

          cookies.set('wordle-state', game.encode(), {
            httpOnly: true,
            secure: !isDev,
            sameSite: isDev ? 'lax' : 'none',
            overwrite: true,
            // domain: 'localhost:3001',
            // maxAge: // TODO automatic expire?
          });

          res.redirect(
            referer ||
              (isDev
                ? 'http://localhost:3001/test'
                : 'https://github.com/wyattades'),
          );
        },
      };

      await h.handler(ctx);

      return;
    }
  }

  res.status(404).end('Not Found');
};

export default handler;
