import { $steps } from "./daunus_steps"
import {
  AbstractStepFactory,
  Scope,
  StepConfig,
  StepFactory,
  StepProps,
  resultKey
} from "./new_types"
import { createRun } from "./run_helpers"
import { ValidateName, Overwrite } from "./type_helpers"
import {
  DataResponse,
  DaunusAction,
  DaunusActionOrActionWithInput,
  DaunusActionWithInput,
  ExceptionReponse
} from "./types"

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
  Local extends Record<any, any> = {},
  CurrentKey extends Key = "",
  Without extends string = ""
> = Omit<
  ConditionDefaultCaseStepFactory<
    Condition,
    Global,
    Local,
    CurrentKey,
    Without
  >,
  Without
>

interface ConditionDefaultCaseStepFactory<
  Condition,
  Global extends Record<string, any> = {},
  Local extends Record<string, any> = {},
  CurrentKey extends Key = "",
  Without extends string = ""
> extends AbstractStepFactory<Global, Local>,
    DaunusActionOrActionWithInput<
      Global["input"],
      ExtractValuesByKey<Local, typeof resultKey>
    > {
  isTrue(): ConditionDefaultCaseStepFactoryWithout<
    Condition,
    GlobalWithoutFalcy<Global, Condition>,
    Local,
    "true",
    "isTrue"
  >

  isFalse(): ConditionDefaultCaseStepFactoryWithout<
    Condition,
    GlobalWithoutTruthy<Global, Condition>,
    Local,
    "false",
    "isFalse"
  >

  add<Value, Name extends string>(
    name: ValidateName<Name, Local> | StepConfig<Name, Local>,
    fn: (props: StepProps<Global>) => Value | Promise<Value>
  ): ConditionDefaultCaseStepFactoryWithout<
    Condition,
    Overwrite<Global, Name> &
      Record<
        Name,
        Value extends
          | DaunusAction<any, any>
          | DaunusActionWithInput<any, any, any>
          ? Awaited<ReturnType<Value["run"]>> extends DataResponse<infer T>
            ? T
            : never
          : Value
      > &
      (Value extends
        | DaunusAction<any, any>
        | DaunusActionWithInput<any, any, any>
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
        : {}),
    OmitNestedByPath<Local, [CurrentKey, typeof resultKey]> &
      Record<CurrentKey, Record<Name, Value>> &
      Record<
        CurrentKey,
        Record<
          typeof resultKey,
          Value extends
            | DaunusAction<any, any>
            | DaunusActionWithInput<any, any, any>
            ? Awaited<ReturnType<Value["run"]>> extends DataResponse<infer T>
              ? T
              : never
            : Value
        > &
          (Value extends
            | DaunusAction<any, any>
            | DaunusActionWithInput<any, any, any>
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
type Falsy = false | 0 | -0 | 0n | "" | null | undefined | typeof Number.NaN

type Truthy<T> = Exclude<T, Falsy>

type ExcludeFalsy<Condition> = Exclude<Condition, Falsy>

type ExcludeTruthy<Condition> = Exclude<Condition, Truthy<Condition>>

type GlobalWithoutFalcy<Global, Condition> = Omit<Global, "condition"> &
  Record<"condition", ExcludeFalsy<Condition>>

type GlobalWithoutTruthy<Global, Condition> = Omit<Global, "condition"> &
  Record<"condition", ExcludeTruthy<Condition>>

type Key = "true" | "false" | ""

export type ConditionFactory<
  Condition,
  Global extends Record<string, any> = {},
  Local extends Record<string, any> = {}
> = ConditionDefaultCaseStepFactory<Condition, Global, Local, "", "add">

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
  key,
  $,
  scope: prevScope,
  name: actionName
}: {
  condition: Condition
  $?: Global
  key?: Key
  scope?: Scope<any, any>
  name?: string
}): ConditionFactory<Condition, Global, Local> {
  const scope =
    prevScope ??
    new Scope({})
      .addLocal("true", {
        scope: new Scope({ global: $ })
      })
      .addLocal("false", {
        scope: new Scope({ global: $ })
      })

  function get<Name extends keyof Local>(
    name: Extract<Name, string>,
    global?: Record<any, any>
  ): Local[Name] {
    return scope.get(name, global)
  }

  function isTrue(): any {
    return $if({
      condition,
      key: "true",
      scope
    })
  }

  function isFalse(): any {
    return $if({
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

    return $if({
      key,
      condition,
      scope
    })
  }

  const run = createRun<Global["input"]>(async (ctx) => {
    const noSteps =
      Object.values(scope.local).filter(
        (item: any) => Object.values(item.scope.steps).length === 0
      ).length === 0

    if (!noSteps) {
      return condition
    }

    if (condition) {
      const { data } = await $steps({
        $: scope.get("true").scope.addGlobal("condition", condition)
      }).run(ctx)

      return data
    }

    const { data } = await $steps({
      $: scope.get("false").scope.addGlobal("condition", condition)
    }).run(ctx)

    return data
  })

  // TODO
  const env = {}

  const name = actionName as string

  const input: any = () => {
    return {} as any
  }

  return { run, get, add, isTrue, isFalse, scope, env, name, input }
}
