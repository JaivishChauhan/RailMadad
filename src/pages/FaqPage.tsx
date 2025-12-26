import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageSquare,
  Phone,
  Train,
  AlertCircle,
  Clock,
  FileText,
  Shield,
  Ticket,
} from "lucide-react";

/**
 * FAQ Item interface for type safety
 */
interface FaqItem {
  /** The question being asked */
  question: string;
  /** The answer to the question */
  answer: string;
  /** Optional category for grouping */
  category: string;
}

/**
 * FAQ categories with their respective icons
 */
const FAQ_CATEGORIES = [
  { id: "general", label: "General FAQs", icon: HelpCircle },
  { id: "uts", label: "UTS FAQs", icon: Ticket },
  { id: "complaints", label: "Complaints", icon: AlertCircle },
  { id: "tracking", label: "Tracking", icon: Clock },
  { id: "services", label: "Services", icon: Train },
  { id: "security", label: "Security & Privacy", icon: Shield },
];

/**
 * Official RailMadad FAQ data
 * Includes General FAQs and UTS (Unreserved Ticketing System) FAQs
 * Source: Official RailMadad Portal
 */
const FAQ_DATA: FaqItem[] = [
  // ==================== OFFICIAL GENERAL FAQs ====================
  {
    category: "general",
    question: "What is the purpose and objectives of Rail Madad portal?",
    answer:
      "Rail Madad Portal has been developed to enable Railway passengers to lodge a complaint or give suggestion through online, app, or SMS and facility to track live status of complaints and provide feedback based on their satisfaction with the resolution. The objective of this portal is to enhance experience of Railways passengers with swift and satisfactory resolution of complaints.",
  },
  {
    category: "general",
    question: "What kind of complaints can I submit?",
    answer:
      "Any complaint relating only to 'Train' or 'Station' can be lodged.",
  },
  {
    category: "general",
    question: "What kind of suggestions can I submit?",
    answer:
      "Any suggestion relating only to 'Train' or 'Station' can be submitted.",
  },
  {
    category: "general",
    question: "What details do I need to login the system?",
    answer:
      "You are required to enter your valid email id or mobile number. A One Time Password (OTP) will be sent to the Mobile Number or Email Id which needs to be entered. (This Procedure is followed to ensure that the complaint / suggestion is being lodged with valid identity.)",
  },
  {
    category: "general",
    question:
      "Are both, mobile number and email id, mandatory to login into the system?",
    answer: "No. Any one of them will do.",
  },
  {
    category: "general",
    question: "Do I have to provide my PNR details in train complaint?",
    answer:
      "Yes. PNR details help in correct assignment of a complaint for swift resolution.",
  },
  {
    category: "general",
    question:
      "Can I attach a supporting document along with the complaint or suggestion?",
    answer:
      "Yes. A facility has been provided to upload only .jpg, .jpeg & .png files as supplementary document you desire along with your complaint / suggestion. Uploading can be done with click on 'Choose File' button.",
  },
  {
    category: "general",
    question: "Within what time frame my complaint will be resolved?",
    answer:
      "We will make all sincere efforts to resolve your complaints at the earliest and also inform you the same. However, you can also track online your complaint status.",
  },
  {
    category: "general",
    question: "How will I get to know if my complaint has been resolved?",
    answer:
      "A message confirming resolution of your complaint / suggestion will be sent on your registered mobile number or email id.",
  },
  {
    category: "general",
    question: "Where can I track the complaint already submitted by me?",
    answer:
      "You can track live status of your complaint by clicking on 'TRACK COMPLAINT' button after login to the portal.",
  },
  {
    category: "general",
    question:
      "Is there any provision for feedback about the quality of resolution of my complaint?",
    answer:
      "Yes. After receiving the message of resolution you can post your feedback through the link provided in resolution SMS you have received from portal.",
  },
  {
    category: "general",
    question:
      "What should I do if the portal stops responding or displays an error?",
    answer:
      "Two immediate actions could be: a) Refresh the browser. b) Log out and login again.",
  },
  {
    category: "general",
    question:
      "Can I edit/modify my complaint or suggestion after it has been submitted?",
    answer:
      "No. Once submitted, no modifications/change can be made to the complaint or suggestion. However, a fresh complaint or suggestion can be submitted.",
  },
  {
    category: "general",
    question: "Can complaint be submitted via post?",
    answer:
      "Yes. You can send your complaint through post that will be accepted and processed through this portal only.",
  },
  {
    category: "general",
    question:
      "I have a question that was not answered in this FAQ. What should I do?",
    answer:
      "We have taken all care to make it comprehensive. If you require any further assistance you can always send a mail to us on railmadad@gov.in.",
  },
  {
    category: "general",
    question:
      "Is there a provision to lodge train complaints using UTS ticket number?",
    answer:
      "Yes. This can be done by clicking train complaints mentioning train number followed by UTS number as a travel authority.",
  },
  {
    category: "general",
    question: "Is there provision to lodge complaints against Railway staff?",
    answer:
      "Yes. Staff Behavior is one of the heads of the Complaint both 'Train' and 'Station' and complaint can be lodged against any incident of staff misbehavior.",
  },
  {
    category: "general",
    question: "Is there provision to lodge complaint through SMS?",
    answer:
      "Yes. You may write a message 'MADAD space your complaint' and SMS it to 139.",
  },
  {
    category: "general",
    question: "Is there provision to lodge complaints over phone?",
    answer:
      "Yes. Complaint can be lodged over phone on the integrated helpline no. 139.",
  },
  {
    category: "general",
    question: "Is there any restriction on length of the Complaint?",
    answer: "Yes. Maximum 1000 characters.",
  },
  {
    category: "general",
    question:
      "Is there provision for tracking same complaints on cross platform?",
    answer:
      "There are three platforms available to lodge complaints in Rail Madad i.e. WEB, APP, SMS and Helpline 139. Complaints lodged on Web or Apps can be tracked on both of them. Complaints lodged through SMS or helpline number 139 can be tracked only on their respective channels.",
  },
  {
    category: "general",
    question:
      "Is there any provision to reopen the complaint if the complainant is not satisfied by the resolution provided by Railways?",
    answer: "No. There is no such provision.",
  },
  {
    category: "general",
    question: "Is there provision to change the password?",
    answer:
      "Yes. Initially Application provides default password and that can be changed later after login.",
  },
  {
    category: "general",
    question: "Can I see my history of the lodged complaints?",
    answer: "No.",
  },
  {
    category: "general",
    question: "Is there provision to track complaint with reference no.?",
    answer: "Yes.",
  },
  {
    category: "general",
    question: "Is there provision to change the contact details?",
    answer:
      "Yes. You can update your profile on the link given for this purpose.",
  },
  {
    category: "general",
    question: "Is there a restriction on entered PNR for Train Complaints?",
    answer:
      "Yes. You can only enter a PNR within 5 days after the boarding time.",
  },

  // ==================== OFFICIAL UTS FAQs ====================
  {
    category: "uts",
    question: "Who can use the utsonmobile application?",
    answer:
      "The services are not available to persons under the age of 17 or to anyone previously suspended or removed from the services by Indian Railways. By accepting the Terms & Conditions or by otherwise using the Services or the Site, you represent that You are at least 17 years of age and have not been previously suspended or removed from the Services. You represent and warrant that you have the right, authority, and capacity to enter into this Agreement and to abide by all the terms and conditions of this Agreement. You shall not impersonate any person or entity, or falsely state or otherwise misrepresent identity, age or affiliation with any person or entity.",
  },
  {
    category: "uts",
    question: "How to download the utsonmobile application?",
    answer:
      "The Android version of the application can be downloaded from Google Play Store. The Windows version of the application can be downloaded from the Windows Store and the iOS version can be downloaded from the Apple store. The application is free to download.",
  },
  {
    category: "uts",
    question:
      "What are the pre-requisites to avail the utsonmobile application service?",
    answer:
      "The passenger should have Android/Windows/iPhone smartphone only. The phone should have minimum GPRS connectivity to use the services. The passenger should have money in their Railway Wallet (R-Wallet) or use Net-banking/Debit/Credit card facility. In order to book paperless tickets, the smart phone should be GPS enabled.",
  },
  {
    category: "uts",
    question: "Is it mandatory to register for using the utsonmobile system?",
    answer: "Yes, it is mandatory to register.",
  },
  {
    category: "uts",
    question: "Where to do registration for UTS?",
    answer:
      "Registration can be done through mobile phone application or website (https://www.utsonmobile.indianrail.gov.in). The passenger first will get registered by providing his/her mobile number, name, password, gender and date of birth. After successful registration, an SMS will be sent to the user with login-id and password and zero-balance R-Wallet will be created without any additional cost.",
  },
  {
    category: "uts",
    question: "Is it necessary to top up the inbuilt R-Wallet?",
    answer:
      "No, it is not mandatory to top-up the R-Wallet. The application is integrated with the other payment options like Net-banking/Debit card/Credit card/UPI/Wallets through Paytm, MobiKwik, FreeCharge payment aggregators.",
  },
  {
    category: "uts",
    question: "Can a ticket be booked inside the station premises?",
    answer:
      "According to the Railway commercial rule, a passenger should enter the Railway premises after purchasing the ticket. Hence, booking a ticket using utsonmobile application inside the station premises is not permissible.",
  },
  {
    category: "uts",
    question:
      "What are the modes of ticketing through utsonmobile application?",
    answer:
      "The passenger can book either Paperless or Paper mode of ticket.\n\nPaperless Ticket: While booking the ticket, the passenger current geo location will be checked using phone GPS and the ticket will be booked if the passenger is not inside the Railway fencing area like station premises and inside the train. The passenger can travel without taking hardcopy of the ticket. The smartphone should be GPS enabled. However, the GPS is not required to book/renew season tickets.\n\nPaper Ticket: The passenger can book ticket from anywhere. On successful booking of ticket, the passenger will get Booking ID along with other ticket details as SMS/Notification. The passenger should go to the source station and take print out from the ATVM, CoTVM, OCR machines using the booking ID. The passenger can also approach UTS booking counter to take ticket printout.",
  },
  {
    category: "uts",
    question:
      "Is GPS necessary while booking a ticket through utsonmobile application?",
    answer:
      "GPS is necessary to book the ticket in Paperless mode. For Paper based ticket, the usage of GPS is not mandatory.",
  },
  {
    category: "uts",
    question:
      "What are the types of ticket that can be bought from the utsonmobile application?",
    answer:
      "Three types of ticket can be bought such as Journey ticket, Season ticket and Platform ticket (both Paperless and Paper based).",
  },
  {
    category: "uts",
    question: "Is it necessary to take the print out of the ticket?",
    answer:
      "For Paperless mode, the print of the ticket is not required and not allowed. For Paper based ticket, the print of the ticket is mandatory and travel without printed ticket will enforce penalty.",
  },
  {
    category: "uts",
    question: "How to take the print out of the paper based ticket?",
    answer:
      "The passenger should go to the source station and take print out from the ATVM, CoTVM, OCR machines using the booking ID. The passenger can also approach UTS booking counter to take ticket printout. Travel without printed ticket will enforce penalty.",
  },
  {
    category: "uts",
    question:
      "What to do if my paper ticket is not printed at the ATVM/CoTVM/OCR machines?",
    answer:
      "Immediately contact the booking office supervisor or call Railway customer care.",
  },
  {
    category: "uts",
    question: "Is paperless Season ticket valid from the same day of booking?",
    answer: "No. It is valid only from the next day of booking.",
  },
  {
    category: "uts",
    question: "How to book paperless ticket without any hassle?",
    answer:
      "a. Check your phone GPS is enabled.\nb. Check your R-wallet balance for sufficient money or use other payment options.\nc. Book your ticket before entering the station premises.",
  },
  {
    category: "uts",
    question:
      "What to do if my paperless ticket is not booked, but money got deducted?",
    answer:
      "a. Click the 'Show Booked Ticket' button available in the Main screen.\nb. If the ticket is not visible, then call customer care. In case money is deducted and ticket not booked, then the money will be refund automatically to your account after 7 days.",
  },
  {
    category: "uts",
    question: "How to cancel a mobile ticket?",
    answer:
      "Paperless ticket is not allowed for cancellation. Paper ticket may be cancelled in the following method:\n\n1. The cancellation of ticket through mobile application is allowed only if the ticket is not printed at the kiosk.\n2. Once, the ticket is printed at the kiosk, then cancellation is allowed only at the UTS counter within one hour after printout.\n\nIn both cancellation methods, there will not be any cash refund at the time of cancellation. The refund amount after deduction of clerkage charge, if any, will be automatically topped up in the user R-Wallet or will be refunded to customer's account.",
  },
  {
    category: "uts",
    question: "How to show the paperless ticket to the TTE?",
    answer:
      "Without login, use 'SHOW BOOKED TICKET' option available in the login screen or after login, use SHOW BOOKED TICKET option available in the main menu.",
  },
  {
    category: "uts",
    question: "Whether 'SHOW BOOKED TICKET' option works in offline mode?",
    answer:
      "Yes, 'SHOW BOOKED TICKET' option works in the offline mode (i.e without internet).",
  },
  {
    category: "uts",
    question: "How long will my paperless platform ticket be valid?",
    answer:
      "According to Railway rules platform ticket is valid for two hours from the time of booking.",
  },
  {
    category: "uts",
    question: "What is the validity of paperless Season Ticket?",
    answer:
      "1. The fresh paperless season ticket will be Valid from the next day.\n\n2. In case of advance renewal of season ticket, the new validity period logic is as follows:\n   i. In case the season ticket validity period is active, then the new validity period will be effective from existing validity period plus one day.\n   ii. In case the season ticket validity period is expired, then the new validity period will be from next day (i.e. current date plus one).",
  },
  {
    category: "uts",
    question: "What if the mobile handset battery is down during the journey?",
    answer:
      "If the passenger is unable to show a paperless ticket to TTE (Train Ticket Examiner) due to the mobile battery drained out, then the travel of the passenger would be treated as a ticketless travel and penalty will be imposed.",
  },
  {
    category: "uts",
    question: "What if the mobile handset is lost during the journey?",
    answer:
      "The travel of the passenger would be treated as a ticketless travel and penalty will be imposed.",
  },
  {
    category: "uts",
    question: "What is the procedure to change the mobile handset?",
    answer:
      "To restrict the duplication of UTS ticket, Application was designed in a way to show active ticket(s) on one mobile device at a time by binding ticket with device IMEI number.\n\nProcess to change mobile handset:\n1) If user is not having active ticket(s): User can change handset using CHANGE HANDSET option available in UTS application or from the website.\n\n2) If user is having active tickets(s):\n   a) If user wants to change handset: One can change the handset only once in a month (i.e. after 30/31 days) in case of having active ticket.\n   b) Mobile Handset is lost: User should give request to CCM/PM office of the concern Railway along with copy of the FIR/CSR and copy of the Duplicate SIM CARD request letter.\n   c) Mobile Handset is non-repairable: User should give request to CCM/PM office with copy of the letter from the dealer or service center and duplicate SIM card request letter.",
  },
  {
    category: "uts",
    question: "Can a R-Wallet account be reactivated once surrendered?",
    answer:
      "Yes, the surrendered R-Wallet can be reactivated having zero balance within 3 months from the date of surrender. Beyond three months, the passenger has to take specific permission of the Railway for reactivation.",
  },
  {
    category: "uts",
    question:
      "Can an active ticket be recovered once a passenger changes the handset?",
    answer:
      "Yes, ticket can be recovered by using change handset option. One can change the handset only once in a month (i.e. after 30/31 days) in case of having active ticket. The steps are:\n1. User has to initiate the change handset (IMEI) request from the existing mobile device.\n2. User can download the application in the new mobile device.\n3. User login to the application using their credential.\n4. User will use the sync ticket option to re-sync the ticket to the new mobile.\n5. All the tickets will be bound to the new mobile handset.",
  },
  {
    category: "uts",
    question: "How to change password in UTS?",
    answer:
      "The password can be changed by using the Change password option available in the mobile application or website.",
  },
  {
    category: "uts",
    question: "How to reset the password in UTS?",
    answer:
      "The user can reset his/her password in case it is forgotten by using 'Forgot Password' option available on the mobile application as well as website.",
  },
  {
    category: "uts",
    question: "What is a R-Wallet?",
    answer:
      "R-Wallet is closed wallet of Indian Railways. Being a closed wallet, all the rules of RBI for Closed Wallet will apply to this wallet also. The R-Wallet with zero-balance will be created without any additional cost upon successful registration by the passenger. The minimum recharge value is Rs.100 and multiples of Rs.100 which can grow up to Rs. 10000. The maximum stored-value amount in this R-Wallet is Rs.10000. Currently, there is 5% bonus on every R-Wallet recharge (for limited period only).",
  },
  {
    category: "uts",
    question: "How to Recharge R-Wallet?",
    answer:
      "R-Wallet will be issued with zero balance to all the users upon successful registration in the system either through utsonmobile mobile applications or website (https://www.utsonmobile.indianrail.gov.in). The user can recharge their R-Wallet at the UTS counters available in the Suburban Railway Stations or through the website. Currently, there is 5% bonus on every R-Wallet recharge (for limited period only).",
  },
  {
    category: "uts",
    question: "How to check the R-Wallet balance?",
    answer:
      "The user can check the balance of R-Wallet either in the UTS mobile applications or in the website (https://www.utsonmobile.indianrail.gov.in).",
  },
  {
    category: "uts",
    question: "How to surrender my R-Wallet?",
    answer:
      "The passenger has to initiate the surrender R-Wallet request from the mobile application and he/she will get a secret code as SMS. The passenger has to go to the Railway Station and show the secret code to the booking operator and get the cash refund after deducting the clerkage amount. However, the surrender policy will change time to time.",
  },
  {
    category: "uts",
    question: "How to Block my R-Wallet?",
    answer:
      "The user is allowed to block the usage of R-Wallet through Helpline number by giving user credentials. Once, it is blocked, then they cannot reuse it and no cash refund will be given for the left out money available in their R-Wallet.",
  },
  {
    category: "uts",
    question: "Why can't I get GPS signal?",
    answer:
      "The GPS signals may be very poor in the place from where you are booking (closed area/inside building) or your phone accuracy may not be good enough to meet the app requirement. We may also check the Location Settings in your phone for High Accuracy mode.",
  },
  {
    category: "uts",
    question: "How to revert a Wallet Surrender request?",
    answer:
      "If you have mistakenly surrendered your wallet and again want to use it, then you can call the customer care number for your city and request for the same. However once refund has been collected from the railway counter no further reversion will be possible.",
  },
  {
    category: "uts",
    question: "Why is syncing process taking more time?",
    answer:
      "1. UTS application is designed in such a way that user's internet usage can be minimized during ticket booking by bundling list of all released stations within application.\n2. Application will only sync stations in case of addition of new stations when ticketing in new zones are enabled or if there is any modification/correction in station names.",
  },
  {
    category: "uts",
    question:
      "What are the payment options for ticket booking/R-Wallet recharge? Are we paying any extra charges to aggregators?",
    answer:
      "User can do payment to book ticket using two payment options i.e. R-WALLET and OTHERS. There are no transaction charges if user pays using R-WALLET. To promote digital transactions, Indian Railway is giving 5% bonus on recharging R-WALLET online.\n\nFor OTHERS payment mode, UTS application is integrated with three payment aggregators i.e Paytm, Mobikwik and Freecharge. No extra charges are paid to payment aggregators.\n\nCurrent charges applicable:\n• Debit card - No charges (below ₹2000) & 0.9% + GST (above ₹2000)\n• UPI - No charges (below ₹2000) & 0.65% + GST (above ₹2000)\n• Netbanking - 1.8% + GST\n• Credit Card - 1.8% + GST",
  },
  {
    category: "uts",
    question:
      "Why am I not able to save paperless ticket in my phone? Can ticket be shown without mobile network?",
    answer:
      "Unlike IRCTC ticket, UTS ticket is not linked with any berth and can be duplicated easily. Permission to save the ticket is restricted to avoid duplication of ticket. UTS application is having SHOW TICKET option in Login screen to show active ticket(s) without depending on network connectivity.",
  },
  {
    category: "uts",
    question: "Can I book inter-zonal ticketing?",
    answer:
      "Yes, you can book ticket for inter-zonal railway stations. It has been enabled from 1st November 2018.",
  },
  {
    category: "uts",
    question: "Why are transactions failed and delay in refund of money?",
    answer:
      "Money got deducted, ticket not booked case: It depends on various points like user mobile device connectivity, server issues, multiple hops, link down etc.\n\nDelayed Refund case: Refund process is an elaborate and well-defined mechanism to ensure correct amount is refunded to right account. This involves authentication and verification at each stage i.e. Payment gateway, aggregators, card companies, acquiring bank, issuing bank and customer account etc. It takes 7-12 working days and in cases of transaction failures, money is refunded.",
  },
  {
    category: "uts",
    question: "What are the helpline numbers and mail ids for UTS?",
    answer:
      "List of helpline numbers and mail ids are available in helpline option available in login screen of UTS application and 'Contact Us' option available in utsonmobile website: https://www.utsonmobile.indianrail.gov.in/RDS/policy/contactUs.",
  },
  {
    category: "uts",
    question: "Can I check my Ticket Booking History in application?",
    answer:
      "User can check booked ticket history using BOOKING HISTORY option available in UTS application.",
  },

  // ==================== ADDITIONAL HELPFUL FAQs ====================
  // Complaint-related FAQs
  {
    category: "complaints",
    question: "How do I lodge a complaint through the AI chatbot?",
    answer:
      "You can lodge a complaint by clicking on 'Lodge a Complaint' on our homepage or by simply telling our AI chatbot about your issue. The chatbot will guide you through the process, collecting necessary details like train number, date of journey, and the nature of your complaint.",
  },
  {
    category: "complaints",
    question: "What types of complaints can I file?",
    answer:
      "You can file complaints about: Train delays, Coach cleanliness, Catering services, Staff behavior, Medical emergencies, Security concerns, Electrical/AC issues, Water supply problems, Bedroll quality, Overcharging, and any other railway-related grievances.",
  },

  // Tracking FAQs
  {
    category: "tracking",
    question: "How do I track my complaint status online?",
    answer:
      "You can track your complaint by: 1) Using the 'Track Complaint' option on our homepage and entering your reference number, 2) Asking our AI chatbot 'What is the status of my complaint?', or 3) Calling 139 with your reference number.",
  },
  {
    category: "tracking",
    question: "What do the different complaint statuses mean?",
    answer:
      "PENDING: Your complaint is awaiting review. IN PROGRESS: Officials are actively working on it. RESOLVED: Action has been taken and the issue is addressed. CLOSED: The complaint has been finalized. ESCALATED: The complaint has been forwarded to higher authorities for urgent attention.",
  },
  {
    category: "tracking",
    question: "How long does it take to resolve a complaint?",
    answer:
      "Resolution time varies by complaint type: Urgent issues (medical, security) are addressed within hours. General complaints typically take 24-72 hours. Complex issues requiring investigation may take up to 7 days. You'll receive updates at each stage.",
  },

  // Services FAQs
  {
    category: "services",
    question: "What is Rail Anubhav?",
    answer:
      "Rail Anubhav is a feedback platform where passengers can share positive experiences with Indian Railways. This helps recognize good service and motivates railway staff. Share your appreciation for clean coaches, helpful staff, or timely trains!",
  },
  {
    category: "services",
    question: "Can I get live train status through RailMadad?",
    answer:
      "While RailMadad primarily handles grievances, our AI chatbot can provide general information about trains. For live running status, we recommend using the NTES app or enquiry.indianrail.gov.in for real-time updates.",
  },

  // Security & Privacy FAQs
  {
    category: "security",
    question: "Is my personal information safe with RailMadad?",
    answer:
      "Yes, we take data privacy seriously. Your personal information is encrypted and used only for complaint processing. We follow government data protection guidelines and never share your information with third parties without your consent.",
  },
  {
    category: "security",
    question: "What should I do in case of emergency on a train?",
    answer:
      "For emergencies: 1) Pull the emergency chain (only for genuine emergencies). 2) Contact the Train Ticket Examiner (TTE) or Railway Protection Force (RPF). 3) Call 182 (Railway Security Helpline). 4) Use RailMadad to report the incident. Stay calm and provide your coach number and location.",
  },
  {
    category: "security",
    question: "How do I report harassment or theft?",
    answer:
      "For harassment or theft: Immediately contact the RPF personnel on your train or station. Call 182 (Security Helpline) or 139. File a complaint through RailMadad with as many details as possible (time, location, description of incident/person). Your safety is our priority.",
  },
];

