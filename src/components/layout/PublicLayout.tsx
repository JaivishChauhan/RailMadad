import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Chatbot from '../Chatbot';
import { MessageCircle } from 'lucide-react';
import { ComplaintProvider } from '../../hooks/useComplaints';

const PublicLayout: React.FC = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<string | null>(null);
    const [startFullScreen, setStartFullScreen] = useState(false);
    const [chatMode, setChatMode] = useState<'general' | 'rail-anubhav' | 'enquiry' | 'suggestions' | 'tracking'>('general');

    useEffect(() => {
        const openChat = (event: any) => {
            setIsChatOpen(true);
            setChatMode(event.detail?.mode || 'general');
            // Check if full screen is requested
            if (event.detail && event.detail.fullScreen) {
                setStartFullScreen(true);
            } else {
                setStartFullScreen(false);
            }
        };
        const sendMessage = (event: any) => {
            if (event.detail && event.detail.message) {
                setPendingMessage(event.detail.message);
                setIsChatOpen(true);
                setChatMode(event.detail?.mode || 'general');
                // Respect full screen if passed in sendMessage event too (optional, but good for consistency)
                if (event.detail.fullScreen) {
                    setStartFullScreen(true);
                }
            }
        };

        document.addEventListener('railmadad:openChat', openChat);
        document.addEventListener('railmadad:sendMessage', sendMessage);
        return () => {
            document.removeEventListener('railmadad:openChat', openChat);
            document.removeEventListener('railmadad:sendMessage', sendMessage);
        };
    }, []);

    return (
        <div
            className="min-h-screen flex flex-col bg-white bg-cover bg-center bg-fixed"
            style={{ backgroundImage: `url('https://i.ibb.co/KsH0yyM/body-bg.jpg')` }}
        >
            <div className="relative z-10 flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow container mx-auto px-4 py-8">
                    <Outlet />
                </main>
                <Footer />
            </div>

            {/* Chatbot providers mount only when chat is open to reduce background Supabase traffic */}
            {isChatOpen && (
                <ComplaintProvider>
                    <Chatbot
                        isOpen={isChatOpen}
                        onClose={() => {
                            setIsChatOpen(false);
                            setPendingMessage(null);
                            setStartFullScreen(false);
                            setChatMode('general');
                        }}
                        initialMessage={pendingMessage}
                        initialFullScreen={startFullScreen}
                        mode={chatMode}
                    />
                </ComplaintProvider>
            )}
            {!isChatOpen && (
                <button
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-primary to-red-700 text-white px-6 py-4 rounded-2xl flex items-center shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 group animate-bounce"
                    aria-label="Open Chat"
                >
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors">
                        <MessageCircle className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <div className="font-semibold text-sm">Chat with AI</div>
                        <div className="text-xs text-white/80">Get help instantly</div>
                    </div>
                </button>
            )}
        </div>
    );
};

export default PublicLayout;
