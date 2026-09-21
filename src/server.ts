import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import nodemailer from 'nodemailer';
import path from 'path';

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

mongoose.connection.on('connected', () => {
mongoConnected = true;
});

mongoose.connection.on('disconnected', () => {
mongoConnected = false;
});

// --------------------------------------------------
// Dashboard
// --------------------------------------------------

app.get('/', (_req, res) => {
res.sendFile(
path.join(
process.cwd(),
'public',
'index.html'
)
);
});

// --------------------------------------------------
// Health
// --------------------------------------------------

app.get('/api/health', (_req, res) => {
res.json({
success: true,
message: 'AI Sales CRM backend is running',
timestamp: new Date().toISOString()
});
});

// --------------------------------------------------
// Service Status
// --------------------------------------------------

app.get('/api/status', async (_req, res) => {

const status: any = {

// ----------------------------------------------
// Backend
// ----------------------------------------------

backend: {
  name: 'Node.js + Express',
  status: 'online',
  url: `http://localhost:${PORT}`,
  description: 'Backend API server'
},

// ----------------------------------------------
// Node.js
// ----------------------------------------------

node: {
  name: 'Node.js',
  status: 'online',
  version: process.version,
  description: 'JavaScript runtime'
},

// ----------------------------------------------
// MongoDB
// ----------------------------------------------

mongodb: {
  name: 'MongoDB',
  status: mongoConnected
    ? 'online'
    : 'offline',
  url: 'mongodb://127.0.0.1:27017',
  database:
    mongoose.connection.name ||
    'ai-sales-crm-n8n-db',
  description: 'CRM database'
},

// ----------------------------------------------
// n8n
// ----------------------------------------------

n8n: {
  name: 'n8n',
  status: 'offline',
  url: N8N_URL,
  description: 'Workflow automation'
},

// ----------------------------------------------
// n8n SQLite
// ----------------------------------------------

sqlite: {
  name: 'n8n SQLite',
  status: 'offline',
  database: 'SQLite',
  description: 'n8n internal database'
},

// ----------------------------------------------
// Ollama
// ----------------------------------------------

ollama: {
  name: 'Ollama',
  status: 'offline',
  url: OLLAMA_URL,
  model: OLLAMA_MODEL,
  description: 'Local AI runtime'
},

// ----------------------------------------------
// Qwen3
// ----------------------------------------------

qwen3: {
  name: 'Qwen3',
  status: 'offline',
  model: OLLAMA_MODEL,
  description: 'Local AI model'
},

// ----------------------------------------------
// Mailpit
// ----------------------------------------------

mailpit: {
  name: 'Mailpit',
  status: 'offline',
  url: MAILPIT_URL,
  smtp:
    `${MAILPIT_SMTP_HOST}:${MAILPIT_SMTP_PORT}`,
  description: 'Local email testing'
},

// ----------------------------------------------
// n8n Webhook
// ----------------------------------------------

webhook: {
  name: 'n8n Lead Webhook',
  status: 'offline',
  url:
    `${N8N_URL}/webhook-test/ai-sales-lead`,
  description: 'Lead automation webhook'
},

// ----------------------------------------------
// AI Test
// ----------------------------------------------

aiTest: {
  name: 'AI Generation Test',
  status: 'offline',
  endpoint:
    '/api/ai/test',
  description: 'Ollama AI generation'
},

// ----------------------------------------------
// Email Test
// ----------------------------------------------

emailTest: {
  name: 'Email Delivery Test',
  status: 'offline',
  endpoint:
    '/api/email/test',
  description: 'SMTP to Mailpit test'
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

status.n8n.status = 'online';

/*
 * SQLite is n8n's internal database.
 * If n8n is running successfully, its database
 * connection has already been initialized.
 */
status.sqlite.status = 'online';
status.sqlite.message =
  'n8n database initialized';

}

// ==================================================
// Ollama
// ==================================================

let ollamaOnline = false;

try {

const response = await axios.get(
  `${OLLAMA_URL}/api/tags`,
  {
    timeout: 1500
  }
);

ollamaOnline = true;

status.ollama.status = 'online';

const models =
  response.data?.models || [];

status.ollama.models =
  models.map(
    (model: any) => model.name
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

// ----------------------------------------------
// Qwen3
// ----------------------------------------------

status.qwen3.status =
  qwen3Installed
    ? 'online'
    : 'offline';

status.qwen3.installed =
  qwen3Installed;

} catch {

status.ollama.status = 'offline';

status.qwen3.status = 'offline';
status.qwen3.installed = false;

}

// ==================================================
// n8n Webhook
// ==================================================

if (n8nOnline) {

status.webhook.status = 'online';

}

// ==================================================
// AI Test
// ==================================================

if (ollamaOnline) {

status.aiTest.status = 'online';

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

status.mailpit.status = 'online';

} catch {

status.mailpit.status = 'offline';

}

// ==================================================
// Email Test
// ==================================================

if (mailpitOnline) {

status.emailTest.status = 'online';

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

success: true,

timestamp:
  new Date().toISOString(),

summary: {

  online:
    onlineCount,

  total:
    services.length

},

services: status

});

});

// --------------------------------------------------
// Lead Model
// --------------------------------------------------

const leadSchema =
new mongoose.Schema(
{
name: String,

  company: String,

  email: String,

  phone: String,

  budget: Number,

  requirement: String,

  message: String,

  status: {
    type: String,
    default: 'new'
  },

  source: {
    type: String,
    default: 'website'
  }
},
{
  timestamps: true
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
        createdAt: -1
      })
      .limit(100);

  res.json({

    success: true,

    count:
      leads.length,

    leads

  });

} catch (error: any) {

  res.status(500).json({

    success: false,

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

    success: true,

    lead

  });

} catch (error: any) {

  res.status(500).json({

    success: false,

    error:
      error.message

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
          false
      },

      {
        timeout:
          120000
      }

    );

  res.json({

    success:
      true,

    model:
      OLLAMA_MODEL,

    response:
      response.data.response

  });

} catch (error: any) {

  res.status(500).json({

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
// n8n
// --------------------------------------------------

app.post(
'/api/n8n/lead',
async (req, res) => {

try {

  const response =
    await axios.post(

      `${N8N_URL}/webhook-test/ai-sales-lead`,

      req.body,

      {
        timeout:
          30000
      }

    );

  res.json({

    success:
      true,

    n8n:
      response.data

  });

} catch (error: any) {

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
() => {

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
  '===================================='
);

console.log('');

}
);
