// src/services/geminiService.js
const { GoogleGenAI } = require("@google/genai");

// Инициализируем клиент (убедись, что переменная GEMINI_API_KEY есть в .env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Анализирует симптомы пользователя с помощью модели Gemini
 * @param {string} symptomsText - Текст с симптомами от пользователя
 * @returns {Promise<string>} - Ответ от ИИ
 */
async function analyzeSymptoms(symptomsText) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Ты — поддерживающий медицинский ассистент в боте для трекинга женского цикла. 
Пользователь зафиксировал симптомы: "${symptomsText}".
Дай краткий (до 3-4 предложений), бережный и научно обоснованный комментарий. 
Напиши, нормально ли это для текущей фазы (если применимо), и напомни, что при сильной боли нужно обратиться к врачу. 
Не ставь диагнозы. Отвечай дружелюбно, строго на русском языке.`,
    });

    return response.text || "Спасибо, я записал твои симптомы! Будь здорова.";
  } catch (error) {
    console.error("Ошибка при запросе к Gemini API:", error);
    // Фолбэк-ответ на случай, если API недоступно или ключ отвалился
    return "Я бережно сохранил твои симптомы в дневник. Если тебя что-то сильно беспокоит, обязательно проконсультируйся с врачом!";
  }
}

module.exports = {
  analyzeSymptoms,
};
