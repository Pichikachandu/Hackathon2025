// Google Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyAhGR0uuKbxZ9YjaKXq0yEYWulVQjD84dw';
const MODEL_NAME = 'gemini-2.5-flash';

// Initialize the Google AI client
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Helper function to call Gemini API
async function queryGemini(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

export const generateInsights = async (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('Invalid or empty data provided for insights');
    return 'No task data available to generate insights.';
  }

  try {
    const prompt = `Analyze the following task data and provide key insights and trends. 
    Focus on completion rates, common issues, and team performance. Be concise and data-driven.
    Here's the data: ${JSON.stringify(data, null, 2)}
    
    Provide the response in markdown format with appropriate headings.`;

    return await queryGemini(prompt);
  } catch (error) {
    console.error('Error in generateInsights:', error);
    return 'Failed to generate insights. Please try again later.';
  }
};

export const answerQuery = async (question, context) => {
  if (!question) {
    console.error('No question provided');
    return 'Please provide a question.';
  }

  try {
    const prompt = `You are a helpful assistant analyzing task management data. 
    Answer the following question based on the provided data. If you don't know the answer, say so.
    
    Question: ${question}
    
    Data Context: ${JSON.stringify(context || {}, null, 2)}
    
    Provide a clear, concise response.`;

    return await queryGemini(prompt);
  } catch (error) {
    console.error('Error in answerQuery:', error);
    return 'Sorry, I encountered an error processing your request.';
  }
};
