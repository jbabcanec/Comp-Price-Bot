/**
 * UNIVERSAL HVAC Industry Constants - Dynamic and Comprehensive
 * Supports ANY HVAC product type across residential, commercial, and industrial applications
 */

/**
 * Core HVAC Product Categories - Comprehensive Industry Coverage
 */
export const HVAC_PRODUCT_CATEGORIES = {
  // Heating Equipment
  HEATING: {
    'furnaces': ['gas', 'electric', 'oil', 'dual-fuel', 'modulating', 'condensing'],
    'boilers': ['steam', 'hot-water', 'combination', 'condensing', 'non-condensing'],
    'heat-pumps': ['air-source', 'ground-source', 'water-source', 'hybrid', 'ductless'],
    'unit-heaters': ['gas-fired', 'electric', 'hot-water', 'steam', 'infrared'],
    'radiant-heating': ['hydronic', 'electric', 'in-floor', 'ceiling', 'wall-mounted']
  },

  // Cooling Equipment  
  COOLING: {
    'air-conditioners': ['central', 'window', 'portable', 'ductless', 'packaged'],
    'chillers': ['air-cooled', 'water-cooled', 'absorption', 'centrifugal', 'screw'],
    'cooling-towers': ['open-circuit', 'closed-circuit', 'natural-draft', 'mechanical-draft'],
    'evaporative-coolers': ['direct', 'indirect', 'two-stage', 'residential', 'commercial']
  },

  // Air Handling & Distribution
  AIR_SYSTEMS: {
    'ahu': ['rooftop', 'indoor', 'modular', 'custom', 'energy-recovery'],
    'fans': ['centrifugal', 'axial', 'mixed-flow', 'inline', 'exhaust'],
    'blowers': ['forward-curved', 'backward-curved', 'radial', 'high-pressure'],
    'air-curtains': ['heated', 'unheated', 'industrial', 'commercial'],
    'ventilation': ['exhaust', 'supply', 'energy-recovery', 'demand-controlled']
  },

  // Package Units & All-in-One
  PACKAGED: {
    'rooftop-units': ['gas-electric', 'electric-electric', 'heat-pump', 'vrf', 'dx'],
    'package-units': ['through-wall', 'window', 'floor-console', 'ceiling'],
    'magic-pak': ['all-in-one', 'ttw', 'multi-family', 'hotel-motel'],
    'split-systems': ['traditional', 'mini-split', 'multi-split', 'vrf-vrv'],
    'self-contained': ['portable', 'computer-room', 'precision', 'spot-cooling']
  },

  // Components & Parts
  COMPONENTS: {
    'coils': ['evaporator', 'condenser', 'heating', 'cooling', 'custom'],
    'filters': ['pleated', 'hepa', 'carbon', 'electrostatic', 'washable'],
    'dampers': ['fire', 'smoke', 'volume', 'bypass', 'backdraft'],
    'controls': ['thermostats', 'sensors', 'actuators', 'controllers', 'building-automation'],
    'valves': ['gas', 'water', 'refrigerant', 'expansion', 'solenoid'],
    'motors': ['blower', 'condenser', 'inducer', 'variable-speed', 'ecm'],
    'compressors': ['reciprocating', 'scroll', 'screw', 'centrifugal', 'rotary'],
    'accessories': ['humidifiers', 'dehumidifiers', 'uv-lights', 'air-purifiers']
  }
} as const;

/**
 * Universal Specification Parameters - Dynamic Detection
 */
