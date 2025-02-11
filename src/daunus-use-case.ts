import { type z } from "zod"
import { $steps } from "./daunus-steps"
import { toCamelCase } from "./helpers"
import { type StepOptions, type Ctx } from "./types"
import { Scope } from "./daunus-scope"
import { type StepProps } from "./daunus-step-props"

export function $useCase<Name extends string, Input>(
  originalName: Name,
  options?: { input?: z.ZodType<Input> }
) {
  const name = toCamelCase(originalName)

  const scope = new Scope()
    .addGlobal("useCase", { name, originalName })
    .addLazyGlobal(
      "input",
      (ctx: Ctx) => options?.input?.parse(ctx.get("input")) as Input
    )

  function steps<Options extends StepOptions>(options?: Options) {
    return $steps({
      $: scope,
      stepsType: options?.stepsType as Options["stepsType"]
    })
  }

  function handle<Value>(
    fn: (props: StepProps<typeof scope.global>) => Promise<Value> | Value
  ) {
    return $steps({
      $: scope
    }).add("handle", fn)
  }

  function input<Input>(input: z.ZodType<Input>) {
    return $useCase(originalName, {
      input
    })
  }

  return { steps, handle, originalName, name, input }
}
