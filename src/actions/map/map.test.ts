import { struct } from "..";
import { $query } from "../..";
import { $ctx } from "../../daunus_helpers";

import map from "./index";

describe("map", () => {
  it("should work for basic example", async () => {
    const action = map(
      {
        list: [1, 2],
        itemName: "item",
        action: {
          type: ["struct"],
          params: $query(($) => $.item as number)
        }
      },
      { name: "items" }
    );

    const res = await action.run($ctx());

    expect(res.data).toStrictEqual([1, 2]);
  });

  it("should work with $action", async () => {
    const action = map(
      {
        list: [1, 2],
        itemName: "item",
        action: struct({ foo: $query(($) => $.item as number) })
      },
      { name: "items" }
    );

    const res = await action.run($ctx());

    expect(res.data).toStrictEqual([{ foo: 1 }, { foo: 2 }]);
  });
});
