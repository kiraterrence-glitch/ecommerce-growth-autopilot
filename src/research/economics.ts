import type { UnitEconomicsInput, UnitEconomicsResult } from "./types.js";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function calculateUnitEconomics(input: UnitEconomicsInput): UnitEconomicsResult {
  const revenueAfterDiscount = Math.max(0, input.sellingPrice - input.discountAmount);
  const contributionBeforeAds = revenueAfterDiscount
    - input.cogs
    - input.shippingCost
    - input.marketplaceFees
    - input.paymentFees;
  const contributionAfterAds = contributionBeforeAds - input.adAllowance;
  const contributionMarginPercent = revenueAfterDiscount > 0
    ? (contributionAfterAds / revenueAfterDiscount) * 100
    : 0;
  return {
    sellingPrice: roundMoney(input.sellingPrice),
    revenueAfterDiscount: roundMoney(revenueAfterDiscount),
    cogs: roundMoney(input.cogs),
    shippingCost: roundMoney(input.shippingCost),
    marketplaceFees: roundMoney(input.marketplaceFees),
    paymentFees: roundMoney(input.paymentFees),
    contributionBeforeAds: roundMoney(contributionBeforeAds),
    adAllowance: roundMoney(input.adAllowance),
    contributionAfterAds: roundMoney(contributionAfterAds),
    contributionMarginPercent: roundPercent(contributionMarginPercent),
    breakEvenCpa: roundMoney(Math.max(0, contributionBeforeAds)),
  };
}
