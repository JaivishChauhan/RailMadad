import { UserContext, Role } from "../types";
import { UserContextService } from "../services/userContextService";
import { UserAwarenessManager } from "./userAwarenessManager";
import {
  StationValidationResult,
  smartStationValidation,
} from "./stationValidationService";
import { TrainValidationService } from "./trainValidationService";

// Configuration for logging - COMPLETELY DISABLED to prevent console spam
const ENABLE_LOGS = false;

// Utility logger functions
const logger = {
  info: (message: string, ...args: any[]) => {
    if (ENABLE_LOGS) {
      console.log(`[FunctionCallService] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    // Errors disabled to prevent console spam
  },
  debug: (message: string, ...args: any[]) => {
    if (ENABLE_LOGS && process.env.NODE_ENV === "development") {
      console.log(`[FunctionCallService DEBUG] ${message}`, ...args);
    }
  },
};

/**
 * Centralized Function Calling Service
 * 

/**
 * Centralized Function Calling Service
 * 
 * This service handles all function calls from the chatbot AI, providing a unified interface
 * for complaint submission, validation, and user management operations.
 */

export interface FunctionCallResult {
  success: boolean;
  message: string;
  data?: any;
  requiresAuth?: boolean;
  redirectTo?: string;
}

export interface ComplaintSubmissionData {
  category?: string;
  complaintType?: string;
  complaintSubType?: string;
  complaintArea?: "TRAIN" | "STATION";
  description: string;
  trainNumber?: string;
  stationCode?: string;
  coachNumber?: string;
  seatNumber?: string;
  journeyDate?: string;
  incidentDate?: string;
  pnrNumber?: string;
  severity: "low" | "medium" | "high" | "critical";
  contactInfo?: {
    email?: string;
    phone?: string;
  };
}

export interface ValidationRequest {
  type: "station" | "train" | "pnr";
  value: string;
}

/**
 * Centralized Function Calling Service
 */
export class FunctionCallService {
  private static instance: FunctionCallService | null = null;
  private complaintService: any = null;
  private userAwarenessManager: any = null;

  private constructor() {
    // Initialize services
    this.initializeServices();
  }

  static getInstance(): FunctionCallService {
    if (!FunctionCallService.instance) {
      FunctionCallService.instance = new FunctionCallService();
    }
    return FunctionCallService.instance;
  }

  private async initializeServices() {
    try {
      // Dynamically import services to avoid circular dependencies
      // const { UserAwarenessManager } = await import("./userAwarenessManager");
      this.userAwarenessManager = UserAwarenessManager.getInstance();

      logger.info("Function Call Service initialized");
    } catch (error) {
      logger.error("Failed to initialize Function Call Service:", error);
    }
  }

  /**
   * Set complaint service (to be injected from the component)
   */
  setComplaintService(complaintService: any) {
    this.complaintService = complaintService;
  }

  /**
   * Get current user context
   */
  private async getCurrentUserContext(): Promise<UserContext> {
    if (this.userAwarenessManager) {
      return await this.userAwarenessManager.getCurrentContext();
    }
    return UserContextService.getCurrentUserContext();
  }

  /**
   * Validate railway-related data
   */
  async validateRailwayData(
    request: ValidationRequest
  ): Promise<FunctionCallResult> {
    try {
      logger.debug(`Validating ${request.type}:`, request.value);

      switch (request.type) {
        case "station":
          const stationResult = await smartStationValidation(request.value);
          return {
            success: stationResult.isValid,
            message: stationResult.isValid
              ? `✅ Station "${stationResult.validatedStation?.name}" (${stationResult.validatedStation?.code}) validated`
              : `❌ Invalid station code: ${request.value}. Please check and try again.`,
            data: stationResult.isValid ? stationResult.validatedStation : null,
          };

        case "train":
          const trainValidationService = TrainValidationService.getInstance();
          const trainResult = await trainValidationService.validateTrainNumber(
            request.value
          );
          return {
            success: trainResult.isValid,
            message: trainResult.isValid
              ? `✅ Train "${trainResult.trainName}" (${trainResult.trainNumber}) validated`
              : `❌ Invalid train number: ${request.value}. Please check and try again.`,
            data: trainResult.isValid ? trainResult : null,
          };

        case "pnr":
          // Basic PNR validation (10 digits)
          const pnrPattern = /^\d{10}$/;
          const isValidPNR = pnrPattern.test(request.value);
          return {
            success: isValidPNR,
            message: isValidPNR
              ? `✅ PNR ${request.value} format validated`
              : `❌ Invalid PNR format. PNR should be 10 digits.`,
            data: isValidPNR ? { pnr: request.value } : null,
          };

        default:
          return {
            success: false,
            message: `❌ Unknown validation type: ${request.type}`,
          };
      }
    } catch (error) {
      logger.error(`Validation error for ${request.type}:`, error);
      return {
        success: false,
        message: `❌ Failed to validate ${request.type}. Please try again.`,
      };
    }
  }

  /**
   * Submit a complaint through the centralized service
   */
  async submitComplaint(
    complaintData: ComplaintSubmissionData
  ): Promise<FunctionCallResult> {
    try {
      logger.debug("Submitting complaint:", complaintData);

      // Get current user context
      const userContext = await this.getCurrentUserContext();

      // Check authentication for complaint submission
      if (!userContext.isAuthenticated) {
        return {
          success: false,
          message:
            "🔒 Authentication required to submit complaints. Please log in first.",
          requiresAuth: true,
          redirectTo: "/passenger-login",
        };
      }

      // Validate required fields
      if (
        (!complaintData.category && !complaintData.complaintType) ||
        !complaintData.description
      ) {
        return {
          success: false,
          message:
            "❌ Category and description are required for complaint submission.",
        };
      }

      // Validate railway data if provided
      const validationResults = [];

      if (complaintData.stationCode) {
        const stationValidation = await this.validateRailwayData({
          type: "station",
          value: complaintData.stationCode,
        });
        if (!stationValidation.success) {
          return stationValidation;
        }
        validationResults.push(stationValidation.data);
      }

      if (complaintData.trainNumber) {
        const trainValidation = await this.validateRailwayData({
          type: "train",
          value: complaintData.trainNumber,
        });
        if (!trainValidation.success) {
          return trainValidation;
        }
        validationResults.push(trainValidation.data);
      }

      if (complaintData.pnrNumber) {
        const pnrValidation = await this.validateRailwayData({
          type: "pnr",
          value: complaintData.pnrNumber,
        });
        if (!pnrValidation.success) {
          return pnrValidation;
        }
        validationResults.push(pnrValidation.data);
      }

      // Use complaint service if available
      if (this.complaintService) {
        try {
          const complaint = await this.complaintService.addComplaint({
            category: complaintData.category,
            complaintType:
              complaintData.complaintType || complaintData.category,
            complaintSubType: complaintData.complaintSubType || "Complaint",
            complaintArea: complaintData.complaintArea || "TRAIN",
            description: complaintData.description,
            trainNumber: complaintData.trainNumber,
            stationCode: complaintData.stationCode,
            coachNumber: complaintData.coachNumber,
            seatNumber: complaintData.seatNumber,
            journeyDate: complaintData.journeyDate,
            incidentDate: complaintData.incidentDate,
            pnr: complaintData.pnrNumber || (complaintData as any).pnr,
            severity: complaintData.severity,
            userId: userContext.user?.id,
            userEmail:
              complaintData.contactInfo?.email || userContext.user?.email,
            userPhone:
              complaintData.contactInfo?.phone || userContext.user?.phone,
          });

          return {
            success: true,
            message: `✅ Complaint submitted successfully! Your complaint ID is ${complaint.id}. Rest assured, our team will look into this immediately. You can track its status anytime.`,
            data: {
              complaintId: complaint.id,
              complaint: complaint,
              validationResults: validationResults,
            },
            redirectTo: `/status/${complaint.id}`,
          };
        } catch (error) {
          logger.error("Complaint service error:", error);
          return {
            success: false,
            message:
              "❌ Failed to submit complaint. Please try again or contact support.",
          };
        }
      } else {
        // Fallback: create complaint object for display
        const complaintId = `RLM${Date.now()}`;
        return {
          success: true,
          message: `✅ Complaint prepared successfully! Complaint ID: ${complaintId}. Please complete the submission through the form.`,
          data: {
            complaintId: complaintId,
            complaintData: complaintData,
            validationResults: validationResults,
          },
          redirectTo: "/submit",
        };
      }
    } catch (error) {
      logger.error("Complaint submission error:", error);
      return {
        success: false,
        message: "❌ Failed to submit complaint. Please try again.",
      };
    }
  }

  /**
   * Get complaint status and details
   */
  async getComplaintStatus(complaintId: string): Promise<FunctionCallResult> {
    try {
      logger.debug("Getting complaint status:", complaintId);

      // Get current user context
      const userContext = await this.getCurrentUserContext();

      if (!userContext.isAuthenticated) {
        return {
          success: false,
          message: "🔒 Please log in to view complaint status.",
          requiresAuth: true,
          redirectTo: "/passenger-login",
        };
      }

      // Use complaint service if available
      if (this.complaintService) {
        try {
          const complaints = await this.complaintService.getComplaints();
          const searchTerm = complaintId.trim().toUpperCase();

          // Try exact match first, then case-insensitive, then partial match
          let complaint = complaints.find((c: any) => c.id === complaintId);

          if (!complaint) {
            complaint = complaints.find(
              (c: any) =>
                c.id.toUpperCase() === searchTerm ||
                c.id.toUpperCase().includes(searchTerm) ||
                searchTerm.includes(c.id.toUpperCase())
            );
          }

          if (!complaint) {
            return {
              success: false,
              message: `❌ Complaint "${complaintId}" not found. Please check the complaint ID.\n\nValid formats: CMP-XXXXX-XXXX, SUG-XXXXX-XXXX, EXP-XXXXX-XXXX, or legacy LOCAL-... IDs.`,
            };
          }

          return {
            success: true,
            message: `📋 **Complaint Found!**\n\n**Reference:** ${complaint.id
              }\n**Status:** ${complaint.status}\n**Title:** ${complaint.title
              }\n**Filed:** ${new Date(
                complaint.createdAt
              ).toLocaleDateString()}`,
            data: complaint,
            redirectTo: `/status/${complaint.id}`,
          };
        } catch (error) {
          logger.error("Complaint service error:", error);
          return {
            success: false,
            message:
              "❌ Failed to retrieve complaint status. Please try again.",
          };
        }
      } else {
        return {
          success: false,
          message:
            "❌ Complaint service unavailable. Please try accessing through the status page.",
          redirectTo: "/status",
        };
      }
    } catch (error) {
      logger.error("Get complaint status error:", error);
      return {
        success: false,
        message: "❌ Failed to get complaint status. Please try again.",
      };
    }
  }

  /**
   * Get user complaints list
   */
  async getUserComplaints(): Promise<FunctionCallResult> {
    try {
      logger.debug("Getting user complaints");

      // Get current user context
      const userContext = await this.getCurrentUserContext();

      if (!userContext.isAuthenticated) {
        return {
          success: false,
          message: "🔒 Please log in to view your complaints.",
          requiresAuth: true,
          redirectTo: "/passenger-login",
        };
      }

      // Use complaint service if available
      if (this.complaintService) {
        try {
          const complaints = await this.complaintService.getComplaints();
          const userComplaints = complaints.filter(
            (c: any) =>
              c.userId === userContext.user?.id ||
              c.userEmail === userContext.user?.email
          );

          return {
            success: true,
            message: `📋 Found ${userComplaints.length} complaint(s) for ${userContext.user?.fullName || userContext.user?.email
              }`,
            data: userComplaints,
            redirectTo: "/status",
          };
        } catch (error) {
          logger.error("Complaint service error:", error);
          return {
            success: false,
            message: "❌ Failed to retrieve complaints. Please try again.",
          };
        }
      } else {
        return {
          success: false,
          message:
            "❌ Complaint service unavailable. Please try accessing through the status page.",
          redirectTo: "/status",
        };
      }
    } catch (error) {
      console.error("❌ Get user complaints error:", error);
      return {
        success: false,
        message: "❌ Failed to get user complaints. Please try again.",
      };
    }
  }

  /**
   * Handle user authentication actions
   */
  async handleAuthentication(
    action: "login" | "logout" | "register",
    data?: any
  ): Promise<FunctionCallResult> {
    try {
      console.log(`🔐 Handling authentication action: ${action}`);

      switch (action) {
        case "login":
          return {
            success: true,
            message: "🔐 Please use the login page to authenticate.",
            redirectTo:
              data?.role === Role.OFFICIAL
                ? "/admin-login"
                : "/passenger-login",
          };

        case "logout":
          // This would be handled by the auth providers
          return {
            success: true,
            message: "👋 Logging you out...",
            redirectTo: "/",
          };

        case "register":
          return {
            success: true,
            message:
              "📝 Please use the registration page to create an account.",
            redirectTo: "/passenger-login", // Google OAuth registration
          };

        default:
          return {
            success: false,
            message: `❌ Unknown authentication action: ${action}`,
          };
      }
    } catch (error) {
      console.error("❌ Authentication error:", error);
      return {
        success: false,
        message: "❌ Authentication action failed. Please try again.",
      };
    }
  }

  /**
   * Submit a suggestion for improving Indian Railways
   *
   * @param {object} params - Suggestion parameters
   * @param {string} params.category - Category of suggestion (e.g., 'station', 'train', 'digital', 'policy')
   * @param {string} params.description - Detailed description of the suggestion
   * @param {string} [params.stationCode] - Related station code if applicable
   * @param {string} [params.trainNumber] - Related train number if applicable
   * @param {string} [params.trainName] - Related train name/type if applicable (e.g., "Vande Bharat")
   * @returns {Promise<FunctionCallResult>} Result of the submission
   */
  async submitSuggestion(params: {
    category: string;
    description: string;
    stationCode?: string;
    trainNumber?: string;
    trainName?: string;
  }): Promise<FunctionCallResult> {
    try {
      console.log("💡 Submitting suggestion:", params);

      const userContext = await this.getCurrentUserContext();

      // Generate a suggestion reference number
      const suggestionId = `SUG${Date.now().toString(36).toUpperCase()}`;

      // Normalize train identifier: accept either trainNumber or trainName
      const trainIdentifier = params.trainNumber || params.trainName;

      // Store in localStorage for prototype (in production, this would go to backend)
      const suggestions = JSON.parse(
        localStorage.getItem("railmadad_suggestions") || "[]"
      );
      suggestions.push({
        id: suggestionId,
        ...params,
        trainIdentifier, // Store the normalized train identifier
        userId: userContext.user?.id || "anonymous",
        userName: userContext.user?.fullName || "Anonymous User",
        submittedAt: new Date().toISOString(),
        status: "received",
      });
      localStorage.setItem(
        "railmadad_suggestions",
        JSON.stringify(suggestions)
      );

      return {
        success: true,
        message: `✅ Thank you for your valuable suggestion!\n\n**Reference Number:** ${suggestionId}\n\nYour idea about *${params.category}* has been recorded. Our team reviews all suggestions to improve Indian Railways services.`,
        data: { suggestionId, ...params },
      };
    } catch (error) {
      console.error("❌ Suggestion submission error:", error);
      return {
        success: false,
        message:
          "❌ Failed to submit suggestion. Please try again or use the Suggestions page.",
        redirectTo: "/suggestions",
      };
    }
  }

  /**
   * Submit a Rail Anubhav (travel experience) feedback
   *
   * @param {object} params - Experience parameters
   * @param {string} params.trainNumber - Train number for the journey
   * @param {string} params.journeyDate - Date of the journey
   * @param {string} params.experience - Detailed experience description
   * @param {string} [params.rating] - Overall rating (positive/negative/mixed)
   * @param {object} [params.aspects] - Specific aspects rated
   * @returns {Promise<FunctionCallResult>} Result of the submission
   */
  async submitExperience(params: {
    trainNumber: string;
    journeyDate: string;
    experience: string;
    rating?: "positive" | "negative" | "mixed";
    aspects?: {
      cleanliness?: string;
      staffBehavior?: string;
      foodQuality?: string;
      punctuality?: string;
    };
  }): Promise<FunctionCallResult> {
    try {
      console.log("🚆 Submitting Rail Anubhav experience:", params);

      const userContext = await this.getCurrentUserContext();

      // Generate an experience reference number
      const experienceId = `EXP${Date.now().toString(36).toUpperCase()}`;

      // Store in localStorage for prototype (in production, this would go to backend)
      const experiences = JSON.parse(
        localStorage.getItem("railmadad_experiences") || "[]"
      );
      experiences.push({
        id: experienceId,
        ...params,
        userId: userContext.user?.id || "anonymous",
        userName: userContext.user?.fullName || "Anonymous User",
        submittedAt: new Date().toISOString(),
        status: "received",
      });
      localStorage.setItem(
        "railmadad_experiences",
        JSON.stringify(experiences)
      );

      const ratingEmoji =
        params.rating === "positive"
          ? "😊"
          : params.rating === "negative"
            ? "😔"
            : "🤔";

      return {
        success: true,
        message: `✅ Thank you for sharing your Rail Anubhav! ${ratingEmoji}\n\n**Reference Number:** ${experienceId}\n**Train:** ${params.trainNumber}\n**Journey Date:** ${params.journeyDate}\n\nYour feedback helps us understand passenger experiences and improve services.`,
        data: { experienceId, ...params },
      };
    } catch (error) {
      console.error("❌ Experience submission error:", error);
      return {
        success: false,
        message:
          "❌ Failed to submit experience. Please try again or use the Rail Anubhav page.",
        redirectTo: "/rail-anubhav",
      };
    }
  }

  /**
   * Get railway information (trains, stations, etc.)
   */
  async getRailwayInfo(
    query: string,
    type?: "train" | "station" | "pnr"
  ): Promise<FunctionCallResult> {
    try {
      console.log(`ℹ️ Getting railway info for: ${query} (type: ${type})`);

      // If type is specified, validate the specific item
      if (type) {
        return await this.validateRailwayData({ type, value: query });
      }

      // Try to auto-detect the type based on query format
      const trainNumberPattern = /^\d{5}$/;
      const stationCodePattern = /^[A-Z]{2,5}$/;
      const pnrPattern = /^\d{10}$/;

      if (pnrPattern.test(query)) {
        return await this.validateRailwayData({ type: "pnr", value: query });
      } else if (trainNumberPattern.test(query)) {
        return await this.validateRailwayData({ type: "train", value: query });
      } else if (stationCodePattern.test(query.toUpperCase())) {
        return await this.validateRailwayData({
          type: "station",
          value: query.toUpperCase(),
        });
      } else {
        // Try searching stations by name
        const stationResult = await smartStationValidation(query);
        if (stationResult.isValid || stationResult.suggestions) {
          return {
            success: stationResult.isValid,
            message: stationResult.isValid
              ? `🚉 Found station "${stationResult.validatedStation?.name}" (${stationResult.validatedStation?.code})`
              : stationResult.responseMessage,
            data: stationResult.isValid
              ? [stationResult.validatedStation]
              : stationResult.suggestions,
          };
        }

        return {
          success: false,
          message: `❌ Could not find railway information for "${query}". Please check the spelling or provide more specific details.`,
        };
      }
    } catch (error) {
      console.error("❌ Railway info error:", error);
      return {
        success: false,
        message: "❌ Failed to get railway information. Please try again.",
      };
    }
  }

  /**
   * Execute function call based on AI function calling
   */
  async executeFunction(
    functionName: string,
    parameters: any
  ): Promise<FunctionCallResult> {
    try {
      console.log(`🔧 Executing function: ${functionName}`, parameters);

      switch (functionName) {
        case "submitComplaint":
        case "submit_complaint":
          return await this.submitComplaint(parameters);

        case "validateStation":
        case "validate_station":
          return await this.validateRailwayData({
            type: "station",
            value: parameters.stationCode,
          });

        case "validateTrain":
        case "validate_train":
          return await this.validateRailwayData({
            type: "train",
            value: parameters.trainNumber,
          });

        case "validatePNR":
        case "validate_pnr":
          return await this.validateRailwayData({
            type: "pnr",
            value: parameters.pnr,
          });

        case "getComplaintStatus":
        case "get_complaint_status":
          return await this.getComplaintStatus(parameters.complaintId);

        case "getUserComplaints":
        case "get_user_complaints":
          return await this.getUserComplaints();

        case "login":
        case "logout":
        case "register":
          return await this.handleAuthentication(functionName, parameters);

        case "getRailwayInfo":
        case "get_railway_info":
          return await this.getRailwayInfo(parameters.query, parameters.type);

        case "submitSuggestion":
        case "submit_suggestion":
          return await this.submitSuggestion(parameters);

        case "submitExperience":
        case "submit_experience":
          return await this.submitExperience(parameters);

        default:
          return {
            success: false,
            message: `❌ Unknown function: ${functionName}`,
          };
      }
    } catch (error) {
      console.error(`❌ Function execution error for ${functionName}:`, error);
      return {
        success: false,
        message: `❌ Failed to execute ${functionName}. Please try again.`,
      };
    }
  }
}

// Export singleton instance
export const functionCallService = FunctionCallService.getInstance();
