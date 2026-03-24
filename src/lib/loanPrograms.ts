export interface LoanProgram {
  id: number;
  name: string;
  shortName: string;
  loanType: string;
  downPayment: string;
  rateDescription: string;
  rateOffset: number; // offset from base conventional rate
  rateBase: "conventional" | "fha";
  term: number;
  hasPMI: boolean;
  maxDTI: number;
  housingDTI: number;
  minCreditScore: number;
  incomeLimit: number | null;
  latePaymentsAllowed: boolean;
  collectionsAllowed: boolean;
  minTraditionalTradelines: number;
  minAlternativeTradelines: number;
  requiresRentalHistory: boolean;
  tradelineNote: string;
  citizenshipOptions: string[];
  dacaAllowed: boolean;
  homeownershipRestriction: string;
  sellerCreditMax: string;
  notes: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  additionalPaymentImpact: number; // extra monthly cost (e.g., DPA second loan + PMI)
  downPaymentPercent: number; // effective down payment %
  isGrant: boolean;
  grantAmount: number;
  programMaxPrice: number; // absolute hard cap on purchase price for this program
  programMaxPriceNote: string; // explains why the cap exists
}

export const loanPrograms: LoanProgram[] = [
  {
    id: 1,
    name: "1% Down, No PMI",
    shortName: "Program 1",
    loanType: "Conventional",
    downPayment: "1% down",
    rateDescription: "Market rate conventional",
    rateOffset: 0,
    rateBase: "conventional",
    term: 30,
    hasPMI: false,
    maxDTI: 45,
    housingDTI: 45,
    minCreditScore: 600,
    incomeLimit: 160000,
    latePaymentsAllowed: false,
    collectionsAllowed: false,
    minTraditionalTradelines: 1,
    minAlternativeTradelines: 2,
    requiresRentalHistory: true,
    tradelineNote: "1 traditional 12+ months + 2 alternative tradelines + rental history required",
    citizenshipOptions: ["US Citizen", "Permanent Resident"],
    dacaAllowed: false,
    homeownershipRestriction: "First-time buyer or not currently owning",
    sellerCreditMax: "4% (cannot be used for additional agent/broker compensation)",
    notes: "Best option for well-qualified buyers. Strict credit but lowest score floor.",
    pros: [
      "No PMI saves ~$150–200/month vs FHA",
      "Lowest effective payment for qualifying buyers",
      "Market rate financing",
      "Only 1% out of pocket",
    ],
    cons: [
      "Strict: zero lates, zero collections",
      "Income cap at $160K",
      "Requires rental history",
      "No DACA/work permits",
      "Requires tradelines",
    ],
    bestFor: "Well-qualified buyers with clean credit history",
    additionalPaymentImpact: 0,
    downPaymentPercent: 1,
    isGrant: false,
    grantAmount: 0,
    programMaxPrice: 850000,
    programMaxPriceNote: "Max $850K — based on $160K income cap at 45% DTI with no debt",
  },
  {
    id: 2,
    name: "$1,000 Down — 30/40 Year, No PMI",
    shortName: "Program 2",
    loanType: "Conventional",
    downPayment: "$1,000 flat",
    rateDescription: "Market + 0.625%",
    rateOffset: 0.625,
    rateBase: "conventional",
    term: 40,
    hasPMI: false,
    maxDTI: 45,
    housingDTI: 45,
    minCreditScore: 640,
    incomeLimit: null,
    latePaymentsAllowed: false,
    collectionsAllowed: false,
    minTraditionalTradelines: 2,
    minAlternativeTradelines: 0,
    requiresRentalHistory: false,
    tradelineNote: "2 traditional OR 1 traditional + 2 alternative. If no rental history → must have 2 traditional",
    citizenshipOptions: ["US Citizen", "Permanent Resident", "DACA/Work Permit"],
    dacaAllowed: true,
    homeownershipRestriction: "Cannot have owned a home in the last 3 years",
    sellerCreditMax: "3% minimum required to achieve $1K down (cannot buy down rate)",
    notes: "Good for DACA clients, slightly lower scores, no rental history needed with 2 tradelines.",
    pros: [
      "Only $1,000 out of pocket",
      "40-year term lowers monthly payment",
      "No income limit",
      "DACA and work permit eligible",
      "More flexible on tradelines",
    ],
    cons: [
      "Higher rate (+0.625% over market)",
      "More interest paid over life of loan",
      "Still requires clean credit (no lates, no collections)",
      "3-year homeownership restriction",
    ],
    bestFor: "Buyers without rental history, DACA clients",
    additionalPaymentImpact: 0,
    downPaymentPercent: 0,
    isGrant: false,
    grantAmount: 0,
    programMaxPrice: 650000,
    programMaxPriceNote: "Max $650K — conventional program limit for this loan structure",
  },
  {
    id: 3,
    name: "FHA Down Payment Assistance (DPA)",
    shortName: "Program 3",
    loanType: "FHA",
    downPayment: "Covered via 10-year second loan at market rate + 2%",
    rateDescription: "FHA market rate",
    rateOffset: 0,
    rateBase: "fha",
    term: 30,
    hasPMI: true,
    maxDTI: 57,
    housingDTI: 46,
    minCreditScore: 600,
    incomeLimit: null,
    latePaymentsAllowed: true,
    collectionsAllowed: true,
    minTraditionalTradelines: 0,
    minAlternativeTradelines: 0,
    requiresRentalHistory: false,
    tradelineNote: "None required",
    citizenshipOptions: ["US Citizen", "Permanent Resident"],
    dacaAllowed: false,
    homeownershipRestriction: "Can be previous homeowner. Current homeowner allowed only if: 25%+ equity, family size increased, and home is vacated/rented.",
    sellerCreditMax: "6% (FHA standard)",
    notes: "Most flexible on credit history. ~$450/month higher payment than Program 1 equivalent.",
    pros: [
      "Most flexible on credit history",
      "No tradeline requirements",
      "Higher DTI tolerance (57%)",
      "No money needed at closing",
    ],
    cons: [
      "~$450/month higher payment than Program 1",
      "Second loan must be repaid (10-year term)",
      "PMI adds to monthly cost",
      "No DACA",
    ],
    bestFor: "Buyers with lower scores, higher debt, past credit issues",
    additionalPaymentImpact: 450,
    downPaymentPercent: 0,
    isGrant: false,
    grantAmount: 0,
    programMaxPrice: 578000,
    programMaxPriceNote: "Max $578K — FHA loan limit for Maricopa County",
  },
  {
    id: 4,
    name: "FHA Solar Program",
    shortName: "Program 4",
    loanType: "FHA",
    downPayment: "3.5% covered (grant — nothing to repay)",
    rateDescription: "FHA market rate",
    rateOffset: 0,
    rateBase: "fha",
    term: 30,
    hasPMI: true,
    maxDTI: 57,
    housingDTI: 46,
    minCreditScore: 580,
    incomeLimit: null,
    latePaymentsAllowed: true,
    collectionsAllowed: true,
    minTraditionalTradelines: 0,
    minAlternativeTradelines: 0,
    requiresRentalHistory: false,
    tradelineNote: "None required",
    citizenshipOptions: ["US Citizen", "Permanent Resident"],
    dacaAllowed: false,
    homeownershipRestriction: "Same as FHA DPA — can be previous homeowner with conditions.",
    sellerCreditMax: "6% (FHA standard)",
    notes: "Lowest score threshold. Solar adds ~$35K to mortgage (~+$200/month) but saves on electric.",
    pros: [
      "Lowest score minimum (580)",
      "Nothing out of pocket (3.5% covered, no repayment)",
      "Electric savings offset ~$150–200/month",
      "Home value increases $10–15K",
      "No tradeline requirements",
      "Most flexible credit history",
    ],
    cons: [
      "$200/month added to payment for solar",
      "PMI included",
      "Longer resale timeline",
      "No DACA",
    ],
    bestFor: "Lowest score threshold, no out-of-pocket, long-term value",
    additionalPaymentImpact: 200,
    downPaymentPercent: 0,
    isGrant: true,
    grantAmount: 0,
    programMaxPrice: 578000,
    programMaxPriceNote: "Max $578K — FHA loan limit for Maricopa County (solar addition reduces effective max to ~$563K)",
  },
  {
    id: 5,
    name: "$4,000 Grant, Conventional",
    shortName: "Program 5",
    loanType: "Conventional",
    downPayment: "3% (buyer brings)",
    rateDescription: "Conventional market rate + ~0.5%",
    rateOffset: 0.5,
    rateBase: "conventional",
    term: 30,
    hasPMI: true,
    maxDTI: 45,
    housingDTI: 45,
    minCreditScore: 660,
    incomeLimit: 89000,
    latePaymentsAllowed: true,
    collectionsAllowed: true,
    minTraditionalTradelines: 0,
    minAlternativeTradelines: 0,
    requiresRentalHistory: false,
    tradelineNote: "None required",
    citizenshipOptions: ["US Citizen", "Permanent Resident", "DACA/Work Permit"],
    dacaAllowed: true,
    homeownershipRestriction: "Previous homeowners OK. Current homeowners OK.",
    sellerCreditMax: "3% (conventional standard)",
    notes: "$4,000 grant — free money, no repayment.",
    pros: [
      "$4,000 grant reduces cash needed",
      "DACA eligible",
      "No homeownership restriction",
      "No tradeline requirements",
      "Flexible on repeat buyers",
    ],
    cons: [
      "Income cap at $89K",
      "3% down still required (buyer brings funds)",
      "PMI applies",
      "Higher rate than Program 1",
    ],
    bestFor: "Straightforward grant, flexible homeownership history, DACA OK",
    additionalPaymentImpact: 0,
    downPaymentPercent: 3,
    isGrant: true,
    grantAmount: 4000,
    programMaxPrice: 500000,
    programMaxPriceNote: "Max ~$500K — based on $89K income limit at 57% DTI with no debt",
  },
];

