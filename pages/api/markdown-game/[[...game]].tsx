import type { NextApiRequest, NextApiResponse } from 'next';
import { match as matchRoute } from 'path-to-regexp';
import { renderToStaticMarkup } from 'react-dom/server';
import Cookies from 'cookies';

import { Game, LetterState } from 'lib/game';
import { getRandomWord, isValidWord } from 'lib/wordBank';

type Handler = (
  req: NextApiRequest & {
    params: Record<string, string>;
    game: Game;
    save: () => void;
  },
  res: NextApiResponse,
) => Promise<void> | void;

const isDev = process.env.NODE_ENV === 'development';

const COLORS = {
  green: '#25731a',
  yellow: '#d1c302',
  red: '#e01616',
  base: '#333',
  active_row: '#555',
};

const referer = isDev
  ? 'http://localhost:3001/test'
  : 'https://github.com/wyattades';

const routes: Record<string, Handler> = {
  '/press-key/:letter': (req, res) => {
    const letter = req.params.letter?.toUpperCase();

    console.log('add letter:', letter);

    req.game.addLetter(letter);

    req.save();

    res.redirect(referer);
  },
  '/press-backspace': (req, res) => {
    req.game.backspace();

    req.save();

    res.redirect(referer);
  },
  '/press-submit': async (req, res) => {
    await req.game.submit();

    req.save();

    res.redirect(referer);
  },

  '/assets/board': (req, res) => {
    const finishedState = req.game.finishedState();

    const asGrid = req.game.asGrid();

    const body = renderToStaticMarkup(
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
        ) : req.game.invalidSubmit ? (
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
    res
      .setHeader('cache-control', 'no-cache,max-age=0')
      .setHeader('content-type', 'image/svg+xml')
      .send(body);
  },
  '/assets/key/:letter': (req, res) => {
    const letter = req.params.letter?.toUpperCase();

    const state = req.game.keyboardLetterState(letter);

    const fill =
      state === LetterState.Correct
        ? COLORS.green
        : state === LetterState.CorrectLetter
        ? COLORS.yellow
        : COLORS.base;

    const body = renderToStaticMarkup(
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

    res
      .setHeader('cache-control', 'no-cache,max-age=0')
      .setHeader('content-type', 'image/svg+xml')
      .send(body);
  },
};
const handlers = Object.entries(routes).map(([pattern, handler]) => ({
  match: matchRoute<Record<string, string>>('/api/markdown-game' + pattern),
  handler,
}));

const handler: Handler = async (req, res) => {
  const url = req.url!;

  for (const h of handlers) {
    const m = h.match(url);
    if (m) {
      req.params = m.params;

      const cookies = new Cookies(req, res, {
        secure: !isDev,
      });

      const cookieState = cookies.get('wordle-state') || null;

      req.game =
        Game.decode(cookieState, isValidWord) ||
        new Game(isValidWord, getRandomWord());

      req.save = () => {
        console.log('referer:', req.headers.referer);

        cookies.set('wordle-state', req.game.encode(), {
          httpOnly: true,
          secure: !isDev,
          sameSite: isDev ? 'lax' : 'none',
          overwrite: true,
          // domain: 'localhost:3001',
          // maxAge: // TODO automatic expire?
        });
      };

      await h.handler(req, res);

      return;
    }
  }

  res.status(404).end('Not Found');
};

export default handler;
