// VGT Wealth AI CRM - Prototype Data Layer (ES Module for React)
// Tailored for Canadian Banking Wealth Management (Scotiabank, ScotiaMcLeod, Private Banking, MD Financial, Scotiatrust)

export const WEALTH_DATA = {
  currentUser: {
    name: "Catherine Sinclair",
    title: "Senior Vice President & Wealth Advisor",
    division: "ScotiaMcLeod & Private Banking",
    branch: "Toronto Financial District · 44 King St W",
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
      name: "Gordon Thompson",
      title: "President, Chief Executive Officer & Director",
      company: "San Lorenzo Gold Corp. (TSX-V: SLG)",
      industry: "Natural Resources & Capital Markets",
      location: "Calgary, AB / Toronto, ON",
      avatar: "GT",
      intentScore: 96,
      urgency: "Immediate (<7 Days)",
      estimatedAUM: "$80,000,000",
      targetDivision: "ScotiaMcLeod & Private Banking",
      primarySignalType: "Liquidity Event - Private Placement Financing",
      status: "New Intent Detected",
      dateDetected: "Today, Live Wire",
      confidence: "99% (Live Wire Verified)",
      signals: [
        {
          source: "GlobeNewswire Canada & SEDAR+",
          type: "Private Placement Financing",
          detail: "San Lorenzo announced upsize of corporate private placement financing up to $80 Million CAD.",
          weight: 45
        },
        {
          source: "Commercial Banking Treasury Inflow",
          type: "Institutional Escrow Reserve",
          detail: "Commercial banking operating facility opened to receive institutional equity subscription proceeds.",
          weight: 35
        },
        {
          source: "Advisor Discretionary Model",
          type: "Corporate Class Tax Shield",
          detail: "Holding company reorganization required to mitigate Ontario/Alberta passive investment income tax drag.",
          weight: 20
        }
      ],
      aiAnalysis: {
        headline: "High probability of corporate cash surplus following $80M financing close.",
        rationale: "Gordon Thompson and institutional shareholders require bespoke Canadian corporate wealth structuring. Large cash proceeds retained in corporate treasury will trigger passive investment income surtaxes if not deployed into tax-sheltered corporate class instruments.",
        recommendedStrategy: "Discretionary Investment Management via ScotiaMcLeod combined with Scotiatrust holding company estate freeze and tax-sheltered corporate class investments.",
        suggestedOutreachChannel: "Warm introduction facilitated by Commercial Banking Director + Curated Private Wealth Briefing.",
        complianceNotice: "PIPEDA Consent Verified. Source attribution: Public SEDAR+ Regulatory Disclosure & Canadian Press Wire. CIRO Suitability boundary active."
      },
      householdPreview: {
        spouse: "Margaret Thompson (Trustee)",
        entities: ["SLG Holdings Alberta Ltd.", "Thompson Family Heritage Trust", "San Lorenzo Exploration Operating Co"],
        jurisdiction: "Alberta & Ontario (Canada)"
      },
      actionTaken: false
    },
    {
      id: "INT-8093",
      name: "Dr. Paul Armstrong, MD, FRCPC, O.C.",
      title: "Distinguished Professor of Medicine & Practice Principal",
      company: "Canadian Cardiology Research & Medicine Professional Corp.",
      industry: "Healthcare & Clinical Cardiology",
      location: "Edmonton, AB / Toronto, ON",
      avatar: "PA",
      intentScore: 95,
      urgency: "High (<14 Days)",
      estimatedAUM: "$4,800,000",
      targetDivision: "MD Financial Management",
      primarySignalType: "Medical Practice Equity Disposition",
      status: "New Intent Detected",
      dateDetected: "Today, 08:30 AM",
      confidence: "96%",
      signals: [
        {
          source: "MD Financial Clinical Network",
          type: "Practice Transition Flag",
          detail: "Sale of clinical facility equity and practice succession to regional healthcare hospital network finalized.",
          weight: 45
        },
        {
          source: "Commercial Banking Trigger",
          type: "Medical Loan Discharge",
          detail: "$1.4M commercial medical diagnostic equipment facility satisfied and discharged ahead of schedule.",
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
        headline: "Transition from active clinical cardiology practice to consulting with substantial liquid capital.",
        rationale: "Dr. Armstrong requires specialized physician wealth planning, including Medical Professional Corporation (MPC) surplus stripping, Individual Pension Plan setup, and bespoke philanthropic legacy planning.",
        recommendedStrategy: "MD Private Investment Counsel with integrated tax optimization for specialized Canadian physicians.",
        suggestedOutreachChannel: "Direct consultation from MD Financial Senior Wealth Consultant citing completed IPP inquiry.",
        complianceNotice: "MD Financial consent-on-file. Fully compliant with Canadian Medical Association standards."
      },
      householdPreview: {
        spouse: "Eleanor Armstrong",
        entities: ["Paul Armstrong Medicine Professional Corp (CPSA/CPSO)", "Armstrong Medical Endowment"],
        jurisdiction: "Alberta & Ontario (Canada)"
      },
      actionTaken: false
    },
    {
      id: "INT-8094",
      name: "Mark Leonard",
      title: "President & Board Chairman",
      company: "Constellation Software Inc. (TSX: CSU)",
      industry: "Enterprise Software & Serial M&A",
      location: "Toronto, ON",
      avatar: "ML",
      intentScore: 98,
      urgency: "Immediate (<7 Days)",
      estimatedAUM: "$45,000,000",
      targetDivision: "Global Family Office & Private Banking",
      primarySignalType: "M&A Asset Acquisition & Corporate Liquidity",
      status: "Assigned to Advisor",
      dateDetected: "Yesterday",
      confidence: "98%",
      signals: [
        {
          source: "TSX & SEDAR+ Capital Allocation",
          type: "M&A Disclosures",
          detail: "Constellation Software operating group closed multiple vertical software acquisitions and corporate asset reallocations.",
          weight: 45
        },
        {
          source: "Commercial Treasury Operating Inflow",
          type: "Corporate Cash Surplus",
          detail: "Holding structure liquidity distribution into commercial accounts at Toronto Financial District Branch.",
          weight: 35
        },
        {
          source: "Global Family Office Governance",
          type: "Endowment Structuring",
          detail: "Attended Scotiabank Global Family Office & Cross-Border Wealth advisory conference.",
          weight: 20
        }
      ],
      aiAnalysis: {
        headline: "High-conviction family office liquidity milestone following serial software acquisitions.",
        rationale: "Requires specialized family office governance, dual-currency liquidity management (USD/CAD), and philanthropic endowment structuring.",
        recommendedStrategy: "Scotiabank Global Family Office integration + Private Banking bespoke structured liquidity facility.",
        suggestedOutreachChannel: "Direct introduction via Scotiabank Technology Commercial Banking Executive Director.",
        complianceNotice: "TSX public corporate record verified. Internal banking referral consent cleared."
      },
      householdPreview: {
        spouse: "Family Foundation Trustee",
        entities: ["CSI Capital Group HoldCo", "Leonard Family Trust", "Constellation Software Operating Apex"],
        jurisdiction: "Ontario (Canada)"
      },
      actionTaken: true
    },
    {
      id: "INT-8095",
      name: "Aras Azadian",
      title: "Chief Executive Officer & Director",
      company: "Avicanna Life Sciences Inc. (TSX: AVCN)",
      industry: "Biotechnology & Life Sciences",
      location: "Toronto, ON (MaRS Discovery District)",
      avatar: "AA",
      intentScore: 94,
      urgency: "Medium (<21 Days)",
      estimatedAUM: "$5,200,000",
      targetDivision: "ScotiaMcLeod & Scotiatrust",
      primarySignalType: "Capital Markets - Public Listing Transition",
      status: "Meeting Scheduled",
      dateDetected: "Today, 10:15 AM",
      confidence: "95%",
      signals: [
        {
          source: "GlobeNewswire Canada Disclosure",
          type: "Public Listing Expansion",
          detail: "Avicanna announced official corporate listing transition to OTCQB and cross-border commercial expansion.",
          weight: 45
        },
        {
          source: "Commercial Banking Internal",
          type: "Treasury Inflow",
          detail: "Surplus cash accumulation in corporate holding structure #8821-ON at MaRS branch.",
          weight: 35
        },
        {
          source: "Client Engagement",
          type: "Executive Options Advisory",
          detail: "Registered for ScotiaMcLeod Executive Compensation and Stock Option Exercise tax planning advisory.",
          weight: 20
        }
      ],
      aiAnalysis: {
        headline: "Biotech executive navigating US/Canada cross-border capital expansion and stock equity vesting.",
        rationale: "Requires cross-border wealth planning, executive stock option monetization strategy, and HoldCo tax sheltering.",
        recommendedStrategy: "ScotiaMcLeod Discretionary Portfolio Management with Scotia Wealth cross-border banking coordination.",
        suggestedOutreachChannel: "Joint meeting with Commercial RM and Senior Wealth Advisor.",
        complianceNotice: "Public disclosure verified. CIRO suitability guidelines attached."
      },
      householdPreview: {
        spouse: "Family Trust Beneficiary",
        entities: ["Azadian BioVentures HoldCo", "Avicanna Operating Research Trust"],
        jurisdiction: "Ontario (Canada)"
      },
      actionTaken: true
    },
    {
      id: "INT-8096",
      name: "Marc Edwards",
      title: "Chief Executive Officer",
      company: "Kane Biotech Inc. (TSX-V: KNE)",
      industry: "Biotechnology & Animal Health",
      location: "Winnipeg, MB / Toronto, ON",
      avatar: "ME",
      intentScore: 92,
      urgency: "Critical Urgency (<10 Days)",
      estimatedAUM: "$2,800,000",
      targetDivision: "Commercial Wealth Advisory",
      primarySignalType: "Commercial Banking Trigger - Debt Restructuring & Insider Financing",
      status: "New Intent Detected",
      dateDetected: "Today, 11:05 AM",
      confidence: "94%",
      signals: [
        {
          source: "Corporate Press Wire Disclosure",
          type: "Insider Loan & Treasury Restructure",
          detail: "Kane Biotech announced $250,000 insider loan and debt restructuring to advance commercialization.",
          weight: 50
        },
        {
          source: "Commercial Banking Trigger",
          type: "Facility Re-Amortization",
          detail: "Commercial operating facility re-amortized freeing up substantial corporate operating liquidity.",
          weight: 30
        },
        {
          source: "Digital Wealth Engagement",
          type: "Corporate Class Planning",
          detail: "Ran complex holding company tax simulation on Scotiabank Advice+ wealth portal.",
          weight: 20
        }
      ],
      aiAnalysis: {
        headline: "Biotech corporate treasury and executive insider liquidity restructuring milestone.",
        rationale: "Executive insider financing requires debt management, liquid reserve accumulation, and corporate tax-efficient yield generation.",
        recommendedStrategy: "Commercial Banking Treasury Sweep + ScotiaMcLeod Corporate Fixed-Income Portfolio.",
        suggestedOutreachChannel: "Commercial Banking RM referral to Senior Wealth Advisor.",
        complianceNotice: "1st Party Bank relationship. Consent for cross-divisional wealth advice confirmed."
      },
      householdPreview: {
        spouse: "Trust Co-Signer",
        entities: ["Edwards Capital Holdings Ltd.", "Kane Biotech Operating Group"],
        jurisdiction: "Manitoba & Ontario (Canada)"
      },
      actionTaken: false
    }
  ],

  simulatedIncomingLeads: [
    {
      id: "INT-8098",
      name: "Michael Wood",
      title: "Executive Director",
      company: "Trident Resources Corp. (TSX-V: TRNT)",
      industry: "Energy & Natural Resources",
      location: "Vancouver, BC",
      avatar: "MW",
      intentScore: 91,
      urgency: "Immediate (<7 Days)",
      estimatedAUM: "$3,600,000",
      targetDivision: "ScotiaMcLeod Discretionary",
      primarySignalType: "Corporate Capital Advisory & Shareholder Marketing",
      status: "New Intent Detected",
      dateDetected: "Just now",
      confidence: "97%",
      signals: [
        {
          source: "Live GlobeNewswire Canada Filing",
          type: "Corporate Advisory Engagement",
          detail: "Trident Resources provided regulatory update on institutional capital engagement with Freedom Financial.",
          weight: 45
        },
        {
          source: "Commercial Banking Inflow",
          type: "Corporate Retainer Reserve",
          detail: "Corporate operating account received wire transfer for corporate capital reserve.",
          weight: 35
        },
        {
          source: "Wealth Model Interaction",
          type: "Executive Liquid Asset Allocation",
          detail: "Reviewed ScotiaMcLeod Discretionary Equity Allocation model.",
          weight: 20
        }
      ],
      aiAnalysis: {
        headline: "Resource executive entering corporate capitalization and advisory phase.",
        rationale: "Requires corporate share management, tax-efficient liquid asset allocation, and wealth preservation.",
        recommendedStrategy: "ScotiaMcLeod Discretionary Portfolio Management + Scotiatrust corporate holding structure.",
        suggestedOutreachChannel: "Immediate executive intro call from Wealth Advisor.",
        complianceNotice: "Verified via Canadian Press Wire disclosure. CIRO suitability guidelines attached."
      },
      householdPreview: {
        spouse: "Family Trust Beneficiary",
        entities: ["Trident Global Resources HoldCo", "Wood Family Endowment"],
        jurisdiction: "British Columbia (Canada)"
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
      clientSince: "Commercial Client since 2017",
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
      clientSince: "Scotia Commercial Client since 2021",
      kycStatus: "Compliant & Verified (Annual Review in 45 Days)",
      riskTolerance: "Conservative Income & Capital Preservation",
      netWorth: "$34,000,000",
      liquidAssets: "$11,200,000",
      assignedAdvisor: "Catherine Sinclair",
      servicingTeam: ["Catherine Sinclair (ScotiaMcLeod)", "David Miller (Private Banker)", "Julia Sterling (Trust Officer)"],
      household: {
        familyName: "The Mansoor Family Household",
        members: [
          { name: "Tariq Mansoor", role: "Primary Client / Real Estate Principal", relationship: "Self", ownership: "100% HoldCo" },
          { name: "Samira Mansoor", role: "Spouse & Trustee", relationship: "Spouse", ownership: "Beneficiary" },
          { name: "Zayn Mansoor", role: "Son (Age 29 - Commercial Director)", relationship: "Co-Trustee", ownership: "Successor" }
        ],
        corporateEntities: [
          { name: "Mansoor Properties & Capital Ltd.", type: "Holding Company (Ontario)", equityValue: "$22.0M", accounts: "ScotiaMcLeod Managed #88102 ($11.2M AUM)" },
          { name: "Mansoor Real Estate Holdings Corp.", type: "Property Entity", equityValue: "$12.0M", accounts: "Commercial Credit Facilities" }
        ]
      },
      recommendedPortfolioAllocation: [
        { assetClass: "Canadian & Global Dividend Equities", weight: "30%", value: "$3,360,000" },
        { assetClass: "Investment Grade Corporate Bonds", weight: "40%", value: "$4,480,000" },
        { assetClass: "Alternative Real Assets & Infrastructure", weight: "20%", value: "$2,240,000" },
        { assetClass: "High-Yield Liquid Cash Reserves", weight: "10%", value: "$1,120,000" }
      ],
      interactionHistory: [
        { date: "Oct 10, 2026", channel: "Account Funding", summary: "Completed $11.2M transfer into ScotiaMcLeod discretionary mandate." },
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
1. **Acknowledge Milestone:** "Congratulations on the recently announced corporate milestone. Building a tier-one manufacturing business in Ontario is an exceptional achievement."
2. **Address the Tax Drag Clock:** "Many business owners we advise find that leaving liquidity in the operating corporation exposes them to passive investment tax drag of over 50%. Our goal today is showing you how Scotiatrust and ScotiaMcLeod preserve and shelter that capital."
3. **Seamless Coordination:** "Because your commercial banking is already within Scotiabank, we can coordinate your corporate treasury, tax distributions, and personal wealth plan under one synchronized umbrella."

### Compliance & Regulatory Guidance (OSFI B-13 & CIRO)
- Ensure Know-Your-Client (KYC) documentation is collected prior to trade execution.
- Disclose discretionary fee structure for balances exceeding $10M.
- AI generated under Venus Global Technology Governance protocol. Human advisor review required.
    `,

    outreachEmail: (lead) => `Subject: Strategic Wealth Advisory & Corporate Treasury Planning — Post-Transaction Milestone

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
