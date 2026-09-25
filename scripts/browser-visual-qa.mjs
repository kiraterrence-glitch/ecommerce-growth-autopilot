import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  constants,
} from "node:fs";

import {
  tmpdir,
} from "node:os";

import {
  join,
  resolve,
} from "node:path";

import {
  spawn,
  spawnSync,
} from "node:child_process";

const proofRoot =
  resolve(
    "docs",
    "portfolio-proof",
    "product-page-demo",
  );

const screenshotRoot =
  join(
    proofRoot,
    "screenshots",
  );

async function exists(path) {
  try {
    await access(
      path,
      constants.F_OK,
    );

    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,

    process.env.PROGRAMFILES
      ? join(
          process.env.PROGRAMFILES,
          "Google",
          "Chrome",
          "Application",
          "chrome.exe",
        )
      : null,

    process.env["PROGRAMFILES(X86)"]
      ? join(
          process.env["PROGRAMFILES(X86)"],
          "Google",
          "Chrome",
          "Application",
          "chrome.exe",
        )
      : null,

    process.env.LOCALAPPDATA
      ? join(
          process.env.LOCALAPPDATA,
          "Google",
          "Chrome",
          "Application",
          "chrome.exe",
        )
      : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Google Chrome executable was not found.",
  );
}

async function freePort() {
  const {
    createServer,
  } =
    await import(
      "node:net"
    );

  return await new Promise(
    (resolvePort, reject) => {
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
                return;
              }

              if (!port) {
                reject(
                  new Error(
                    "Could not allocate a local port.",
                  ),
                );

                return;
              }

              resolvePort(port);
            },
          );
        },
      );
    },
  );
}

async function delay(ms) {
  await new Promise(
    (resolveDelay) =>
      setTimeout(
        resolveDelay,
        ms,
      ),
  );
}

async function waitFor(
  callback,
  timeoutMs,
  message,
) {
  const deadline =
    Date.now() +
    timeoutMs;

  let latestError = null;

  while (
    Date.now() <
    deadline
  ) {
    try {
      const result =
        await callback();

      if (result) {
        return result;
      }
    } catch (error) {
      latestError =
        error;
    }

    await delay(100);
  }

  throw new Error(
    `${message}${
      latestError instanceof Error
        ? `: ${latestError.message}`
        : ""
    }`,
  );
}

function killTree(child) {
  if (
    !child ||
    !child.pid
  ) {
    return;
  }

  if (
    process.platform ===
    "win32"
  ) {
    spawnSync(
      "taskkill",
      [
        "/PID",
        String(child.pid),
        "/T",
        "/F",
      ],
      {
        stdio:
          "ignore",
      },
    );

    return;
  }

  try {
    child.kill(
      "SIGKILL",
    );
  } catch {
    // Best-effort cleanup only.
  }
}

class CdpClient {
  constructor(socket) {
    this.socket =
      socket;

    this.nextId =
      1;

    this.pending =
      new Map();

    socket.addEventListener(
      "message",
      (event) => {
        const message =
          JSON.parse(
            event.data,
          );

        if (
          typeof message.id !==
          "number"
        ) {
          return;
        }

        const pending =
          this.pending.get(
            message.id,
          );

        if (!pending) {
          return;
        }

        this.pending.delete(
          message.id,
        );

        if (message.error) {
          pending.reject(
            new Error(
              message.error.message ??
              "Chrome DevTools command failed.",
            ),
          );

          return;
        }

        pending.resolve(
          message.result,
        );
      },
    );
  }

  static async connect(url) {
    if (
      typeof WebSocket ===
      "undefined"
    ) {
      throw new Error(
        "This Node.js version does not expose WebSocket support.",
      );
    }

    const socket =
      new WebSocket(
        url,
      );

    await new Promise(
      (resolveOpen, reject) => {
        socket.addEventListener(
          "open",
          resolveOpen,
          {
            once: true,
          },
        );

        socket.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Could not connect to Chrome DevTools.",
              ),
            ),
          {
            once: true,
          },
        );
      },
    );

    return new CdpClient(
      socket,
    );
  }

  command(
    method,
    params = {},
  ) {
    const id =
      this.nextId++;

    return new Promise(
      (resolveCommand, reject) => {
        this.pending.set(
          id,
          {
            resolve:
              resolveCommand,
            reject,
          },
        );

        this.socket.send(
          JSON.stringify({
            id,
            method,
            params,
          }),
        );
      },
    );
  }

  close() {
    try {
      this.socket.close();
    } catch {
      // Best effort.
    }
  }
}

