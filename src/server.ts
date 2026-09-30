import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import nodemailer from 'nodemailer';
import path from 'path';
import open from 'open';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/ai-sales-crm-n8n-db';

const N8N_URL =
  process.env.N8N_URL ||
  'http://127.0.0.1:5678';

const OLLAMA_URL =
  process.env.OLLAMA_URL ||
  'http://127.0.0.1:11434';

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ||
  'qwen3:8b';

const MAILPIT_URL =
  process.env.MAILPIT_URL ||
  'http://127.0.0.1:8025';

const MAILPIT_SMTP_HOST =
  process.env.MAILPIT_SMTP_HOST ||
  '127.0.0.1';

const MAILPIT_SMTP_PORT =
  Number(process.env.MAILPIT_SMTP_PORT || 1025);

// --------------------------------------------------
// Shopify
// --------------------------------------------------

const SHOPIFY_ENABLED =
  process.env.SHOPIFY_ENABLED === 'true';

const SHOPIFY_STORE =
  process.env.SHOPIFY_STORE ||
  '';

const SHOPIFY_WEBHOOK_URL =
  process.env.SHOPIFY_WEBHOOK_URL ||
  `${N8N_URL}/webhook/shopify-order-created`;

let mongoConnected = false;

// --------------------------------------------------
// MongoDB
// --------------------------------------------------

mongoose
  .connect(MONGODB_URI)
  .then(() => {

    mongoConnected = true;

    console.log('MongoDB connected');

    console.log(
      `MongoDB database: ${mongoose.connection.name}`
    );

  })
  .catch((error) => {

    mongoConnected = false;

    console.error(
      'MongoDB connection failed:',
      error.message
    );

  });

mongoose.connection.on(
  'connected',
  () => {

    mongoConnected = true;

  }
);

mongoose.connection.on(
  'disconnected',
  () => {

    mongoConnected = false;

  }
);

// --------------------------------------------------
// Dashboard
// --------------------------------------------------

app.get(
  '/',
  (_req, res) => {

    res.sendFile(
      path.join(
        process.cwd(),
        'public',
        'index.html'
      )
    );

  }
);

// --------------------------------------------------
// Health
// --------------------------------------------------

app.get(
  '/api/health',
  (_req, res) => {

    res.json({

      success: true,

      message:
        'AI Sales CRM backend is running',

      timestamp:
        new Date().toISOString()

    });

  }
);

// --------------------------------------------------
// Service Status
// --------------------------------------------------

