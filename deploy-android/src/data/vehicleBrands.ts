export const BRAND_MODELS: Record<string, string[]> = {
  Renault: ['Clio', 'Megane', 'Captur', 'Kadjar', 'Scenic', 'Twingo', 'Arkana', 'Austral', 'Zoe'],
  Peugeot: ['208', '308', '2008', '3008', '5008', '508', 'Partner', 'e-208'],
  'Citroën': ['C3', 'C4', 'C5 Aircross', 'Berlingo', 'C3 Aircross', 'C5 X', 'Ami'],
  Dacia: ['Sandero', 'Duster', 'Jogger', 'Spring', 'Logan'],
  Toyota: ['Yaris', 'Corolla', 'C-HR', 'RAV4', 'Aygo', 'Yaris Cross', 'Camry'],
  Volkswagen: ['Golf', 'Polo', 'Tiguan', 'T-Roc', 'Passat', 'T-Cross', 'ID.3', 'ID.4'],
  Ford: ['Fiesta', 'Focus', 'Puma', 'Kuga', 'Mustang', 'Transit'],
  Audi: ['A1', 'A3', 'A4', 'A5', 'Q3', 'Q5', 'Q7', 'e-tron'],
  BMW: ['Série 1', 'Série 3', 'Série 5', 'X1', 'X3', 'X5', 'i4'],
  Mercedes: ['Classe A', 'Classe C', 'Classe E', 'GLA', 'GLC', 'EQA'],
  Opel: ['Corsa', 'Astra', 'Mokka', 'Crossland', 'Grandland'],
  Fiat: ['500', 'Panda', 'Tipo', '500X'],
  Hyundai: ['i10', 'i20', 'i30', 'Tucson', 'Kona', 'Ioniq', 'Bayon'],
  Kia: ['Picanto', 'Rio', 'Ceed', 'Sportage', 'Niro', 'EV6'],
  Nissan: ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Leaf'],
  Seat: ['Ibiza', 'Leon', 'Arona', 'Ateca'],
  Skoda: ['Fabia', 'Octavia', 'Kamiq', 'Karoq', 'Kodiaq'],
  Volvo: ['XC40', 'XC60', 'XC90', 'V60', 'S60'],
};

export const BRAND_LIST = [...Object.keys(BRAND_MODELS), 'Autre'];
