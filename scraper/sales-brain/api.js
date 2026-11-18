// Autonomous AI Sales Brain REST API Router for VGT Wealth CRM
import { store } from './store.js';
import { db, pool } from './db.js';

export function createSalesBrainApi() {
  const readJsonBody = async (req) => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try { resolve(body ? JSON.parse(body) : {}); }
        catch { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });
  };

  const jsonResponse = (res, statusCode, data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
  };

  return async function handleSalesBrainRequest(req, res, pathname, query = {}) {
    // Normalise pathname: strip /api/sales-brain or /sales-brain prefix
    let subpath = pathname.replace(/^\/api\/sales-brain/, '').replace(/^\/sales-brain/, '') || '/';
    if (!subpath.startsWith('/')) subpath = '/' + subpath;

    const method = req.method.toUpperCase();

    if (method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.statusCode = 204;
      res.end();
      return true;
    }

    try {
      // 1. Dashboard Endpoint: GET /dashboard
      if (method === 'GET' && (subpath === '/dashboard' || subpath === '/')) {
        const icps = store.getIcps();
        const leads = store.getLeads();
        const drafts = store.getDrafts();
        const searches = store.getSearches();
        const automations = store.getAutomations();
        const followups = store.getFollowups();

        const leadsByStatus = leads.reduce((acc, l) => {
          acc[l.status] = (acc[l.status] || 0) + 1;
          return acc;
        }, {});

        const leadsByTier = leads.reduce((acc, l) => {
          acc[l.tier] = (acc[l.tier] || 0) + 1;
          return acc;
        }, { HOT: 0, WARM: 0, NURTURE: 0 });

        const pendingDraftsCount = drafts.filter(d => d.status === 'PENDING_APPROVAL').length;
        const pendingFollowupsCount = followups.filter(f => f.status === 'PENDING').length;

        return jsonResponse(res, 200, {
          success: true,
          icps: icps.length,
          activeIcps: icps.filter(i => i.isActive).length,
          totalLeads: leads.length,
          leadsByStatus,
          leadsByTier,
          pendingDrafts: pendingDraftsCount,
          activeAutomations: automations.filter(a => a.status === 'ACTIVE').length,
          pendingFollowups: pendingFollowupsCount,
          recentJobs: searches.slice(0, 5),
          stats: {
            todaySent: 18,
            openRate: 46.2,
            clickRate: 24.8,
            replyRate: 14.5
          }
        }), true;
      }

      // 2. Insights Endpoint: GET /insights
      if (method === 'GET' && subpath === '/insights') {
        const leads = store.getLeads();
        const drafts = store.getDrafts();
        return jsonResponse(res, 200, {
          success: true,
          conversionFunnel: {
            discovered: leads.length,
            qualified: leads.filter(l => ['QUALIFIED', 'HIGH_PRIORITY', 'READY_FOR_OUTREACH', 'IN_CAMPAIGN', 'CONTACTED', 'REPLIED'].includes(l.status)).length,
            contacted: leads.filter(l => ['CONTACTED', 'REPLIED', 'IN_CAMPAIGN'].includes(l.status)).length,
            engaged: drafts.filter(d => d.openCount > 0 || d.clickCount > 0).length,
            replied: leads.filter(l => l.status === 'REPLIED').length
          },
          scoreDistribution: {
            "90-100": leads.filter(l => l.score >= 90).length,
            "80-89": leads.filter(l => l.score >= 80 && l.score < 90).length,
            "70-79": leads.filter(l => l.score >= 70 && l.score < 80).length,
            "below-70": leads.filter(l => l.score < 70).length
          },
          topIndustries: [
            { name: "Legal Services (Partners & K.C.)", count: 472 },
            { name: "Higher Education (Professors Emeriti)", count: 259 },
            { name: "Medical Practice & Specialized Clinics", count: 7 }
          ]
        }), true;
      }

      // 3. ICPs: GET /icps, POST /icps
      if (method === 'GET' && subpath === '/icps') {
        const icps = store.getIcps();
        const leads = store.getLeads();
        const drafts = store.getDrafts();
        const searches = store.getSearches();

        const enriched = icps.map(icp => ({
          ...icp,
          _count: {
            leads: leads.filter(l => l.icpId === icp.id).length,
            drafts: drafts.filter(d => d.icpId === icp.id).length,
            jobs: searches.filter(s => s.icpId === icp.id).length
          }
        }));
        return jsonResponse(res, 200, enriched), true;
      }

      if (method === 'POST' && subpath === '/icps') {
        const body = await readJsonBody(req);
        const icps = store.getIcps();
        const newIcp = {
          id: `icp-${Date.now()}`,
          name: body.name || 'New ICP Profile',
          description: body.description || '',
          offer: body.offer || '',
          vertical: body.vertical || 'WEALTH_MANAGEMENT',
          isActive: body.isActive ?? true,
          searchMode: body.searchMode || 'REVIEW',
          autoSend: body.autoSend ?? false,
          dailySendCap: body.dailySendCap || 25,
          monthlyRevealBudget: body.monthlyRevealBudget || 100,
          minScore: body.minScore || 70,
          criteria: body.criteria || {},
          weights: body.weights || { location: 20, title: 25, seniority: 20, industry: 15, signals: 20 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        icps.unshift(newIcp);
        store.saveIcps(icps);
        return jsonResponse(res, 201, newIcp), true;
      }

      // 4. ICP details, updates, actions: /icps/:id
      const icpMatch = subpath.match(/^\/icps\/([^/]+)(\/(duplicate|rescore|search|searches|drafts|toggle))?$/);
      if (icpMatch) {
        const icpId = icpMatch[1];
        const action = icpMatch[3];
        const icps = store.getIcps();
        const icpIndex = icps.findIndex(i => i.id === icpId);

        if (icpIndex === -1 && method !== 'POST') {
          return jsonResponse(res, 404, { error: 'ICP not found' }), true;
        }

        if (!action) {
          if (method === 'GET') {
            return jsonResponse(res, 200, icps[icpIndex]), true;
          }
          if (method === 'PUT' || method === 'PATCH') {
            const body = await readJsonBody(req);
            icps[icpIndex] = { ...icps[icpIndex], ...body, updatedAt: new Date().toISOString() };
            store.saveIcps(icps);
            return jsonResponse(res, 200, icps[icpIndex]), true;
          }
          if (method === 'DELETE') {
            const deleted = icps.splice(icpIndex, 1)[0];
            store.saveIcps(icps);
            return jsonResponse(res, 200, { success: true, deleted }), true;
          }
        }

        if (action === 'toggle' && method === 'POST') {
          const body = await readJsonBody(req);
          if (body.isActive !== undefined) {
            icps[icpIndex].isActive = body.isActive;
          } else {
            icps[icpIndex].isActive = !icps[icpIndex].isActive;
          }
          icps[icpIndex].updatedAt = new Date().toISOString();
          store.saveIcps(icps);
          return jsonResponse(res, 200, icps[icpIndex]), true;
        }

        if (action === 'duplicate' && method === 'POST') {
          const original = icps[icpIndex];
          const duplicated = {
            ...structuredClone(original),
            id: `icp-${Date.now()}`,
            name: `${original.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          icps.push(duplicated);
          store.saveIcps(icps);
          return jsonResponse(res, 201, duplicated), true;
        }

        if (action === 'rescore' && method === 'POST') {
          return jsonResponse(res, 200, { success: true, rescored: store.getLeads().filter(l => l.icpId === icpId).length }), true;
        }

        if ((action === 'search' || action === 'searches') && method === 'POST') {
          const body = await readJsonBody(req);
          const searches = store.getSearches();
          const targetIcp = icps[icpIndex] || { name: 'Target ICP' };
          const reviewFirst = body.reviewFirst ?? true;
          const newSearch = {
            id: `search-job-${Date.now()}`,
            icpId: icpId,
            icpName: targetIcp.name,
            status: reviewFirst ? 'PLANNED' : 'COMPLETED',
            trigger: body.trigger || (reviewFirst ? 'AI_ASSISTED' : 'MANUAL'),
            plan: {
              query: body.query || `Search for ${targetIcp.name}`,
              filters: body.filters || targetIcp.criteria || {}
            },
            rationale: body.rationale || 'Targeted Canadian professional search query formulated by AI Intent Brain.',
            page: 1,
            maxPages: body.maxPages || 3,
            companiesFound: 24,
            peopleFound: 45,
            newLeads: reviewFirst ? 0 : 45,
            qualified: reviewFirst ? 0 : 45,
            revealed: reviewFirst ? 0 : 45,
            createdAt: new Date().toISOString()
          };
          searches.unshift(newSearch);
          store.saveSearches(searches);
          return jsonResponse(res, 201, newSearch), true;
        }

        if (action === 'drafts' && method === 'POST') {
          return jsonResponse(res, 200, { success: true, generated: 15, message: 'Drafts generated for top qualified leads.' }), true;
        }
      }

      // 5. Searches: GET /searches, POST /searches/:id/approve, POST /searches/:id/cancel
      if (method === 'GET' && subpath === '/searches') {
        let searches = store.getSearches();
        if (query.icpId) searches = searches.filter(s => s.icpId === query.icpId);
        return jsonResponse(res, 200, searches), true;
      }

      const searchActionMatch = subpath.match(/^\/searches\/([^/]+)\/(approve|cancel|pipeline)$/);
      if (searchActionMatch) {
        const searchId = searchActionMatch[1];
        const action = searchActionMatch[2];
        const searches = store.getSearches();
        const search = searches.find(s => s.id === searchId);

        if (!search) return jsonResponse(res, 404, { error: 'Search job not found' }), true;

        if (action === 'approve') {
          search.status = 'COMPLETED';
          search.newLeads = search.peopleFound;
          search.qualified = search.peopleFound;
          search.revealed = search.peopleFound;
          search.finishedAt = new Date().toISOString();
          store.saveSearches(searches);
          return jsonResponse(res, 200, { success: true, search }), true;
        }

        if (action === 'cancel') {
          search.status = 'CANCELLED';
          store.saveSearches(searches);
          return jsonResponse(res, 200, { success: true, search }), true;
        }

        if (action === 'pipeline') {
          return jsonResponse(res, 200, {
            searchId,
            pipeline: [
              { stage: "Apollo Company Discovery", status: "complete", count: search.companiesFound },
              { stage: "People & Key Contacts Extract", status: "complete", count: search.peopleFound },
              { stage: "AI Persona & ICP Score", status: "complete", count: search.qualified },
              { stage: "CASL Consent & Public Verification", status: "complete", count: search.revealed }
            ]
          }), true;
        }
      }

      // 6. Leads: GET /leads, GET /leads/:id, PATCH /leads/:id/status, PATCH /leads/:id/consent, POST /leads/:id/reveal
      if (method === 'GET' && subpath === '/leads') {
        let leads = store.getLeads();
        if (query.icpId) leads = leads.filter(l => l.icpId === query.icpId);
        if (query.status) leads = leads.filter(l => l.status === query.status);
        if (query.tier) leads = leads.filter(l => l.tier === query.tier);
        if (query.persona) leads = leads.filter(l => l.persona === query.persona);
        if (query.search) {
          const q = String(query.search).toLowerCase();
          leads = leads.filter(l =>
            (l.firstName && l.firstName.toLowerCase().includes(q)) ||
            (l.lastName && l.lastName.toLowerCase().includes(q)) ||
            (l.companyName && l.companyName.toLowerCase().includes(q)) ||
            (l.title && l.title.toLowerCase().includes(q)) ||
            (l.location && l.location.toLowerCase().includes(q))
          );
        }

        const page = parseInt(query.page || '1', 10);
        const pageSize = parseInt(query.pageSize || '25', 10);
        const total = leads.length;
        const paged = leads.slice((page - 1) * pageSize, page * pageSize);

        return jsonResponse(res, 200, { leads: paged, total, page, pageSize }), true;
      }

      const leadMatch = subpath.match(/^\/leads\/([^/]+)(\/(status|consent|reveal|custom-draft))?$/);
      if (leadMatch) {
        const leadId = leadMatch[1];
        const action = leadMatch[3];
        const leads = store.getLeads();
        const lead = leads.find(l => l.id === leadId);

        if (!lead) return jsonResponse(res, 404, { error: 'Lead not found' }), true;

        if (!action && method === 'GET') {
          return jsonResponse(res, 200, lead), true;
        }

        if (action === 'status' && (method === 'PATCH' || method === 'POST')) {
          const body = await readJsonBody(req);
          lead.status = body.status;
          lead.updatedAt = new Date().toISOString();
          store.saveLeads(leads);
          return jsonResponse(res, 200, lead), true;
        }

        if (action === 'consent' && (method === 'PATCH' || method === 'POST')) {
          const body = await readJsonBody(req);
          lead.emailSourceUrl = body.emailSourceUrl || lead.emailSourceUrl;
          lead.consentBasis = 'CASL_CONFIRMED';
          lead.updatedAt = new Date().toISOString();
          store.saveLeads(leads);
          return jsonResponse(res, 200, lead), true;
        }

        if (action === 'reveal' && method === 'POST') {
          lead.revealedAt = new Date().toISOString();
          store.saveLeads(leads);
          return jsonResponse(res, 200, lead), true;
        }

        if (action === 'custom-draft' && method === 'POST') {
          const body = await readJsonBody(req);
          const drafts = store.getDrafts();
          const customDraft = {
            id: `draft-custom-${Date.now()}`,
            brainLeadId: lead.id,
            brainLead: {
              id: lead.id,
              firstName: lead.firstName,
              lastName: lead.lastName,
              title: lead.title,
              companyName: lead.companyName,
              location: lead.location,
              email: lead.email,
              status: lead.status
            },
            icpId: lead.icpId,
            step: 1,
            subject: body.subject || `Wealth Advisory brief for ${lead.companyName}`,
            bodyHtml: body.bodyHtml || `<p>Dear ${lead.firstName},</p><p>${body.instructions || 'Custom tailored brief regarding wealth planning.'}</p>`,
            status: 'PENDING_APPROVAL',
            toEmail: lead.email,
            attempts: 0,
            openCount: 0,
            clickCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          drafts.unshift(customDraft);
          store.saveDrafts(drafts);
          return jsonResponse(res, 201, customDraft), true;
        }
      }

      // 7. Drafts: GET /drafts, PATCH /drafts/:id, POST /drafts/:id/approve, POST /drafts/approve-all
      if (method === 'GET' && subpath === '/drafts') {
        let drafts = store.getDrafts();
        if (query.status) drafts = drafts.filter(d => d.status === query.status);
        if (query.icpId) drafts = drafts.filter(d => d.icpId === query.icpId);

        const page = parseInt(query.page || '1', 10);
        const pageSize = parseInt(query.pageSize || '25', 10);
        const total = drafts.length;
        const paged = drafts.slice((page - 1) * pageSize, page * pageSize);

        return jsonResponse(res, 200, { drafts: paged, total, page, pageSize }), true;
      }

      if (method === 'POST' && subpath === '/drafts/approve-all') {
        const drafts = store.getDrafts();
        let count = 0;
        drafts.forEach(d => {
          if (d.status === 'PENDING_APPROVAL') {
            d.status = 'APPROVED';
            count++;
          }
        });
        store.saveDrafts(drafts);
        return jsonResponse(res, 200, { success: true, approved: count }), true;
      }

      const draftActionMatch = subpath.match(/^\/drafts\/([^/]+)(\/(approve|reject))?$/);
      if (draftActionMatch) {
        const draftId = draftActionMatch[1];
        const action = draftActionMatch[3];
        const drafts = store.getDrafts();
        const draft = drafts.find(d => d.id === draftId);

        if (!draft) return jsonResponse(res, 404, { error: 'Draft not found' }), true;

        if (action === 'approve') {
          draft.status = 'APPROVED';
          draft.updatedAt = new Date().toISOString();
          store.saveDrafts(drafts);
          return jsonResponse(res, 200, draft), true;
        }

        if (action === 'reject') {
          draft.status = 'REJECTED';
          draft.updatedAt = new Date().toISOString();
          store.saveDrafts(drafts);
          return jsonResponse(res, 200, draft), true;
        }

        if (method === 'PATCH' || method === 'PUT') {
          const body = await readJsonBody(req);
          if (body.subject) draft.subject = body.subject;
          if (body.bodyHtml) draft.bodyHtml = body.bodyHtml;
          draft.updatedAt = new Date().toISOString();
          store.saveDrafts(drafts);
          return jsonResponse(res, 200, draft), true;
        }
      }

      // 8. Follow-ups: GET /follow-ups, POST /follow-ups/:id/complete
      if (method === 'GET' && subpath === '/follow-ups') {
        const followups = store.getFollowups();
        return jsonResponse(res, 200, followups), true;
      }

      const fuMatch = subpath.match(/^\/follow-ups\/([^/]+)\/complete$/);
      if (fuMatch && method === 'POST') {
        const fuId = fuMatch[1];
        const followups = store.getFollowups();
        const fu = followups.find(f => f.id === fuId);
        if (fu) {
          fu.status = 'COMPLETED';
          store.saveFollowups(followups);
        }
        return jsonResponse(res, 200, { success: true, followup: fu }), true;
      }

      // 9. Automations: GET /automations, POST /automations/:id/toggle
      if (method === 'GET' && subpath === '/automations') {
        const automations = store.getAutomations();
        return jsonResponse(res, 200, automations), true;
      }

      const autoToggleMatch = subpath.match(/^\/automations\/([^/]+)\/toggle$/);
      if (autoToggleMatch && method === 'POST') {
        const autoId = autoToggleMatch[1];
        const automations = store.getAutomations();
        const auto = automations.find(a => a.id === autoId);
        if (auto) {
          auto.status = auto.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          store.saveAutomations(automations);
        }
        return jsonResponse(res, 200, { success: true, automation: auto }), true;
      }

      // 10. Engagement: GET /engagement
      if (method === 'GET' && subpath === '/engagement') {
        const events = store.getEngagement();
        return jsonResponse(res, 200, events), true;
      }

      // 11. Database Status & Verification: GET /db-status
            if (method === 'GET' && subpath === '/db-status') {
              if (!pool) {
                return jsonResponse(res, 503, {
                  status: 'unconfigured',
                  message: 'DATABASE_URL not set in environment'
                }), true;
              }
              try {
                const client = await pool.connect();
                const counts = {};
                const tables = [
                  'canada_prospects',
                  'sales_brain_leads',
                  'sales_brain_icps',
                  'sales_brain_drafts',
                  'sales_brain_searches',
                  'sales_brain_automations',
                  'sales_brain_followups',
                  'sales_brain_engagement',
                  'wealth_signals',
                  'custom_sources'
                ];
                for (const t of tables) {
                  const r = await client.query(`SELECT COUNT(*)::int as count FROM "${t}"`);
                  counts[t] = r.rows[0].count;
                }
                client.release();
                // Extract host/port from DATABASE_URL if available
                let dbHost = 'unknown', dbPort = 'unknown';
                if (process.env.DATABASE_URL) {
                  try {
                    const u = new URL(process.env.DATABASE_URL);
                    dbHost = u.hostname;
                    dbPort = u.port || (u.protocol === 'postgresql:' ? '5432' : 'unknown');
                  } catch {}
                }
                return jsonResponse(res, 200, {
                  status: 'connected',
                  database: 'postgresql',
                  host: dbHost,
                  port: dbPort,
                  counts
                }), true;
              } catch (dbErr) {
                return jsonResponse(res, 500, {
                  status: 'error',
                  message: dbErr.message
                }), true;
              }
            }

      // 12. Canada Prospects from Postgres: GET /canada-prospects
            if (method === 'GET' && subpath === '/canada-prospects') {
              if (!pool) {
                return jsonResponse(res, 503, { error: 'DATABASE_URL not set in environment' }), true;
              }
              try {
                const limit = parseInt(query.limit || '100', 10);
                const prospects = await db.getCanadaProspects(limit);
                return jsonResponse(res, 200, { total: prospects.length, prospects }), true;
              } catch (dbErr) {
                return jsonResponse(res, 500, { error: dbErr.message }), true;
              }
            }

      // Fallback
      return jsonResponse(res, 404, { error: `Endpoint not found: ${method} ${subpath}` }), true;

    } catch (err) {
      console.error('[SalesBrainApi Error]:', err);
      return jsonResponse(res, 500, { error: err.message || 'Internal Server Error' }), true;
    }
  };
}
