import assert from "node:assert/strict";

import {
  spawn,
} from "node:child_process";

import {
  createServer,
} from "node:net";

import test from "node:test";

async function getFreePort() {
  return await new Promise(
    (resolve, reject) => {
      const server =
        createServer();

      server.once(
        "error",
        reject,
      );

      server.listen(
        0,
        "127.0.0.1",
        () => {
          const address =
            server.address();

          const port =
            typeof address ===
              "object" &&
            address
              ? address.port
              : null;

          server.close(
            (error) => {
              if (error) {
                reject(error);
              } else if (!port) {
                reject(
                  new Error(
                    "Could not allocate test port",
                  ),
                );
              } else {
                resolve(port);
              }
            },
          );
        },
      );
    },
  );
}

async function waitForHealth(
  child,
  baseUrl,
) {
  const deadline =
    Date.now() + 10_000;

  while (
    Date.now() < deadline
  ) {
    if (
      child.exitCode !== null
    ) {
      throw new Error(
        `local API exited with ${child.exitCode}`,
      );
    }

    try {
      const response =
        await fetch(
          `${baseUrl}/health`,
        );

      if (response.ok) {
        return;
      }
    } catch {
      // Starting.
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          100,
        ),
    );
  }

  throw new Error(
    "local API did not become healthy",
  );
}

async function stopChild(
  child,
) {
  if (
    child.exitCode !== null
  ) {
    return;
  }

  child.kill("SIGTERM");

  await Promise.race([
    new Promise(
      (resolve) =>
        child.once(
          "exit",
          resolve,
        ),
    ),
    new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          2000,
        ),
    ),
  ]);

  if (
    child.exitCode === null
  ) {
    child.kill("SIGKILL");
  }
}

test("local API serves the responsive product-page demo preview", async (context) => {
  const port =
    await getFreePort();

  const baseUrl =
    `http://127.0.0.1:${port}`;

  const child =
    spawn(
      process.execPath,
      [
        "scripts/local-api.mjs",
      ],
      {
        cwd:
          process.cwd(),
        env: {
          ...process.env,
          LOCAL_API_PORT:
            String(port),
          AI_PROVIDER:
            "mock",
          LOG_LEVEL:
            "silent",
        },
        stdio: [
          "ignore",
          "pipe",
          "pipe",
        ],
        windowsHide: true,
      },
    );

  context.after(
    async () =>
      await stopChild(
        child,
      ),
  );

  await waitForHealth(
    child,
    baseUrl,
  );

  const response =
    await fetch(
      `${baseUrl}/product-page/preview-demo`,
    );

  assert.equal(
    response.status,
    200,
  );

  const html =
    await response.text();

  assert.match(
    html,
    /Portable Espresso Maker/,
  );

  assert.match(
    html,
    /data-live-publishing="false"/,
  );

  assert.match(
    html,
    /VERIFIED COMPARISON/,
  );

  assert.doesNotMatch(
    html,
    /<script\b/i,
  );
});
