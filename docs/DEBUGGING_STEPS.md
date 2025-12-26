# Debugging Train Validation - Step by Step

## Issue: AI not detecting/validating train numbers like "12345"

## Step 1: Test in Existing Chatbot Component

1. Open your RailMadad app
2. Open browser developer tools (F12) 
3. Go to Console tab
4. Type exactly `12345` in the chatbot input
5. Look for these debug messages in console:
   - `🔧 DEBUG: X function calls detected: ['validateTrain']`
   - `🚂 DEBUG: geminiValidateTrain called with input: "12345"`

**Expected Result**: You should see function calls being made

**If you DON'T see function calls**: The issue is with the system prompt or AI model configuration

## Step 2: Check System Prompt

The system prompt now includes these critical instructions:

```
**CRITICAL: ALWAYS VALIDATE NUMBERS FIRST**
- If user mentions ANY 4-5 digit number (like 12345, 54321, 12001), IMMEDIATELY call validateTrain() function

**INTELLIGENT STATION AND TRAIN VALIDATION (CRITICAL):**
- TRAIN NUMBERS: Look for 4-5 digit numbers (12001, 22691, 2615, 12345, etc.) - ALWAYS validate these!

- VALIDATION FUNCTIONS TO CALL (MANDATORY):
  * validateTrain() - MUST call for ANY 4-5 digit number (12001, 22691, 12345, 54321, etc.)

- DETECTION EXAMPLES (FOLLOW EXACTLY):
  * "12345" → Call validateTrain("12345") IMMEDIATELY
```

## Step 3: Test Different Inputs

Try these inputs one by one and note which ones trigger function calls:

1. `12345` (should trigger validateTrain)
2. `Train 12345` (should trigger validateTrain)  
3. `Problem with 12345` (should trigger validateTrain)
4. `NDLS` (should trigger validateStation)
5. `Mumbai` (should trigger validateStation)

## Step 4: Check API Response

If function calls are detected but not working:

1. Check if `geminiValidateStation/Train/PNR` functions are being called
2. Check if they return proper responses
3. Check if the follow-up response is sent back to AI

## Step 5: Model Comparison

The Chatbot component uses `gemini-1.5-flash` while some other functions use `gemini-2.5-flash`. 

**Current setup**: Both now use `gemini-1.5-flash` for consistency.

## Step 6: Manual Function Test

Test the validation functions directly in console:

```javascript
import { geminiValidateTrain } from './services/geminiService';

// Test the function directly
geminiValidateTrain("12345").then(result => {
  console.log("Direct validation result:", result);
});
```

## Step 7: System Prompt Test

Test if the system prompt is being applied:

1. Ask the AI: "What should you do when I say 12345?"
2. Expected response should mention calling validateTrain function

## Common Issues & Solutions

### Issue 1: No Function Calls Detected
**Cause**: System prompt not clear enough or model not configured for function calling
**Solution**: The system prompt has been updated with more explicit instructions

### Issue 2: Function Calls Detected But No Validation
**Cause**: Validation functions failing or not being called properly  
**Solution**: Check debug logs for validation function calls

### Issue 3: Validation Works But AI Doesn't Use Results
**Cause**: Follow-up response not being sent back to AI
**Solution**: Check if functionResults are being sent back to chat session

## Quick Fix Test

Add this temporary debug code to your Chatbot component's `handleSendMessage` function:

```javascript
// Add this right before sending message to AI
console.log("🔍 User message:", text);
console.log("🔍 Looking for 4-5 digit numbers:", text.match(/\b\d{4,5}\b/g));

// Add this right after getting response
console.log("🔍 Response function calls:", response.functionCalls?.length || 0);
```

This will help identify exactly where the issue is occurring.

## Expected Working Flow

1. User types "12345"
2. AI detects 4-5 digit number pattern
3. AI calls validateTrain("12345") function
4. Function returns validation result
5. AI incorporates result into response
6. User sees: "✅ Train found: [name]" or "❌ Train not found, suggestions: [list]"

If any step fails, that's where the issue is!