export type CurrencyCode = "USD" | "AUD" | "PHP" | "GBP" | "EUR" | "CAD";

export type Offer = Readonly<{
  type: "percentage" | "fixed" | "none";
  value: number;
}>;

export type SalesChannels = Readonly<{
  shopify: boolean;
  amazon: boolean;
}>;

export type Product = Readonly<{
  sku: string;
  title: string;
  description: string;
  price: number;
  currency: CurrencyCode;
  cost: number | null;
  inventory: number | null;
  features: readonly string[];
  benefits: readonly string[];
  audiences: readonly string[];
  imageUrls: readonly string[];
  offer: Offer;
  channels: SalesChannels;
}>;

export type ProductValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type ProductValidationResult =
  | Readonly<{ ok: true; product: Product }>
  | Readonly<{ ok: false; issues: readonly ProductValidationIssue[] }>;
