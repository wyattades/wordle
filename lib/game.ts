const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export enum LetterState {
  Unanswered,
  Incorrect,
  Correct,
  CorrectLetter,
  ActiveRow, // not applicable to keyboard keys
}

type ValidateWord = (word: string) => Promise<boolean> | boolean;

export class Game {
  static width = 5;
  static height = 6;

  invalidSubmit = false;

  constructor(
    private readonly validateWord: ValidateWord,
    private readonly answer: string,
    private prevGuesses: string[] = [],
    private currentGuess = '',
  ) {}

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
    } else {
      this.invalidSubmit = false;
    }

    this.prevGuesses.push(this.currentGuess);
    this.currentGuess = '';
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
  }

  addLetter(letter: string) {
    if (this.finishedState()) return;

    this.invalidSubmit = false;
    this.currentGuess = this.currentGuess.slice(0, Game.width - 1) + letter;
  }

  letterStates() {
    const states: Record<string, LetterState> = {};

    for (const guess of this.prevGuesses) {
      Array.from({ length: Game.width }).map((_x, x) => {
        const letter = guess.charAt(x);

        if (this.answer.charAt(x) === letter) {
          states[letter] = LetterState.Correct;
        } else if (this.answer.includes(letter)) {
          if (states[letter] !== LetterState.Correct)
            states[letter] = LetterState.CorrectLetter;
        } else if (!states[letter]) {
          states[letter] = LetterState.Incorrect;
        }
      });
    }

    return states;
  }

  asGrid() {
    const letterStates = this.letterStates();
    const currentRow = this.currentRow();

    return Array.from({ length: Game.height }).map((_y, y) => {
      const guess =
        this.prevGuesses.length > y
          ? this.prevGuesses[y]
          : this.prevGuesses.length === y
          ? this.currentGuess
          : '';

      return Array.from({ length: Game.width }).map((_x, x) => {
        const letter = guess.length > x ? guess.charAt(x) : null;

        const state: LetterState | null =
          y > currentRow || (currentRow === y && this.finishedState())
            ? LetterState.Unanswered
            : currentRow === y
            ? LetterState.ActiveRow
            : (letter != null && letterStates[letter]) || null;

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

  static decode(data: any, validateWord: ValidateWord): Game | null {
    if (typeof data !== 'string') return null;

    try {
      const parsed = JSON.parse(
        Buffer.from(data, 'base64url').toString('ascii'),
      );

      return new Game(
        validateWord,
        parsed.answer,
        parsed.prevGuesses,
        parsed.currentGuess,
      );
    } catch {}

    return null;
  }
  encode() {
    return Buffer.from(
      JSON.stringify({
        answer: this.answer,
        prevGuesses: this.prevGuesses,
        currentGuess: this.currentGuess,
      }),
      'ascii',
    ).toString('base64url');
  }
}
