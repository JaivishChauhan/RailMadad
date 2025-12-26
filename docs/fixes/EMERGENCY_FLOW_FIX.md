# Emergency Response Flow Fix - Two-Stage Process

## Issue Identified

The emergency response was being triggered immediately during complaint **preparation** instead of only after complaint **submission**. This caused emergency contact numbers and emergency buttons to appear prematurely when the user was just trying to report an incident.

### Problem:
```
Input: "robbery on train 12345"
Current Output: Shows emergency numbers and buttons immediately
Expected Output: Prepare complaint first, then show emergency contacts after confirmation
```

## Solution Implemented

### Two-Stage Emergency Response Process

#### **Stage 1: Complaint Preparation** (Initial Response)
When emergency keywords are detected, the system now:
1. Acknowledges the emergency seriously
2. Prepares a complaint summary with available information  
3. Asks for confirmation to submit
4. **Does NOT show emergency contact numbers**
5. **Does NOT show emergency buttons**

**Example Stage 1 Response:**
```
This is a serious security/safety issue, and I will help you report it immediately.

I am preparing your complaint. Here is what I have:
- **Issue:** Security/Safety
- **Location:** On Train 12345
- **Time:** Just now (current time will be logged)
- **PNR:** 1234567890

Please reply 'CONFIRM' to submit this report to the Railway Protection Force (RPF) immediately. If anything is incorrect, please let me know.
```

#### **Stage 2: Post-Confirmation** (After User Confirms)
Only after user replies 'CONFIRM', 'YES', or similar:
1. Submit the complaint to authorities
2. **Then** show emergency response with contacts
3. Display emergency buttons for immediate calling

**Example Stage 2 Response:**
```
🚨 EMERGENCY_RESPONSE_NEEDED 🚨

Your emergency complaint has been submitted to railway authorities. Please follow these immediate steps:

**IMMEDIATE ACTION:**
• Call the appropriate emergency service using the buttons below
• Stay in a safe location if possible
• Provide your exact location details when ready

**EMERGENCY CONTACTS:**
📞 Railway Helpline: 139
📞 Railway Protection Force: 182
📞 Medical Emergency: 108
📞 Police Emergency: 100

Your complaint has been escalated to the appropriate authorities for immediate attention.
```

## Code Changes Made

### 1. **Updated System Prompt**
- Modified emergency response protocol to be two-stage
- Added clear separation between preparation and post-confirmation phases
- Added critical rule about when to show emergency contacts

### 2. **Enhanced Emergency Handler**
```typescript
const handleEmergencyResponse = async (userMessage, conversationHistory, additionalContext) => {
    // Check if this is a confirmation message
    const isConfirmation = /^(confirm|yes|y|ok|proceed|submit)$/i.test(userMessage.trim());
    
    if (isConfirmation) {
        // Stage 2: Show emergency contacts after confirmation
        return emergencyResponseWithContacts();
    }
    
    // Stage 1: Complaint preparation without emergency contacts
    return complaintPreparationResponse();
}
```

### 3. **Added Confirmation Detection**
```typescript
const isEmergencyConfirmation = /^(confirm|yes|y|ok|proceed|submit)$/i.test(userMessage.trim()) && 
    conversationHistory.some(msg => 
        msg.role === 'model' && 
        msg.parts.some(part => 
            part.text.toLowerCase().includes('emergency') ||
            part.text.toLowerCase().includes('robbery') ||
            // ... other emergency keywords
        )
    );
```

### 4. **Enhanced Location Extraction**
```typescript
const extractLocationFromMessage = (message: string): string => {
    // Extract train numbers, coach info, station details
    // Provides structured location information for complaint preparation
}
```

## Expected User Flow

### Scenario: User reports robbery
1. **User**: "robbery on train 12345 coach s5"
2. **Bot**: Prepares complaint summary, asks for confirmation (no emergency numbers shown)
3. **User**: "CONFIRM"  
4. **Bot**: Shows emergency response with contact numbers and buttons

### Scenario: User reports medical emergency
1. **User**: "medical emergency help"
2. **Bot**: Prepares complaint, asks for confirmation (no emergency numbers shown)
3. **User**: "yes"
4. **Bot**: Shows emergency response with medical emergency contacts

## Key Benefits

✅ **Proper Flow**: Emergency contacts only shown after complaint submission
✅ **User Control**: User must confirm before escalating to emergency response
✅ **Clear Process**: Two distinct stages make the process clearer
✅ **Compliance**: Follows proper complaint submission before emergency escalation
✅ **Flexibility**: User can still modify complaint details before confirmation

## Testing Checklist

- [ ] Emergency keywords trigger complaint preparation (no contacts shown)
- [ ] "CONFIRM" triggers emergency response with contacts  
- [ ] "YES" triggers emergency response with contacts
- [ ] Non-emergency complaints work normally
- [ ] Location extraction works for train/coach/station details
- [ ] Emergency buttons only appear after confirmation

---

**Status**: ✅ **FIXED** - Emergency response now follows proper two-stage process
**Date**: 2025-01-03
**Version**: 2.0.0