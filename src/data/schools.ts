import type { School, University } from "../types";

/**
 * ILLUSTRATIVE placement bands. Real CSSPS cut-offs change every year and
 * depend on school demand and boarding or day status. Treat output as a
 * planning guide and confirm with the official CSSPS portal.
 */
export const PLACEMENT_NOTICE =
  "Indicative bands only. Official CSSPS placement and university cut-offs change every year; always confirm on the official portals.";

export const SCHOOLS: School[] = [
  { name: "PRESEC Legon", category: "A", region: "Greater Accra", maxAggregate: 10 },
  { name: "Wesley Girls' High School", category: "A", region: "Central", maxAggregate: 10 },
  { name: "Achimota School", category: "A", region: "Greater Accra", maxAggregate: 12 },
  { name: "Prempeh College", category: "A", region: "Ashanti", maxAggregate: 12 },
  { name: "Holy Child School", category: "A", region: "Central", maxAggregate: 12 },
  { name: "Mfantsipim School", category: "A", region: "Central", maxAggregate: 12 },
  { name: "Aburi Girls' SHS", category: "B", region: "Eastern", maxAggregate: 20 },
  { name: "Tamale SHS", category: "B", region: "Northern", maxAggregate: 24 },
  { name: "Ghana National College", category: "B", region: "Central", maxAggregate: 24 },
  { name: "Community Day SHS (typical)", category: "C", region: "Various", maxAggregate: 36 },
  { name: "Rural Day SHS (typical)", category: "C", region: "Various", maxAggregate: 54 },
];

export const UNIVERSITIES: University[] = [
  { name: "University of Ghana", programme: "Highly competitive (e.g. Medicine, Law)", maxAggregate: 10 },
  { name: "KNUST", programme: "Highly competitive (e.g. Engineering, Pharmacy)", maxAggregate: 12 },
  { name: "University of Cape Coast", programme: "Competitive (e.g. Education, Sciences)", maxAggregate: 18 },
  { name: "University of Ghana", programme: "General programmes", maxAggregate: 24 },
  { name: "KNUST", programme: "General programmes", maxAggregate: 24 },
  { name: "University of Cape Coast", programme: "General programmes", maxAggregate: 24 },
];
