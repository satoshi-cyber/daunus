import { type z } from "zod"
import {
  type DaunusAction,
  type DaunusActionOrActionWithInput,
  type DaunusActionWithInput,
  type DaunusCtx
} from "./types"
import { $action } from "./daunus_action"
import { $ctx } from "./daunus_helpers"

export const $actionWithInput =
  <I, P, O, E = {}>(
    args: {
      type: string
      name?: string
      paramsSchema?: z.Schema<P>
      skipParse?: boolean
      skipPlaceholders?: boolean
      envSchema?: z.Schema<E>
      inputSchema?: z.Schema<I>
    },
    fn: ({
      ctx,
      env
    }: {
      ctx: DaunusCtx
      env: E
    }) => (params: P) => Promise<O> | O
  ) =>
  (
    params: P,
    actionCtx?: {
      name?: string
    }
  ): DaunusActionOrActionWithInput<I, O, E> => {
    const factory = $action<P, O, E>(args, (options) => fn(options))

    const action = factory(params, actionCtx)

    const run = ((
      ...args: [ctx?: Map<string, any>] | [input: I, ctx?: Map<string, any>]
    ) => {
      const ctx = getContext(...args)

      return action.run(ctx)
    }) as I extends object
      ? DaunusActionWithInput<I, O, E>["run"]
      : DaunusAction<O, E>["run"]

    const input = ((input: I) => {
      return {
        ...action,
        run: (ctx: DaunusCtx = $ctx()) => {
          ctx.set("input", input)

          return action.run(ctx)
        }
      }
    }) as I extends object ? typeof input : never

    return { ...action, input, run }
  }

export const getContext = <I>(
  ...args: [input: I, ctx?: Map<string, any>] | [ctx?: Map<string, any>]
) => {
  switch (args.length) {
    case 0: {
      return $ctx()
    }

    case 1: {
      if (args[0] instanceof Map) {
        return args[0]
      }

      return $ctx().set("input", args[0])
    }

    case 2: {
      return (args[1] ?? $ctx()).set("input", args[0])
    }
  }
}
