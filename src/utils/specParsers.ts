export interface EquipmentRow {
  equipment: string;
  brand: string;
  model: string;
  serial: string;
  year: string;
}

export interface LifeSupportRow {
  system: string;
  location: string;
  controlLocation: string;
}

export interface StructuralRow {
  foundation: string;
  walls: string;
  glassFormula: string;
  windowType: string;
}

export interface BuildingInfo {
  yearBuilt: string;
  structures: StructuralRow[];
}

export interface GeneralSpecs {
  totalArea: string;
  floorsCount: string;
  material: string;
  foundation: string;
}

export interface SpecsData {
  general: GeneralSpecs;
  lifeSupport: LifeSupportRow[];
}

// Safely parse Specs (General specs + Life Support list) from string
export function parseSpecs(val?: string): SpecsData {
  const defaultVal: SpecsData = {
    general: { totalArea: "", floorsCount: "", material: "", foundation: "" },
    lifeSupport: []
  };
  if (!val) return defaultVal;
  const trimmed = val.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        ...defaultVal,
        lifeSupport: parsed
      };
    } catch (e) {
      console.warn("Failed to parse specs array JSON:", e);
    }
  } else if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        general: {
          totalArea: parsed.totalArea || "",
          floorsCount: parsed.floorsCount || "",
          material: parsed.material || "",
          foundation: parsed.foundation || ""
        },
        lifeSupport: parsed.lifeSupport || []
      };
    } catch (e) {
      console.warn("Failed to parse specs object JSON:", e);
    }
  }
  // Fallback representation for legacy text
  return {
    general: {
      totalArea: "",
      floorsCount: "",
      material: trimmed,
      foundation: ""
    },
    lifeSupport: []
  };
}

// Safely parse Equipment List from string
export function parseEquipment(val?: string): EquipmentRow[] {
  if (!val) return [];
  const trimmed = val.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.map((item: any) => ({
        equipment: item.equipment || "",
        brand: item.brand || "",
        model: item.model || "",
        serial: item.serial || "",
        year: item.year || ""
      }));
    } catch (e) {
      console.warn("Failed to parse equipment JSON, falling back to raw text:", e);
    }
  }
  // Fallback representation for legacy text
  return [{
    equipment: trimmed,
    brand: "Не указана",
    model: "Не указана",
    serial: "Не указан",
    year: "—"
  }];
}

// Safely parse Life Support Systems list from string (legacy helper)
export function parseLifeSupport(val?: string): LifeSupportRow[] {
  return parseSpecs(val).lifeSupport;
}

// Safely parse Building Commissioning and structure details from string
export function parseBuildingInfo(val?: string): BuildingInfo {
  const defaultVal: BuildingInfo = { yearBuilt: "", structures: [] };
  if (!val) return defaultVal;
  const trimmed = val.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      console.warn("Failed to parse building info JSON, falling back to raw text:", e);
    }
  }
  // Fallback parsing for legacy text (usually "YYYY год" or similar, or foundation details)
  const digitsMatch = trimmed.match(/\b(19|20)\d{2}\b/);
  const yearBuilt = digitsMatch ? digitsMatch[0] : "";
  return {
    yearBuilt: yearBuilt,
    structures: [
      {
        foundation: "Не определен",
        walls: trimmed,
        glassFormula: "Не заполнено",
        windowType: "Не заполнено"
      }
    ]
  };
}
