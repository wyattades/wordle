import { EventEmitter } from 'events';

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export enum LetterState {
  Unanswered,
  Incorrect,
  Correct,
  CorrectLetter,
  ActiveRow, // not applicable to keyboard keys
}

type ValidateWord = (word: string) => MaybePromise<boolean>;

type SerializedGame = {
  answer: string;
  prevGuesses: string[];
  currentGuess: string;
  invalidSubmit: boolean;
};

export class Game {
  static width = 5;
  static height = 6;

  private emitter?: EventEmitter;

  private answer = '_'.repeat(Game.width);
  private prevGuesses: string[] = [];
  private currentGuess = '';
  invalidSubmit = false;
  initialized = false;

  constructor(private readonly validateWord: ValidateWord) {}

  init(
    answer = '_'.repeat(Game.width),
    prevGuesses: string[] = [],
    currentGuess = '',
    invalidSubmit = false,
  ) {
    this.answer = answer;
    this.prevGuesses = prevGuesses;
    this.currentGuess = currentGuess;
    this.invalidSubmit = invalidSubmit;

    this.initialized = true;
    this.emit('init');

    return this;
  }

  emit(eventName: string) {
    this.emitter?.emit('event', eventName);
  }
  subscribe(cb: (eventName: string) => void) {
    this.emitter ||= new EventEmitter();
    this.emitter.on('event', cb);
    return () => {
      this.emitter?.off('event', cb);
    };
  }

  finishedState() {
    if (this.prevGuesses[this.prevGuesses.length - 1] === this.answer)
      return 'won';

    return this.prevGuesses.length < Game.height ? null : 'lost';
  }

  canSubmit() {
    if (this.finishedState()) return;

    return this.currentGuess.length === Game.width;
  }

  async submit() {
    if (!this.canSubmit()) return;

    if (!(await this.validateWord(this.currentGuess))) {
      this.invalidSubmit = true;
      return;
    }

    this.invalidSubmit = false;
    this.prevGuesses.push(this.currentGuess);
    this.currentGuess = '';

    this.emit('change');
  }

  currentRow() {
    return this.prevGuesses.length;
  }

  // reset() {
  //   this.prevGuesses = [];
  //   this.currentGuess = '';
  // }

  backspace() {
    if (this.finishedState()) return;

    this.invalidSubmit = false;
    this.currentGuess = this.currentGuess.slice(0, -1);

    this.emit('change');
  }

  addLetter(letter: string) {
    if (this.finishedState()) return;

    this.invalidSubmit = false;
    this.currentGuess = this.currentGuess.slice(0, Game.width - 1) + letter;

    this.emit('change');
  }

  letterState(letter: string, letterPos: number) {
    if (letter === '') return LetterState.Incorrect;

    if (this.answer.charAt(letterPos) === letter) {
      return LetterState.Correct;
    } else if (this.answer.includes(letter)) {
      return LetterState.CorrectLetter;
    } else {
      return LetterState.Incorrect;
    }
  }

  letterStates() {
    const states: Record<string, LetterState> = {};

    for (const guess of this.prevGuesses) {
      Array.from({ length: Game.width }).forEach((_x, x) => {
        const letter = guess.charAt(x);
        const prev = states[letter];
        const state = this.letterState(letter, x);

        if (state === LetterState.Correct) {
          states[letter] = LetterState.Correct;
        } else if (state === LetterState.CorrectLetter) {
          if (prev !== LetterState.Correct)
            states[letter] = LetterState.CorrectLetter;
        } else if (prev == null) {
          states[letter] = LetterState.Incorrect;
        }
      });
    }

    return states;
  }

  asGrid() {
    const currentRow = this.currentRow();

    return Array.from({ length: Game.height }).map((_y, y) => {
      const guess =
        y < currentRow
          ? this.prevGuesses[y]
          : y === currentRow
          ? this.currentGuess
          : null;

      return Array.from({ length: Game.width }).map((_x, x) => {
        const letter = guess?.charAt(x);

        const state: LetterState =
          y > currentRow || (currentRow === y && this.finishedState())
            ? LetterState.Unanswered
            : y === currentRow
            ? LetterState.ActiveRow
            : this.letterState(letter ?? '', x);

        return { letter, state };
      });
    });
  }

  keyboardLetterState(letter: string) {
    return this.letterStates()[letter] || null;
  }

  keyboard() {
    const letterStates = this.letterStates();

    return KEY_ROWS.map((row) => {
      return row.split('').map((letter) => {
        return { letter, state: letterStates[letter] || null };
      });
    });
  }

  decode(data: string | SerializedGame | null | undefined): Game | null {
    if (!data) return null;
    try {
      if (typeof data === 'string') data = JSON.parse(data) as SerializedGame;

      if (!Array.isArray(data.prevGuesses)) return null;

      return this.init(
        data.answer,
        data.prevGuesses,
        data.currentGuess,
        data.invalidSubmit,
      );
    } catch {}

    return null;
  }
  encode() {
    const serialized: SerializedGame = {
      answer: this.answer,
      prevGuesses: this.prevGuesses,
      currentGuess: this.currentGuess,
      invalidSubmit: this.invalidSubmit,
    };
    return JSON.stringify(serialized);
  }
}