app.get(
  '/api/status',
  async (_req, res) => {

    const status: any = {

      // ----------------------------------------------
      // Backend
      // ----------------------------------------------

      backend: {

        name:
          'Node.js + Express',

        status:
          'online',

        url:
          `http://localhost:${PORT}`,

        description:
          'Backend API server'

      },

      // ----------------------------------------------
      // Node.js
      // ----------------------------------------------

      node: {

        name:
          'Node.js',

        status:
          'online',

        version:
          process.version,

        description:
          'JavaScript runtime'

      },

      // ----------------------------------------------
      // MongoDB
      // ----------------------------------------------

      mongodb: {

        name:
          'MongoDB',

        status:
          mongoConnected
            ? 'online'
            : 'offline',

        url:
          'mongodb://127.0.0.1:27017',

        database:
          mongoose.connection.name ||
          'ai-sales-crm-n8n-db',

        description:
          'CRM database'

      },

      // ----------------------------------------------
      // n8n
      // ----------------------------------------------

      n8n: {

        name:
          'n8n',

        status:
          'offline',

        url:
          N8N_URL,

        description:
          'Workflow automation'

      },

      // ----------------------------------------------
      // n8n SQLite
      // ----------------------------------------------

      sqlite: {

        name:
          'n8n SQLite',

        status:
          'offline',

        database:
          'SQLite',

        description:
          'n8n internal database'

      },

      // ----------------------------------------------
      // Ollama
      // ----------------------------------------------

      ollama: {

        name:
          'Ollama',

        status:
          'offline',

        url:
          OLLAMA_URL,

        model:
          OLLAMA_MODEL,

        description:
          'Local AI runtime'

      },

      // ----------------------------------------------
      // Qwen3
      // ----------------------------------------------

      qwen3: {

        name:
          'Qwen3',

        status:
          'offline',

        model:
          OLLAMA_MODEL,

        description:
          'Local AI model'

      },

      // ----------------------------------------------
      // Mailpit
      // ----------------------------------------------

      mailpit: {

        name:
          'Mailpit',

        status:
          'offline',

        url:
          MAILPIT_URL,

        smtp:
          `${MAILPIT_SMTP_HOST}:${MAILPIT_SMTP_PORT}`,

        description:
          'Local email testing'

      },

      // ----------------------------------------------
      // n8n Webhook
      // ----------------------------------------------

      webhook: {

        name:
          'n8n Lead Webhook',

        status:
          'online',

        url:
          `${N8N_URL}/webhook/ai-sales-lead`,

        description:
          'Lead automation webhook'

      },

      // ----------------------------------------------
      // Shopify
      // ----------------------------------------------

      shopify: {

        name:
          'Shopify',

        status:
          SHOPIFY_ENABLED
            ? 'configured'
            : 'disabled',

        store:
          SHOPIFY_STORE || null,

        description:
          'Shopify e-commerce integration'

      },

      // ----------------------------------------------
      // Shopify Webhook
      // ----------------------------------------------

      shopifyWebhook: {

        name:
          'Shopify Order Webhook',

        status:
          SHOPIFY_ENABLED
            ? 'configured'
            : 'disabled',

        url:
          SHOPIFY_WEBHOOK_URL,

        description:
          'Shopify orders automation through n8n'

      },

      // ----------------------------------------------
      // AI Test
      // ----------------------------------------------

      aiTest: {

        name:
          'AI Generation Test',

        status:
          'offline',

        endpoint:
          '/api/ai/test',

        description:
          'Ollama AI generation'

      },

      // ----------------------------------------------
      // Email Test
      // ----------------------------------------------

      emailTest: {

        name:
          'Email Delivery Test',

        status:
          'offline',

        endpoint:
          '/api/email/test',

        description:
          'SMTP to Mailpit test'

      }

    };

    // ==================================================
    // n8n
    // ==================================================

    let n8nOnline = false;

    try {

      await axios.get(
        `${N8N_URL}/healthz`,
        {
          timeout: 1500
        }
      );

      n8nOnline = true;

    } catch {

      try {

        await axios.get(
          N8N_URL,
          {
            timeout: 1500
          }
        );

        n8nOnline = true;

      } catch {}

    }

    if (n8nOnline) {

      status.n8n.status =
        'online';

      status.sqlite.status =
        'online';

      status.sqlite.message =
        'n8n database initialized';

    }

    // ==================================================
    // Ollama
    // ==================================================

    let ollamaOnline = false;

    try {

      const response =
        await axios.get(
          `${OLLAMA_URL}/api/tags`,
          {
            timeout: 1500
          }
        );

      ollamaOnline = true;

      status.ollama.status =
        'online';

      const models =
        response.data?.models || [];

      status.ollama.models =
        models.map(
          (model: any) =>
            model.name
        );

      const qwen3Installed =
        models.some(
          (model: any) =>
            model.name === OLLAMA_MODEL ||
            model.name?.startsWith(
              `${OLLAMA_MODEL}:`
            )
        );

      status.ollama.qwen3Installed =
        qwen3Installed;

      status.qwen3.status =
        qwen3Installed
          ? 'online'
          : 'offline';

      status.qwen3.installed =
        qwen3Installed;

    } catch {

      status.ollama.status =
        'offline';

      status.qwen3.status =
        'offline';

      status.qwen3.installed =
        false;

    }

    // ==================================================
    // n8n Webhook
    // ==================================================

    if (n8nOnline) {

      status.webhook.status =
        'online';

    }

    // ==================================================
    // AI Test
    // ==================================================

    if (ollamaOnline) {

      status.aiTest.status =
        'online';

    }

    // ==================================================
    // Mailpit
    // ==================================================

    let mailpitOnline = false;

    try {

      await axios.get(
        `${MAILPIT_URL}/api/v1/messages`,
        {
          timeout: 1500
        }
      );

      mailpitOnline = true;

      status.mailpit.status =
        'online';

    } catch {

      status.mailpit.status =
        'offline';

    }

    // ==================================================
    // Email Test
    // ==================================================

    if (mailpitOnline) {

      status.emailTest.status =
        'online';

    }

    // ==================================================
    // Summary
    // ==================================================

    const services =
      Object.values(status);

    const onlineCount =
      services.filter(
        (service: any) =>
          service.status === 'online'
      ).length;

    res.json({

      success:
        true,

      timestamp:
        new Date().toISOString(),

      summary: {

        online:
          onlineCount,

        total:
          services.length

      },

      services:
        status

    });

  }
);

