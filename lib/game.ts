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

  invalidSubmit: boolean;

  constructor(
    private readonly validateWord: ValidateWord,
    private readonly answer: string,
    private prevGuesses: string[] = [],
    private currentGuess = '',
    invalidSubmit = false,
  ) {
    this.invalidSubmit = invalidSubmit;
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

  static decode(
    data: string | Record<string, any> | null | undefined,
    validateWord: ValidateWord,
  ): Game | null {
    if (!data) return null;
    try {
      if (typeof data === 'string')
        data = JSON.parse(data) as Record<string, any>;

      if (!Array.isArray(data.prevGuesses)) return null;

      return new Game(
        validateWord,
        data.answer,
        data.prevGuesses,
        data.currentGuess,
        data.invalidSubmit,
      );
    } catch {}

    return null;
  }
  encode() {
    return JSON.stringify({
      answer: this.answer,
      prevGuesses: this.prevGuesses,
      currentGuess: this.currentGuess,
      invalidSubmit: this.invalidSubmit,
    });
  }
}
