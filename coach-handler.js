/**
 * backend/ai/coach-handler.js (Node / Express / Edge Function)
 * Enforces student data protection, prompt confinement, and non-authoring AI output.
 */

const SYSTEM_PEDAGOGY_PROMPT = `
You are the BuildForMyKids Writing Gym Coach.
Your mission is to make children better writers by teaching them to THINK like writers.

STRICT OPERATIONAL RULES:
1. NEVER rewrite the sentence or paragraph for the student.
2. NEVER say "Here is a better version..." or provide completed text.
3. Identify exactly ONE concrete strength.
4. Point out ONE specific opportunity for growth (e.g., repeating a word, vague verb, missing evidence).
5. End with a single open-ended guiding question or a mini-challenge.
6. Match tone strictly to the student's grade:
   - Grade 3: Warm, clear, concrete, friendly.
   - Grade 7: Respectful, analytical, focused on logical cohesion and voice.
7. Keep responses under 60 words.
`;

export async function handleCoachingRequest(req, res) {
  const { grade, studentWriting, exerciseType } = req.body;

  // Reject empty submissions
  if (!studentWriting || studentWriting.trim().length < 3) {
    return res.status(400).json({ error: "Empty writing sample." });
  }

  const promptMessages = [
    { role: "system", content: SYSTEM_PEDAGOGY_PROMPT },
    {
      role: "user",
      content: `Grade: ${grade}\nExercise: ${exerciseType}\nStudent's Draft:\n"${studentWriting}"\nProvide targeted coaching feedback:`
    }
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AI_COACH_API_KEY}` // Protected server credential
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: promptMessages,
        max_tokens: 200,
        temperature: 0.7
      })
    });

    const data = await response.json();
    const coachResponse = data.choices[0].message.content;

    return res.status(200).json({ coachResponse });
  } catch (err) {
    return res.status(500).json({ error: "Upstream AI service unavailable." });
  }
}