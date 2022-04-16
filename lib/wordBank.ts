import validWords from 'wordle-words/valid-words.csv?raw';
import bankWords from 'wordle-words/word-bank.csv?raw';

export const isValidWord = (word: any): boolean => {
  if (typeof word !== 'string') return false;

  word = word.toLowerCase();

  if (!/^[a-z]{5}$/.test(word)) return false;

  return validWords.includes(word);
};

const lines = bankWords.split('\n');
lines.pop(); // remove last empty line
export const getRandomWord = () => {
  return lines[Math.floor(Math.random() * lines.length)].toUpperCase();
};
