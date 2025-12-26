# Future Implementations for RailMadad

## Role-Based Chatbot Implementation

This document outlines a detailed plan for implementing a role-based chatbot system in the RailMadad application, allowing different behaviors for administrators and passengers.

### 1. System Prompts Differentiation

#### 1.1 Create Role-Specific Prompts in geminiService.ts

```typescript
// Base prompt remains for shared functionality
export const RAILMADAD_CHAT_SYSTEM_PROMPT = `...existing base prompt...`;

// Passenger-specific system prompt
export const PASSENGER_CHAT_SYSTEM_PROMPT = `${RAILMADAD_CHAT_SYSTEM_PROMPT}
You are speaking to a passenger using the RailMadad system. Focus on:
1. Helping them submit complaints with all required details
2. Assisting with checking complaint status
3. Providing information about railway services and facilities
4. Using simpler, more customer-oriented language
5. Guiding through the complaint submission process step-by-step
6. Offering reassurance about the complaint handling process

Remember that passengers need clear guidance and might not be familiar with railway 
department structure or technical terminology. Be patient and user-friendly.`;

// Admin-specific system prompt
export const ADMIN_CHAT_SYSTEM_PROMPT = `${RAILMADAD_CHAT_SYSTEM_PROMPT}
You are speaking to a railway official/administrator. Focus on:
1. Providing insights about complaint trends and patterns
2. Suggesting administrative actions based on complaint analysis
3. Helping with complaint categorization and prioritization
4. Using more technical and administrative terminology
5. Offering statistical observations about complaints when relevant
6. Providing summaries that would be useful for management decisions

As an admin assistant, you can reference internal railway department structures and processes.
Admins are looking for efficient, precise information to help them manage complaints effectively.`;
```

### 2. Chatbot Component Modifications

#### 2.1 Update ChatbotProps Interface

```typescript
interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: Role; // Add role parameter
  userName?: string; // Optional: personalize greetings
}
```

#### 2.2 Modify Initialization Logic

```typescript
const Chatbot: React.FC<ChatbotProps> = ({ 
  isOpen, 
  onClose, 
  userRole = Role.PASSENGER, // Default to passenger experience
  userName 
}) => {
  // ...existing state variables
  
  // Add a state to track role-specific UI elements
  const [isAdminMode, setIsAdminMode] = useState(userRole === Role.OFFICIAL);
  
  // Initialize chat session with role-specific behavior
  useEffect(() => {
    if (isOpen && !chatSessionRef.current) {
      try {
        // Safely access the API key, checking if `process` is defined.
        const apiKey = typeof process !== 'undefined' ? process.env?.API_KEY : undefined;
        if (!apiKey) {
          console.error("API_KEY environment variable not set. Chatbot will be disabled.");
          setMessages([{ id: Date.now(), text: "Configuration error: API Key is missing. I am unable to connect.", isUser: false }]);
          return;
        }

        const ai = new GoogleGenAI({ apiKey });
        // Compute current date/time in IST for reliable defaults
        const now = new Date();
        const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
        const istTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
        
        // Choose appropriate system prompt based on user role
        const roleBasedPrompt = userRole === Role.OFFICIAL 
          ? ADMIN_CHAT_SYSTEM_PROMPT 
          : PASSENGER_CHAT_SYSTEM_PROMPT;
          
        const systemInstruction = `${roleBasedPrompt}\n\nCurrent context for defaults:\n- Current IST date: ${istDate}\n- Current IST time: ${istTime}`;

        chatSessionRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: { systemInstruction },
        });

        // Role-specific welcome message
        const welcomeMessage = getWelcomeMessage(userRole, userName);
        setMessages([{ id: Date.now(), text: welcomeMessage, isUser: false }]);
      } catch (error) {
        console.error("Failed to initialize AI Chat:", error);
        setMessages([{ id: Date.now(), text: "Sorry, I couldn't initialize our chat session. Please try again later.", isUser: false }]);
      }
    }
  }, [isOpen, userRole, userName]); // Include new dependencies

  // Helper function for role-specific welcome messages
  const getWelcomeMessage = (role: Role, name?: string) => {
    const greeting = name ? `Hello ${name}!` : "Hello!";
    
    if (role === Role.OFFICIAL) {
      return `${greeting} I am the RailMadad Administrative Assistant. I can help you analyze complaints, identify trends, and suggest actions for complaint management.`;
    }
    
    return `${greeting} I am the RailMadad Bot. How can I assist you with your railway complaint today?`;
  };
  
  // ...rest of component implementation
```

#### 2.3 Customize UI Based on Role