async function chromePage(
  port,
) {
  return await waitFor(
    async () => {
      const response =
        await fetch(
          `http://127.0.0.1:${port}/json/list`,
        );

      if (!response.ok) {
        return null;
      }

      const pages =
        await response.json();

      return (
        pages.find(
          (page) =>
            page.type ===
              "page" &&
            page.webSocketDebuggerUrl,
        ) ??
        null
      );
    },

    15000,

    "Chrome DevTools target did not become available",
  );
}

async function waitForDocument(
  cdp,
) {
  await waitFor(
    async () => {
      const state =
        await cdp.command(
          "Runtime.evaluate",
          {
            expression:
              "document.readyState",
            returnByValue:
              true,
          },
        );

      return (
        state.result
          ?.value ===
        "complete"
      );
    },

    10000,

    "Product preview did not finish loading",
  );

  await delay(300);
}

const inspectionExpression = `
(() => {
  const required = [
    "hero",
    "benefit",
    "feature",
    "comparison",
    "offer"
  ];

  const root =
    document.documentElement;

  const body =
    document.body;

  const visualNodes =
    Array.from(
      document.querySelectorAll(
        "[data-visual-kind]"
      )
    );

  const kinds =
    visualNodes.map(
      node =>
        node.getAttribute(
          "data-visual-kind"
        )
    );

  const missingVisuals =
    required.filter(
      kind =>
        !kinds.includes(kind)
    );

  const zeroSizeVisuals =
    visualNodes
      .filter(node => {
        const box =
          node.getBoundingClientRect();

        return (
          box.width < 10 ||
          box.height < 10
        );
      })
      .map(
        node =>
          node.getAttribute(
            "data-visual-kind"
          )
      );

  const brokenImages =
    Array.from(
      document.images
    )
      .filter(
        image =>
          image.complete &&
          image.naturalWidth === 0
      )
      .map(
        image =>
          image.currentSrc ||
          image.src
      );

  const ctas =
    Array.from(
      document.querySelectorAll(
        '[data-preview-cta="true"]'
      )
    );

  const visibleCtas =
    ctas.filter(node => {
      const box =
        node.getBoundingClientRect();

      const style =
        getComputedStyle(
          node
        );

      return (
        box.width > 10 &&
        box.height > 10 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    }).length;

  return {
    viewportWidth:
      innerWidth,

    viewportHeight:
      innerHeight,

    pageWidth:
      root.scrollWidth,

    pageHeight:
      Math.max(
        root.scrollHeight,
        body.scrollHeight
      ),

    horizontalOverflow:
      root.scrollWidth >
      root.clientWidth + 2,

    visualCount:
      visualNodes.length,

    svgCount:
      document.querySelectorAll(
        "svg"
      ).length,

    missingVisuals,

    zeroSizeVisuals,

    brokenImages,

    ctaCount:
      ctas.length,

    visibleCtas,

    scriptCount:
      document.querySelectorAll(
        "script"
      ).length,

    externalWrites:
      body.dataset
        .externalWrites,

    livePublishing:
      body.dataset
        .livePublishing,

    heading:
      document.querySelector(
        "h1"
      )?.textContent?.trim() ??
      null,

    title:
      document.title
  };
})()
`;

