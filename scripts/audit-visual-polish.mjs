import {
  buildDemoProductPagePreview,
} from "./product-preview-demo.mjs";

function pass(
  label,
  detail,
) {
  console.log(
    `[PASS] ${label} -> ${detail}`,
  );
}

function fail(
  message,
) {
  throw new Error(
    message,
  );
}

const {
  preview,
  visualPack,
} =
  buildDemoProductPagePreview();

const byKind =
  new Map(
    visualPack.assets.map(
      (asset) => [
        asset.kind,
        asset,
      ],
    ),
  );

const expected = {
  hero: [
    1200,
    900,
  ],

  benefit: [
    1200,
    760,
  ],

  feature: [
    1200,
    760,
  ],

  comparison: [
    1200,
    650,
  ],

  offer: [
    1200,
    700,
  ],
};

for (
  const [
    kind,
    [width, height],
  ] of Object.entries(
    expected,
  )
) {
  const asset =
    byKind.get(kind);

  if (!asset) {
    fail(
      `Missing ${kind} visual.`,
    );
  }

  if (
    asset.width !== width ||
    asset.height !== height
  ) {
    fail(
      `${kind} expected ${width}x${height}, received ${asset.width}x${asset.height}.`,
    );
  }
}

pass(
  "Purpose-built aspect ratios",
  "hero/benefit/feature/comparison/offer use compact dimensions",
);

const sourceRequired =
  visualPack.assets.filter(
    (asset) =>
      asset.svg.includes(
        "SOURCE REQUIRED",
      ),
  );

if (
  sourceRequired.length !==
    1 ||
  sourceRequired[0]?.kind !==
    "hero"
) {
  fail(
    "SOURCE REQUIRED must appear only in the hero visual.",
  );
}

pass(
  "Placeholder reduction",
  "large product-image placeholder appears only in hero",
);

const comparison =
  byKind.get(
    "comparison",
  );

if (
  !comparison.svg.includes(
    "500 ml",
  ) ||
  !comparison.svg.includes(
    "350 ml",
  ) ||
  !comparison.svg.includes(
    "400 g",
  ) ||
  !comparison.svg.includes(
    "500 g",
  )
) {
  fail(
    "Comparison visual is missing expected demo metrics.",
  );
}

pass(
  "Comparison density",
  "capacity and weight comparisons rendered",
);

if (
  !preview.html.includes(
    'class="trust-icon"',
  )
) {
  fail(
    "Enhanced trust strip is missing.",
  );
}

if (
  !preview.html.includes(
    ".faq-item summary::after",
  )
) {
  fail(
    "FAQ polish styles are missing.",
  );
}

if (
  !preview.html.includes(
    'class="offer-proof"',
  )
) {
  fail(
    "Offer proof block is missing.",
  );
}

pass(
  "Storefront polish",
  "trust strip, offer proof and FAQ styling present",
);

if (
  !preview.qa.passed
) {
  fail(
    `Preview QA has ${preview.qa.errors} errors.`,
  );
}

pass(
  "Preview safety",
  "existing preview QA remains passing",
);

console.log("");
console.log(
  "PHASE 7 VISUAL POLISH AUDIT PASSED",
);
