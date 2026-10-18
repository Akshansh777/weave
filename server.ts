import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // 1. Parse uploaded Resume PDF / Document into structured CandidateResume
  app.post('/api/ai/parse-resume', async (req, res) => {
    try {
      const { fileName, fileSize, base64Data, mimeType, extractedText } = req.body;
      const ai = getGenAIClient();

      if (!ai) {
        res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
        return;
      }

      const parts: any[] = [];
      if (base64Data && mimeType === 'application/pdf') {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data,
          },
        });
      }

      const promptText = `Extract structured candidate profile details from this resume (${fileName || 'resume.pdf'}).
${extractedText ? `Extracted document text:\n${extractedText.slice(0, 12000)}` : ''}
Return a JSON object containing name, email, cgpa, branch, gradYear, backlogs, skills, projects, and experienceSummary.`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              email: { type: Type.STRING },
              cgpa: { type: Type.NUMBER },
              branch: { type: Type.STRING },
              gradYear: { type: Type.INTEGER },
              backlogs: { type: Type.INTEGER },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              projects: { type: Type.ARRAY, items: { type: Type.STRING } },
              experienceSummary: { type: Type.STRING },
            },
            required: ['name', 'email', 'cgpa', 'branch', 'gradYear', 'backlogs', 'skills', 'projects', 'experienceSummary'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        fileName: fileName || 'Resume.pdf',
        fileSize: fileSize || '180 KB',
        uploadedAt: 'Just now',
        ...parsed,
      });
    } catch (error: any) {
      console.error('Error in /api/ai/parse-resume:', error);
      res.status(500).json({ error: error?.message || 'Failed to parse resume' });
    }
  });

  // 2. AI-Driven Eligibility Engine for Opportunities Tracker
  app.post('/api/ai/evaluate-eligibility', async (req, res) => {
    try {
      const { resume, opportunity } = req.body;
      const ai = getGenAIClient();

      if (!ai) {
        res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
        return;
      }

      const prompt = `Compare the candidate's uploaded resume against the target opportunity and generate a personalized eligibility report.
CANDIDATE: ${resume.name}, Branch: ${resume.branch}, CGPA: ${resume.cgpa}, Skills: ${(resume.skills || []).join(', ')}
OPPORTUNITY: ${opportunity.title} at ${opportunity.company}, Required Skills: ${(opportunity.requiredSkills || []).join(', ')}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isEligible: { type: Type.BOOLEAN },
              score: { type: Type.INTEGER },
              verdictHeadline: { type: Type.STRING },
              personalizedReport: { type: Type.STRING },
              matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              skillGaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    actionStep: { type: Type.STRING },
                  },
                  required: ['skill', 'severity', 'reason', 'actionStep'],
                },
              },
              whyNotEligible: { type: Type.ARRAY, items: { type: Type.STRING } },
              howToQualify: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['isEligible', 'score', 'verdictHeadline', 'personalizedReport', 'matchedSkills', 'skillGaps', 'whyNotEligible', 'howToQualify'],
          },
        },
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to evaluate eligibility' });
    }
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WEAVE Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
