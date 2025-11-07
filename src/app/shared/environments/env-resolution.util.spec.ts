import { collectVariableTokens } from "./env-resolution.util";

describe("env-resolution.util", () => {
  it("resolves variables using request > env > global order", () => {
    const tokens = collectVariableTokens(
      {
        url: "https://{{host}}/data",
        headers: [{ key: "Authorization", value: "Bearer {{token}}" }],
      },
      {
        requestVars: { host: "local.request" },
        environment: {
          meta: { id: "env", createdAt: 1, updatedAt: 1, version: 1 },
          name: "Env",
          order: 1,
          vars: { host: "env.host", token: "env-token" },
        },
        globals: { token: "global-token" },
      }
    );
    const host = tokens.find((t) => t.key === "host");
    const token = tokens.find((t) => t.key === "token");
    expect(host?.value).toBe("local.request");
    expect(host?.source).toBe("request");
    expect(token?.value).toBe("env-token");
    expect(token?.source).toBe("environment");
  });
});
