/**
 * Allied Air Product Catalog - Real 2024 Data
 * Based on actual Armstrong Air, AirEase, and Ducane product lines
 */

// Our Allied Air Price Book (What we sell)
export const alliedAirCatalog = [
  // Heat Pumps - Armstrong Air
  {
    id: 1,
    sku: 'ARM-4SHP15LE024-AA',
    model: '4SHP15LE024P',
    brand: 'Armstrong Air',
    type: 'Heat Pump',
    tonnage: 2,
    seer: 15,
    seer2: 15.2,
    hspf: 8.5,
    hspf2: 7.5,
    refrigerant: 'R-410A',
    price: 2850,
    description: '2 ton 15 SEER Heat Pump with Quiet Shift Technology'
  },
  {
    id: 2,
    sku: 'ARM-4SHP15LE036-AA',
    model: '4SHP15LE036P',
    brand: 'Armstrong Air',
    type: 'Heat Pump',
    tonnage: 3,
    seer: 15,
    seer2: 15.2,
    hspf: 8.5,
    hspf2: 7.5,
    refrigerant: 'R-410A',
    price: 3100,
    description: '3 ton 15 SEER Heat Pump with Quiet Shift Technology'
  },
  {
    id: 3,
    sku: 'ARM-4SHP17LE024-AA',
    model: '4SHP17LE024P',
    brand: 'Armstrong Air',
    type: 'Heat Pump',
    tonnage: 2,
    seer: 17,
    seer2: 16.2,
    hspf: 9.0,
    hspf2: 7.5,
    refrigerant: 'R-410A',
    price: 3200,
    description: '2 ton 17 SEER Heat Pump ENERGY STAR certified'
  },
  {
    id: 4,
    sku: 'ARM-4SHP17LE036-AA',
    model: '4SHP17LE036P',
    brand: 'Armstrong Air',
    type: 'Heat Pump',
    tonnage: 3,
    seer: 17,
    seer2: 16.2,
    hspf: 9.0,
    hspf2: 7.5,
    refrigerant: 'R-410A',
    price: 3450,
    description: '3 ton 17 SEER Heat Pump ENERGY STAR certified'
  },
  {
    id: 5,
    sku: 'ARM-4SHP20LX036-AA',
    model: '4SHP20LX036P',
    brand: 'Armstrong Air',
    type: 'Heat Pump',
    tonnage: 3,
    seer: 20,
    seer2: 19.0,
    hspf: 10.0,
    hspf2: 8.5,
    refrigerant: 'R-410A',
    price: 4200,
    description: '3 ton 20 SEER Variable-Capacity Heat Pump Pro Series'
  },
  {
    id: 6,
    sku: 'ARM-4SHP22LX036-AA',
    model: '4SHP22LX036P',
    brand: 'Armstrong Air',
    type: 'Heat Pump',
    tonnage: 3,
    seer: 22,
    seer2: 20.9,
    hspf: 11.0,
    hspf2: 9.5,
    refrigerant: 'R-410A',
    price: 4850,
    description: '3 ton 22 SEER Premium Pro Series Variable-Speed Heat Pump'
  },

  // AirEase Heat Pumps (same models, different brand)
  {
    id: 7,
    sku: 'AE-4SHP17LE024-AE',
    model: '4SHP17LE024P',
    brand: 'AirEase',
    type: 'Heat Pump',
    tonnage: 2,
    seer: 17,
    seer2: 16.2,
    hspf: 9.0,
    hspf2: 7.5,
    refrigerant: 'R-410A',
    price: 3150,
    description: '2 ton 17 SEER Heat Pump ENERGY STAR certified'
  },
  {
    id: 8,
    sku: 'AE-4SHP20LX048-AE',
    model: '4SHP20LX048P',
    brand: 'AirEase',
    type: 'Heat Pump',
    tonnage: 4,
    seer: 20,
    seer2: 19.0,
    hspf: 10.0,
    hspf2: 8.5,
    refrigerant: 'R-410A',
    price: 4650,
    description: '4 ton 20 SEER Variable-Capacity Heat Pump Pro Series'
  },

  // Air Conditioners
  {
    id: 9,
    sku: 'ARM-4SCU13LE036-AA',
    model: '4SCU13LE036P',
    brand: 'Armstrong Air',
    type: 'AC',
    tonnage: 3,
    seer: 13,
    seer2: 13.4,
    refrigerant: 'R-410A',
    price: 2450,
    description: '3 ton 13 SEER Single-Stage Air Conditioner'
  },
  {
    id: 10,
    sku: 'ARM-4SCU16LE036-AA',
    model: '4SCU16LE036P',
    brand: 'Armstrong Air',
    type: 'AC',
    tonnage: 3,
    seer: 16,
    seer2: 15.2,
    refrigerant: 'R-410A',
    price: 2950,
    description: '3 ton 16 SEER Air Conditioner ENERGY STAR certified'
  },
  {
    id: 11,
    sku: 'AE-4SCU13LE024-AE',
    model: '4SCU13LE024P',
    brand: 'AirEase',
    type: 'AC',
    tonnage: 2,
    seer: 13,
    seer2: 13.4,
    refrigerant: 'R-410A',
    price: 2200,
    description: '2 ton 13 SEER Single-Stage Air Conditioner'
  },

  // Gas Furnaces - Armstrong Air
  {
    id: 12,
    sku: 'ARM-A972E070-AA',
    model: 'A972E070B12S',
    brand: 'Armstrong Air',
    type: 'Furnace',
    btu_input: 70000,
    btu_output: 67900,
    afue: 97,
    fuel_type: 'Natural Gas',
    price: 2800,
    description: '70K BTU 97% AFUE Two-Stage Gas Furnace with Constant Torque Motor'
  },
  {
    id: 13,
    sku: 'ARM-A972V100-AA',
    model: 'A972V100B12S',
    brand: 'Armstrong Air',
    type: 'Furnace',
    btu_input: 100000,
    btu_output: 97000,
    afue: 97,
    fuel_type: 'Natural Gas',
    price: 3200,
    description: '100K BTU 97% AFUE Two-Stage Gas Furnace with Variable Speed Motor'
  },
  {
    id: 14,
    sku: 'ARM-A97MV080-AA',
    model: 'A97MV080B12S',
    brand: 'Armstrong Air',
    type: 'Furnace',
    btu_input: 80000,
    btu_output: 77600,
    afue: 97,
    fuel_type: 'Natural Gas',
    price: 3450,
    description: '80K BTU 97% AFUE Modulating Gas Furnace'
  },

  // Ducane Furnaces
  {
    id: 15,
    sku: 'DUC-97G2E080-DC',
    model: '97G2E080B12S',
    brand: 'Ducane',
    type: 'Furnace',
    btu_input: 80000,
    btu_output: 77600,
    afue: 97,
    fuel_type: 'Natural Gas',
    price: 2750,
    description: '80K BTU 97% AFUE Two-Stage Gas Furnace with Constant Torque Motor'
  },
  {
    id: 16,
    sku: 'DUC-97G2V100-DC',
    model: '97G2V100B12S',
    brand: 'Ducane',
    type: 'Furnace',
    btu_input: 100000,
    btu_output: 97000,
    afue: 97,
    fuel_type: 'Natural Gas',
    price: 3150,
    description: '100K BTU 97% AFUE Two-Stage Gas Furnace with Variable Speed Motor'
  },

  // All-Climate Heat Pumps (2024 Cold Climate models)
  {
    id: 17,
    sku: 'ARM-A7CP21V036-AA',
    model: 'A7CP21V036P',
    brand: 'Armstrong Air',
    type: 'Heat Pump',
    tonnage: 3,
    seer: 21.5,
    seer2: 21.0,
    hspf: 12.0,
    hspf2: 10.0,
    refrigerant: 'R-454B',
    price: 5200,
    description: '3 ton 21 SEER All-Climate Heat Pump with Cold Climate Technology'
  },

  // Package Units
  {
    id: 18,
    sku: 'ARM-4GCC13H036-AA',
    model: '4GCC13H036P',
    brand: 'Armstrong Air',
    type: 'Package Unit',
    tonnage: 3,
    seer: 13,
    seer2: 13.4,
    refrigerant: 'R-410A',
    price: 4100,
    description: '3 ton 13 SEER Gas/Electric Package Unit'
  },

  // Air Handlers
  {
    id: 19,
    sku: 'ARM-A80UH1B024-AA',
    model: 'A80UH1B024P',
    brand: 'Armstrong Air',
    type: 'Air Handler',
    tonnage: 2,
    cfm: 800,
    price: 1450,
    description: '2 ton Multi-Position Air Handler with ECM Motor'
  },
  {
    id: 20,
    sku: 'AE-A80UH1B036-AE',
    model: 'A80UH1B036P',
    brand: 'AirEase',
    type: 'Air Handler',
    tonnage: 3,
    cfm: 1200,
    price: 1650,
    description: '3 ton Multi-Position Air Handler with ECM Motor'
  }
];

