import { $actionWithInput } from "./daunus_action_with_input"
import { $steps } from "./daunus_steps"

import { type ValidateName } from "./types_helpers"
import {
  type AbstractStepFactory,
  type resultKey,
  type DataResponse,
  type ActionOrActionWithInput,
  type ExceptionReponse,
  type StepConfig,
  type ActionWithInput,
  type Action,
  type StepFactory
} from "./types"
import { Scope } from "./daunus_scope"
import { $stepProps, type StepProps } from "./daunus_step_props"

export type ExtractValuesByKey<T, K extends keyof any> =
  T extends Record<string, any>
    ? T extends Record<K, infer R>
      ? R
      : { [P in keyof T]: T[P] extends Record<K, infer S> ? S : never }[keyof T]
    : never

export type OmitNestedByPath<
  T,
  Path extends [keyof any, ...any[]]
> = Path extends [infer Key, infer SecondKey]
  ? Key extends keyof T
    ? SecondKey extends keyof T[Key]
      ? { [K in keyof T]: K extends Key ? Omit<T[K], SecondKey> : T[K] }
      : Omit<T, Key>
    : T
  : T

type ConditionDefaultCaseStepFactoryWithout<
  Condition,
  Global extends Record<string, any> = {},
  ScopedGlobal extends Record<string, any> = {},
  Local extends Record<any, any> = {},
  CurrentKey extends Key = "",
  Without extends string = ""
> = Omit<
  ConditionDefaultCaseStepFactory<
    Condition,
    Global,
    ScopedGlobal,
    Local,
    CurrentKey,
    Without
  >,
  Without
>

interface ConditionDefaultCaseStepFactory<
  Condition,
  Global extends Record<string, any> = {},
  ScopedGlobal extends Record<string, any> = {},
  Local extends Record<string, any> = {},
  CurrentKey extends Key = "",
  Without extends string = ""
> extends AbstractStepFactory<Global, Local>,
    ActionOrActionWithInput<
      Global["input"],
      ExtractValuesByKey<Local, typeof resultKey>
    > {
  isTrue(): ConditionDefaultCaseStepFactoryWithout<
    Condition,
    Global,
    ScopedGlobal & Record<"true", Record<"condition", ExcludeFalsy<Condition>>>,
    Local,
    "true",
    "isTrue"
  >

  isFalse(): ConditionDefaultCaseStepFactoryWithout<
    Condition,
    Global,
    ScopedGlobal &
      Record<"false", Record<"condition", ExcludeTruthy<Condition>>>,
    Local,
    "false",
    "isFalse"
  >

  add<Value, Name extends string>(
    name: ValidateName<Name, Local> | StepConfig<Name, Local>,
    fn: (
      props: StepProps<Global & ScopedGlobal[CurrentKey]>
    ) => Value | Promise<Value>
  ): ConditionDefaultCaseStepFactoryWithout<
    Condition,
    Global,
    ScopedGlobal &
      Record<
        CurrentKey,
        Record<
          Name,
          Value extends Action<any, any> | ActionWithInput<any, any, any>
            ? Awaited<ReturnType<Value["run"]>> extends DataResponse<infer T>
              ? T
              : never
            : Value
        >
        // TODO: add continue on error option
        //   &
        //     (Value extends Action<any, any> | ActionWithInput<any, any, any>
        //       ? Record<
        //           "exceptions",
        //           Record<
        //             Name,
        //             Awaited<ReturnType<Value["run"]>> extends ExceptionReponse<
        //               infer T
        //             >
        //               ? T
        //               : never
        //           >
        //         >
        //       : {})
        //
      >,
    OmitNestedByPath<Local, [CurrentKey, typeof resultKey]> &
      Record<CurrentKey, Record<Name, Value>> &
      Record<
        CurrentKey,
        Record<
          typeof resultKey,
          Value extends Action<any, any> | ActionWithInput<any, any, any>
            ? Awaited<ReturnType<Value["run"]>> extends DataResponse<infer T>
              ? T
              : never
            : Value
        > &
          (Value extends Action<any, any> | ActionWithInput<any, any, any>
            ? Record<
                "exceptions",
                Record<
                  Name,
                  Awaited<ReturnType<Value["run"]>> extends ExceptionReponse<
                    infer T
                  >
                    ? T
                    : never
                >
              >
            : {})
      >,
    CurrentKey,
    Without
  >

  get<N extends keyof Local>(
    name: N,
    scope?: Record<any, any>
  ): StepFactory<Global, Local[N]>
}
// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents, @typescript-eslint/no-redundant-type-constituents
type Falsy = false | 0 | -0 | 0n | "" | null | undefined | typeof Number.NaN