// --------------------------------------------------
// Lead Model
// --------------------------------------------------

const leadSchema =
  new mongoose.Schema(
    {

      name:
        String,

      company:
        String,

      email:
        String,

      phone:
        String,

      budget:
        Number,

      requirement:
        String,

      message:
        String,

      status: {

        type:
          String,

        default:
          'new'

      },

      source: {

        type:
          String,

        default:
          'website'

      }

    },
    {
      timestamps:
        true
    }
  );

const Lead =
  mongoose.model(
    'Lead',
    leadSchema
  );

// --------------------------------------------------
// Leads
// --------------------------------------------------

app.get(
  '/api/leads',
  async (_req, res) => {

    try {

      const leads =
        await Lead
          .find()
          .sort({
            createdAt:
              -1
          })
          .limit(100);

      res.json({

        success:
          true,

        count:
          leads.length,

        leads

      });

    } catch (error: any) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

app.post(
  '/api/leads',
  async (req, res) => {

    try {

      const lead =
        await Lead.create(
          req.body
        );

      res.status(201).json({

        success:
          true,

        lead

      });

    } catch (error: any) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

// --------------------------------------------------
// Get single lead
// --------------------------------------------------

app.get(
  '/api/leads/:id',
  async (req, res) => {

    try {

      const lead =
        await Lead.findById(
          req.params.id
        );

      if (!lead) {

        return res.status(404).json({

          success:
            false,

          error:
            'Lead not found'

        });

      }

      res.json({

        success:
          true,

        lead

      });

    } catch (error: any) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

// --------------------------------------------------
// Update lead
// --------------------------------------------------

app.put(
  '/api/leads/:id',
  async (req, res) => {

    try {

      const lead =
        await Lead.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new:
              true,

            runValidators:
              true
          }
        );

      if (!lead) {

        return res.status(404).json({

          success:
            false,

          error:
            'Lead not found'

        });

      }

      res.json({

        success:
          true,

        lead

      });

    } catch (error: any) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

// --------------------------------------------------
// Delete lead
// --------------------------------------------------

app.delete(
  '/api/leads/:id',
  async (req, res) => {

    try {

      const lead =
        await Lead.findByIdAndDelete(
          req.params.id
        );

      if (!lead) {

        return res.status(404).json({

          success:
            false,

          error:
            'Lead not found'

        });

      }

      res.json({

        success:
          true,

        message:
          'Lead deleted successfully'

      });

    } catch (error: any) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

// --------------------------------------------------
// AI Lead Qualification
// --------------------------------------------------

app.post(
  '/api/leads/:id/qualify',
  async (req, res) => {

    try {

      const lead =
        await Lead.findById(
          req.params.id
        );

      if (!lead) {

        return res.status(404).json({

          success:
            false,

          error:
            'Lead not found'

        });

      }

      const prompt = `
You are an AI sales qualification assistant.

Analyze the CRM lead below and determine its sales qualification.

Lead information:

Name: ${lead.name || 'Not provided'}
Company: ${lead.company || 'Not provided'}
Email: ${lead.email || 'Not provided'}
Phone: ${lead.phone || 'Not provided'}
Budget: ${lead.budget ?? 'Not provided'}
Requirement: ${lead.requirement || 'Not provided'}
Message: ${lead.message || 'Not provided'}
Source: ${lead.source || 'Not provided'}
Current Status: ${lead.status || 'Not provided'}

Evaluate:

1. Purchase intent
2. Budget clarity
3. Requirement clarity
4. Business need
5. Likelihood of becoming a customer

Return ONLY valid JSON.

Do not use markdown.
Do not use code fences.

Use exactly this structure:

{
  "qualification": "qualified",
  "score": 85,
  "reason": "Short explanation of why this lead received this score.",
  "recommendation": "Recommended next sales action."
}

Rules:

qualification must be exactly one of:

qualified
potential
unqualified

score must be an integer between 0 and 100.

Keep reason under 250 characters.

Keep recommendation under 250 characters.
`;

      const response =
        await axios.post(

          `${OLLAMA_URL}/api/generate`,

          {

            model:
              OLLAMA_MODEL,

            prompt,

            stream:
              false

          },

          {

            timeout:
              120000

          }

        );

      let aiText =
        response.data?.response ||
        '';

      aiText =
        aiText
          .replace(
            /^```json\s*/i,
            ''
          )
          .replace(
            /^```\s*/i,
            ''
          )
          .replace(
            /\s*```$/i,
            ''
          )
          .trim();

      let result;

      try {

        result =
          JSON.parse(
            aiText
          );

      } catch {

        console.error(
          'Invalid AI qualification JSON:',
          aiText
        );

        return res.status(500).json({

          success:
            false,

          error:
            'AI returned an invalid qualification response.',

          rawResponse:
            aiText

        });

      }

      const qualificationValues = [

        'qualified',

        'potential',

        'unqualified'

      ];

      const qualification =
        qualificationValues.includes(
          result.qualification
        )
          ? result.qualification
          : 'potential';

      let score =
        Number(
          result.score
        );

      if (
        !Number.isFinite(
          score
        )
      ) {

        score =
          0;

      }

      score =
        Math.max(
          0,
          Math.min(
            100,
            Math.round(
              score
            )
          )
        );

      res.json({

        success:
          true,

        qualification,

        score,

        reason:
          result.reason ||
          'No reason provided.',

        recommendation:
          result.recommendation ||
          'Review the lead manually.',

        model:
          OLLAMA_MODEL

      });

    } catch (error: any) {

      console.error(
        'AI qualification error:',
        error.message
      );

      res.status(500).json({

        success:
          false,

        error:
          error.response?.data ||
          error.message ||
          'AI qualification failed.'

      });

    }

  }
);

// --------------------------------------------------
// Shopify Order Model
// --------------------------------------------------

const shopifyOrderSchema =
  new mongoose.Schema(
    {

      shopifyOrderId: {

        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true

      },

      orderNumber:
        String,

      customer: {

        id:
          String,

        name:
          String,

        email:
          String,

        phone:
          String

      },

      totalPrice:
        Number,

      currency:
        String,

      financialStatus:
        String,

      fulfillmentStatus:
        String,

      lineItems: [

        {

          title:
            String,

          quantity:
            Number,

          price:
            Number,

          productId:
            String,

          variantId:
            String

        }

      ],

      aiAnalysis: {

        qualification:
          String,

        score:
          Number,

        reason:
          String,

        recommendation:
          String

      },

      source: {

        type:
          String,

        default:
          'shopify'

      }

    },
    {

      timestamps:
        true

    }
  );

const ShopifyOrder =
  mongoose.model(
    'ShopifyOrder',
    shopifyOrderSchema
  );

// --------------------------------------------------
// Shopify Orders
// --------------------------------------------------

// Receive normalized Shopify order from n8n

app.post(
  '/api/shopify/orders',
  async (req, res) => {

    try {

      const order =
        req.body;

      const shopifyOrderId =
        String(
          order.shopifyOrderId ||
          order.id ||
          ''
        );

      if (!shopifyOrderId) {

        return res.status(400).json({

          success:
            false,

          error:
            'Shopify order ID is required'

        });

      }

      const savedOrder =
        await ShopifyOrder.findOneAndUpdate(

          {
            shopifyOrderId
          },

          {

            shopifyOrderId,

            orderNumber:
              order.orderNumber,

            customer: {

              id:
                order.customer?.id,

              name:
                order.customer?.name,

              email:
                order.customer?.email,

              phone:
                order.customer?.phone

            },

            totalPrice:
              Number(
                order.totalPrice ||
                0
              ),

            currency:
              order.currency,

            financialStatus:
              order.financialStatus,

            fulfillmentStatus:
              order.fulfillmentStatus,

            lineItems:
              order.lineItems ||
              [],

            source:
              'shopify'

          },

          {

            new:
              true,

            upsert:
              true,

            runValidators:
              true

          }

        );

      res.status(201).json({

        success:
          true,

        message:
          'Shopify order saved successfully',

        order:
          savedOrder

      });

    } catch (error: any) {

      console.error(
        'Shopify order error:',
        error.message
      );

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

// --------------------------------------------------
// Get Shopify Orders
// --------------------------------------------------

app.get(
  '/api/shopify/orders',
  async (_req, res) => {

    try {

      const orders =
        await ShopifyOrder
          .find()
          .sort({
            createdAt:
              -1
          })
          .limit(100);

      res.json({

        success:
          true,

        count:
          orders.length,

        orders

      });

    } catch (error: any) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

// --------------------------------------------------
// Get Shopify Order
// --------------------------------------------------

app.get(
  '/api/shopify/orders/:id',
  async (req, res) => {

    try {

      const order =
        await ShopifyOrder.findById(
          req.params.id
        );

      if (!order) {

        return res.status(404).json({

          success:
            false,

          error:
            'Shopify order not found'

        });

      }

      res.json({

        success:
          true,

        order

      });

    } catch (error: any) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

// --------------------------------------------------
// Delete Shopify Order
// --------------------------------------------------

app.delete(
  '/api/shopify/orders/:id',
  async (req, res) => {

    try {

      const order =
        await ShopifyOrder.findByIdAndDelete(
          req.params.id
        );

      if (!order) {

        return res.status(404).json({

          success:
            false,

          error:
            'Shopify order not found'

        });

      }

      res.json({

        success:
          true,

        message:
          'Shopify order deleted successfully'

      });

    } catch (error: any) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

// --------------------------------------------------
// Shopify Order AI Analysis
// --------------------------------------------------

app.post(
  '/api/shopify/orders/:id/analyze',
  async (req, res) => {

    try {

      const order =
        await ShopifyOrder.findById(
          req.params.id
        );

      if (!order) {

        return res.status(404).json({

          success:
            false,

          error:
            'Shopify order not found'

        });

      }

      const items =
        order.lineItems
          .map(
            (item: any) =>
              `${item.title} x${item.quantity} - ${item.price}`
          )
          .join('\n');

      const prompt = `
You are an AI e-commerce sales assistant.

Analyze this Shopify order.

Customer:
Name: ${order.customer?.name || 'Not provided'}
Email: ${order.customer?.email || 'Not provided'}
Phone: ${order.customer?.phone || 'Not provided'}

Order:
Order Number: ${order.orderNumber || 'Not provided'}
Total: ${order.totalPrice || 0} ${order.currency || ''}
Financial Status: ${order.financialStatus || 'Not provided'}
Fulfillment Status: ${order.fulfillmentStatus || 'Not provided'}

Products:
${items || 'No products provided'}

Determine:

1. Customer value
2. Purchase intent
3. Potential sales opportunity
4. Recommended follow-up action

Return ONLY valid JSON.

Do not use markdown.
Do not use code fences.

Use exactly:

{
  "qualification": "qualified",
  "score": 85,
  "reason": "Short explanation.",
  "recommendation": "Recommended sales action."
}

qualification must be exactly:

qualified
potential
unqualified

score must be an integer between 0 and 100.

Keep reason under 250 characters.

Keep recommendation under 250 characters.
`;

      const response =
        await axios.post(

          `${OLLAMA_URL}/api/generate`,

          {

            model:
              OLLAMA_MODEL,

            prompt,

            stream:
              false,

            think:
              false,

            options: {

              num_predict:
                250,

              temperature:
                0.2

            }

          },

          {

            timeout:
              120000

          }

        );

      let aiText =
        response.data?.response ||
        '';

      aiText =
        aiText
          .replace(
            /^```json\s*/i,
            ''
          )
          .replace(
            /^```\s*/i,
            ''
          )
          .replace(
            /\s*```$/i,
            ''
          )
          .trim();

      let result;

      try {

        result =
          JSON.parse(
            aiText
          );

      } catch {

        console.error(
          'Invalid Shopify AI response:',
          aiText
        );

        return res.status(500).json({

          success:
            false,

          error:
            'AI returned invalid JSON.',

          rawResponse:
            aiText

        });

      }

      const qualificationValues = [

        'qualified',

        'potential',

        'unqualified'

      ];

      const qualification =
        qualificationValues.includes(
          result.qualification
        )
          ? result.qualification
          : 'potential';

      let score =
        Number(
          result.score
        );

      if (
        !Number.isFinite(
          score
        )
      ) {

        score =
          0;

      }

      score =
        Math.max(
          0,
          Math.min(
            100,
            Math.round(
              score
            )
          )
        );

      order.aiAnalysis = {

        qualification,

        score,

        reason:
          result.reason ||
          'No reason provided.',

        recommendation:
          result.recommendation ||
          'Review the order manually.'

      };

      await order.save();

      res.json({

        success:
          true,

        orderId:
          order._id,

        qualification,

        score,

        reason:
          order.aiAnalysis.reason,

        recommendation:
          order.aiAnalysis.recommendation,

        model:
          OLLAMA_MODEL

      });

    } catch (error: any) {

      console.error(
        'Shopify AI analysis error:',
        error.message
      );

      res.status(500).json({

        success:
          false,

        error:
          error.response?.data ||
          error.message ||
          'Shopify AI analysis failed.'

      });

    }

  }
);

// --------------------------------------------------
// Ollama AI Test
// --------------------------------------------------

app.post(
  '/api/ai/test',
  async (req, res) => {

    try {

      const prompt =
        req.body?.prompt ||
        'Give me one short sales qualification question.';

      const response =
        await axios.post(

          `${OLLAMA_URL}/api/generate`,

          {

            model:
              OLLAMA_MODEL,

            prompt,

            stream:
              false,

            think:
              false,

            options: {

              num_predict:
                150,

              temperature:
                0.2

            }

          },

          {

            timeout:
              30000

          }

        );

      res.json({

        success:
          true,

        model:
          OLLAMA_MODEL,

        response:
          response.data?.response ||
          'No response returned.'

      });

    } catch (error: any) {

      console.error(
        'AI test error:',
        error.response?.data ||
        error.message
      );

      res.status(500).json({

        success:
          false,

        error:
          error.response?.data ||
          error.message ||
          'AI test failed.'

      });

    }

  }
);

// --------------------------------------------------
// n8n Lead
// --------------------------------------------------

app.post(
  '/api/n8n/lead',
  async (req, res) => {

    try {

      const leadPayload = {
        ...req.body
      };

      // Make sure _id is a valid MongoDB ObjectId
      if (
        !leadPayload._id ||
        !/^[a-fA-F0-9]{24}$/.test(
          String(leadPayload._id)
        )
      ) {

        return res.status(400).json({

          success:
            false,

          error:
            '_id must be a valid 24-character MongoDB ObjectId'

        });

      }

      const response =
        await axios.post(

          `${N8N_URL}/webhook/ai-sales-lead`,

          leadPayload,

          {
            timeout:
              30000
          }

        );

      res.json({

        success:
          true,

        leadPayload,

        n8n:
          response.data

      });

    } catch (error: any) {

      console.error(
        'n8n workflow error:',
        error.response?.data ||
        error.message
      );

      res.status(502).json({

        success:
          false,

        error:
          error.response?.data ||
          error.message

      });

    }

  }
);

// --------------------------------------------------
// n8n Shopify
// --------------------------------------------------

app.post(
  '/api/n8n/shopify',
  async (req, res) => {
    try {
      const order = req.body || {};
      const customer = order.customer || {};

      // ----------------------------------------------
      // Customer
      // ----------------------------------------------

      const firstName =
        customer.first_name || '';

      const lastName =
        customer.last_name || '';

      const name =
        `${firstName} ${lastName}`.trim() ||
        customer.email ||
        order.email ||
        'Shopify Customer';

      const email =
        customer.email ||
        order.email ||
        '';

      const phone =
        customer.phone ||
        order.phone ||
        '';

      // ----------------------------------------------
      // Order total
      // ----------------------------------------------

      const budget =
        Number(order.total_price || 0);

      // ----------------------------------------------
      // Products
      // ----------------------------------------------

      const products =
        Array.isArray(order.line_items)
          ? order.line_items
              .map(
                (item: any) =>
                  `${item.title || 'Product'} x${item.quantity || 1}`
              )
              .join(', ')
          : '';

      // ----------------------------------------------
      // Shopify order information
      // ----------------------------------------------

      const shopifyOrderId =
        String(
          order.id ||
          ''
        );

      const orderNumber =
        order.order_number ||
        order.id ||
        'N/A';

      const requirement =
        `Shopify order #${orderNumber}. ` +
        `Products: ${products || 'N/A'}. ` +
        `Order total: ${budget} ${order.currency || ''}.`;

      // ----------------------------------------------
      // Create Lead in MongoDB
      //
      // IMPORTANT:
      // Do NOT use Shopify order.id as _id.
      // Mongoose/MongoDB will generate a valid ObjectId.
      // ----------------------------------------------

      const lead = await Lead.create({
        name,

        company:
          customer.default_address?.company ||
          'Shopify Customer',

        email,

        phone,

        budget,

        status:
          'new',

        requirement,

        source:
          'shopify'
      });

      // ----------------------------------------------
      // Build payload for EXISTING n8n workflow
      // ----------------------------------------------

      const leadPayload = {
        _id:
          lead._id.toString(),

        name:
          lead.name,

        company:
          lead.company,

        email:
          lead.email,

        phone:
          lead.phone,

        budget:
          lead.budget,

        status:
          lead.status,

        requirement
      };

      // ----------------------------------------------
      // Debug
      // ----------------------------------------------

      console.log(
        '\n========== SHOPIFY → MONGODB → N8N =========='
      );

      console.log(
        'Shopify Order ID:',
        shopifyOrderId
      );

      console.log(
        'MongoDB Lead ID:',
        lead._id.toString()
      );

      console.log(
        JSON.stringify(
          leadPayload,
          null,
          2
        )
      );

      console.log(
        'Webhook:',
        SHOPIFY_WEBHOOK_URL
      );

      console.log(
        '==============================================\n'
      );

      // ----------------------------------------------
      // Send to EXISTING n8n workflow
      // ----------------------------------------------

      const response =
        await axios.post(
          SHOPIFY_WEBHOOK_URL,
          leadPayload,
          {
            timeout: 30000
          }
        );

      // ----------------------------------------------
      // Response
      // ----------------------------------------------

      res.json({
        success:
          true,

        message:
          'Shopify order created as lead and sent to n8n',

        shopifyOrderId,

        leadId:
          lead._id.toString(),

        leadPayload,

        n8n:
          response.data
      });

    } catch (error: any) {

      console.error(
        'Shopify → Lead → n8n error:',
        error.response?.data ||
        error.message
      );

      res.status(502).json({
        success:
          false,

        error:
          error.response?.data ||
          error.message ||
          'Shopify order processing failed.'
      });
    }
  }
);


// --------------------------------------------------
// Mailpit Test
// --------------------------------------------------

app.post(
  '/api/email/test',
  async (req, res) => {

    try {

      const transporter =
        nodemailer.createTransport({

          host:
            MAILPIT_SMTP_HOST,

          port:
            MAILPIT_SMTP_PORT,

          secure:
            false

        });

      await transporter.sendMail({

        from:
          'crm@ai-sales-crm.local',

        to:
          req.body?.to ||
          'demo@example.com',

        subject:
          req.body?.subject ||
          'AI Sales CRM Test Email',

        text:
          req.body?.text ||
          'This is a test email from AI Sales CRM.'

      });

      res.json({

        success:
          true,

        message:
          'Email sent to Mailpit',

        mailpit:
          MAILPIT_URL

      });

    } catch (error: any) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);

// --------------------------------------------------
// Start
// --------------------------------------------------

app.listen(
  PORT,
  async () => {

    console.log('');

    console.log(
      '===================================='
    );

    console.log(
      ' AI SALES CRM BACKEND'
    );

    console.log(
      '===================================='
    );

    console.log(
      ` Dashboard: http://localhost:${PORT}`
    );

    console.log(
      ` API:       http://localhost:${PORT}/api`
    );

    console.log(
      ` MongoDB:   ${MONGODB_URI}`
    );

    console.log(
      ` n8n:       ${N8N_URL}`
    );

    console.log(
      ` Ollama:    ${OLLAMA_URL}`
    );

    console.log(
      ` Mailpit:   ${MAILPIT_URL}`
    );

    console.log(
      ` Shopify:   ${
        SHOPIFY_ENABLED
          ? SHOPIFY_STORE || 'enabled'
          : 'disabled'
      }`
    );

    console.log(
      '===================================='
    );

    console.log('');

    await open(
      `http://localhost:${PORT}`
    );

  }
);