async function testViewport(
  cdp,
  url,
  viewport,
) {
  await cdp.command(
    "Emulation.setDeviceMetricsOverride",
    {
      width:
        viewport.width,

      height:
        viewport.height,

      deviceScaleFactor:
        1,

      mobile:
        viewport.mobile,

      screenWidth:
        viewport.width,

      screenHeight:
        viewport.height,
    },
  );

  await cdp.command(
    "Page.navigate",
    {
      url,
    },
  );

  await waitForDocument(
    cdp,
  );

  const evaluated =
    await cdp.command(
      "Runtime.evaluate",
      {
        expression:
          inspectionExpression,

        returnByValue:
          true,
      },
    );

  const inspection =
    evaluated.result
      ?.value;

  if (!inspection) {
    throw new Error(
      `No browser inspection result returned for ${viewport.name}.`,
    );
  }

  const failures = [];

  if (
    inspection
      .horizontalOverflow
  ) {
    failures.push(
      "horizontal overflow",
    );
  }

  if (
    inspection
      .visualCount !==
      5
  ) {
    failures.push(
      `expected 5 visual sections but found ${inspection.visualCount}`,
    );
  }

  if (
    inspection.svgCount <
    5
  ) {
    failures.push(
      `expected at least 5 SVGs but found ${inspection.svgCount}`,
    );
  }

  if (
    inspection
      .missingVisuals
      .length
  ) {
    failures.push(
      `missing visuals: ${inspection.missingVisuals.join(", ")}`,
    );
  }

  if (
    inspection
      .zeroSizeVisuals
      .length
  ) {
    failures.push(
      `zero-size visuals: ${inspection.zeroSizeVisuals.join(", ")}`,
    );
  }

  if (
    inspection
      .brokenImages
      .length
  ) {
    failures.push(
      `broken images: ${inspection.brokenImages.join(", ")}`,
    );
  }

  if (
    inspection.visibleCtas <
    1
  ) {
    failures.push(
      "no visible CTA",
    );
  }

  if (
    inspection
      .externalWrites !==
      "false"
  ) {
    failures.push(
      "externalWrites is not false",
    );
  }

  if (
    inspection
      .livePublishing !==
      "false"
  ) {
    failures.push(
      "livePublishing is not false",
    );
  }

  if (
    inspection
      .scriptCount !==
      0
  ) {
    failures.push(
      `expected zero client scripts but found ${inspection.scriptCount}`,
    );
  }

  const layout =
    await cdp.command(
      "Page.getLayoutMetrics",
    );

  const content =
    layout.cssContentSize ??
    layout.contentSize;

  const screenshot =
    await cdp.command(
      "Page.captureScreenshot",
      {
        format:
          "png",

        fromSurface:
          true,

        captureBeyondViewport:
          true,

        clip: {
          x: 0,
          y: 0,

          width:
            Math.ceil(
              content.width,
            ),

          height:
            Math.ceil(
              content.height,
            ),

          scale:
            1,
        },
      },
    );

  await writeFile(
    join(
      screenshotRoot,
      `${viewport.name}.png`,
    ),

    Buffer.from(
      screenshot.data,
      "base64",
    ),
  );

  return {
    ...viewport,

    passed:
      failures.length ===
      0,

    failures,

    inspection,

    screenshot:
      `screenshots/${viewport.name}.png`,
  };
}

const tempRoot =
  await mkdtemp(
    join(
      tmpdir(),
      "ecom-phase6-",
    ),
  );

let api = null;
let chrome = null;
let cdp = null;

