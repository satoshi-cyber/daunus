import { FormatScope } from "./type_helpers";

export interface Action<R, I = unknown> {
  run: I extends object
    ? (input: I, ctx?: Map<string, any>) => R
    : (ctx?: Map<string, any>) => R
}

type WorkflowBackoff = "constant" | "linear" | "exponential";

export interface StepConfig {
  retries?: {
    limit: number;
    delay: string | number;
    backoff?: WorkflowBackoff;
  };
  timeout?: string | number;
}

export class Scope<
  G extends Record<string, any> = {},
  L extends Record<string, any> = {}
> {
  public global: G;
  public local: L;

  constructor({ global, local }: { global?: G; local?: L }) {
    this.global = global ?? ({} as G);
    this.local = local ?? ({} as L);
  }

  addGlobal<N extends string, V>(name: N, value: V) {
    return new Scope<G & Record<N, V>, L>({
      global: { ...this.global, [name]: value },
      local: this.local
    });
  }
}

export interface AbstractStepFactory<
  G extends Record<string, any> = {},
  L extends Record<string, any> = {}
> {
  scope: Scope<FormatScope<G>, FormatScope<L>>;

  get(name: string, scope?: Record<any, any>): any;

  add(...params: any): any;
}

export interface StepFactory<
  G extends Record<string, any> = {},
  L extends Record<string, any> = {}
> extends AbstractStepFactory<G, L> {
  get<N extends keyof L>(name: N, scope?: Record<any, any>): L[N];
}

export const resultKey: unique symbol = Symbol("resultKey");

export interface StepOptions {
  stepsType?: "default" | "parallel" | "serial";
}
