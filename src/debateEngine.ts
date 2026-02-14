export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DebateTurn {
  speaker: 'Moderator' | 'Caesar' | 'Washington';
  text: string;
}

// Function to call our local Nemotron models
export async function fetchAIResponse(modelName: string, messageHistory: ChatMessage[]): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: messageHistory,
        stream: false
      })
    });

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error("Failed to fetch from Ollama:", error);
    return "Error: Could not connect to local AI.";
  }
}

// NEW: Function to trigger the victory speech
export async function fetchVictorySpeech(winner: 'Caesar' | 'Washington', topic: string): Promise<string> {
  const modelName = winner.toLowerCase();

  const prompt = winner === 'Caesar'
    ? `The debate over "${topic}" has concluded. The crowd has declared you the absolute winner over George Washington. Give a highly arrogant, pompous, and snarky 1-sentence victory remark.`
    : `The debate over "${topic}" has concluded. The crowd has declared you the winner over Julius Caesar. Give a humble but slightly smug 1-sentence victory remark about how tyranny always falls to democracy.`;

  return await fetchAIResponse(modelName, [{ role: 'user', content: prompt }]);
}