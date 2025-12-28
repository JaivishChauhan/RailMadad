import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Role } from "../types";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const openChat = (mode: string = "general") => {
    document.dispatchEvent(
      new CustomEvent("railmadad:openChat", {
        detail: { mode },
      })
    );
  };

  const openChatWithMessage = (
    initialMessage: string,
    isFullScreen: boolean = false,
    mode: string = "general"
  ) => {
    // Open chat and send an initial message
    document.dispatchEvent(
      new CustomEvent("railmadad:openChat", {
        detail: { fullScreen: isFullScreen, mode },
      })
    );
    // Small delay to ensure chatbot is open before sending message
    setTimeout(() => {
      document.dispatchEvent(
        new CustomEvent("railmadad:sendMessage", {
          detail: { message: initialMessage, fullScreen: isFullScreen, mode },
        })
      );
    }, 500);
  };

  const handleCardClick = (
    actionType: string,
    requiresAuth?: boolean | Role,
    additionalState?: any
  ) => {
    // Instead of navigating to separate pages, open chatbot for most actions
    switch (actionType) {
      case "submit-complaint":
        openChatWithMessage("I want to submit a complaint", true, "general");
        break;
      case "track-complaint":
        if (requiresAuth === Role.PASSENGER || requiresAuth === true) {
          // For tracking complaints, open chatbot and let it handle authentication
          openChatWithMessage(
            "I want to check the status of my complaint",
            false,
            "tracking"
          );
        } else {
          openChatWithMessage(
            "I want to check the status of my complaint",
            false,
            "tracking"
          );
        }
        break;
      case "rail-anubhav":
        openChatWithMessage(
          "I want to share my experience with Indian Railways",
          false,
          "rail-anubhav"
        );
        break;
      case "suggestions":
        openChatWithMessage(
          "I have suggestions for improving railway services",
          false,
          "suggestions"
        );
        break;
      case "enquiry":
        openChat("enquiry");
        break;
      case "track-legacy":
        navigate("/track-concern");
        break;
      case "legacy-form":
        // For users who specifically want the traditional form
        if (requiresAuth === Role.PASSENGER || requiresAuth === true) {
          navigate("/passenger-login", {
            state: {
              from: {
                pathname: "/submit",
                state: additionalState,
              },
            },
          });
        } else if (requiresAuth === Role.OFFICIAL) {
          navigate("/admin-login", {
            state: { from: { pathname: "/dashboard" } },
          });
        } else {
          navigate("/submit", { state: additionalState });
        }
        break;
      default:
        openChat("general");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center p-6 text-center bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-center mb-4 gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 64 64"
              className="fill-primary"
            >
              <g>
                <path d="M54,17.6c-0.8-6.8-6.6-11.9-13.5-11.9h-0.7V5c0-1.8-1.5-3.2-3.2-3.2h-9.2c-1.8,0-3.2,1.5-3.2,3.2v0.7h-0.8 c-6.9,0-12.6,5.1-13.4,11.9c-0.1,0.5-0.1,1.1-0.1,1.6v27.1c0,3.4,2.7,6.1,6.1,6.1h0.9l-4.2,6.4c-0.7,1-0.4,2.4,0.6,3.1 c0.4,0.3,0.8,0.4,1.2,0.4c0.7,0,1.4-0.4,1.9-1l5.8-8.9h19.7l5.6,8.8c0.4,0.7,1.2,1,1.9,1c0.4,0,0.8-0.1,1.2-0.3 c1.1-0.7,1.4-2.1,0.7-3.1l-4-6.4H48c3.4,0,6.1-2.7,6.1-6.1V19.1C54.1,18.6,54.1,18.1,54,17.6z M29.8,20.1V28H14.4v-7.9H29.8z M34.2,20.1h15.4V28H34.2V20.1z M28.7,6.2h6.7v3.3h-6.7V6.2z M23.4,10.2h0.8v0.7c0,1.8,1.5,3.2,3.2,3.2h9.2c1.8,0,3.2-1.5,3.2-3.2 v-0.7h0.7c3.7,0,7,2.2,8.3,5.4H15.1C16.5,12.4,19.7,10.2,23.4,10.2z M48,47.9H16c-0.9,0-1.6-0.7-1.6-1.6V32.5h35.2v13.8 C49.6,47.2,48.9,47.9,48,47.9z" />
                <path d="M26.5,37.4h-5.4c-1.2,0-2.2,1-2.2,2.2s1,2.2,2.2,2.2h5.4c1.2,0,2.2-1,2.2-2.2S27.8,37.4,26.5,37.4z" />
                <path d="M43.3,37.4h-5.4c-1.2,0-2.2,1-2.2,2.2s1,2.2,2.2,2.2h5.4c1.2,0,2.2-1,2.2-2.2S44.6,37.4,43.3,37.4z" />
              </g>
            </svg>
            <h2 className="text-2xl font-semibold text-gray-800">
              Train Complaints
            </h2>
          </div>
          <p className="text-sm text-muted-foreground flex-grow mb-4 px-4">
            File complaints related to train services like delays, cleanliness,
            etc.
          </p>
          <div className="w-full space-y-2">
            <Button
              className="w-full"
              onClick={() => handleCardClick("submit-complaint")}
            >
              Submit via AI Chat
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() =>
                handleCardClick("legacy-form", Role.PASSENGER, {
                  complaintArea: "TRAIN",
                })
              }
            >
              Use Traditional Form
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col items-center p-6 text-center bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-center mb-4 gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-800">
              Station Complaints
            </h2>
          </div>
          <p className="text-sm text-muted-foreground flex-grow mb-4 px-4">
            File complaints related to station facilities, services, and
            infrastructure.
          </p>
          <div className="w-full space-y-2">
            <Button
              className="w-full"
              onClick={() => handleCardClick("submit-complaint")}
            >
              Submit via AI Chat
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() =>
                handleCardClick("legacy-form", Role.PASSENGER, {
                  complaintArea: "STATION",
                })
              }
            >
              Use Traditional Form
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col items-center p-6 text-center bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-center mb-4 gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-800">
              Rail Anubhav
            </h2>
          </div>
          <p className="text-sm text-muted-foreground flex-grow mb-4 px-4">
            Share your experience with Indian Railways and help improve the
            services.
          </p>
          <div className="w-full space-y-2">
            <Button
              className="w-full"
              onClick={() => handleCardClick("rail-anubhav")}
            >
              Share via AI Chat
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => navigate("/rail-anubhav")}
            >
              Use Traditional Form
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col items-center p-6 text-center bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-center mb-4 gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-800">Enquiry</h2>
          </div>
          <p className="text-sm text-muted-foreground flex-grow mb-6 px-4">
            Get answers to your queries related to Indian Railways, train
            schedules, etc.
          </p>
          <Button className="w-full" onClick={() => handleCardClick("enquiry")}>
            Ask AI Assistant
          </Button>
        </Card>

        <Card className="flex flex-col items-center p-6 text-center bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-center mb-4 gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-800">
              Track Your Concern
            </h2>
          </div>
          <p className="text-sm text-muted-foreground flex-grow mb-4 px-4">
            Track the status of your complaint or feedback submitted to Indian
            Railways.
          </p>
          <div className="w-full space-y-2">
            <Button
              className="w-full"
              onClick={() => handleCardClick("track-complaint", true)}
            >
              Track via AI Chat
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => handleCardClick("track-legacy")}
            >
              Use Status Page
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col items-center p-6 text-center bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-center mb-4 gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-800">
              Your Suggestions
            </h2>
          </div>
          <p className="text-sm text-muted-foreground flex-grow mb-6 px-4">
            Share your valuable suggestions to improve the services of Indian
            Railways.
          </p>
          <div className="w-full space-y-2">
            <Button
              className="w-full"
              onClick={() => handleCardClick("suggestions")}
            >
              Share via AI Chat
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => navigate("/suggestions")}
            >
              Use Traditional Form
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
