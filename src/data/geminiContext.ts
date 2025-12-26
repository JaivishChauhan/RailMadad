// Gemini Context Data - Modular context system for AI responses
export const geminiContextData = {
  // Core railway data - frequently used information
  coreRailwayData: {
    coachTypes: {
      'SL': 'Sleeper Class (non-AC)',
      '3A': 'AC 3 Tier',
      '2A': 'AC 2 Tier', 
      '1A': 'AC First Class',
      'CC': 'Chair Car (AC seating)',
      '2S': 'Second Sitting (non-AC seating)',
      'GEN': 'General (unreserved)'
    },
    berthTypes: {
      'LB': 'Lower Berth',
      'MB': 'Middle Berth', 
      'UB': 'Upper Berth',
      'SL': 'Side Lower',
      'SU': 'Side Upper'
    },
    trainNumbering: {
      firstDigitMeaning: {
        '0': 'Special trains (holiday/summer specials)',
        '1': 'Long-distance Mail/Express (premium services)',
        '2': 'Long-distance Mail/Express (premium services)', 
        '3': 'Kolkata suburban trains',
        '4': 'Suburban trains (Chennai, Delhi, Secunderabad)',
        '5': 'Passenger trains with conventional coaches',
        '6': 'MEMU (Mainline Electric Multiple Unit)',
        '7': 'DEMU (Diesel Electric Multiple Unit) and railcar',
        '8': 'Special purpose trains (Suvidha Express)',
        '9': 'Mumbai suburban trains, Vande Metro'
      },
      structure: '5-digit format: [Type][Zone/Division][Serial Number]'
    }
  },

  // Quick reference data
  quickReference: {
    emergencyNumbers: {
      'Railway Helpline': '139',
      'Railway Protection Force': '182', 
      'Medical Emergency': '108',
      'Police Emergency': '100'
    },
    majorStations: [
      'New Delhi (NDLS)',
      'Mumbai Central (MMCT)', 
      'Chennai Central (MAS)',
      'Kolkata (KOAA)',
      'Bangalore (SBC)'
    ],
    premiumTrains: [
      'Rajdhani Express',
      'Shatabdi Express',
      'Duronto Express', 
      'Vande Bharat Express',
      'Garib Rath'
    ]
  },

  // Complaint processing context
  complaintProcessing: {
    urgencyLevels: {
      high: ['Medical emergency', 'Security threat', 'Safety hazard', 'Accident'],
      medium: ['Service disruption', 'Staff misconduct', 'Equipment failure', 'Cleanliness'],
      low: ['Minor issues', 'Food quality', 'Information request', 'Suggestions']
    },
    responseTimeframes: {
      high: '2-4 hours (immediate escalation)',
      medium: '24-48 hours (standard processing)', 
      low: '3-7 days (routine handling)'
    },
    departments: {
      'Operations': 'Train delays, cancellations, schedule issues',
      'Maintenance': 'Coach defects, equipment, infrastructure',
      'Customer Service': 'Staff behavior, information, general service',
      'Security': 'Safety, theft, harassment, unauthorized persons',
      'Medical': 'Health emergencies, medical facilities',
      'Catering': 'Food quality, water, vending services',
      'Electrical': 'AC/heating, lighting, charging points',
      'Cleaning': 'Cleanliness in coaches or stations',
      'Ticketing': 'Booking, cancellation, refund issues'
    }
  },

  // Cultural and linguistic context
  culturalContext: {
    respectfulTerms: ['Ji', 'Sahab', 'Madam', 'Sir'],
    regionalLanguages: {
      north: ['Hindi', 'English', 'Punjabi', 'Urdu'],
      south: ['Tamil', 'Telugu', 'Kannada', 'Malayalam', 'English'],
      east: ['Bengali', 'Hindi', 'English', 'Assamese', 'Odia'],
      west: ['Marathi', 'Gujarati', 'Hindi', 'English'],
      northeast: ['Assamese', 'Bengali', 'English', 'local languages']
    },
    peakSeasons: {
      summer: 'April-June (vacation travel)',
      festival: 'October-November (Diwali, Durga Puja)',
      winter: 'December-February (wedding season)',
      monsoon: 'July-September (reduced travel)'
    }
  }
};

// Function to get contextual information based on complaint type
export const getContextualInfo = (complaintType: string): string => {
  switch (complaintType.toLowerCase()) {
    case 'cleanliness':
      return `Context: Cleanliness is a major concern in Indian Railways. Common issues include dirty toilets, unclean coaches, and poor maintenance. Expected resolution time is typically 24-48 hours for cleaning-related complaints.`;
    
    case 'medical':
      return `Context: Medical emergencies on trains require immediate attention. Indian Railways has medical facilities at major stations and some trains have medical kits. This is a high-priority complaint requiring 2-4 hour response time.`;
    
    case 'security':
      return `Context: Security concerns include theft, harassment, or safety threats. Railway Protection Force (RPF) handles security matters. This is typically a high-priority complaint.`;
    
    default:
      return `Context: This complaint will be processed according to Indian Railway's grievance handling system with appropriate priority and department assignment.`;
  }
};

// Dynamic context based on user location/language
export const getLocationContext = (stationCode?: string): string => {
  const majorStations = geminiContextData.quickReference.majorStations;
  const station = majorStations.find((s: string) => s.includes(stationCode || ''));
  
  if (station) {
    return `Location Context: ${station} is a major railway hub with enhanced facilities and faster complaint resolution.`;
  }
  
  return 'Location Context: Standard railway station with regular complaint handling procedures.';
};