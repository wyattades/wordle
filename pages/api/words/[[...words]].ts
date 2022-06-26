import { buildRouter } from 'lib/router';

import { isValidWord, getRandomWord } from 'lib/wordBank';

export default buildRouter(
  {
    '/valid': async (ctx) => {
      ctx.res.json({
        valid: isValidWord(ctx.req.query.word),
      });
    },
    '/random': async (ctx) => {
      ctx.res.json({
        word: getRandomWord(),
      });
    },
  },
  '/api/words',
);
