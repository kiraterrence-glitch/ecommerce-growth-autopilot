import assert from "node:assert/strict";
import test from "node:test";

import {
  isDisallowedAddress,
} from "../../scripts/product-research-safe-network.mjs";

test("network guard rejects local and private IPv4 ranges", () => {
  assert.equal(
    isDisallowedAddress(
      "127.0.0.1",
    ),
    true,
  );

  assert.equal(
    isDisallowedAddress(
      "10.0.0.8",
    ),
    true,
  );

  assert.equal(
    isDisallowedAddress(
      "192.168.1.5",
    ),
    true,
  );

  assert.equal(
    isDisallowedAddress(
      "172.16.0.1",
    ),
    true,
  );

  assert.equal(
    isDisallowedAddress(
      "8.8.8.8",
    ),
    false,
  );
});

test("network guard rejects loopback and unique-local IPv6", () => {
  assert.equal(
    isDisallowedAddress(
      "::1",
    ),
    true,
  );

  assert.equal(
    isDisallowedAddress(
      "fc00::1",
    ),
    true,
  );

  assert.equal(
    isDisallowedAddress(
      "fd12::1",
    ),
    true,
  );

  assert.equal(
    isDisallowedAddress(
      "2606:4700:4700::1111",
    ),
    false,
  );
});