/**
 * Individual FAQ Accordion Item Component
 *
 * @param item - The FAQ item to display
 * @param isOpen - Whether the accordion is expanded
 * @param onToggle - Callback when the accordion is clicked
 */
const FaqAccordionItem: React.FC<{
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ item, isOpen, onToggle }) => {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-4 px-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen ? "true" : "false"}
      >
        <span className="font-medium text-gray-900 pr-4">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-red-700 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500 shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-gray-600 leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  );
};

/**
 * FaqPage Component
 *
 * Displays frequently asked questions about the RailMadad platform.
 * Features category-based filtering and accordion-style Q&A display.
 * Provides quick access to support channels and chatbot assistance.
 *
 * @returns JSX.Element - The rendered FAQ page
 */
const FaqPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  /**
   * Filters FAQ items based on selected category
   * @returns Filtered array of FAQ items
   */
  const filteredFaqs =
    selectedCategory === "all"
      ? FAQ_DATA
      : FAQ_DATA.filter((faq) => faq.category === selectedCategory);

  /**
   * Opens the chatbot with a help message
   */
  const openChatbot = () => {
    document.dispatchEvent(
      new CustomEvent("railmadad:openChat", {
        detail: { mode: "enquiry" },
      })
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl pt-20">
      <Card className="w-full bg-white/90 backdrop-blur-sm shadow-xl border-t-4 border-t-[#8B0000]">
        <CardHeader className="bg-white border-b pb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle className="text-2xl font-bold text-red-800 flex items-center gap-2">
                <HelpCircle className="h-6 w-6" />
                Frequently Asked Questions
              </CardTitle>
              <p className="text-gray-600 text-sm mt-1">
                Find answers to common questions about RailMadad
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Quick Help Section */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 mb-6 border border-red-100">
            <h3 className="font-semibold text-gray-900 mb-2">
              Need Immediate Help?
            </h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={openChatbot}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Ask AI Assistant
              </Button>
              <a
                href="tel:139"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                <Phone className="h-4 w-4" />
                Call 139
              </a>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Filter by Category
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className={
                  selectedCategory === "all"
                    ? "bg-red-700 hover:bg-red-800"
                    : ""
                }
              >
                All Topics
              </Button>
              {FAQ_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <Button
                    key={cat.id}
                    variant={
                      selectedCategory === cat.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? "bg-red-700 hover:bg-red-800"
                        : ""
                    }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    {cat.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="border rounded-lg bg-white">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <FaqAccordionItem
                  key={index}
                  item={faq}
                  isOpen={openIndex === index}
                  onToggle={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                />
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No FAQs found for this category.</p>
              </div>
            )}
          </div>

          {/* Still Need Help Section */}
          <div className="mt-8 text-center bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Still have questions?
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Our AI-powered chatbot is available 24/7 to help you with any
              queries.
            </p>
            <Button
              onClick={openChatbot}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat with RailMadad AI
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaqPage;
