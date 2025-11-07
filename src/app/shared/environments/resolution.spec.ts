import { collectVariableTokens } from "./env-resolution.util";

describe("variable resolution", () => {
  it("prefers request variables over environment and globals", () => {
    const tokens = collectVariableTokens(
      {
        url: "https://{{host}}/data",
        headers: [{ key: "Authorization", value: "Bearer {{token}}" }],
      },
      {
        requestVars: { host: "local.request" },
        environment: {
          id: "env-1",
          meta: { id: "env-1", createdAt: 1, updatedAt: 1, version: 1 },
          name: "Env",
          order: 1,
          vars: { host: "env.host", token: "env-token" },
        } as any,
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

  it("flags missing variables without blocking", () => {
    const tokens = collectVariableTokens(
      { url: "https://{{missing}}/api" },
      { requestVars: {}, environment: null, globals: {} }
    );
    const missing = tokens.find((t) => t.source === "missing");
    expect(missing?.key).toBe("missing");
    expect(missing?.value).toBeUndefined();
  });
});