export interface ClientData {
  // Step 1
  firstName: string;
  lastName: string;
  date: string;
  // Step 2
  citizenship: "yes" | "no" | "daca" | "";
  isVeteran: "yes" | "no" | "";
  isHomeowner: "yes" | "no" | "";
  hasEquity25: "yes" | "no" | "";
  familySizeIncreased: "yes" | "no" | "";
  homeVacated: "yes" | "no" | "";
  ownedLast3Years: "yes" | "no" | "";
  // Step 3
  annualIncome: number;
  hasCosigner: "yes" | "no" | "";
  cosignerIncome: number;
  cosignerDebts: number;
  cosignerCreditScore: number;
  has2YearsEmployment: "yes" | "no" | "";
  isSelfEmployed: "yes" | "no" | "";
  reducesNetIncome: "yes" | "no" | "";
  hasEmploymentGaps: "yes" | "no" | "";
  newW2Job: "yes" | "no" | "";
  hasVariableIncome: "yes" | "no" | "";
  hasVariableIncomeHistory: "yes" | "no" | "";
  // Step 4
  monthlyDebts: number;
  // Step 5
  creditScore: number;
  hasLatePayments: "yes" | "no" | "";
  hasCollections: "yes" | "no" | "";
  traditionalTradelines: "0" | "1" | "2+" | "";
  alternativeTradelines: "0" | "1" | "2+" | "";
  hasRentalHistory: "yes" | "no" | "";
  // Step 6
  purchasePrice: number;
  propertyType: "single-family" | "condo" | "townhome" | "new-build" | "";
  targetArea: string;
  hasHOA: "yes" | "no" | "";
  hoaAmount: number;
  downPaymentAvailable: number;
}