try {
  await rm(
    proofRoot,
    {
      recursive: true,
      force: true,
    },
  );

  await mkdir(
    screenshotRoot,
    {
      recursive: true,
    },
  );

  const apiPort =
    await freePort();

  const baseUrl =
    `http://127.0.0.1:${apiPort}`;

  api =
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
            String(apiPort),

          AI_PROVIDER:
            "mock",

          LOG_LEVEL:
            "silent",

          PRODUCT_PAGE_JOB_PATH:
            join(
              tempRoot,
              "product-page.jsonl",
            ),

          PROJECT_HISTORY_PATH:
            join(
              tempRoot,
              "history.jsonl",
            ),

          AUDIT_PATH:
            join(
              tempRoot,
              "audit.jsonl",
            ),
        },

        stdio: [
          "ignore",
          "pipe",
          "pipe",
        ],

        windowsHide:
          true,
      },
    );

  await waitFor(
    async () => {
      if (
        api.exitCode !==
        null
      ) {
        throw new Error(
          `Local API exited with code ${api.exitCode}.`,
        );
      }

      try {
        const response =
          await fetch(
            `${baseUrl}/health`,
          );

        return response.ok;
      } catch {
        return false;
      }
    },

    15000,

    "Isolated local API did not become healthy",
  );

  const previewUrl =
    `${baseUrl}/product-page/preview-demo`;

  const previewResponse =
    await fetch(
      previewUrl,
    );

  if (
    !previewResponse.ok
  ) {
    throw new Error(
      `Product preview returned HTTP ${previewResponse.status}.`,
    );
  }

  const previewHtml =
    await previewResponse.text();

  await writeFile(
    join(
      proofRoot,
      "index.html",
    ),

    previewHtml,

    "utf8",
  );

  const chromePath =
    await findChrome();

  const chromePort =
    await freePort();

  const chromeProfile =
    join(
      tempRoot,
      "chrome-profile",
    );

  await mkdir(
    chromeProfile,
    {
      recursive: true,
    },
  );

  chrome =
    spawn(
      chromePath,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        `--remote-debugging-port=${chromePort}`,
        `--user-data-dir=${chromeProfile}`,
        "about:blank",
      ],
      {
        stdio:
          "ignore",

        windowsHide:
          true,
      },
    );

  const page =
    await chromePage(
      chromePort,
    );

  cdp =
    await CdpClient.connect(
      page.webSocketDebuggerUrl,
    );

  await cdp.command(
    "Page.enable",
  );

  await cdp.command(
    "Runtime.enable",
  );

  const viewports = [
    {
      name:
        "desktop",

      width:
        1440,

      height:
        1000,

      mobile:
        false,
    },

    {
      name:
        "tablet",

      width:
        1024,

      height:
        768,

      mobile:
        false,
    },

    {
      name:
        "mobile",

      width:
        390,

      height:
        844,

      mobile:
        true,
    },
  ];

  const results = [];

  for (
    const viewport of
    viewports
  ) {
    console.log(
      `Testing ${viewport.name} ${viewport.width}x${viewport.height}...`,
    );

    results.push(
      await testViewport(
        cdp,
        previewUrl,
        viewport,
      ),
    );
  }

  const report = {
    generatedAt:
      new Date().toISOString(),

    previewRoute:
      "/product-page/preview-demo",

    passed:
      results.every(
        (result) =>
          result.passed,
      ),

    externalWrites:
      false,

    livePublishing:
      false,

    viewports:
      results,
  };

  await writeFile(
    join(
      proofRoot,
      "browser-qa-report.json",
    ),

    `${JSON.stringify(
      report,
      null,
      2,
    )}\n`,

    "utf8",
  );

  const proofReadme = [
    "# Product Page Automation Portfolio Proof",
    "",
    "This folder contains browser-rendered proof for the product research and product-page automation workflow.",
    "",
    "## Tested viewports",
    "",
    "- Desktop: 1440 × 1000",
    "- Tablet: 1024 × 768",
    "- Mobile: 390 × 844",
    "",
    "## Checks",
    "",
    "- horizontal overflow",
    "- required visual sections",
    "- SVG rendering",
    "- zero-size visual elements",
    "- broken HTML images",
    "- visible CTA",
    "- externalWrites=false",
    "- livePublishing=false",
    "- no executable client-side JavaScript",
    "",
    "## Screenshots",
    "",
    "- screenshots/desktop.png",
    "- screenshots/tablet.png",
    "- screenshots/mobile.png",
    "",
    "## Demo limitation",
    "",
    "Where no approved real product image exists, the deterministic demo intentionally displays SOURCE REQUIRED rather than fabricating product imagery.",
    "",
    `Browser QA passed: **${report.passed}**`,
    "",
  ].join("\n");

  await writeFile(
    join(
      proofRoot,
      "README.md",
    ),

    proofReadme,

    "utf8",
  );

  console.log("");

  for (
    const result of
    results
  ) {
    console.log(
      `${result.name}: ${
        result.passed
          ? "PASS"
          : "FAIL"
      }`,
    );

    for (
      const failure of
      result.failures
    ) {
      console.log(
        `  - ${failure}`,
      );
    }
  }

  console.log("");
  console.log(
    `Browser QA: ${
      report.passed
        ? "PASS"
        : "FAIL"
    }`,
  );

  if (!report.passed) {
    process.exitCode = 1;
  }
} finally {
  if (cdp) {
    cdp.close();
  }

  killTree(chrome);
  killTree(api);

  await rm(
    tempRoot,
    {
      recursive: true,
      force: true,
    },
  );
}
