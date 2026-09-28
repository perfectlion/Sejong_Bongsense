// api/evaluate.js
export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { target, spoken } = req.body;

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const GEMINI_MODEL = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    // AI Studio에서 작성하신 System Prompt를 반영
    const systemPrompt = `
You are the AI Backend Engine for a Korean language learning web application tailored specifically for native Japanese speakers.
Your primary responsibility is Speech-to-Text & Pronunciation Evaluation.

Input: Target Korean Sentence and Recognized Student Text.
Compare the student's text with the target sentence.
Analyze common phonological rules (연음법칙, 구개음화, 경음화, 비음화 등) and identify specific pronunciation mistakes.

ALWAYS output valid JSON format ONLY in this exact structure without markdown backticks:
{
  "is_correct": true,
  "accuracy_score": 85,
  "feedback_ja": "素晴らしいです！'예약하셔야'の連音化[예약하셔대요]も正確に発音できています。",
  "pronunciation_guide": "[예약하셔대요]"
}
    `;

    const userPrompt = `Target Korean Sentence: "${target}"\nRecognized Student Text: "${spoken}"`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        // JSON 응답 보장 설정
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const rawData = await response.json();
    
    // Gemini 응답 텍스트 추출
    const responseText = rawData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // 마크다운 ```json 래핑 제거 및 JSON 파싱
    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultJson = JSON.parse(cleanJsonText);

    return res.status(200).json(resultJson);

  } catch (err) {
    console.error("Vercel Proxy Error:", err);
    return res.status(500).json({ 
      error: '발음 평가 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
}
