import {
  parseMarketplaceEvidenceCsv,
} from "./marketplace-evidence-csv.mjs";

import {
  buildMarketplaceEvidenceLedger,
} from "./marketplace-evidence-ledger.mjs";

import {
  assessAutomatedFactClaim,
  canUseMediaEvidence,
} from "./marketplace-claim-safety.mjs";

const csv = `product_id,source_url,source_id,field,raw_value,normalized_value,unit,status,rights_status,captured_at
product-1,https://supplier-a.example.com/product,source-a,capacity,500 ml,500,ml,VERIFIED,UNKNOWN_RIGHTS,2026-09-26T00:00:00Z
product-1,https://supplier-b.example.com/product,source-b,capacity,0.5 l,0.5,l,VERIFIED,UNKNOWN_RIGHTS,2026-09-26T00:05:00Z
product-1,https://supplier-a.example.com/product,source-c,weight,400 g,400,g,VERIFIED,LICENSED,2026-09-26T00:10:00Z`;

const records =
  parseMarketplaceEvidenceCsv(
    csv,
  );

if (
  records.length !==
  3
) {
  throw new Error(
    "CSV evidence import count mismatch.",
  );
}

console.log(
  "[PASS] strict CSV evidence import",
);

const ledger =
  buildMarketplaceEvidenceLedger(
    records,
  );

const capacity =
  ledger.assessField(
    "product-1",
    "capacity",
  );

if (
  capacity.status !==
  "VERIFIED"
) {
  throw new Error(
    "Equivalent measurements were incorrectly marked conflicting.",
  );
}

console.log(
  "[PASS] equivalent-unit reconciliation",
);

const claim =
  assessAutomatedFactClaim({
    ledger,
    productId:
      "product-1",
    field:
      "capacity",
  });

if (!claim.allowed) {
  throw new Error(
    "Stable verified evidence did not pass claim gate.",
  );
}

console.log(
  "[PASS] verified fact claim gate",
);

const conflictRecords =
  parseMarketplaceEvidenceCsv(
    `product_id,source_url,source_id,field,raw_value,normalized_value,unit,status,rights_status,captured_at
product-x,https://one.example.com/p,one,capacity,500 ml,500,ml,VERIFIED,UNKNOWN_RIGHTS,2026-09-26T00:00:00Z
product-x,https://two.example.com/p,two,capacity,350 ml,350,ml,VERIFIED,UNKNOWN_RIGHTS,2026-09-26T00:01:00Z`,
  );

const conflictLedger =
  buildMarketplaceEvidenceLedger(
    conflictRecords,
  );

const conflictClaim =
  assessAutomatedFactClaim({
    ledger:
      conflictLedger,
    productId:
      "product-x",
    field:
      "capacity",
  });

if (
  conflictClaim.reason !==
  "EVIDENCE_CONFLICT"
) {
  throw new Error(
    "Conflicting evidence was allowed through the claim gate.",
  );
}

console.log(
  "[PASS] conflicting evidence fails closed",
);

if (
  canUseMediaEvidence(
    records[0],
  )
) {
  throw new Error(
    "UNKNOWN_RIGHTS media became automatically reusable.",
  );
}

console.log(
  "[PASS] media rights fail closed",
);

console.log("");
console.log(
  "PHASE 12A-2 EVIDENCE SAFETY AUDIT PASSED",
);
