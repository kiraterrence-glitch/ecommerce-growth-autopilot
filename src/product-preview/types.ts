import type {
  ProductVisualPack,
} from "../product-visuals/types.js";

export type ProductPreviewFaq = Readonly<{
  question: string;
  answer: string;
}>;

export type ProductPagePreviewInput = Readonly<{
  previewId: string;
  productTitle: string;
  subtitle: string;
  priceLine: string;
  ctaLabel: string;
  visualPack: ProductVisualPack;
  faq: readonly ProductPreviewFaq[];
  shippingReturns: string;
  demoMode: boolean;
}>;

export type ProductPreviewQaIssue = Readonly<{
  code: string;
  severity: "error" | "warning";
  message: string;
}>;

export type ProductPreviewQaReport = Readonly<{
  passed: boolean;
  errors: number;
  warnings: number;
  requiredVisualCount: number;
  renderedVisualCount: number;
  issues: readonly ProductPreviewQaIssue[];
}>;

export type ProductPagePreview = Readonly<{
  previewId: string;
  html: string;
  qa: ProductPreviewQaReport;
  externalWrites: false;
  livePublishing: false;
}>;