export const SPEC_PARAMETERS = {
  // Capacity & Performance
  CAPACITY: {
    patterns: [
      /(\d+(?:\.\d+)?)\s*(?:btu|btuh|mbh)/gi,
      /(\d+(?:\.\d+)?)\s*(?:ton|tons|tonnage)/gi,
      /(\d+(?:\.\d+)?)\s*(?:kw|kilowatt)/gi,
      /(\d+(?:\.\d+)?)\s*(?:cfm|cubic feet)/gi,
      /(\d+(?:\.\d+)?)\s*(?:gpm|gallons per minute)/gi
    ],
    units: ['BTU', 'BTUH', 'MBH', 'TON', 'KW', 'CFM', 'GPM']
  },

  // Efficiency Ratings - Universal Detection
  EFFICIENCY: {
    patterns: [
      /(?:seer|seasonal energy efficiency)[\s:]*(\d+(?:\.\d+)?)/gi,
      /(?:seer2)[\s:]*(\d+(?:\.\d+)?)/gi,
      /(?:eer|energy efficiency ratio)[\s:]*(\d+(?:\.\d+)?)/gi,
      /(?:ieer)[\s:]*(\d+(?:\.\d+)?)/gi,
      /(?:afue|annual fuel utilization)[\s:]*(\d+(?:\.\d+)?)%?/gi,
      /(?:hspf|heating seasonal performance)[\s:]*(\d+(?:\.\d+)?)/gi,
      /(?:cop|coefficient of performance)[\s:]*(\d+(?:\.\d+)?)/gi,
      /(?:scop|seasonal cop)[\s:]*(\d+(?:\.\d+)?)/gi,
      /(\d+(?:\.\d+)?)%?\s*(?:efficiency|eff)/gi
    ],
    types: ['SEER', 'SEER2', 'EER', 'IEER', 'AFUE', 'HSPF', 'COP', 'SCOP', 'EFFICIENCY']
  },

  // Physical Dimensions
  DIMENSIONS: {
    patterns: [
      /(\d+(?:\.\d+)?)\s*(?:x|\u00d7)\s*(\d+(?:\.\d+)?)\s*(?:x|\u00d7)\s*(\d+(?:\.\d+)?)\s*(?:in|inch|ft|feet)/gi,
      /(?:length|width|height|depth)[\s:]*(\d+(?:\.\d+)?)\s*(?:in|inch|ft|feet)/gi,
      /(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds|kg|kilograms)/gi
    ],
    types: ['DIMENSIONS', 'LENGTH', 'WIDTH', 'HEIGHT', 'WEIGHT']
  },

  // Electrical Specifications
  ELECTRICAL: {
    patterns: [
      /(\d+)\s*(?:volt|v|voltage)/gi,
      /(\d+)\s*(?:amp|amps|amperage)/gi,
      /(\d+)\s*(?:phase|ph|\u03a6)/gi,
      /(\d+)\s*(?:hz|hertz|frequency)/gi,
      /(\d+(?:\.\d+)?)\s*(?:kw|kilowatt)/gi
    ],
    types: ['VOLTAGE', 'AMPERAGE', 'PHASE', 'FREQUENCY', 'POWER']
  },

  // Operating Conditions
  OPERATING: {
    patterns: [
      /(?:static pressure|sp)[\s:]*(\d+(?:\.\d+)?)\s*(?:in|wc|iwc)/gi,
      /(?:temperature range|temp)[\s:]*(-?\d+)\s*to\s*(\d+)\s*(?:f|fahrenheit|c|celsius)/gi,
      /(?:pressure|psi)[\s:]*(\d+(?:\.\d+)?)/gi,
      /(?:flow rate|flow)[\s:]*(\d+(?:\.\d+)?)\s*(?:cfm|gpm|lpm)/gi
    ],
    types: ['STATIC_PRESSURE', 'TEMP_RANGE', 'PRESSURE', 'FLOW_RATE']
  },

  // Refrigerant & Fuel Types
  REFRIGERANT: {
    patterns: [
      /(r[-\s]?(?:22|410a?|32|454[bc]|290|407[abc]|134a|404a|507|717))/gi,
      /(?:natural gas|propane|electric|oil|diesel)/gi
    ],
    types: ['REFRIGERANT', 'FUEL_TYPE']
  }
} as const;

/**
 * Dynamic Product Type Detection Patterns
 */
export const PRODUCT_TYPE_PATTERNS = {
  'furnace': [
    /furnace/gi, /gas\s+heat/gi, /heating\s+unit/gi, /warm\s+air/gi
  ],
  'boiler': [
    /boiler/gi, /steam/gi, /hot\s+water\s+heat/gi, /hydronic/gi
  ],
  'heat-pump': [
    /heat\s+pump/gi, /hp\b/gi, /heating\s*\/\s*cooling/gi, /dual\s+fuel/gi
  ],
  'air-conditioner': [
    /air\s+condition/gi, /a\/c/gi, /cooling/gi, /condenser/gi, /dx\s+unit/gi
  ],
  'ahu': [
    /air\s+handler/gi, /ahu/gi, /air\s+handling/gi, /fan\s+coil/gi
  ],
  'rooftop-unit': [
    /rooftop/gi, /rtu/gi, /packaged\s+unit/gi, /roof\s+top/gi
  ],
  'chiller': [
    /chiller/gi, /cooling\s+tower/gi, /process\s+cooling/gi
  ],
  'coil': [
    /coil/gi, /evaporator/gi, /condenser\s+coil/gi, /heating\s+coil/gi
  ],
  'fan': [
    /fan/gi, /blower/gi, /exhaust/gi, /ventilation/gi, /air\s+mover/gi
  ],
  'filter': [
    /filter/gi, /air\s+clean/gi, /hepa/gi, /filtration/gi
  ],
  'damper': [
    /damper/gi, /louver/gi, /fire\s+damper/gi, /smoke\s+damper/gi
  ],
  'control': [
    /thermostat/gi, /control/gi, /sensor/gi, /actuator/gi, /automation/gi
  ],
  'valve': [
    /valve/gi, /gas\s+valve/gi, /water\s+valve/gi, /expansion\s+valve/gi
  ],
  'compressor': [
    /compressor/gi, /scroll/gi, /reciprocating/gi, /screw\s+compressor/gi
  ],
  'motor': [
    /motor/gi, /blower\s+motor/gi, /fan\s+motor/gi, /ecm/gi, /variable\s+speed/gi
  ],
  'accessory': [
    /humidifier/gi, /dehumidifier/gi, /uv\s+light/gi, /air\s+purifier/gi
  ]
} as const;

