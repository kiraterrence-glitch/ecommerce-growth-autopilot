export const productBrainJsonSchema:
  Readonly<Record<string, unknown>> = {
    type: "object",
    additionalProperties: false,

    properties: {
      audiences: {
        type: "array",
        minItems: 1,
        items: {
          type: "string",
          minLength: 1,
        },
      },

      painPoints: {
        type: "array",
        minItems: 1,
        items: {
          type: "string",
          minLength: 1,
        },
      },

      benefits: {
        type: "array",
        minItems: 1,
        items: {
          type: "string",
          minLength: 1,
        },
      },

      objections: {
        type: "array",
        minItems: 1,
        items: {
          type: "string",
          minLength: 1,
        },
      },

      buyingTriggers: {
        type: "array",
        minItems: 1,
        items: {
          type: "string",
          minLength: 1,
        },
      },

      angles: {
        type: "array",
        minItems: 3,

        items: {
          type: "object",
          additionalProperties: false,

          properties: {
            name: {
              type: "string",
              minLength: 1,
            },

            hook: {
              type: "string",
              minLength: 1,
            },

            reason: {
              type: "string",
              minLength: 1,
            },
          },

          required: [
            "name",
            "hook",
            "reason",
          ],
        },
      },

      offerPositioning: {
        type: "string",
        minLength: 1,
      },
    },

    required: [
      "audiences",
      "painPoints",
      "benefits",
      "objections",
      "buyingTriggers",
      "angles",
      "offerPositioning",
    ],
  };
