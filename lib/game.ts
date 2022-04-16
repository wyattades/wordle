const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export enum LetterState {
  Unanswered,
  Incorrect,
  ActiveRow,
  Correct,
  CorrectLetter,
}

export class Game {
  static width = 5;
  static height = 6;

  constructor(
    readonly answer: string,
    readonly validateWord: (word: string) => Promise<boolean>,
  ) {}

  prevGuesses: string[] = [];
  currentGuess = '';

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

    if (!(await this.validateWord(this.currentGuess))) return 'invalid';

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

    this.currentGuess = this.currentGuess.slice(0, -1);
  }

  addLetter(letter: string) {
    if (this.finishedState()) return;

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

  keyboard() {
    const letterStates = this.letterStates();

    return KEY_ROWS.map((row) => {
      return row.split('').map((letter) => {
        return { letter, state: letterStates[letter] || null };
      });
    });
  }

  // TODO:
  // static fromRequest(req: any) {}
  // saveToResponse(res: any) {}
}
