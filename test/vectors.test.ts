/**
 * The canonical vectors of 0xHedgeHood/sdks (vectors/goldens.json), which every maker SDK and the Solidity, gateway
 * and desk implementations are pinned against: recompute them from their inputs, and check this repo's copies
 * (test/goldens.ts) against them. CI checks the hub out and sets HEDGEHOOD_VECTORS to that file.
 */
import { readFileSync } from "node:fs";
import { type Hex, keccak256 } from "viem";
import { describe, expect, it } from "vitest";
import {
  domainSeparator,
  QUOTE_TYPE_STRING,
  quoteDigest,
  SERIES_TYPE_STRING,
  seriesId,
  signQuote,
} from "../src/eip712.js";
import { makeQuote } from "../src/models.js";
import { encodeFill } from "../src/settler.js";
import * as G from "./goldens.js";

const path = process.env.HEDGEHOOD_VECTORS;

describe.skipIf(!path)("hub vectors (0xHedgeHood/sdks vectors/goldens.json)", () => {
  // biome-ignore lint/suspicious/noExplicitAny: parsed JSON
  const hub: any = path ? JSON.parse(readFileSync(path, "utf8")) : {};
  const quote = () => makeQuote({ ...hub.quote, series: hub.series });

  it("recomputes from the hub's inputs", async () => {
    const q = quote();
    expect(quoteDigest(q, hub.chainId, hub.settler)).toBe(hub.digest);
    expect(seriesId(q.series).toString()).toBe(hub.seriesId);
    expect(await signQuote(q, hub.chainId, hub.settler, hub.signerKey as Hex)).toBe(hub.signature);
    expect(keccak256(encodeFill(q, hub.signature, BigInt(hub.fillCalldataHash.amount)))).toBe(
      hub.fillCalldataHash.hash,
    );
    expect(keccak256(encodeFill(q, hub.signature, BigInt(hub.closeCalldataHash.amount), true))).toBe(
      hub.closeCalldataHash.hash,
    );
    const sep = hub.testnetDomainSeparator;
    expect(domainSeparator(sep.chainId, sep.settler)).toBe(sep.value);
    expect(SERIES_TYPE_STRING).toBe(hub.typeStrings.series);
    expect(QUOTE_TYPE_STRING).toBe(hub.typeStrings.quote);
  });

  it("the local copies match the hub", () => {
    expect(quoteDigest(G.QUOTE, G.CHAIN, G.SETTLER)).toBe(hub.digest);
    expect([G.CHAIN, G.SETTLER, G.SERIES_ID.toString(), G.DIGEST, G.SIGNATURE]).toEqual([
      hub.chainId,
      hub.settler,
      hub.seriesId,
      hub.digest,
      hub.signature,
    ]);
    expect(G.SELECTORS).toEqual(hub.selectors);
  });
});
