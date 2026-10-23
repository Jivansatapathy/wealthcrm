// VGT Wealth AI CRM - Prototype Data Layer
// Tailored for Canadian Banking Wealth Departments (e.g., Scotiabank Wealth, ScotiaMcLeod, Private Banking, MD Financial)

const WEALTH_DATA = {
  currentUser: {
    name: "Catherine Sinclair",
    title: "Senior Vice President & Wealth Advisor",
    division: "ScotiaMcLeod & Private Banking",
    branch: "Toronto Financial District - 44 King St W",
    activeClients: 248,
    activeProspects: 64,
    pendingReviews: 18,
    referralOpportunities: 27,
    aumManaged: "$312.4M",
    pipelineAUM: "$68.7M"
  },

  kpiMetrics: {
    totalPipelineAUM: "$142.8M",
    intentLeadsDetectedThisMonth: 84,
    avgIntentScore: 91.4,
    conversionToMeetingRate: "38.2%",
    timeToFirstOutreach: "2.4 hours",
    crossDivisionReferrals: 41,
    osfiComplianceStatus: "100% Audit-Ready"
  },

  intentLeads: [
    {
      id: "INT-8092",
      name: "Marcus Vance",
      title: "President & Majority Shareholder",
      company: "ABC Advanced Manufacturing Ltd.",
      industry: "Industrial & Precision Automation",
      location: "Oakville / Toronto, ON",
      avatar: "MV",
      intentScore: 98,
      urgency: "Immediate (7-day window)",
      estimatedAUM: "$12,500,000",
      targetDivision: "ScotiaMcLeod & Scotiatrust",
      primarySignalType: "Liquidity Event - M&A Asset Sale",
      status: "New Intent Detected",
      dateDetected: "Today, 09:14 AM",
      confidence: "99%",
      signals: [
        {
          source: "Corporate Registry & SEDAR+",
          type: "M&A Filings",
          detail: "ABC Advanced Manufacturing closed definitive agreement for $18.5M asset purchase by European conglomerate.",
          weight: 40
        },
        {
          source: "Commercial Banking Internal Trigger",
          type: "Treasury Inflow",
          detail: "Commercial operating account #4902-88 received $14.2M wire distribution into corporate operating reserve.",
          weight: 35
        },
        {
          source: "Client Consent & Digital Tracking",
          type: "Wealth Portal Interaction",
          detail: "Marcus attended Scotiabank Business Owner Succession & Capital Gains Exemption webinar last Thursday.",
          weight: 25
        }
      ],
      aiAnalysis: {
        headline: "High probability of tax-inefficient idle corporate surplus within 14 days.",
        rationale: "Marcus is facing significant capital gains implications from the $18.5M transaction. If funds sit in the operating company without holding company reorganization and discretionary wealth structuring, corporate tax drag will exceed 50.1% on passive investment income.",
        recommendedStrategy: "Discretionary Investment Management via ScotiaMcLeod combined with Scotiatrust holding company estate freeze and tax-sheltered corporate class investments.",
        suggestedOutreachChannel: "Warm introduction facilitated by Commercial Banking Director (Geoff Reynolds) + Curated Private Wealth Briefing.",
        complianceNotice: "PIPEDA Consent Verified. Source attribution: First-Party Banking Transaction & Public Corporate Registry. CIRO Suitability boundary active."
      },
      householdPreview: {
        spouse: "Elena Vance (Managing Director, Vance Family Trust)",
        entities: ["Vance Global Holdings Inc. (HoldCo)", "ABC Mfg Operating Co", "Vance 2018 Family Trust"],
        jurisdiction: "Ontario (Canada)"
      },
      actionTaken: false
    },
    {
      id: "INT-8093",
      name: "Dr. Aris Thorne, MD, FRCSC",
      title: "Chief of Surgical Innovation & Clinic Owner",
      company: "Apex Orthopaedic Surgical Clinic",
      industry: "Healthcare & Surgical Medicine",
      location: "Vancouver, BC",
      avatar: "AT",
      intentScore: 95,
      urgency: "High (14-day window)",
      estimatedAUM: "$4,200,000",
      targetDivision: "MD Financial Management",
      primarySignalType: "Medical Practice Equity Disposition",
      status: "New Intent Detected",
      dateDetected: "Today, 08:30 AM",
      confidence: "96%",
      signals: [
        {
          source: "MD Financial Clinical Network",
          type: "Practice Transition Flag",
          detail: "Sale of clinical facility equity ($4.8M valuation) to regional healthcare network finalized.",
          weight: 45
        },
        {
          source: "Commercial Banking Trigger",
          type: "Medical Loan Discharge",
          detail: "$1.4M commercial medical equipment lease satisfied and discharged ahead of schedule.",
          weight: 30
        },
        {
          source: "Digital Planning Inquiry",
          type: "Physician Retirement Model",
          detail: "Completed MD Financial Physician Wealth Transition assessment seeking Individual Pension Plan (IPP) advice.",
          weight: 25
        }
      ],
      aiAnalysis: {
        headline: "Transition from active clinical practice to consulting with substantial liquid capital.",
        rationale: "Dr. Thorne requires specialized physician wealth planning, including Medical Professional Corporation (MPC) surplus stripping, Individual Pension Plan setup, and bespoke philanthropic legacy planning.",
        recommendedStrategy: "MD Private Investment Counsel with integrated tax optimization for specialized physicians.",
        suggestedOutreachChannel: "Direct call from MD Financial Senior Wealth Consultant citing completed IPP inquiry.",
        complianceNotice: "MD Financial consent-on-file. Fully compliant with Canadian medical association standards."
      },
      householdPreview: {
        spouse: "Katarina Thorne (Architect)",
        entities: ["Aris Thorne Medical Professional Corp", "Thorne Legacy Endowment"],
        jurisdiction: "British Columbia (Canada)"
      },
      actionTaken: false
    },
    {
      id: "INT-8094",
      name: "Jean-Luc Tremblay",
      title: "Founder & Chief Executive Officer",
      company: "Kestrel CleanTech Solutions",
      industry: "Clean Energy & Grid Tech",
      location: "Montreal, QC",
      avatar: "JT",
      intentScore: 92,
      urgency: "Medium-High (21 days)",
      estimatedAUM: "$7,800,000",
      targetDivision: "Private Banking & ScotiaMcLeod",
      primarySignalType: "Series B Secondary Share Sale",
      status: "Assigned to Advisor",
      dateDetected: "Yesterday",
      confidence: "94%",
      signals: [
        {
          source: "Venture Intelligence & Capital IQ",
          type: "Funding Recapitalization",
          detail: "Kestrel completed $35M Series B with institutional secondary liquidity tranche ($7.2M net to founder).",
          weight: 45
        },
        {
          source: "Commercial Banking Internal",
          type: "Treasury Inflow",
          detail: "Surplus cash accumulation in corporate holding structure #8821-QC.",
          weight: 35
        },
        {
          source: "Client Engagement",
          type: "Family Office Webinar",
          detail: "Attended Scotiabank Global Family Office & Cross-Border Wealth webinar.",
          weight: 20
        }
      ],
      aiAnalysis: {
        headline: "Tech founder entering first institutional liquidity milestone.",
        rationale: "Tremblay needs dual-currency liquidity management (USD/CAD) and diversified wealth preservation outside clean energy tech risk.",
        recommendedStrategy: "Private Banking customized liquidity lines + ScotiaMcLeod ESG Multi-Asset Mandate.",
        suggestedOutreachChannel: "Introduction via Scotiabank Technology & Innovation Commercial Banking Group.",
        complianceNotice: "Corporate intelligence public record verified. Internal banking referral consent cleared."
      },
      householdPreview: {
        spouse: "Camille Bouchard (Venture Partner)",
        entities: ["Tremblay Innovations HoldCo", "Kestrel CleanTech Corp"],
        jurisdiction: "Quebec (Civil Law Compliance)"
      },
      actionTaken: true
    },
    {
      id: "INT-8095",
      name: "Robert & Eleanor Harrington",
      title: "Founders & Board Co-Chairs",
      company: "Harrington Western Logistics Group",
      industry: "Supply Chain & Distribution",
      location: "Calgary, AB",
      avatar: "RH",
      intentScore: 91,
      urgency: "Medium (30 days)",
      estimatedAUM: "$9,500,000",
      targetDivision: "Scotiatrust & Private Banking",
      primarySignalType: "Intergenerational Succession & Real Estate Payout",
      status: "Meeting Scheduled",
      dateDetected: "3 days ago",
      confidence: "92%",
      signals: [
        {
          source: "Commercial Banking Warm Referral",
          type: "Succession Planning Flag",
          detail: "Commercial RM Robert Vance forwarded request: founders stepping down, transferring equity to sons.",
          weight: 50
        },
        {
          source: "Commercial Real Estate Registry",
          type: "Distribution Facility Sale",
          detail: "Completed sale-leaseback on 140,000 sq ft logistics depot netting $11.2M cash.",
          weight: 35
        },
        {
          source: "Retail Branch Flag",
          type: "High Balance Maturation",
          detail: "Personal term deposits ($2.5M) reaching maturity with no rollover instruction.",
          weight: 15
        }
      ],
      aiAnalysis: {
        headline: "Multi-generational wealth transfer and family estate governance requirement.",
        rationale: "Crucial window to institute Family Trust structures, estate equalization between active and non-active sibling shareholders, and liquidity portfolio generation.",
        recommendedStrategy: "Comprehensive Family Office Wealth Architecture via Scotiatrust + Private Banking custom credit facilities.",
        suggestedOutreachChannel: "Joint meeting with Commercial RM and Senior Trust Officer.",
        complianceNotice: "Client meeting pre-brief generated. CIRO suitability guidelines attached."
      },
      householdPreview: {
        spouse: "Eleanor Harrington",
        entities: ["Harrington Group Inc.", "Harrington Family Heritage Trust", "HWL Holdings AB"],
        jurisdiction: "Alberta (Canada)"
      },
      actionTaken: true
    },
    {
      id: "INT-8096",
      name: "Priya Nair",
      title: "Senior Partner & Practice Lead",
      company: "Nair & Sterling BioConsulting LLP",
      industry: "Biotech Advisory & Life Sciences",
      location: "Toronto, ON",
      avatar: "PN",
      intentScore: 89,
      urgency: "High (10 days)",
      estimatedAUM: "$3,400,000",
      targetDivision: "ScotiaMcLeod",
      primarySignalType: "High Net Worth Liquid Inflow & Maturing GIC",
      status: "New Intent Detected",
      dateDetected: "Today, 11:05 AM",
      confidence: "91%",
      signals: [
        {
          source: "Retail Branch Network Flag",
          type: "Large Liquid Balance",
          detail: "$2.8M in maturing fixed-income GIC holdings maturing Oct 28 without automatic reinvestment instructions.",
          weight: 50
        },
        {
          source: "Digital Wealth Engagement",
          type: "Retirement Planning Tool",
          detail: "Ran complex tax simulation on Scotiabank Advice+ wealth portal twice in past 48 hours.",
          weight: 30
        },
        {
          source: "Licensed Professional Directory",
          type: "Partnership Capital Payout",
          detail: "Announced retirement from partnership equity effective year-end.",
          weight: 20
        }
      ],
      aiAnalysis: {
        headline: "High-earning professional seeking yield and capital preservation post-partnership.",
        rationale: "Client has significant cash drag risk. Maturing GIC proceeds need immediate redeployment into tax-managed high-net-worth portfolio before auto-renewing into low-yield savings.",
        recommendedStrategy: "ScotiaMcLeod High-Quality Dividend Growth portfolio + Tax-Advantaged Corporate Class.",
        suggestedOutreachChannel: "Direct call offering complimentary portfolio tax stress-test.",
        complianceNotice: "1st Party Bank relationship. Consent for cross-divisional wealth advice confirmed."
      },
      householdPreview: {
        spouse: "Vikram Nair (Emeritus Professor, U of T)",
        entities: ["Nair Professional Corp", "Nair Family Living Trust"],
        jurisdiction: "Ontario (Canada)"
      },
      actionTaken: false
    },
    {
      id: "INT-8097",
      name: "David Chen",
      title: "Principal & Managing Partner",
      company: "Pacific Rim Commercial Land Corp",
      industry: "Commercial Real Estate Development",
      location: "Vancouver, BC",
      avatar: "DC",
      intentScore: 97,
      urgency: "Immediate (5-day window)",
      estimatedAUM: "$16,000,000",
      targetDivision: "Private Banking & Scotia Wealth Family Office",
      primarySignalType: "Land Parcel Disposition & Commercial Escrow",
      status: "New Intent Detected",
      dateDetected: "Today, 07:45 AM",
      confidence: "98%",
      signals: [
        {
          source: "BC Land Title Intelligence",
          type: "Major Real Estate Transaction",
          detail: "Finalized closing of Richmond transit-oriented development site for $26.8M.",
          weight: 45
        },
        {
          source: "Commercial Treasury Inflow",
          type: "Escrow Release",
          detail: "$18.2M net disbursement wired into Commercial account at Vancouver Main Branch.",
          weight: 40
        },
        {
          source: "Private Banker Meeting Note",
          type: "Informal Inquiry",
          detail: "David asked his Commercial RM for an intro to Private Banking regarding cross-border liquidity.",
          weight: 15
        }
      ],
      aiAnalysis: {
        headline: "Major real estate liquidity event with urgent cash preservation & tax planning needs.",
        rationale: "Massive liquidity influx requiring immediate short-term high-yield structured deposits while constructing long-term private wealth mandate and family foundation.",
        recommendedStrategy: "Scotia Wealth Management Family Office integration, custom high-deposit yield sweep, and private debt allocation.",
        suggestedOutreachChannel: "Immediate executive intro call from Regional VP of Private Banking.",
        complianceNotice: "OSFI B-13 compliant client identity verification verified. Commercial RM intro logged."
      },
      householdPreview: {
        spouse: "Grace Chen (Founding Trustee)",
        entities: ["Pacific Rim Capital HoldCo", "Chen Dynasty Trust", "Chen Foundation"],
        jurisdiction: "British Columbia (Canada)"
      },
      actionTaken: false
    }
  ],

  simulatedIncomingLeads: [
    {
      id: "INT-8098",
      name: "Dr. Suzanne L'Heureux",
      title: "Founder & Chief Medical Officer",
      company: "BioVax Diagnostics Canada",
      industry: "Biotech & Medical Diagnostics",
      location: "Quebec City / Montreal, QC",
      avatar: "SL",
      intentScore: 96,
      urgency: "Critical (48-hour window)",
      estimatedAUM: "$8,900,000",
      targetDivision: "ScotiaMcLeod & Private Banking",
      primarySignalType: "Patent Licensing Liquidity & Commercial Inflow",
      status: "New Intent Detected",
      dateDetected: "Just now",
      confidence: "97%",
      signals: [
        {
          source: "Commercial Banking Inflow",
          type: "International Royalty Wire",
          detail: "Commercial Account #9012-QC received $10.4M USD international patent licensing wire from Global Pharma Co.",
          weight: 50
        },
        {
          source: "Canadian Intellectual Property Office",
          type: "Patent Assignment",
          detail: "Commercialized diagnostic assay rights licensed under 10-year exclusive milestone agreement.",
          weight: 30
        },
        {
          source: "Wealth Portal Interaction",
          type: "Cross-Border Wealth Inquiry",
          detail: "Submitted contact request on Scotia Private Banking US/CAD cross-border advisory page.",
          weight: 20
        }
      ],
      aiAnalysis: {
        headline: "Substantial USD liquidity influx requiring cross-border currency hedging and wealth creation.",
        rationale: "Suzanne needs institutional-grade FX conversion hedging and tax-efficient holdco structuring to prevent double taxation across Canada and US royalty receipts.",
        recommendedStrategy: "Private Banking foreign exchange management + ScotiaMcLeod discretionary wealth mandate.",
        suggestedOutreachChannel: "Urgent advisory outreach coordinated with Commercial Banking International Desk.",
        complianceNotice: "PIPEDA and FINTRAC screening cleared. OSFI B-13 security logging active."
      },
      householdPreview: {
        spouse: "Etienne L'Heureux",
        entities: ["L'Heureux BioHoldings Inc.", "SL Research Trust"],
        jurisdiction: "Quebec"
      },
      actionTaken: false
    }
  ],

  pipelineOpportunities: [
    {
      id: "OPP-301",
      name: "Marcus Vance - Wealth Portfolio & HoldCo Structuring",
      leadId: "INT-8092",
      clientName: "Marcus Vance",
      company: "ABC Advanced Manufacturing",
      stage: "intent_detected",
      stageLabel: "Intent Detected",
      estimatedAUM: "$12,500,000",
      probability: "35%",
      expectedRevenue: "$112,500/yr",
      assignedAdvisor: "Catherine Sinclair",
      division: "ScotiaMcLeod / Scotiatrust",
      nextAction: "Commercial RM warm intro call",
      targetCloseDate: "Dec 15, 2026",
      notes: "Detected via $18.5M M&A sale. High urgency due to capital gains deadline."
    },
    {
      id: "OPP-302",
      name: "Dr. Aris Thorne - Physician Private Wealth",
      leadId: "INT-8093",
      clientName: "Dr. Aris Thorne",
      company: "Apex Orthopaedic Clinic",
      stage: "advisor_qualified",
      stageLabel: "Advisor Qualified",
      estimatedAUM: "$4,200,000",
      probability: "50%",
      expectedRevenue: "$37,800/yr",
      assignedAdvisor: "Marc Gauthier (MD Financial)",
      division: "MD Financial Management",
      nextAction: "Deliver tailored IPP briefing deck",
      targetCloseDate: "Nov 30, 2026",
      notes: "Practice equity sold. Needs Individual Pension Plan & tax-structured corporate class."
    },
    {
      id: "OPP-303",
      name: "Jean-Luc Tremblay - Tech Founder Liquidity Mandate",
      leadId: "INT-8094",
      clientName: "Jean-Luc Tremblay",
      company: "Kestrel CleanTech Solutions",
      stage: "discovery_scheduled",
      stageLabel: "Discovery Scheduled",
      estimatedAUM: "$7,800,000",
      probability: "65%",
      expectedRevenue: "$70,200/yr",
      assignedAdvisor: "Catherine Sinclair",
      division: "ScotiaMcLeod / Private Banking",
      nextAction: "Discovery meeting on Wednesday at 2:00 PM",
      targetCloseDate: "Nov 15, 2026",
      notes: "Series B secondary proceeds ($7.2M). Focus on multi-asset ESG & USD liquidity."
    },
    {
      id: "OPP-304",
      name: "Harrington Family Heritage - Succession & Trust",
      leadId: "INT-8095",
      clientName: "Robert & Eleanor Harrington",
      company: "Harrington Western Logistics",
      stage: "wealth_plan_presented",
      stageLabel: "Wealth Plan Presented",
      estimatedAUM: "$9,500,000",
      probability: "80%",
      expectedRevenue: "$85,500/yr",
      assignedAdvisor: "Graham Douglas",
      division: "Scotiatrust & Private Banking",
      nextAction: "Review Family Trust Deed revisions with legal counsel",
      targetCloseDate: "Nov 08, 2026",
      notes: "Estate freeze finalized. Plan reviewed by family trustees and corporate accountants."
    },
    {
      id: "OPP-305",
      name: "David Chen - Pacific Rim Capital Treasury & Wealth",
      leadId: "INT-8097",
      clientName: "David Chen",
      company: "Pacific Rim Commercial Land Corp",
      stage: "kyc_onboarding",
      stageLabel: "KYC & Suitability",
      estimatedAUM: "$16,000,000",
      probability: "90%",
      expectedRevenue: "$144,000/yr",
      assignedAdvisor: "Catherine Sinclair",
      division: "Private Banking & Scotia Wealth Family Office",
      nextAction: "Verify beneficial ownership documentation for Chen Dynasty Trust",
      targetCloseDate: "Oct 31, 2026",
      notes: "Escrow funds released. CIRO compliance documentation underway."
    },
    {
      id: "OPP-306",
      name: "Tariq Mansoor - Real Estate Family Office Mandate",
      leadId: "INT-8088",
      clientName: "Tariq Mansoor",
      company: "Mansoor Properties & Capital Ltd.",
      stage: "funded_active",
      stageLabel: "Funded & Active AUM",
      estimatedAUM: "$11,200,000",
      probability: "100%",
      expectedRevenue: "$100,800/yr",
      assignedAdvisor: "Catherine Sinclair",
      division: "ScotiaMcLeod",
      nextAction: "30-day initial portfolio performance review",
      targetCloseDate: "Won - Oct 10, 2026",
      notes: "Successfully closed from Commercial Banking referral. Assets funded into discretionary mandate."
    }
  ],

  referrals: [
    {
      id: "REF-201",
      referringDivision: "Commercial Banking",
      referrerName: "Geoff Reynolds",
      referrerRole: "VP Commercial Banking, Toronto Metro",
      clientName: "Marcus Vance (ABC Advanced Mfg)",
      estimatedValue: "$12.5M AUM",
      dateReceived: "Today, 09:15 AM",
      slaHoursLeft: 22,
      status: "Action Required",
      context: "Client sold manufacturing division. Requested introduction to ScotiaMcLeod advisor for wealth preservation and tax strategy.",
      targetSpecialist: "ScotiaMcLeod Private Wealth"
    },
    {
      id: "REF-202",
      referringDivision: "Retail Banking Branch Network",
      referrerName: "Sarah MacIntyre",
      referrerRole: "Branch Manager, King & Bay Branch",
      clientName: "Priya Nair",
      estimatedValue: "$3.4M AUM",
      dateReceived: "Today, 11:10 AM",
      slaHoursLeft: 46,
      status: "Advisor Assigned",
      context: "$2.8M GIC maturing without renewal instruction. Client actively modeling retirement options on Advice+ kiosk.",
      targetSpecialist: "ScotiaMcLeod Portfolio Manager"
    },
    {
      id: "REF-203",
      referringDivision: "Mortgage & Real Estate Specialists",
      referrerName: "Carlos Delgado",
      referrerRole: "Senior Commercial Mortgage Advisor",
      clientName: "David Chen",
      estimatedValue: "$16.0M AUM",
      dateReceived: "Yesterday",
      slaHoursLeft: 14,
      status: "In Progress",
      context: "Completed discharge on major commercial development. Liquid escrow release of $18.2M confirmed.",
      targetSpecialist: "Private Banking & Family Office"
    },
    {
      id: "REF-204",
      referringDivision: "MD Financial Clinical Network",
      referrerName: "Dr. Alistair MacLeod",
      referrerRole: "Regional Director, Physician Practice Advisory",
      clientName: "Dr. Aris Thorne",
      estimatedValue: "$4.2M AUM",
      dateReceived: "Yesterday",
      slaHoursLeft: 18,
      status: "Action Required",
      context: "Surgical practice equity disposition. Needs specialized IPP and corporate class investment structuring.",
      targetSpecialist: "MD Private Investment Counsel"
    }
  ],

  clients360: [
    {
      id: "CLI-1042",
      name: "Marcus Vance",
      age: 56,
      primaryPhone: "(416) 555-0192",
      primaryEmail: "m.vance@abcmfg-group.ca",
      location: "Oakville, ON",
      clientSince: "Prospective / Commercial Client since 2017",
      kycStatus: "Commercial Verified / Wealth KYC Pending",
      riskTolerance: "Balanced Growth (Proposed)",
      netWorth: "$28,500,000",
      liquidAssets: "$14,800,000",
      assignedAdvisor: "Catherine Sinclair",
      servicingTeam: ["Catherine Sinclair (ScotiaMcLeod)", "Geoff Reynolds (Commercial RM)", "Julia Sterling (Trust Officer)"],
      household: {
        familyName: "The Vance Family Household",
        members: [
          { name: "Marcus Vance", role: "Primary Client / Business Founder", relationship: "Self", ownership: "65% HoldCo" },
          { name: "Elena Vance", role: "Spouse & Trustee", relationship: "Spouse", ownership: "35% HoldCo" },
          { name: "Chloe Vance", role: "Daughter (Age 24 - Grad Student)", relationship: "Beneficiary", ownership: "Trust Beneficiary" },
          { name: "Liam Vance", role: "Son (Age 21 - Tech Founder)", relationship: "Beneficiary", ownership: "Trust Beneficiary" }
        ],
        corporateEntities: [
          { name: "Vance Global Holdings Inc.", type: "Holding Company (Ontario)", equityValue: "$18.5M", accounts: "Scotia Commercial Account #4902-88 ($14.2M cash)" },
          { name: "ABC Advanced Manufacturing Ltd.", type: "Operating Company (Asset Transferred)", equityValue: "$4.0M", accounts: "Operating Lines" },
          { name: "Vance 2018 Family Trust", type: "Discretionary Inter Vivos Trust", equityValue: "$6.0M", accounts: "Trustee Controlled" }
        ]
      },
      recommendedPortfolioAllocation: [
        { assetClass: "Canadian High-Dividend Equities", weight: "25%", value: "$3,125,000" },
        { assetClass: "US & Global Quality Growth", weight: "35%", value: "$4,375,000" },
        { assetClass: "Private Debt & Senior Secured Loans", weight: "20%", value: "$2,500,000" },
        { assetClass: "Short-Term High Yield Cash Sweep", weight: "20%", value: "$2,500,000" }
      ],
      interactionHistory: [
        { date: "Oct 17, 2026", channel: "AI Intent Engine", summary: "Intent signal flagged: $18.5M M&A Asset Sale + $14.2M wire deposit into commercial operating account." },
        { date: "Oct 15, 2026", channel: "Webinar", summary: "Registered and attended 'Business Owner Tax Strategies & Capital Gains Optimization'." },
        { date: "Oct 12, 2026", channel: "Commercial Bank Call", summary: "Commercial RM Geoff Reynolds noted client's upcoming transaction closing." }
      ]
    },
    {
      id: "CLI-1088",
      name: "Tariq Mansoor",
      age: 62,
      primaryPhone: "(416) 555-0841",
      primaryEmail: "tmansoor@mansoorgroup.com",
      location: "Toronto (Rosedale), ON",
      clientSince: "2021",
      kycStatus: "Compliant & Verified (Annual Review Due in 45 days)",
      riskTolerance: "Conservative Income & Capital Preservation",
      netWorth: "$34,000,000",
      liquidAssets: "$11,200,000",
      assignedAdvisor: "Catherine Sinclair",
      servicingTeam: ["Catherine Sinclair (ScotiaMcLeod)", "David Miller (Private Banker)"],
      household: {
        familyName: "Mansoor Family Household",
        members: [
          { name: "Tariq Mansoor", role: "Primary Client", relationship: "Self", ownership: "100% HoldCo" },
          { name: "Samira Mansoor", role: "Spouse", relationship: "Spouse", ownership: "Beneficiary" },
          { name: "Zayn Mansoor", role: "Son (Age 29 - Commercial Director)", relationship: "Co-Trustee", ownership: "Successor" }
        ],
        corporateEntities: [
          { name: "Mansoor Properties & Capital Ltd.", type: "Holding Company", equityValue: "$22.0M", accounts: "ScotiaMcLeod Managed #88102 ($11.2M AUM)" },
          { name: "Mansoor Real Estate Holdings", type: "Property Entity", equityValue: "$12.0M", accounts: "Commercial Credit Facilities" }
        ]
      },
      recommendedPortfolioAllocation: [
        { assetClass: "Canadian & Global Dividend", weight: "30%", value: "$3,360,000" },
        { assetClass: "Investment Grade Corporate Bonds", weight: "40%", value: "$4,480,000" },
        { assetClass: "Alternative Real Assets", weight: "20%", value: "$2,240,000" },
        { assetClass: "High-Yield Liquid Reserves", weight: "10%", value: "$1,120,000" }
      ],
      interactionHistory: [
        { date: "Oct 10, 2026", channel: "Account Funding", summary: "Completed $11.2M transfer into ScotiaMcLeod discretionary account." },
        { date: "Sep 22, 2026", channel: "Review Meeting", summary: "Annual portfolio stress test and inflation hedge strategy confirmed." }
      ]
    }
  ],

  copilotTemplates: {
    meetingBrief: (lead) => `
# AI Wealth Briefing: Prospective Client Meeting
**Client Target:** ${lead.name}
**Entity / Role:** ${lead.title}, ${lead.company}
**Calculated Intent Score:** ${lead.intentScore}/100 | **Urgency:** ${lead.urgency}
**Target Service Line:** ${lead.targetDivision}
**Estimated Wealth Mandate:** ${lead.estimatedAUM}

---

### Executive Context & Trigger
- **Primary Trigger:** ${lead.primarySignalType}
- **Signal Breakdown:**
${lead.signals.map(s => `  • [${s.source}]: ${s.detail}`).join('\n')}

### Core Wealth Opportunities & Pain Points
- ${lead.aiAnalysis.rationale}
- **Recommended Solution Structure:** ${lead.aiAnalysis.recommendedStrategy}

### Strategic Talking Points & Icebreakers
1. **Acknowledge Milestone:** "Marcus, congratulations on the successful asset transaction with ABC Advanced Manufacturing. Building a tier-one manufacturing business in Ontario is an exceptional achievement."
2. **Address the Tax Drag Clock:** "Many business owners we advise find that leaving liquidity in the operating corporation exposes them to passive investment tax drag of over 50%. Our goal today is showing you how Scotiatrust and ScotiaMcLeod preserve and shelter that capital."
3. **Seamless Coordination:** "Because your commercial banking is already within Scotiabank, we can coordinate your corporate treasury, tax distributions, and personal wealth plan under one synchronized umbrella."

### Compliance & Regulatory Guidance (OSFI B-13 & CIRO)
- Ensure Know-Your-Client (KYC) documentation is collected prior to trade execution.
- Disclose discretionary fee structure for balances exceeding $10M.
- AI generated under Venus Global Technology Governance protocol. Human advisor review required.
    `,

    outreachEmail: (lead) => `Subject: Congratulations on ABC Mfg's Milestone — Wealth Strategy for Corporate Proceeds

Dear ${lead.name.split(' ')[0]},

Congratulations to you and your team on the recently announced milestone at ${lead.company}. Building such an enduring market presence is a testament to your leadership.

Following transactions of this magnitude, business owners frequently navigate a short window to optimize corporate treasury surplus, minimize passive investment income tax drag, and coordinate personal liquidity with family holding structures.

Through our partnership with Geoff Reynolds and the Scotiabank Commercial Banking team, we have designed customized wealth preservation frameworks for Canadian founders managing eight-figure liquidity events.

I would welcome a private 20-minute conversation this week to share our "Post-Transaction Corporate Wealth Blueprint" and discuss how ScotiaMcLeod and Scotiatrust can help you shelter and compound your capital.

Would this Thursday at 2:00 PM or Friday morning suit your schedule?

Warm regards,

Catherine Sinclair, CIM, FCSI
Senior Vice President & Wealth Advisor
ScotiaMcLeod | Scotia Wealth Management
Direct: (416) 555-0192 | 44 King St West, 21st Floor, Toronto, ON
    `,

    phoneScript: (lead) => `
**Target:** ${lead.name} (${lead.title}, ${lead.company})
**Warm Connection:** Commercial Banking RM Geoff Reynolds

[GREETING]
"Hello Marcus, this is Catherine Sinclair from Scotia Wealth Management. I work closely with Geoff Reynolds at our Commercial Banking centre here on King Street."

[THE HOOK / CONGRATULATIONS]
"Geoff mentioned you just crossed a tremendous milestone with the ABC Manufacturing asset transaction. First off, congratulations on a landmark deal."

[THE VALUE PROPOSITION]
"The reason for my call today is that right after an eight-figure asset sale, founders often face an aggressive 50%+ corporate tax penalty on passive capital sitting in the operating accounts. We specialize in helping entrepreneurs move that capital into tax-advantaged holding structures and discretionary portfolios before year-end."

[THE LOW-FRICTION ASK]
"Geoff suggested we connect for just 15 minutes over coffee or a brief Zoom. I've prepared a customized one-page briefing on how peers in the manufacturing sector structure their capital post-sale. How does your Thursday afternoon look?"
    `
  }
};

// Export for module or browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WEALTH_DATA;
} else if (typeof window !== 'undefined') {
  window.WEALTH_DATA = WEALTH_DATA;
}
