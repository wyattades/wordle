import type { NextApiRequest, NextApiResponse } from 'next';
import { match as matchRoute } from 'path-to-regexp';

// TODO: handle different HTTP methods

export type BaseCtx = {
  req: NextApiRequest;
  res: NextApiResponse;
  params: Record<string, string | undefined>;
};

export type RoutesMap<Ctx extends Record<string, unknown> | undefined> = Record<
  string,
  (ctx: Ctx extends undefined ? BaseCtx : BaseCtx & Ctx) => MaybePromise<void>
>;

export const buildRouter = <Ctx extends Record<string, unknown> | undefined>(
  routes: RoutesMap<Ctx>,
  basePath = '',
  extraContext?: Ctx extends undefined
    ? never
    : (baseCtx: BaseCtx) => MaybePromise<Ctx>,
) => {
  const handlers = Object.entries(routes).map(([pattern, handler]) => ({
    match: matchRoute<Record<string, string>>(basePath + pattern, {
      end: false,
    }),
    handler,
  }));

  const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const url = req.url!;

    for (const h of handlers) {
      const m = h.match(url);
      if (m) {
        const base: BaseCtx = {
          req,
          res,
          params: m.params,
        };

        const ctx = {
          ...base,
          ...(extraContext ? await extraContext(base) : {}),
        } as Ctx extends undefined ? BaseCtx : BaseCtx & Ctx;

        await h.handler(ctx);

        return;
      }
    }

    res.status(404).end('Not Found');
  };

  return handler;
};
