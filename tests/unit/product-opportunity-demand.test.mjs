import assert from "node:assert/strict";
import test from "node:test";

import {
  assessDemandObservation,
  validateDemandObservation,
} from "../../dist/product-opportunity/index.js";

function relativeObservation() {
  return {
    id:
      "demand-1",

    candidateId:
      "candidate-1",

    sourceId:
      "google-trends-1",

    sourceType:
      "GOOGLE_TRENDS",

    acquisitionMethod:
      "MANUAL_CAPTURE",

    signal:
      "SEARCH_INTEREST_RELATIVE",

    value:
      72,

    unit:
      "INDEX_0_100",

    currency:
      null,

    geography:
      "US",

    periodStart:
      "2026-08-01T00:00:00Z",

    periodEnd:
      "2026-08-31T00:00:00Z",

    capturedAt:
      "2026-09-01T00:00:00Z",

    sourceUrl:
      "https://trends.google.com/example",

    verified:
      true,
  };
}

test(
  "relative search interest remains a 0-100 index rather than search volume",
  () => {
    const observation =
      validateDemandObservation(
        relativeObservation(),
      );

    assert.equal(
      observation.signal,
      "SEARCH_INTEREST_RELATIVE",
    );

    assert.equal(
      observation.unit,
      "INDEX_0_100",
    );
  },
);

test(
  "relative interest above 100 fails closed",
  () => {
    const observation =
      relativeObservation();

    observation.value =
      101;

    assert.throws(
      () =>
        validateDemandObservation(
          observation,
        ),
      /between 0 and 100/,
    );
  },
);

test(
  "relative interest cannot masquerade as absolute search volume",
  () => {
    const observation =
      relativeObservation();

    observation.unit =
      "COUNT";

    assert.throws(
      () =>
        validateDemandObservation(
          observation,
        ),
      /must use INDEX_0_100/,
    );
  },
);

test(
  "absolute search volume requires an integer COUNT",
  () => {
    const observation = {
      ...relativeObservation(),

      signal:
        "SEARCH_VOLUME_ABSOLUTE",

      value:
        12001,

      unit:
        "COUNT",
    };

    assert.doesNotThrow(
      () =>
        validateDemandObservation(
          observation,
        ),
    );

    observation.value =
      12001.5;

    assert.throws(
      () =>
        validateDemandObservation(
          observation,
        ),
      /must contain an integer/,
    );
  },
);

test(
  "revenue requires explicit currency provenance",
  () => {
    const observation = {
      ...relativeObservation(),

      signal:
        "REVENUE",

      value:
        50000,

      unit:
        "CURRENCY",

      currency:
        "USD",
    };

    assert.doesNotThrow(
      () =>
        validateDemandObservation(
          observation,
        ),
    );

    observation.currency =
      null;

    assert.throws(
      () =>
        validateDemandObservation(
          observation,
        ),
      /requires a three-letter uppercase currency code/,
    );
  },
);

test(
  "HTTP demand sources fail closed",
  () => {
    const observation =
      relativeObservation();

    observation.sourceUrl =
      "http://example.com/demand";

    assert.throws(
      () =>
        validateDemandObservation(
          observation,
        ),
      /must use HTTPS/,
    );
  },
);

test(
  "capture timestamp cannot predate measured period",
  () => {
    const observation =
      relativeObservation();

    observation.capturedAt =
      "2026-08-15T00:00:00Z";

    assert.throws(
      () =>
        validateDemandObservation(
          observation,
        ),
      /cannot be before periodEnd/,
    );
  },
);

test(
  "freshness is based on observation period rather than capture date",
  () => {
    const observation =
      relativeObservation();

    observation.capturedAt =
      "2026-09-26T00:00:00Z";

    const assessment =
      assessDemandObservation(
        observation,
        "2026-09-27T00:00:00Z",
      );

    assert.equal(
      assessment.freshness,
      "FRESH",
    );

    assert.equal(
      assessment.ageDays,
      27,
    );
  },
);

test(
  "aging demand evidence is identified explicitly",
  () => {
    const assessment =
      assessDemandObservation(
        relativeObservation(),
        "2026-10-15T00:00:00Z",
      );

    assert.equal(
      assessment.freshness,
      "AGING",
    );
  },
);

test(
  "stale demand evidence is identified explicitly",
  () => {
    const assessment =
      assessDemandObservation(
        relativeObservation(),
        "2026-12-15T00:00:00Z",
      );

    assert.equal(
      assessment.freshness,
      "STALE",
    );
  },
);

test(
  "future observation periods fail closed",
  () => {
    assert.throws(
      () =>
        assessDemandObservation(
          relativeObservation(),
          "2026-08-15T00:00:00Z",
        ),
      /cannot end in the future/,
    );
  },
);