type Truthy<T> = Exclude<T, Falsy>

type ExcludeFalsy<Condition> = Exclude<Condition, Falsy>

type ExcludeTruthy<Condition> = Exclude<Condition, Truthy<Condition>>

type Key = "true" | "false" | ""

export interface ConditionFactory<
  Condition,
  Global extends Record<string, any> = {},
  Local extends Record<string, any> = {}
> extends ActionOrActionWithInput<Global["input"], Condition> {
  isTrue(): ConditionDefaultCaseStepFactoryWithout<
    Condition,
    Global,
    Record<"true", Record<"condition", ExcludeFalsy<Condition>>>,
    Local,
    "true",
    "isTrue"
  >

  isFalse(): ConditionDefaultCaseStepFactoryWithout<
    Condition,
    Global,
    Record<"false", Record<"condition", ExcludeTruthy<Condition>>>,
    Local,
    "false",
    "isFalse"
  >
}

function $ifBranch<
  Condition,
  Global extends Record<string, any> = {},
  ScopeGlobal extends Record<string, any> = {},
  Local extends Record<any, any> = Record<
    "true",
    Record<"condition", Exclude<Condition, Falsy>> &
      Record<typeof resultKey, ExcludeFalsy<Condition>>
  > &
    Record<
      "false",
      Record<"condition", ExcludeTruthy<Condition>> &
        Record<typeof resultKey, ExcludeTruthy<Condition>>
    >,
  CurrentKey extends Key = "",
  Without extends string = ""
>({
  condition,
  key,
  scope
}: {
  condition: Condition
  key?: Key
  scope: Scope<any, any>
  name?: string
}): ConditionDefaultCaseStepFactory<
  Condition,
  Global,
  ScopeGlobal,
  Local,
  CurrentKey,
  Without
> {
  function get<Name extends keyof Local>(
    name: Extract<Name, string>,
    global?: Record<any, any>
  ): Local[Name] {
    return scope.get(name, $stepProps(global))
  }

  function isTrue(): any {
    return $ifBranch({
      condition,
      key: "true",
      scope
    })
  }

  function isFalse(): any {
    return $ifBranch({
      condition,
      key: "false",
      scope
    })
  }

  function add(
    nameOrConfig: string | StepConfig<any, any>,
    fn: (props: any) => any
  ): any {
    scope.get(key ?? "").scope.addStep(nameOrConfig, fn)

    return $ifBranch({
      key,
      condition,
      scope
    })
  }

  const action = $actionWithInput<Global["input"], any, any>(
    { type: "condition" },
    ({ ctx }) =>
      async () => {
        if (condition) {
          const trueScope = scope
            .get("true")
            .scope.addGlobal("condition", condition)

          const { data, exception } = await $steps({
            $: trueScope
          }).run(ctx)

          if (exception) {
            return exception
          }

          return data
        }

        const falseScope = scope
          .get("false")
          .scope.addGlobal("condition", condition)

        const { data, exception } = await $steps({
          $: falseScope
        }).run(ctx)

        if (exception) {
          return exception
        }

        return data
      }
  )({})

  return { ...action, get, add, isTrue, isFalse, scope }
}

export function $if<
  Condition,
  Global extends Record<string, any> = {},
  Local extends Record<any, any> = Record<
    "true",
    Record<"condition", Exclude<Condition, Falsy>> &
      Record<typeof resultKey, ExcludeFalsy<Condition>>
  > &
    Record<
      "false",
      Record<"condition", ExcludeTruthy<Condition>> &
        Record<typeof resultKey, ExcludeTruthy<Condition>>
    >
>({
  condition,
  $
}: {
  condition: Condition
  $?: Global
  name?: string
}): ConditionFactory<Condition, Global, Local> {
  const scope = new Scope({})
    .addLocal("true", {
      scope: new Scope({ global: $ })
    })
    .addLocal("false", {
      scope: new Scope({ global: $ })
    })

  const action = $actionWithInput<Global["input"], any, any>(
    { type: "condition" },
    () => async () => {
      return condition
    }
  )({})

  function isTrue(): any {
    return $ifBranch({
      condition,
      key: "true",
      scope
    })
  }

  function isFalse(): any {
    return $ifBranch({
      condition,
      key: "false",
      scope
    })
  }

  return { ...action, isTrue, isFalse }
}
