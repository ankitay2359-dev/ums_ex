import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Google GenAI SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Shop details
const SHOP_NAME = process.env.SHOP_NAME || 'Shree Ganesh Kirana & General Store';
const SHOP_PHONE = process.env.SHOP_PHONE || '+91 98765 43210';

// Helper to call Gemini with automatic model fallback on 429 rate limit
async function callGeminiSafe(prompt: string, systemInstruction?: string, model: string = 'gemini-3.8-flash'): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('NO_API_KEY');
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    return response.text || '';
  } catch (err: any) {
    const errMsg = (err?.message || '') + ' ' + JSON.stringify(err);
    const isRateLimit = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('Quota');

    if (isRateLimit && model !== 'gemini-3.1-flash-lite') {
      console.warn('Rate limit hit on gemini-3.8-flash, falling back to gemini-3.1-flash-lite...');
      const response2 = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });
      return response2.text || '';
    }
    throw err;
  }
}

// Smart local fallback resolver when API quota is exhausted
function generateLocalAnswer(message: string, shopData: any): string {
  const query = (message || '').toLowerCase();
  const customers = shopData?.customers || [];
  const totals = shopData?.totals || { totalUdhaar: 0, totalPaid: 0, totalRemaining: 0, overdueCount: 0, pendingCount: 0 };

  // 1. Highest pending balance query
  if (query.includes('highest') || query.includes('most') || query.includes('maximum')) {
    const sorted = [...customers].sort((a: any, b: any) => (b.remainingBalance || 0) - (a.remainingBalance || 0));
    const top = sorted[0];
    if (top) {
      return `Based on your live records, the customer with the highest pending balance is **${top.name} (Customer ID #${top.id})** with an outstanding balance of **₹${(top.remainingBalance || 0).toLocaleString('en-IN')}**.\n\n` +
        `• Total Udhaar Taken: ₹${(top.totalUdhaar || 0).toLocaleString('en-IN')}\n` +
        `• Total Payments Made: ₹${(top.totalPaid || 0).toLocaleString('en-IN')}\n` +
        `• Mobile: ${top.mobile || 'N/A'}`;
    }
  }

  // 2. Overdue accounts query
  if (query.includes('overdue') || query.includes('due date') || query.includes('expired')) {
    const overdueList = customers.filter((c: any) => (c.remainingBalance || 0) > 0 && c.status === 'Overdue');
    if (overdueList.length > 0) {
      const items = overdueList.map((c: any) => `• **${c.name} (#${c.id})**: ₹${(c.remainingBalance || 0).toLocaleString('en-IN')} (Due: ${c.latestDue || 'Past due'})`).join('\n');
      return `The following accounts currently have overdue balances:\n\n${items}\n\nTotal overdue accounts: **${overdueList.length}** customer(s).`;
    }
    return `Great news! Currently, none of your customers are past their promised payment due dates.`;
  }

  // 3. Search multiple customers with same name (e.g. 'Ankita')
  if (query.includes('ankita')) {
    const ankitas = customers.filter((c: any) => (c.name || '').toLowerCase().includes('ankita'));
    if (ankitas.length > 0) {
      const items = ankitas.map((c: any) =>
        `• **Customer ID #${c.id} - ${c.name}**\n  Mobile: ${c.mobile || 'N/A'} | Address: ${c.address || 'N/A'}\n  Total Udhaar: ₹${(c.totalUdhaar || 0).toLocaleString('en-IN')} | Total Paid: ₹${(c.totalPaid || 0).toLocaleString('en-IN')} | **Remaining Balance: ₹${(c.remainingBalance || 0).toLocaleString('en-IN')}**`
      ).join('\n\n');
      return `Found **${ankitas.length} separate customers** named "Ankita" in your database:\n\n${items}\n\n*Note: Each customer has their own distinct Customer ID and ledger.*`;
    }
  }

  // 4. Specific customer query (e.g., 'Rahul', 'Vikram', 'Sunita', or Customer ID #)
  const idMatch = query.match(/(?:customer|id|#)\s*(\d+)/);
  let matchedCust = null;
  if (idMatch) {
    const cid = parseInt(idMatch[1], 10);
    matchedCust = customers.find((c: any) => c.id === cid);
  }
  if (!matchedCust) {
    for (const c of customers) {
      if (query.includes((c.name || '').toLowerCase())) {
        matchedCust = c;
        break;
      }
    }
  }

  if (matchedCust) {
    const rem = matchedCust.remainingBalance || 0;
    const isOver = rem > 0;
    return `**Customer Summary for ${matchedCust.name} (ID #${matchedCust.id})**:\n\n` +
      `• **Remaining Balance:** ₹${rem.toLocaleString('en-IN')} ${isOver ? '(Pending)' : '(Fully Settled ✓)'}\n` +
      `• **Total Udhaar Given:** ₹${(matchedCust.totalUdhaar || 0).toLocaleString('en-IN')}\n` +
      `• **Total Paid:** ₹${(matchedCust.totalPaid || 0).toLocaleString('en-IN')}\n` +
      `• **Contact:** ${matchedCust.mobile || 'No mobile registered'}\n` +
      `• **Address:** ${matchedCust.address || 'No address'}\n\n` +
      (isOver ? `You can send a polite payment reminder or record an incoming payment from the ledger page.` : `This account is completely settled.`);
  }

  // 5. Payment reminder drafting query
  if (query.includes('reminder') || query.includes('remind') || query.includes('draft')) {
    const firstPending = customers.find((c: any) => (c.remainingBalance || 0) > 0) || customers[0];
    if (firstPending) {
      return `Here is a polite payment reminder message:\n\n` +
        `"Hello ${firstPending.name}, this is a gentle reminder from ${SHOP_NAME} regarding your outstanding balance of ₹${(firstPending.remainingBalance || 0).toLocaleString('en-IN')}. Kindly make the payment at your convenience. For any queries, contact us at ${SHOP_PHONE}. Thank you!"`;
    }
  }

  // 6. Overall shop totals / financial inquiry
  return `**Shop Ledger Overview (${SHOP_NAME})**:\n\n` +
    `• **Total Customers:** ${customers.length}\n` +
    `• **Total Udhaar Issued:** ₹${(totals.totalUdhaar || 0).toLocaleString('en-IN')}\n` +
    `• **Total Payments Recovered:** ₹${(totals.totalPaid || 0).toLocaleString('en-IN')}\n` +
    `• **Net Outstanding Market Balance:** ₹${(totals.totalRemaining || 0).toLocaleString('en-IN')}\n` +
    `• **Pending Accounts:** ${totals.pendingCount || 0} (${totals.overdueCount || 0} overdue)\n\n` +
    `Ask me about any specific customer by name (e.g., *"How much does Rahul Gupta owe?"*) or by ID to view details!`;
}

// Safe AI Chat Endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { message, shopData } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const systemInstruction = `You are the intelligent AI Shop Assistant for '${SHOP_NAME}'.
Your role is to assist the shopkeeper with customer credit (Udhaar), payments, and balances.
CRITICAL RULES:
1. Strictly use ONLY the actual database data provided below. NEVER invent or hallucinate customer balances or payments.
2. Note that multiple customers can have the same name (e.g. multiple 'Ankita'); always distinguish them using their unique Customer ID and phone number.
3. You must NEVER execute or suggest destructive commands (DROP, DELETE, TRUNCATE, ALTER). Any deletion must be done manually by the shopkeeper.
4. Format currency in Indian Rupees (₹) with commas.
5. Be concise, polite, and helpful.

CURRENT SHOP DATA:
${JSON.stringify(shopData || {}, null, 2)}
`;

  try {
    const reply = await callGeminiSafe(message, systemInstruction, 'gemini-3.8-flash');
    res.json({ reply });
  } catch (error: any) {
    console.warn('Gemini chat encountered error / rate-limit. Using live database resolver:', error?.message || error);
    // Graceful smart local resolution from actual shopData
    const fallbackReply = generateLocalAnswer(message, shopData);
    res.json({ reply: fallbackReply });
  }
});

// AI Customer Summary Endpoint
app.post('/api/ai/customer-summary', async (req: Request, res: Response) => {
  const { customer } = req.body;
  if (!customer) {
    return res.status(400).json({ error: 'Customer data required' });
  }

  const fallbackSummary = `Customer #${customer.id} (${customer.name}) has an outstanding balance of ₹${(customer.remainingBalance || 0).toLocaleString('en-IN')}. They have taken ₹${(customer.totalUdhaar || 0).toLocaleString('en-IN')} in total credit and made ₹${(customer.totalPaid || 0).toLocaleString('en-IN')} in payments. Account status: ${customer.remainingBalance > 0 ? 'Pending Payment' : 'Fully Settled'}.`;

  const prompt = `Generate a concise 3-sentence financial summary for the shop owner regarding:
Customer ID: #${customer.id}
Name: ${customer.name}
Total Credit: ₹${customer.totalUdhaar}
Total Payments: ₹${customer.totalPaid}
Remaining Balance: ₹${customer.remainingBalance}
Transactions: ${JSON.stringify(customer.udhaarList || [])}
Payments: ${JSON.stringify(customer.paymentList || [])}

Highlight payment discipline, current outstanding status, and whether their account is settled or pending.`;

  try {
    const summary = await callGeminiSafe(prompt, 'You are a financial advisor for a retail store.');
    res.json({ summary: summary || fallbackSummary });
  } catch (error: any) {
    console.warn('Gemini summary error/rate-limit, using fallback summary:', error?.message);
    res.json({ summary: fallbackSummary });
  }
});

