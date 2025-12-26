/**
 * List of Indian Railway Zones with their codes and headquarters.
 * Source: Official Indian Railways data.
 */

export interface RailwayZone {
  zone: string;
  code: string;
  headquarters: string;
}

export const RAILWAY_ZONES: RailwayZone[] = [
  { zone: "Central Railway", code: "CR", headquarters: "Mumbai CST" },
  { zone: "Western Railway", code: "WR", headquarters: "Mumbai Churchgate" },
  { zone: "Eastern Railway", code: "ER", headquarters: "Kolkata" },
  { zone: "Northern Railway", code: "NR", headquarters: "New Delhi" },
  { zone: "Southern Railway", code: "SR", headquarters: "Chennai" },
  { zone: "North Eastern Railway", code: "NER", headquarters: "Gorakhpur" },
  { zone: "Northeast Frontier Railway", code: "NFR", headquarters: "Guwahati" },
  {
    zone: "South Eastern Railway",
    code: "SER",
    headquarters: "Kolkata (Garden Reach)",
  },
  { zone: "South Central Railway", code: "SCR", headquarters: "Secunderabad" },
  { zone: "South Western Railway", code: "SWR", headquarters: "Hubballi" },
  { zone: "North Western Railway", code: "NWR", headquarters: "Jaipur" },
  { zone: "East Central Railway", code: "ECR", headquarters: "Hajipur" },
  { zone: "East Coast Railway", code: "ECOR", headquarters: "Bhubaneswar" },
  { zone: "North Central Railway", code: "NCR", headquarters: "Prayagraj" },
  {
    zone: "South East Central Railway",
    code: "SECR",
    headquarters: "Bilaspur",
  },
  { zone: "West Central Railway", code: "WCR", headquarters: "Jabalpur" },
  { zone: "Metro Railway", code: "MR", headquarters: "Kolkata" },
  { zone: "South Coast Railway", code: "SCOR", headquarters: "Visakhapatnam" },
];

export const ZONE_CODES = RAILWAY_ZONES.map((z) => z.code);
export const ZONE_NAMES = RAILWAY_ZONES.map((z) => z.zone);