export const defaultClientData: ClientData = {
  firstName: "",
  lastName: "",
  date: new Date().toISOString().split("T")[0],
  citizenship: "",
  isVeteran: "",
  isHomeowner: "",
  hasEquity25: "",
  familySizeIncreased: "",
  homeVacated: "",
  ownedLast3Years: "",
  annualIncome: 0,
  hasCosigner: "",
  cosignerIncome: 0,
  cosignerDebts: 0,
  cosignerCreditScore: 0,
  has2YearsEmployment: "",
  isSelfEmployed: "",
  reducesNetIncome: "",
  hasEmploymentGaps: "",
  newW2Job: "",
  hasVariableIncome: "",
  hasVariableIncomeHistory: "",
  monthlyDebts: 0,
  creditScore: 0,
  hasLatePayments: "",
  hasCollections: "",
  traditionalTradelines: "",
  alternativeTradelines: "",
  hasRentalHistory: "",
  purchasePrice: 0,
  propertyType: "",
  targetArea: "",
  hasHOA: "",
  hoaAmount: 100,
  downPaymentAvailable: 0,
};

export interface ProgramEligibility {
  program: LoanProgram;
  eligible: boolean;
  conditional: boolean;
  reasons: string[];
  monthlyPayment: number;
  monthlyPITI: number;
  totalMonthly: number;
  downPaymentRequired: number;
  loanAmount: number;
  effectiveRate: number;
  suggestedMaxPrice: number;
  suggestedMaxPriceNote: string;
  suggestedMaxPriceBound: "dti" | "program" | null;
}

export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  if (monthlyRate === 0) return principal / numPayments;
  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

