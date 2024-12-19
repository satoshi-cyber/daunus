/* eslint-disable @typescript-eslint/ban-types */
import { z } from "zod";

import { v4 } from "@lukeed/uuid";
import { resolveParams } from "./resolve_params";
import {
  ExceptionParams,
  DaunusAction,
  DaunusActionInfo,
  DaunusActionRunOptions,
  DaunusCtx,
  DaunusActionWithOptions
} from "./types";
import { isException, parseResult } from "./helpers";

export const $action =
  <P, O, E = {}>(
    args: {
      type: string;
      name?: string;
      paramsSchema?: z.Schema<P>;
      skipParse?: boolean;
      parseResponse?: boolean;
      skipPlaceholders?: boolean;
      envSchema?: z.Schema<E>;
      meta?: object;
    },
    fn: ({
      ctx,
      parseParams,
      env
    }: {
      ctx: DaunusCtx;
      parseParams: <X>(ctx: Map<string, any>, params: X) => Promise<X>;
      env: E;
    }) => (params: P) => Promise<O> | O
  ) =>
  (
    params: P,
    actionCtx?: {
      name?: string;
    }
  ) => {
    const name: string = actionCtx?.name || args.name || v4();

    const actionInfo: DaunusActionInfo<O, ExceptionParams<O, P>> = {
      name,
      type: args.type,
      params: null
    };

    const makeRun =
      (init?: (ctx: DaunusCtx) => void) =>
      async (
        ctx: DaunusCtx = new Map(),
        options?: DaunusActionRunOptions<O, ExceptionParams<O, P>>
      ) => {
        try {
          const runFn = async () => {
            init && init(ctx);

            const parsedParams =
              args.skipParse || !params
                ? params
                : await parseParams(ctx, params, {
                    schema: args.paramsSchema,
                    skipPlaceholders: args.skipPlaceholders
                  });

            actionInfo.params = parsedParams;

            if (isException(parsedParams)) {
              return parsedParams;
            }

            const env = args.envSchema
              ? args.envSchema.parse(ctx.get(".env"))
              : (z.object({}) as E);

            const value = await fn({ ctx, parseParams, env })(parsedParams!);

            if (!args.parseResponse) {
              return value;
            }

            const parseValue = await parseParams(ctx, value, {
              skipPlaceholders: true
            });

            return parseValue;
          };

          const value = parseResult<O, ExceptionParams<O, P>>(
            (await runFn()) as O
          );

          ctx.set(name, value);

          actionInfo.data = value.data;
          actionInfo.exception = value.exception;

          return value;
        } catch (error: any) {
          actionInfo.exception = error;

          throw error;
        } finally {
          if (options?.onComplete) {
            options.onComplete(actionInfo, ctx);
          }
        }
      };

    const action: DaunusAction<O, ExceptionParams<O, P>, E> = {
      ...actionCtx,
      name,
      envSchema: args.envSchema,
      run: makeRun(),
      actionMeta: args.meta
    };

    const actionWithOptions: DaunusActionWithOptions<
      O,
      ExceptionParams<O, P>,
      E
    > = {
      ...action,
      createRoute: (iSchema?: any) => ({
        ...(!iSchema && action),
        ...(iSchema && {
          meta: {
            iSchema,
            openapi: {
              method:
                iSchema instanceof z.ZodObject && iSchema.shape.method
                  ? `<% method %>`
                  : "post",
              contentType:
                iSchema instanceof z.ZodObject && iSchema.shape.contentType
                  ? `<% contentType %>`
                  : "application/json",
              path:
                iSchema instanceof z.ZodObject && iSchema.shape.path
                  ? `<% path %>`
                  : undefined,
              body:
                iSchema instanceof z.ZodObject && iSchema.shape.body
                  ? `<% body %>`
                  : undefined,
              query:
                iSchema instanceof z.ZodObject && iSchema.shape.query
                  ? `<% query %>`
                  : undefined
            }
          },
          input: (value: any): DaunusAction<O, ExceptionParams<O, P>, E> => ({
            ...action,
            run: makeRun((ctx) => {
              ctx.set("input", iSchema?.parse(value));
            })
          }),
          rawInput: (
            value: unknown
          ): DaunusAction<O, ExceptionParams<O, P>, E> => ({
            ...action,
            run: makeRun((ctx) => {
              ctx.set("input", iSchema?.parse(value));
            })
          })
        })
      })
    };

    return actionWithOptions;
  };

export const parseParams = async <T>(
  ctx: Map<string, any>,
  params: T,
  options?: {
    schema?: z.Schema<T>;
    skipPlaceholders?: boolean;
  }
) => {
  const resolvedParams = await resolveParams(ctx, params, {
    skipPlaceholders: options?.skipPlaceholders
  });

  if (!options?.schema) {
    return resolvedParams as T;
  }

  return options?.schema.parse(resolvedParams) as T;
};
