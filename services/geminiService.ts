
import { Order, DriverBlock } from "../types";

const API_BASE = 'http://localhost:3001/api/ai';

/**
 * Simulates AI analysis of a logistics block to provide optimization feedback.
 * NOW SECURE: Calls backend proxy.
 */
export const analyzeBlockEfficiency = async (block: DriverBlock, orders: Order[]) => {
  try {
    const response = await fetch(`${API_BASE}/analyze-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block, orders })
    });

    if (!response.ok) throw new Error("Backend AI service error");
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("AI Optimization failed", error);
    return "AI Optimization currently unavailable.";
  }
};

/**
 * Generate a daily operational summary for the Admin dashboard.
 * NOW SECURE: Calls backend proxy.
 */
export const generateDailyOpsReport = async (blocks: DriverBlock[]) => {
    try {
        const response = await fetch(`${API_BASE}/ops-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });
    
        if (!response.ok) throw new Error("Backend AI service error");
        const data = await response.json();
        return data.text;
      } catch (error) {
        return "Daily operations status: Normal volume detected (Backend connection failed).";
      }
};

/**
 * Generate an intelligent response for support tickets.
 * NOW SECURE: Calls backend proxy.
 */
export const generateSupportSuggestion = async (issueType: string, userRole: string) => {
  try {
    const response = await fetch(`${API_BASE}/support-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueType, userRole })
    });

    if (!response.ok) throw new Error("Backend AI service error");
    const data = await response.json();
    return data.text;
  } catch (error) {
    return "Suggest contacting the user directly to resolve the discrepancy.";
  }
};