export function evaluateEligibility(
  client: ClientData,
  rates: { conventional: number; fha: number }
): ProgramEligibility[] {
  const totalIncome = client.annualIncome + (client.hasCosigner === "yes" ? client.cosignerIncome : 0);
  const totalDebts = client.monthlyDebts + (client.hasCosigner === "yes" ? client.cosignerDebts : 0);

  return loanPrograms.map((program) => {
    const reasons: string[] = [];
    let eligible = true;
    let conditional = false;

    // Credit score check
    if (client.creditScore > 0 && client.creditScore < program.minCreditScore) {
      eligible = false;
      reasons.push(`Credit score ${client.creditScore} below minimum ${program.minCreditScore}`);
    }

    // Income limit check
    if (program.incomeLimit && totalIncome > program.incomeLimit) {
      eligible = false;
      reasons.push(`Income exceeds $${program.incomeLimit.toLocaleString()} limit`);
    }

    // Citizenship check
    if (client.citizenship === "daca" && !program.dacaAllowed) {
      eligible = false;
      reasons.push("DACA status — program not available");
    }
    if (client.citizenship === "no") {
      eligible = false;
      reasons.push("Must be U.S. citizen, permanent resident, or DACA/work permit holder");
    }

    // Late payments
    if (client.hasLatePayments === "yes" && !program.latePaymentsAllowed) {
      eligible = false;
      reasons.push("Late payment in last 24 months — does not meet requirements");
    }

    // Collections
    if (client.hasCollections === "yes" && !program.collectionsAllowed) {
      eligible = false;
      reasons.push("Open collections — does not meet requirements");
    }

    // Tradeline checks
    if (program.id === 1) {
      const tradCount = client.traditionalTradelines === "2+" ? 2 : client.traditionalTradelines === "1" ? 1 : 0;
      const altCount = client.alternativeTradelines === "2+" ? 2 : client.alternativeTradelines === "1" ? 1 : 0;
      if (tradCount < 1) {
        eligible = false;
        reasons.push("Requires at least 1 traditional tradeline active 12+ months");
      }
      if (altCount < 2) {
        eligible = false;
        reasons.push("Requires at least 2 alternative tradelines");
      }
      if (client.hasRentalHistory === "no") {
        eligible = false;
        reasons.push("Requires 12 months verifiable rental history");
      }
    }

    if (program.id === 2) {
      const tradCount = client.traditionalTradelines === "2+" ? 2 : client.traditionalTradelines === "1" ? 1 : 0;
      const altCount = client.alternativeTradelines === "2+" ? 2 : client.alternativeTradelines === "1" ? 1 : 0;
      if (tradCount < 2 && !(tradCount >= 1 && altCount >= 2)) {
        eligible = false;
        reasons.push("Requires 2 traditional tradelines OR 1 traditional + 2 alternative");
      }
      if (client.hasRentalHistory === "no" && tradCount < 2) {
        eligible = false;
        reasons.push("No rental history — must have 2 traditional tradelines");
      }
    }

    // Homeownership restrictions
    if (program.id === 1) {
      if (client.isHomeowner === "yes") {
        eligible = false;
        reasons.push("Currently a homeowner — must be first-time buyer or not currently owning");
      }
    }

    if (program.id === 2) {
      if (client.ownedLast3Years === "yes") {
        eligible = false;
        reasons.push("Owned a home in the last 3 years — program requires 3-year gap");
      }
    }

    if (program.id === 3 || program.id === 4) {
      if (client.isHomeowner === "yes") {
        if (client.hasEquity25 !== "yes" || client.familySizeIncreased !== "yes" || client.homeVacated !== "yes") {
          conditional = true;
          reasons.push("Current homeowner — must have 25%+ equity, family size increase, and home vacated/rented");
        }
      }
    }

    // FHA loan limit — Maricopa County $578,000
    if (program.loanType === "FHA" && client.purchasePrice > 0) {
      const fhaLoanAmount = client.purchasePrice * 0.965; // 3.5% down
      if (fhaLoanAmount > 578000) {
        eligible = false;
        reasons.push(
          `Purchase price exceeds FHA loan limit for Maricopa County ($578K). FHA programs are not available at this price point.`
        );
      }
    }

    // Condo check
    if (client.propertyType === "condo") {
      if (program.loanType === "FHA") {
        eligible = false;
        reasons.push("Condo — FHA not eligible, conventional only");
      }
      if (program.id === 5 && client.creditScore < 660) {
        eligible = false;
        reasons.push("Condo requires 660+ credit score for conventional");
      }
    }

    // Calculate payment
    const baseRate = program.rateBase === "conventional" ? rates.conventional : rates.fha;
    const rate = baseRate + program.rateOffset;
    const hoa = client.hasHOA === "yes" ? client.hoaAmount : 0;

    // Helper: compute total monthly for a given purchase price under this program
    const computeForPrice = (price: number) => {
      let loan = price;
      if (program.id === 1) loan = price * 0.97;
      else if (program.id === 2) loan = price - 1000;
      else if (program.id === 3) loan = price * 0.965;
      else if (program.id === 4) loan = price * 0.965 + 35000; // solar added
      else if (program.id === 5) loan = price * 0.97;

      const pi = calculateMonthlyPayment(loan, rate, program.term);
      const tax = (price * 0.0045) / 12;
      const ins = 1350 / 12;
      const pmi = program.hasPMI ? loan * 0.007 / 12 : 0;
      const piti = pi + tax + ins + pmi;
      const total = piti + hoa + program.additionalPaymentImpact;
      return { loan, pi, piti, total };
    };

    const { loan: loanAmount, pi: monthlyPI, piti: monthlyPITI, total: totalMonthly } =
      computeForPrice(client.purchasePrice);

    // Down payment required
    let downPaymentRequired = 0;
    if (program.id === 1) downPaymentRequired = client.purchasePrice * 0.01;
    else if (program.id === 2) downPaymentRequired = 1000;
    else if (program.id === 5) downPaymentRequired = client.purchasePrice * 0.03;

    // DTI check
    if (totalIncome > 0 && client.purchasePrice > 0) {
      const monthlyIncome = totalIncome / 12;
      const totalDTI = ((totalMonthly + totalDebts) / monthlyIncome) * 100;
      if (totalDTI > program.maxDTI) {
        conditional = true;
        reasons.push(`Total DTI ${totalDTI.toFixed(1)}% exceeds program max of ${program.maxDTI}%`);
      }
    }

    // Suggested max purchase price — binary search for DTI ceiling, then cap at program hard limit
    let dtiMaxPrice = 0;
    if (totalIncome > 0) {
      const monthlyIncome = totalIncome / 12;
      const maxHousingPayment = monthlyIncome * (program.maxDTI / 100) - totalDebts;
      if (maxHousingPayment > 0) {
        let lo = 0, hi = 2000000;
        for (let i = 0; i < 50; i++) {
          const mid = (lo + hi) / 2;
          const { total } = computeForPrice(mid);
          if (total < maxHousingPayment) lo = mid;
          else hi = mid;
        }
        dtiMaxPrice = Math.floor(lo / 1000) * 1000;
      }
    }

    // Apply program hard cap — use whichever is lower: DTI max or program limit
    const hardCap = program.programMaxPrice;
    let suggestedMaxPrice = 0;
    let suggestedMaxPriceNote = "";
    let suggestedMaxPriceBound: "dti" | "program" | null = null;

    if (dtiMaxPrice > 0 || hardCap > 0) {
      if (dtiMaxPrice > 0 && dtiMaxPrice <= hardCap) {
        // Client's income/debt is the binding constraint
        suggestedMaxPrice = dtiMaxPrice;
        suggestedMaxPriceBound = "dti";
        suggestedMaxPriceNote = `Based on your income and debt load at ${program.maxDTI}% DTI`;
      } else {
        // Program's hard cap is the binding constraint
        suggestedMaxPrice = hardCap;
        suggestedMaxPriceBound = "program";
        suggestedMaxPriceNote = program.programMaxPriceNote;
      }
    }

    return {
      program,
      eligible: eligible && !conditional ? true : eligible,
      conditional,
      reasons,
      monthlyPayment: monthlyPI,
      monthlyPITI,
      totalMonthly,
      downPaymentRequired,
      loanAmount,
      effectiveRate: rate,
      suggestedMaxPrice,
      suggestedMaxPriceNote,
      suggestedMaxPriceBound,
    };
  });
}

export function getCrossCountryFlags(client: ClientData): string[] {
  const flags: string[] = [];
  if (client.creditScore > 0 && client.creditScore < 580) {
    flags.push("Credit score below 580 — refer to Cross Country Mortgage for credit repair pathway");
  }
  if (client.isSelfEmployed === "yes" && client.reducesNetIncome === "yes") {
    flags.push("Self-employed and reduces net income on taxes — complex income file");
  }
  if (client.hasVariableIncome === "yes" && client.hasVariableIncomeHistory === "no") {
    flags.push("Variable/commission income without 12 months of documented history — refer to Cross Country Mortgage if client needs to move sooner");
  }
  return flags;
}