/**
 * Universal Brand Detection - No Hardcoding
 */
export const BRAND_DETECTION_PATTERNS = [
  // Common brand prefix patterns
  /^([A-Z]{2,5})[-\s]/i,    // TRN-, CAR-, LEN-, etc.
  /\b([A-Z][a-z]+)\s+\w/g,  // Brand Name + model
  /brand[\s:]+([A-Z][A-Za-z\s&]+)/gi,
  /manufacturer[\s:]+([A-Z][A-Za-z\s&]+)/gi,
  /mfg[\s:]+([A-Z][A-Za-z\s&]+)/gi
];

/**
 * Universal Specification Extraction Engine
 */
export const UNIVERSAL_EXTRACTION_PATTERNS = {
  // Model/SKU patterns - completely flexible
  MODEL_SKU: [
    /(?:model|sku|part\s*#|p\/n)[\s:#]*([A-Z0-9][\w\-\/\.]{2,30})/gi,
    /\b([A-Z]{2,4}[\-\s]?[0-9X]{2,6}[\-\s]?[A-Z0-9]{2,8})\b/gi,
    /\b([0-9]{2,3}[A-Z]{2,6}[0-9]{3,8}[A-Z]?)\b/gi,
    /\b([A-Z]{3,6}[0-9]{3,8}[A-Z]{0,4})\b/gi
  ],

  // Price patterns - universal currency detection
  PRICE: [
    /[\$\€\£\¥][\s]*([0-9,]+\.?[0-9]*)/g,
    /(?:price|cost|msrp|list)[\s:$]*([0-9,]+\.?[0-9]*)/gi,
    /([0-9,]+\.?[0-9]*)\s*(?:dollars?|usd|eur|gbp)/gi
  ],

  // Company/Brand patterns - dynamic detection
  COMPANY: [
    /(?:company|brand|manufacturer|mfg)[\s:]+([A-Za-z][A-Za-z\s&\.]{2,40})/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:model|series)/gi,
    /^([A-Z][A-Za-z\s&\.]{2,25})\s*[-:]?\s*[A-Z0-9]/gm
  ]
} as const;

/**
 * Application Categories - Industry Coverage
 */
export const APPLICATION_CATEGORIES = {
  RESIDENTIAL: ['single-family', 'multi-family', 'apartment', 'condo', 'townhouse'],
  LIGHT_COMMERCIAL: ['retail', 'office', 'restaurant', 'medical', 'education'],
  COMMERCIAL: ['warehouse', 'manufacturing', 'hospital', 'hotel', 'shopping-center'],
  INDUSTRIAL: ['process-cooling', 'process-heating', 'clean-room', 'data-center'],
  SPECIALTY: ['marine', 'mobile', 'temporary', 'emergency', 'military']
} as const;

/**
 * Size/Capacity Ranges - Universal Scaling
 */
export const CAPACITY_RANGES = {
  RESIDENTIAL: { min: 0.5, max: 10, unit: 'tons' },
  LIGHT_COMMERCIAL: { min: 2, max: 50, unit: 'tons' },
  COMMERCIAL: { min: 25, max: 500, unit: 'tons' },
  INDUSTRIAL: { min: 100, max: 5000, unit: 'tons' }
} as const;

/**
 * Universal File Type Support - No Limitations
 */
export const SUPPORTED_FILE_PATTERNS = {
  SPREADSHEETS: ['.xlsx', '.xls', '.csv', '.ods'],
  DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
  DATA_FILES: ['.json', '.xml', '.yaml', '.sql'],
  WEB_FORMATS: ['.html', '.htm', '.xml'],
  EMAIL_FORMATS: ['.msg', '.eml', '.mbox'],
  IMAGE_FORMATS: ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif', '.webp'],
  ARCHIVES: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  CAD_FILES: ['.dwg', '.dxf', '.pdf'],
  DATABASES: ['.db', '.sqlite', '.mdb', '.accdb']
} as const;