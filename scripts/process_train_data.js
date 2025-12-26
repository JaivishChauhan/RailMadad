// Script to refine train data into structured DB table format
// Input: train_data.js with indianRailwayZones, indianTrainTypes, arrTrainList
// Output: refinedTrainData array with objects containing:
// { id, train_number, train_name, train_type, train_subtype, source_station, destination_station, zone }

import { writeFileSync } from "fs";
import {
  indianRailwayZones,
  indianTrainTypes,
  arrTrainList,
} from "./train_data.js";

// Function to determine train type and subtype based on train name
function determineTrainTypeAndSubtype(trainName) {
  const name = trainName.toUpperCase();

  // Check for high-speed trains
  if (
    name.includes("VANDE BHARAT") ||
    name.includes("GATIMAAN") ||
    name.includes("TEJAS")
  ) {
    return {
      type: "High-Speed and Semi-High-Speed Trains",
      subtype: "Vande Bharat Express",
    };
  }

  // Check for Rajdhani/Shatabdi
  if (name.includes("RAJDHANI")) {
    return { type: "Mail/Express Trains", subtype: "Rajdhani Express" };
  }
  if (name.includes("SHATABDI")) {
    return { type: "Mail/Express Trains", subtype: "Shatabdi Express" };
  }

  // Check for Duronto
  if (name.includes("DURONTO")) {
    return { type: "Mail/Express Trains", subtype: "Duronto Express" };
  }

  // Check for Garib Rath
  if (name.includes("GARIB RATH")) {
    return { type: "Mail/Express Trains", subtype: "Garib Rath Express" };
  }

  // Check for Express trains
  if (name.includes("EXPRESS") && !name.includes("SUPERFAST")) {
    return { type: "Mail/Express Trains", subtype: "Express Trains" };
  }

  // Check for Superfast
  if (name.includes("SUPERFAST") || name.includes("SF")) {
    return { type: "Mail/Express Trains", subtype: "Superfast Trains" };
  }

  // Check for Mail trains
  if (name.includes("MAIL")) {
    return { type: "Mail/Express Trains", subtype: "Mail Trains" };
  }

  // Check for Passenger trains
  if (name.includes("PASSENGER") || name.includes("PGR")) {
    return { type: "Passenger Trains", subtype: "Ordinary Passenger" };
  }

  // Check for MEMU/DEMU
  if (name.includes("MEMU") || name.includes("DEMU")) {
    return { type: "Passenger Trains", subtype: "MEMU/DEMU" };
  }

  // Check for Suburban/Local trains
  if (
    name.includes("LOCAL") ||
    name.includes("SUBURBAN") ||
    name.includes("EMU")
  ) {
    return { type: "Suburban Trains", subtype: "Suburban/Local Trains" };
  }

  // Check for Tourist trains
  if (
    name.includes("TOURIST") ||
    name.includes("DARJEELING") ||
    name.includes("HIMALAYAN")
  ) {
    return { type: "Tourist Trains", subtype: "Tourist Trains" };
  }

  // Default to Express if not matched
  return { type: "Mail/Express Trains", subtype: "Express Trains" };
}