```typescript
// In the return/render section of the Chatbot component

return (
  <>
    <div
      className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} z-50`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chatbot-title"
    >
      <div className="h-full flex flex-col">
        <header className={`flex justify-between items-center p-4 ${isAdminMode ? 'bg-amber-600' : 'bg-primary'} text-primary-foreground`}>
          <img src="/favicon/RMLogo.png" alt="RailMadad Logo" className="h-12" />
          <h2 id="chatbot-title" className="text-xl font-bold">
            {isAdminMode ? 'RailMadad Admin Assistant' : 'RailMadad Bot'}
          </h2>
          <button onClick={onClose} className="hover:opacity-90" aria-label="Close chat">
            <X className="h-6 w-6" />
          </button>
        </header>

        {/* Admin-specific toolbar (only visible in admin mode) */}
        {isAdminMode && (
          <div className="bg-amber-100 p-2 flex gap-2 justify-end">
            <button 
              className="text-xs px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded-md text-amber-800"
              onClick={() => handleSendMessage("Show complaint trends for this month")}
            >
              Trends
            </button>
            <button 
              className="text-xs px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded-md text-amber-800"
              onClick={() => handleSendMessage("Summarize urgent complaints")}
            >
              Urgent Issues
            </button>
            <button 
              className="text-xs px-2 py-1 bg-amber-200 hover:bg-amber-300 rounded-md text-amber-800"
              onClick={() => handleSendMessage("Generate complaint statistics")}
            >
              Statistics
            </button>
          </div>
        )}

        {/* Rest of the existing UI */}
        <main ref={chatMessagesRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-background">
          {/* Message bubbles with role-specific styling */}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              {!msg.isUser && (
                <div className={`w-8 h-8 rounded-full ${isAdminMode ? 'bg-amber-500' : 'bg-primary'} text-primary-foreground flex items-center justify-center flex-shrink-0`}>
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.isUser 
                  ? 'bg-primary text-primary-foreground' 
                  : isAdminMode
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-secondary text-secondary-foreground'
              }`}>
                {/* Existing message content rendering */}
                {msg.isTypingIndicator ? (
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                ) : (
                  <p dangerouslySetInnerHTML={parseMarkdown(msg.text)} />
                )}
              </div>
              {msg.isUser && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </main>
        
        {/* Rest of the UI components */}
        {/* ... */}
      </div>
    </div>
    
    {/* Existing modals */}
    {/* ... */}
  </>
);
```

### 3. Integration with Application

#### 3.1 Update HomePage.tsx to Pass User Role

```typescript
// In HomePage.tsx
import { useSessionContext } from '../hooks/useSessionContext';
import Chatbot from '../components/Chatbot';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeRole, currentUser } = useSessionContext();
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const openChat = () => {
    setIsChatOpen(true);
  };
  
  const closeChat = () => {
    setIsChatOpen(false);
  };
  
  // Listen for custom event to open chat
  useEffect(() => {
    const handleCustomEvent = () => {
      setIsChatOpen(true);
    };
    
    document.addEventListener('railmadad:openChat', handleCustomEvent);
    return () => {
      document.removeEventListener('railmadad:openChat', handleCustomEvent);
    };
  }, []);
  
  // Rest of the component...
  
  return (
    <>
      {/* Existing UI components */}
      
      {/* Add the Chatbot component with role */}
      <Chatbot 
        isOpen={isChatOpen} 
        onClose={closeChat} 
        userRole={activeRole} 
        userName={currentUser?.name}
      />
    </>
  );
};
```

#### 3.2 Include Chatbot in Admin Pages

```typescript
// In AdminDashboardPage.tsx or a layout component that wraps admin pages
import { useState, useEffect } from 'react';
import { useSessionContext } from '../../hooks/useSessionContext';
import Chatbot from '../../components/Chatbot';

const AdminDashboardPage: React.FC = () => {
  const { activeRole, currentUser } = useSessionContext();
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Chat handlers
  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);
  
  // Rest of the admin dashboard component...
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin dashboard content */}
      <div className="flex items-center justify-between p-4 bg-white shadow">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        
        {/* Add a button to open the admin-specific chatbot */}
        <button 
          onClick={openChat}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
        >
          <Bot className="h-5 w-5" />
          Admin Assistant
        </button>
      </div>
      
      {/* Rest of dashboard UI */}
      
      {/* Include the Chatbot with admin role */}
      <Chatbot 
        isOpen={isChatOpen} 
        onClose={closeChat} 
        userRole={Role.OFFICIAL}
        userName={currentUser?.name}
      />
    </div>
  );
};
```

### 4. Enhanced Chatbot Features

#### 4.1 Role-Specific Message Handling

```typescript
// Enhanced message handling in Chatbot.tsx
const handleSendMessage = useCallback(async (text: string, file?: { blob: Blob, type: 'image' | 'audio' }) => {
  if (!chatSessionRef.current) return;

  // Add role-specific context to certain admin queries
  let processedText = text;
  if (isAdminMode && text.toLowerCase().includes('trends') || text.toLowerCase().includes('statistics')) {
    processedText = `As a railway administrator, I need information about: ${text}`;
  }

  const userMessageText = file ? `[Sent ${file.type}] ${processedText}` : processedText;
  addMessage(userMessageText, true);
  setIsLoading(true);
  setIsTyping(false);
  
  // Show typing indicator while waiting for model response
  const placeholderId = addTypingIndicator();

  try {
    // With system-prompt language control, we simply pass user text/media.
    const parts: Part[] = [{ text: processedText || 'Kindly analyze the attached file as per your role and respond.' }];
    if (file) {
      const base64Data = await fileToBase64(file.blob);
      parts.push({
        inlineData: {
          mimeType: file.blob.type,
          data: base64Data,
        }
      });
    }
    
    const response = await chatSessionRef.current.sendMessage({ message: parts });
    const fullText = response.text || '';

    // Start typing out the response into the placeholder message
    setIsTyping(true);
    // Ensure the placeholder switches off the typing indicator before typing actual text
    updateMessageText(placeholderId, '', { isTypingIndicator: false });

    // Rest of the typing animation logic...
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    updateMessageText(placeholderId, "Sorry, I encountered an error trying to process your request. Please try again.", { isTypingIndicator: false });
  } finally {
    if (!isTyping) setIsLoading(false);
  }
}, [isAdminMode]); // Add isAdminMode to dependencies
```

#### 4.2 Add Role-Specific Suggested Prompts

```typescript
// New component for suggested prompts in Chatbot.tsx
const SuggestedPrompts: React.FC<{ 
  isAdmin: boolean, 
  onSelectPrompt: (prompt: string) => void 
}> = ({ isAdmin, onSelectPrompt }) => {
  const adminPrompts = [
    "Show complaint trends for this month",
    "Summarize the most urgent complaints",
    "What are the most common complaint categories?",
    "Generate a report on cleanliness complaints",
    "Analyze staff behavior complaints"
  ];
  
  const passengerPrompts = [
    "How do I file a complaint about train cleanliness?",
    "Check the status of my complaint",
    "I want to report a delay in train arrival",
    "My seat was not available despite reservation",
    "The AC in my coach is not working"
  ];
  
  const prompts = isAdmin ? adminPrompts : passengerPrompts;
  
  return (
    <div className="p-3 border-t border-gray-200">
      <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(prompt)}
            className={`text-xs px-2 py-1 rounded-md ${
              isAdmin 
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
};

// Then add this component above the footer in the main Chatbot component
<main ref={chatMessagesRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-background">
  {/* Messages rendering */}
</main>

{/* Add suggested prompts when there are few or no messages */}
{messages.length < 3 && (
  <SuggestedPrompts 
    isAdmin={isAdminMode} 
    onSelectPrompt={(prompt) => {
      setUserInput(prompt);
    }} 
  />
)}

<footer className="p-4 border-t">
  {/* Existing footer content */}
</footer>
```

### 5. Implementation Timeline and Strategy

#### Phase 1: Foundation (Week 1)
1. Update the `geminiService.ts` with role-specific system prompts
2. Modify the `Chatbot.tsx` component to accept and use the role prop
3. Add basic role-specific welcome messages

#### Phase 2: Integration (Week 2)
1. Implement the chatbot in the HomePage with proper role passing
2. Add the chatbot to the admin dashboard with admin role
3. Test the different behaviors with sample queries

#### Phase 3: UI Enhancements (Week 3)
1. Implement role-specific styling for the chatbot interface
2. Add the suggested prompts feature
3. Create admin-specific quick action buttons

#### Phase 4: Advanced Features (Week 4)
1. Implement more sophisticated role-specific message handling
2. Add data visualization capabilities for admin queries
3. Enhance prompt engineering for better role differentiation
4. Comprehensive testing and refinement

### 6. Testing Scenarios

#### 6.1 Passenger Testing
- Submit a complaint about train cleanliness
- Ask about complaint status
- Request information about services
- Test multilingual support
- Test with multimedia attachments

#### 6.2 Admin Testing
- Request statistics on complaints
- Ask for trend analysis
- Test admin-specific suggestions
- Request complaint categorization help
- Test report generation capabilities

By following this implementation plan, the RailMadad application will provide a contextually appropriate chatbot experience tailored to each user role, enhancing both passenger service and administrative efficiency.