// Competitor products to test matching against
export const competitorProducts = [
  // Exact matches (should stop at Stage 1)
  {
    name: 'Exact SKU Match Test',
    sku: 'ARM-4SHP17LE036-AA', // Exact match to our catalog
    company: 'Competitor Supply Co',
    model: 'COMP-HP-3T-17S',
    price: 3600,
    description: 'Competitor 3 ton heat pump'
  },
  {
    name: 'Exact Model Match Test',
    sku: 'COMP-DIFFERENT-SKU',
    company: 'HVAC Outlet',
    model: '4SHP20LX036P', // Exact match to our model
    price: 4400,
    description: 'Variable capacity heat pump'
  },

  // Fuzzy matches (should succeed at Stage 2)
  {
    name: 'Similar Armstrong Model',
    sku: 'COMPETITOR-HP-20SEER',
    company: 'Regional HVAC',
    model: '4SHP20LX036P-ALT', // Very similar to 4SHP20LX036P
    price: 4150,
    description: 'High efficiency variable speed heat pump'
  },

  // Specification matches (should succeed at Stage 3)
  {
    name: 'Generic 3-Ton 17 SEER HP',
    sku: 'GENERIC-3T-17S-HP',
    company: 'Budget HVAC',
    model: 'BHP-3T-17SEER',
    price: 3300,
    description: '3 ton 17 SEER heat pump system',
    specifications: {
      tonnage: 3,
      seer: 17,
      hspf: 9.0,
      product_type: 'Heat Pump',
      refrigerant: 'R-410A'
    }
  },
  {
    name: '97% AFUE Furnace Match',
    sku: 'BUDGET-FURN-100K',
    company: 'Discount Heating',
    model: 'DF-100K-97AFUE',
    price: 2900,
    description: '100,000 BTU 97% AFUE gas furnace',
    specifications: {
      btu_input: 100000,
      afue: 97,
      fuel_type: 'Natural Gas',
      product_type: 'Furnace'
    }
  },

  // AI Enhancement scenarios (require HVAC knowledge)
  {
    name: 'Trane Heat Pump (Cross-Brand)',
    sku: 'TRANE-XR16-036',
    company: 'Trane',
    model: 'XR16036000',
    price: 3800,
    description: 'Trane XR16 3 ton 16 SEER heat pump with scroll compressor',
    specifications: {
      capacity: '36000 BTU',
      efficiency: '16 SEER',
      compressor_type: 'scroll',
      refrigerant: 'R-410A',
      tonnage: 3,
      seer: 16,
      product_type: 'heat_pump'
    }
  },
  {
    name: 'Carrier Heat Pump (Cross-Brand)',
    sku: 'CARRIER-25HCB336A300',
    company: 'Carrier',
    model: '25HCB336A300',
    price: 3650,
    description: 'Carrier Comfort 3 ton 15.5 SEER heat pump',
    specifications: {
      tonnage: 3,
      seer: 15.5,
      refrigerant: 'R-410A',
      product_type: 'heat_pump',
      brand_equivalent: 'mid-tier'
    }
  },
  {
    name: 'Lennox Furnace (Premium Brand)',
    sku: 'LENNOX-EL296V070',
    company: 'Lennox',
    model: 'EL296V070C36B',
    price: 3400,
    description: 'Lennox Elite 70K BTU 96% AFUE variable speed furnace',
    specifications: {
      btu_input: 70000,
      afue: 96,
      motor_type: 'variable_speed',
      fuel_type: 'natural_gas',
      product_type: 'furnace'
    }
  },
  {
    name: 'Rheem Classic Heat Pump',
    sku: 'RHEEM-RP1636AJ1NA',
    company: 'Rheem',
    model: 'RP1636AJ1NA',
    price: 3200,
    description: 'Rheem Classic Plus 3 ton 16 SEER heat pump',
    specifications: {
      tonnage: 3,
      seer: 16,
      refrigerant: 'R-410A',
      product_type: 'heat_pump',
      compressor_stages: 'single'
    }
  },
  {
    name: 'Goodman Variable Speed Furnace',
    sku: 'GOODMAN-GMVC96070',
    company: 'Goodman',
    model: 'GMVC960703BN',
    price: 2650,
    description: 'Goodman 70K BTU 96% AFUE variable speed modulating furnace',
    specifications: {
      btu_input: 70000,
      afue: 96,
      motor_type: 'variable_speed',
      fuel_type: 'natural_gas',
      modulating: true
    }
  },

  // Should fail (non-HVAC or incompatible)
  {
    name: 'Pool Heat Pump (Should Fail)',
    sku: 'POOL-HP-125K',
    company: 'AquaTemp',
    model: 'AT-125K-POOL',
    price: 3800,
    description: '125K BTU pool heat pump',
    specifications: {
      btu: 125000,
      application: 'pool_heating',
      refrigerant: 'R-407C'
    }
  },
  {
    name: 'Commercial RTU (Should Fail)',
    sku: 'COMMERCIAL-RTU-10T',
    company: 'Commercial HVAC Inc',
    model: 'RTU-10T-13EER',
    price: 12500,
    description: '10 ton commercial rooftop unit',
    specifications: {
      tonnage: 10,
      eer: 13,
      application: 'commercial',
      voltage: '460V'
    }
  }
];

export default {
  alliedAirCatalog,
  competitorProducts
};