// Function to infer zone based on train number or name
function determineZone(trainNumber, trainName) {
  const num = parseInt(trainNumber);
  const name = trainName.toUpperCase();

  // Northern Railway (00001-09999, 14001-19999, 25001-29999)
  if (
    (num >= 1 && num <= 9999) ||
    (num >= 14001 && num <= 19999) ||
    (num >= 25001 && num <= 29999)
  ) {
    return "Northern Railway";
  }

  // North Eastern Railway (13001-13999)
  if (num >= 13001 && num <= 13999) {
    return "North Eastern Railway";
  }

  // Northeast Frontier Railway (55001-59999)
  if (num >= 55001 && num <= 59999) {
    return "Northeast Frontier Railway";
  }

  // Eastern Railway (13001-13999, 22001-24999, 31001-39999)
  if ((num >= 22001 && num <= 24999) || (num >= 31001 && num <= 39999)) {
    return "Eastern Railway";
  }

  // South Eastern Railway (58001-59999)
  if (num >= 58001 && num <= 59999) {
    return "South Eastern Railway";
  }

  // South Central Railway (56001-57999, 72001-79999)
  if ((num >= 56001 && num <= 57999) || (num >= 72001 && num <= 79999)) {
    return "South Central Railway";
  }

  // Southern Railway (56001-59999, 66001-69999, 95001-99999)
  if ((num >= 66001 && num <= 69999) || (num >= 95001 && num <= 99999)) {
    return "Southern Railway";
  }

  // Central Railway (51001-53999, 61001-64999)
  if ((num >= 51001 && num <= 53999) || (num >= 61001 && num <= 64999)) {
    return "Central Railway";
  }

  // Western Railway (59001-59999, 69001-69999)
  if ((num >= 59001 && num <= 59999) || (num >= 69001 && num <= 69999)) {
    return "Western Railway";
  }

  // North Western Railway (74001-74999)
  if (num >= 74001 && num <= 74999) {
    return "North Western Railway";
  }

  // West Central Railway (75001-79999)
  if (num >= 75001 && num <= 79999) {
    return "West Central Railway";
  }

  // North Central Railway (84001-89999)
  if (num >= 84001 && num <= 89999) {
    return "North Central Railway";
  }

  // South Western Railway (91001-94999)
  if (num >= 91001 && num <= 94999) {
    return "South Western Railway";
  }

  // East Central Railway (92001-94999)
  if (num >= 92001 && num <= 94999) {
    return "East Central Railway";
  }

  // East Coast Railway (83001-83999)
  if (num >= 83001 && num <= 83999) {
    return "East Coast Railway";
  }

  // South East Central Railway (88001-89999)
  if (num >= 88001 && num <= 89999) {
    return "South East Central Railway";
  }

  // Metro Railway (93001-94999)
  if (num >= 93001 && num <= 94999) {
    return "Metro Railway";
  }

  // Default to Northern Railway if not matched
  return "Northern Railway";
}

// Function to extract source and destination from train name (basic inference)
function extractSourceDestination(trainName) {
  const name = trainName.toUpperCase();

  // Look for patterns like "SOURCE - DESTINATION"
  const dashPattern = name.match(
    /^(.+?)\s*-\s*(.+?)\s*(?:LOCAL|EXPRESS|PASSENGER|MAIL)?$/
  );
  if (dashPattern) {
    return {
      source: dashPattern[1].trim(),
      destination: dashPattern[2].trim(),
    };
  }

  // For express trains, try to extract from name
  if (name.includes("EXPRESS")) {
    // This is a simplified approach - in reality, you'd need a comprehensive mapping
    return { source: null, destination: null };
  }

  return { source: null, destination: null };
}

// Main processing function
function refineTrainData() {
  const refinedData = [];

  arrTrainList.forEach((trainEntry, index) => {
    // Parse train entry: "train_number- train_name"
    const parts = trainEntry.split("-");
    if (parts.length < 2) return; // Skip invalid entries

    const trainNumber = parts[0].trim();
    const trainName = parts.slice(1).join("-").trim();

    // Determine type and subtype
    const { type: trainType, subtype: trainSubtype } =
      determineTrainTypeAndSubtype(trainName);

    // Determine zone
    const zone = determineZone(trainNumber, trainName);

    // Extract source and destination
    const { source: sourceStation, destination: destinationStation } =
      extractSourceDestination(trainName);

    // Create refined object
    const refinedTrain = {
      id: index + 1,
      train_number: trainNumber,
      train_name: trainName,
      train_type: trainType,
      train_subtype: trainSubtype,
      source_station: sourceStation,
      destination_station: destinationStation,
      zone: zone,
    };

    refinedData.push(refinedTrain);
  });

  return refinedData;
}

// Export the refined data
const refinedTrainData = refineTrainData();

console.log(`Processed ${refinedTrainData.length} train entries`);
console.log("Sample refined train data:");
console.log(JSON.stringify(refinedTrainData.slice(0, 5), null, 2));

// Save to file
writeFileSync(
  "refined_train_data.json",
  JSON.stringify(refinedTrainData, null, 2)
);
console.log("Full refined data saved to refined_train_data.json");

// You can save this to a file or use it as needed
export { refinedTrainData };
