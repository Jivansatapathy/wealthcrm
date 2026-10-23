import React, { useState } from 'react';
import { WEALTH_DATA } from '../data/wealthData';
import { Bot, Send, Download, Sparkles, FileText, ShieldAlert, Award } from 'lucide-react';

export default function AdvisorCopilotView({ showToast }) {
  const [messages, setMessages] = useState([
    {
      sender: "assistant",
      text: "Hello Catherine. I have analyzed your 64 active prospects and 84 intent signals detected this month across Scotiabank's network.\n\nTop recommendation today: Marcus Vance (ABC Advanced Mfg) has an immediate 7-day window following an $18.5M asset purchase closing. Commercial account received $14.2M wire.\n\nHow can I assist you right now?"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState(null);

  const handleSendPrompt = (prompt) => {
    if (!prompt.trim()) return;

    const userMsg = { sender: "user", text: prompt };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");

    // Simulate AI thinking and response
    setTimeout(() => {
      let aiReply = "";
      let docContent = null;

      if (prompt.includes("Marcus Vance")) {
        aiReply = "I have compiled the comprehensive pre-meeting briefing for Marcus Vance, addressing the $18.5M asset transaction, commercial banking coordination with Geoff Reynolds, and corporate class tax shielding. See the generated document on the right.";
        docContent = (
          <pre style={{ fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap' }}>
            {WEALTH_DATA.copilotTemplates.meetingBrief(WEALTH_DATA.intentLeads[0])}
          </pre>
        );
      } else if (prompt.includes("Tax Drag")) {
        aiReply = "Calculated tax liability: Leaving $14.2M in corporate reserves without holding company reorganization results in 50.17% passive corporate investment tax in Ontario. See full analysis in the right pane.";
        docContent = (
          <div>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '12px' }}>
              Corporate Tax Drag Analysis: $14.2M Liquid Operating Surplus
            </h3>
            <p><strong>Jurisdiction:</strong> Ontario, Canada | Combined Federal/Provincial Tax Rate</p>
            <ul style={{ margin: '12px 0 16px 20px', lineHeight: '1.7' }}>
              <li><strong>Passive Investment Income Rate:</strong> 50.17% (54.67% on foreign income)</li>
              <li><strong>Annual Tax Penalty on 6% Return ($852,000):</strong> $427,448 lost to tax drag annually without wealth structuring</li>
              <li><strong>Small Business Deduction Grind:</strong> Passive income exceeds $50,000, reducing SBD limit to $0</li>
            </ul>
            <h4 style={{ color: '#34D399', marginTop: '16px' }}>Proposed ScotiaMcLeod & Scotiatrust Shield:</h4>
            <p style={{ marginTop: '4px' }}>
              Implement Section 85 rollover into Vance Global Holdings Inc. (HoldCo), establish an Inter Vivos Family Trust, and utilize Tax-Advantaged Corporate Class investment pools + Private Debt instruments.
            </p>
          </div>
        );
      } else if (prompt.includes("CIRO")) {
        aiReply = "CIRO Suitability checklist generated for discretionary management mandate. Ready for compliance audit.";
        docContent = (
          <div>
            <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '12px' }}>
              CIRO Suitability & Client Identification Checklist
            </h3>
            <p><strong>Regulatory Regime:</strong> Canadian Investment Regulatory Organization (CIRO) Rule 3200 & OSFI B-13</p>
            <ol style={{ margin: '12px 0 16px 20px', lineHeight: '1.8' }}>
              <li><strong>Know Your Client (KYC):</strong> Investment horizon (10+ years), Risk capacity (High), Risk willingness (Moderate Balanced).</li>
              <li><strong>Beneficial Ownership:</strong> Identify all individuals holding 25%+ equity in corporate holding structures.</li>
              <li><strong>Conflict of Interest Disclosure:</strong> Banking division referral disclosure provided to client in writing.</li>
              <li><strong>Discretionary Authorization:</strong> Investment Policy Statement (IPS) signed by Marcus Vance & Elena Vance.</li>
            </ol>
          </div>
        );
      } else {
        aiReply = "I have analyzed your inquiry and generated a tailored advisory document. You can review the draft on the right.";
        docContent = (
          <pre style={{ fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap' }}>
            {WEALTH_DATA.copilotTemplates.outreachEmail(WEALTH_DATA.intentLeads[0])}
          </pre>
        );
      }

      setMessages(prev => [...prev, { sender: "assistant", text: aiReply }]);
      setGeneratedDoc(docContent);
    }, 600);
  };

  const quickPrompts = [
    { label: "📄 Marcus Vance Meeting Brief", prompt: "Generate Executive Meeting Brief for Marcus Vance ($12.5M Mandate)" },
    { label: "📊 Explain Tax Drag on $14M Surplus", prompt: "Explain Capital Gains Tax Drag on Corporate Operating Reserves in Ontario" },
    { label: "🛡️ CIRO Suitability Checklist", prompt: "Run CIRO Suitability and KYC Checklist for Tech Founder Liquidity Mandate" },
    { label: "🩺 MD Financial Physician Outreach", prompt: "Draft Private Banking Warm Outreach to Dr. Aris Thorne (MD Financial)" }
  ];

  return (
    <div className="copilot-workspace-grid">
      {/* Chat Panel */}
      <div className="copilot-panel">
        <div className="copilot-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={22} className="text-indigo-400" />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#FFFFFF', fontSize: '1.05rem' }}>
                VGT Wealth Advisor Copilot
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Trained on Canadian Banking Wealth Workflows, CIRO Suitability & Tax Optimization
              </div>
            </div>
          </div>
          <span className="compliance-status-tag">
            <span className="pulse-dot"></span> Online
          </span>
        </div>

        {/* Chat History */}
        <div className="copilot-chat-history">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.sender}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
            </div>
          ))}
        </div>

        {/* Quick Action Prompts */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0' }}>
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              className="btn btn-secondary btn-sm"
              onClick={() => handleSendPrompt(q.prompt)}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Prompt Input */}
        <div className="copilot-prompt-bar">
          <input
            type="text"
            className="copilot-input"
            placeholder="Ask AI Copilot to draft briefs, research prospects, or verify suitability..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendPrompt(inputText);
            }}
          />
          <button className="btn btn-primary" onClick={() => handleSendPrompt(inputText)}>
            <Send size={15} /> Send
          </button>
        </div>
      </div>

      {/* Generated Document Panel */}
      <div className="copilot-panel">
        <div className="copilot-panel-header">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#FFFFFF', fontSize: '1.05rem' }}>
            Generated Advisory Document & Briefing
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => showToast("Briefing exported as PDF / Scotia Advisory Memo format.", "success")}
          >
            <Download size={14} /> Export Document
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px', fontSize: '0.85rem', lineHeight: 1.6, color: '#E2E8F0' }}>
          {generatedDoc || (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '120px' }}>
              <Sparkles size={36} className="text-indigo-400" style={{ margin: '0 auto 12px auto' }} />
              <div>Click a quick prompt on the left or type an inquiry to generate instant meeting briefs, talking points, and tax models.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
