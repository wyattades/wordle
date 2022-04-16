import { useRef, useState } from 'react';
import clsx from 'clsx';

import { Game, LetterState } from 'lib/game';

const KeyButton: React.FC<
  {
    children: string;
    state?: LetterState | null;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, state, onClick, ...rest }) => {
  return (
    <button
      {...rest}
      onClick={onClick}
      className={clsx(
        'block w-16 h-16 text-white p-1 rounded-sm m-1 flex items-center justify-center text-2xl',
        state === LetterState.Incorrect && 'opacity-60',
        state === LetterState.Correct
          ? 'bg-green-600 hover:bg-green-700'
          : state === LetterState.CorrectLetter
          ? 'bg-yellow-600 hover:bg-yellow-700'
          : 'bg-gray-700 hover:bg-gray-800',
      )}
    >
      {children}
    </button>
  );
};

export const GameBoard: React.FC<{ answer: string }> = ({ answer }) => {
  const gameRef = useRef<Game>();
  gameRef.current ||= new Game(
    (word) =>
      fetch(`/api/validate_word?word=${word}`)
        .then((res) => res.json())
        .then((j) => j.valid)
        .catch(() => false),
    answer,
  );
  const game = gameRef.current;

  const keyboard = game.keyboard();
  const finishedState = game.finishedState();

  const [, setUpdate] = useState(false);
  const update = () => setUpdate((v) => !v);

  return (
    <>
      {finishedState ? (
        <p
          className={clsx(
            'text-xl mb-4 text-center uppercase',
            finishedState === 'lost' ? 'text-red-500' : 'text-green-600',
          )}
        >
          {finishedState}
        </p>
      ) : game.invalidSubmit ? (
        <p className="text-xl mb-4 text-center text-red-500">
          Word not in word list
        </p>
      ) : null}

      <div className="mb-16">
        {game.asGrid().map((row, y) => {
          return (
            <div key={y} className="flex">
              {row.map(({ letter, state }, x) => {
                return (
                  <span
                    key={x}
                    className={clsx(
                      'block w-16 h-16 text-white p-1 rounded-sm m-1 flex items-center justify-center text-2xl',
                      state === LetterState.ActiveRow
                        ? 'bg-gray-500'
                        : state === LetterState.Correct
                        ? 'bg-green-600'
                        : state === LetterState.CorrectLetter
                        ? 'bg-yellow-600'
                        : 'bg-gray-700',
                    )}
                  >
                    {letter}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center">
        {keyboard.map((row, y) => {
          return (
            <div key={y} className="flex">
              {y === 2 ? (
                <KeyButton
                  onClick={async () => {
                    await game.submit();

                    update();
                  }}
                >
                  Enter
                </KeyButton>
              ) : null}
              {row.map(({ letter, state }, x) => {
                return (
                  <KeyButton
                    key={x}
                    state={state}
                    onClick={() => {
                      game.addLetter(letter);
                      update();
                    }}
                  >
                    {letter}
                  </KeyButton>
                );
              })}
              {y === 2 ? (
                <KeyButton
                  onClick={() => {
                    game.backspace();
                    update();
                  }}
                  aria-label="Backspace"
                >
                  ⌫
                </KeyButton>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
};