// AI Reminder Generator Endpoint
app.post('/api/ai/generate-reminder', async (req: Request, res: Response) => {
  const { customer, tone } = req.body;
  if (!customer) {
    return res.status(400).json({ error: 'Customer data required' });
  }

  const fallbackReminder = `Hello ${customer.name}, this is a friendly reminder from ${SHOP_NAME} that your current outstanding Udhaar balance is ₹${(customer.remainingBalance || 0).toLocaleString('en-IN')}. Please settle the payment at your convenience. For any queries, contact ${SHOP_PHONE}. Thank you!`;

  const prompt = `Draft a ${tone || 'polite'} WhatsApp/SMS reminder message in English from '${SHOP_NAME}' to customer '${customer.name}' (Customer ID #${customer.id}) for an outstanding balance of ₹${customer.remainingBalance}. Include shop contact: ${SHOP_PHONE}. Do not leave placeholders.`;

  try {
    const message = await callGeminiSafe(prompt, 'You are a polite retail shop communication assistant.');
    res.json({ message: message || fallbackReminder });
  } catch (error: any) {
    console.warn('Gemini reminder error/rate-limit, using fallback reminder:', error?.message);
    res.json({ message: fallbackReminder });
  }
});

// AI Financial Insights Endpoint
app.post('/api/ai/financial-insights', async (req: Request, res: Response) => {
  const { metrics } = req.body || {};
  const recoveryRate = Math.round(((metrics?.totalPaid || 0) / (metrics?.totalUdhaar || 1)) * 100);
  const fallbackInsights = `• **1. Credit Recovery Rate**: Your shop has recovered **${recoveryRate}%** of issued credit.\n` +
    `• **2. Overdue Risk Exposure**: There are **${metrics?.overdueCount || 0}** accounts past promised due dates totaling **₹${(metrics?.totalRemaining || 0).toLocaleString('en-IN')}** uncollected.\n` +
    `• **3. Cash Flow Health**: Regular instalments via UPI and Cash provide steady working capital.\n` +
    `• **4. Recommended Action**: Send gentle WhatsApp reminders to pending customers with outstanding credit over ₹1,000.`;

  const prompt = `Provide 4 crisp actionable business insights for '${SHOP_NAME}' based on:
Total Customers: ${metrics?.totalCustomers}
Total Udhaar: ₹${metrics?.totalUdhaar}
Total Paid: ₹${metrics?.totalPaid}
Total Remaining: ₹${metrics?.totalRemaining}
Overdue Count: ${metrics?.overdueCount}
Pending Count: ${metrics?.pendingCount}

Format as 4 crisp bullet points with titles:
1. Credit Recovery Rate
2. Overdue Risk Exposure
3. Cash Flow Health
4. Immediate Recommended Action`;

  try {
    const insights = await callGeminiSafe(prompt, 'You are a retail business analyst specializing in Indian kirana store finances.');
    res.json({ insights: insights || fallbackInsights });
  } catch (error: any) {
    console.warn('Gemini insights error/rate-limit, using fallback insights:', error?.message);
    res.json({ insights: fallbackInsights });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Udhaar Server listening on port ${PORT}`);
  });
}

startServer();
