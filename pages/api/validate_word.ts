import type { NextApiRequest, NextApiResponse } from 'next';

import { isValidWord } from 'lib/wordBank';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{
    valid: boolean;
  }>,
) {
  res.status(200).json({ valid: isValidWord(req.query.word) });
}
