import { z } from "zod";
import { $useCase } from "./daunus_use_case";
import { Expect, Equal } from "./type_helpers";
import { $input } from ".";

describe("$route", () => {
  it("show work without input", async () => {
    const useCase = $useCase().handle(() => "Hello world");

    const data = await useCase.run();

    type A = typeof data;

    type data = Expect<Equal<A, string>>;

    expect(data).toEqual("Hello world");
  });

  it("show work for single step", async () => {
    const input = $input({ name: z.string() });

    const useCase = $useCase({ input }).handle(($) => $.input.name === "lorem");

    const data = await useCase.run({ name: "lorem" });

    type A = typeof data;

    type data = Expect<Equal<A, boolean>>;

    expect(data).toEqual(true);
  });

  it("should provide expected types for return", async () => {
    const input = $input({ name: z.string() });

    const route = $useCase({ input })
      .steps()

      .add("first step", ($) => $.input)

      .add("second step", ($) => $.firstStep.name);

    const data = await route.run({ name: "Luna" });

    type A = typeof data;

    type data = Expect<Equal<A, string>>;

    expect(data).toEqual("Luna");
  });
});
