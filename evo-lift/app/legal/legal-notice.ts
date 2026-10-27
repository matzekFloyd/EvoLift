export const LEGAL_NOTICE_HREF = "/legal";

/** Person who runs EvoLift. Quoted by the privacy policy and the terms of use. */
export const OPERATOR_NAME = "Mathias Mayrhofer";

/** Questions about the service and about account data. */
export const OPERATOR_EMAIL = "contact@evolift.at";

/** Placeholder until a real address is set. */
export const OPERATOR_POSTAL_ADDRESS = "-";

export type LegalNoticeSection = {
  heading: string;
  paragraphs: string[];
};

export const legalNoticeSections: LegalNoticeSection[] = [
  {
    heading: "Operator",
    paragraphs: [`${OPERATOR_NAME} runs EvoLift.`],
  },
  {
    heading: "Postal address",
    paragraphs: [OPERATOR_POSTAL_ADDRESS],
  },
  {
    heading: "Email",
    paragraphs: [
      `Email ${OPERATOR_EMAIL} with questions about the service and about account data.`,
    ],
  },
];
