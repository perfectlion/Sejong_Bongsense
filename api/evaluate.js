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
      console.error("Vercel Error: GEMINI_API_KEY 환경변수가 없습니다.");
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const GEMINI_MODEL = "gemini-3.1-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    const systemInstructionText = `
You are a Korean phonetics teacher for Japanese learners.
Compare target Korean sentence with student spoken text.
Analyze phonological rules (연음법칙, 구개음화, 경음화, 비음화 등) and identify pronunciation mistakes.

ALWAYS output valid JSON format ONLY in this exact structure without markdown backticks:
{
  "is_correct": true,
  "accuracy_score": 85,
  "feedback_ja": "素晴らしいです！正確に発音できています。",
  "pronunciation_guide": "[예약하셔대요]"
}
    `;

    const userPromptText = `Target Korean Sentence: "${target || ''}"\nRecognized Student Text: "${spoken || ''}"`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPromptText }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const rawData = await response.json();

    // Gemini API 자체에서 에러를 반환했는지 검사
    if (!response.ok) {
      console.error("Gemini API Error Detail:", JSON.stringify(rawData));
      return res.status(500).json({ 
        error: 'Gemini API 호출에 실패했습니다.', 
        details: rawData.error?.message || 'Unknown API Error' 
      });
    }

    // Gemini 응답 텍스트 추출
    const responseText = rawData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("Gemini API Empty Response:", JSON.stringify(rawData));
      return res.status(500).json({ error: 'Gemini로부터 응답 텍스트를 받지 못했습니다.' });
    }

    // 마크다운 ```json 래핑 제거 및 안전한 JSON 파싱
    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultJson = JSON.parse(cleanJsonText);

    return res.status(200).json(resultJson);

  } catch (err) {
    console.error("Vercel Serverless Internal Error:", err);
    return res.status(500).json({ 
      error: '발음 평가 처리 중 서버 내부 오류가 발생했습니다.',
      message: err.message 
    });
  }
}
