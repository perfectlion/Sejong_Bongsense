// api/evaluate.js
export default async function handler(req, res) {
  // CORS 설정 (내 웹사이트에서만 호출 허용)
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

    // Vercel 환경 변수에서 숨겨진 API 키를 가져옵니다.
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const GEMINI_MODEL = "gemini-1.5-flash"; // 최신 안정한 모델명
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    const promptText = `
You are a Korean phonetics teacher for Japanese learners.
Compare target: "${target}" with student spoken: "${spoken}".

Respond ONLY with valid JSON in this exact structure without markdown backticks:
{
  "score": "95%",
  "evaluation": "발음 피드백 (일본어/한국어 혼용)"
}
    `;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("Vercel Proxy Error:", err);
    return res.status(500).json({ error: '발음 평가 중 오류가 발생했습니다.' });
  }
}