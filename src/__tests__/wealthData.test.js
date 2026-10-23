import { describe, it, expect } from 'vitest';
import { WEALTH_DATA } from '../data/wealthData';

describe('WEALTH_DATA Data Layer Integrity', () => {
  it('contains valid user information for executive banking advisor', () => {
    expect(WEALTH_DATA.currentUser).toBeDefined();
    expect(WEALTH_DATA.currentUser.name).toBe('Catherine Sinclair');
    expect(WEALTH_DATA.currentUser.division).toContain('ScotiaMcLeod');
    expect(WEALTH_DATA.currentUser.activeClients).toBeGreaterThan(0);
  });

  it('contains valid KPI metrics with positive values', () => {
    expect(WEALTH_DATA.kpiMetrics.totalPipelineAUM).toContain('$');
    expect(WEALTH_DATA.kpiMetrics.intentLeadsDetectedThisMonth).toBeGreaterThan(0);
    expect(WEALTH_DATA.kpiMetrics.avgIntentScore).toBeGreaterThan(80);
    expect(WEALTH_DATA.kpiMetrics.conversionToMeetingRate).toContain('%');
  });

  it('contains well-formed intent leads with valid scores and signals', () => {
    expect(WEALTH_DATA.intentLeads.length).toBeGreaterThanOrEqual(5);

    WEALTH_DATA.intentLeads.forEach(lead => {
      expect(lead.id).toMatch(/^INT-\d+/);
      expect(lead.name).toBeTruthy();
      expect(lead.company).toBeTruthy();
      expect(lead.intentScore).toBeGreaterThanOrEqual(0);
      expect(lead.intentScore).toBeLessThanOrEqual(100);
      expect(lead.signals.length).toBeGreaterThan(0);
      expect(lead.aiAnalysis.rationale).toBeTruthy();
      expect(lead.estimatedAUM).toContain('$');
      expect(lead.householdPreview).toBeDefined();
      expect(lead.householdPreview.entities.length).toBeGreaterThan(0);

      // Signal weights should sum up to approximately 100
      const totalWeight = lead.signals.reduce((sum, s) => sum + s.weight, 0);
      expect(totalWeight).toBe(100);
    });
  });

  it('generates valid copilot templates for any lead', () => {
    const sampleLead = WEALTH_DATA.intentLeads[0];

    const email = WEALTH_DATA.copilotTemplates.outreachEmail(sampleLead);
    expect(email).toContain(sampleLead.name.split(' ')[0]);
    expect(email).toContain(sampleLead.company);
    expect(email).toContain('ScotiaMcLeod');

    const phone = WEALTH_DATA.copilotTemplates.phoneScript(sampleLead);
    expect(phone).toContain(sampleLead.name);
    expect(phone).toContain('Geoff Reynolds');

    const brief = WEALTH_DATA.copilotTemplates.meetingBrief(sampleLead);
    expect(brief).toContain(sampleLead.name);
    expect(brief).toContain(sampleLead.estimatedAUM);
    expect(brief).toContain('OSFI B-13');
  });

  it('contains valid pipeline opportunities across stages', () => {
    const validStages = [
      'intent_detected',
      'advisor_qualified',
      'discovery_scheduled',
      'wealth_plan_presented',
      'kyc_onboarding',
      'funded_active'
    ];

    expect(WEALTH_DATA.pipelineOpportunities.length).toBeGreaterThan(0);
    WEALTH_DATA.pipelineOpportunities.forEach(opp => {
      expect(opp.id).toMatch(/^OPP-\d+/);
      expect(validStages).toContain(opp.stage);
      expect(opp.estimatedAUM).toContain('$');
    });
  });

  it('contains valid cross-divisional referrals with active SLAs', () => {
    expect(WEALTH_DATA.referrals.length).toBeGreaterThan(0);
    WEALTH_DATA.referrals.forEach(ref => {
      expect(ref.id).toMatch(/^REF-\d+/);
      expect(ref.referringDivision).toBeTruthy();
      expect(ref.slaHoursLeft).toBeGreaterThan(0);
      expect(ref.estimatedValue).toContain('$');
    });
  });
});
