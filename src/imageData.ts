export type ImageRecord = {
  destination_id: string
  item_name?: string
  image_url: string | null
  alt_text: string
  source_name: string | null
  source_url: string | null
  is_verified: boolean
  author?: string | null
  license?: string | null
  license_url?: string | null
  image_quality_status?: 'high' | 'standard' | 'unavailable' | 'pending-review'
  image_width?: number
  image_height?: number
}

export type FoodImageRecord = {
  id: string
  name: string
  image_url: string | null
  image_source: string | null
  image_source_url: string | null
  image_alt: string
  image_verified: boolean
  author: string | null
  license: string | null
  license_url: string | null
}

const auditedImageDimensions: Record<string, [number, number]> = {
  'hawa-mahal': [1280, 960],
  'amer-fort': [1280, 1162],
  'city-palace-jaipur': [1280, 1142],
  'jantar-mantar': [1280, 806],
  'mehrangarh-fort': [1280, 854],
  'umaid-bhawan': [1280, 953],
  'lake-pichola': [1280, 720],
  'city-palace-udaipur': [1280, 853],
  'jag-mandir': [1280, 1108],
  'jaisalmer-fort': [1280, 533],
  'junagarh-fort': [1280, 853],
  'pushkar-lake': [1280, 853],
  'chittorgarh-fort': [1280, 851],
  'dilwara-temples': [1280, 960],
  'ajmer-sharif-dargah': [1280, 576],
  'ana-sagar-lake': [1280, 851],
  'sam-sand-dunes': [1280, 960],
  'cultural-festivals': [1280, 720],
  mojari: [1280, 853],
  e8: [1280, 720],
  e9: [1280, 2276],
  e12: [1280, 1852],
  e15: [1280, 1151],
  'dal-baati-churma': [1280, 960],
  'pyaaz-kachori': [1280, 720],
  ghewar: [3000, 4000],
  'gatte-ki-sabzi': [1280, 720],
  'ker-sangri': [1880, 2816],
  'traditional-jewellery': [1200, 900],
  'rajasthani-textiles': [1280, 958],
}

const imageItemNames: Record<string, string> = {
  'ajmer-sharif-dargah': 'Ajmer Sharif Dargah',
  'ana-sagar-lake': 'Ana Sagar Lake',
  'hawa-mahal': 'Hawa Mahal',
  'amer-fort': 'Amer Fort',
  'city-palace-jaipur': 'City Palace Jaipur',
  'jantar-mantar': 'Jantar Mantar',
  'mehrangarh-fort': 'Mehrangarh Fort',
  'umaid-bhawan': 'Umaid Bhawan Palace',
  'lake-pichola': 'Lake Pichola',
  'city-palace-udaipur': 'City Palace Udaipur',
  'jag-mandir': 'Jag Mandir',
  'jaisalmer-fort': 'Jaisalmer Fort',
  'sam-sand-dunes': 'Sam Sand Dunes',
  'junagarh-fort': 'Junagarh Fort',
  'pushkar-lake': 'Pushkar Lake',
  'chittorgarh-fort': 'Chittorgarh Fort',
  'dilwara-temples': 'Dilwara Temples',
  h1: 'Royal Fern Haveli (sample hotel)',
  h2: 'The Palace Courtyard (sample hotel)',
  h3: 'Jodhpur Blue Stay (sample hotel)',
  h4: 'Lakeview Aravalli (sample hotel)',
  h5: 'Desert Dune Camp (sample hotel)',
  h6: 'Marwar Boutique Hotel (sample hotel)',
  h7: 'Pink City Guesthouse (sample hotel)',
  h8: 'Pushkar Sacred Inn (sample hotel)',
  h9: 'Camel Country Resort (sample hotel)',
  h10: 'Hill Crown Retreat (sample hotel)',
  e8: 'Blue Pottery',
  e9: 'Bandhani',
  mojari: 'Mojari',
  'traditional-jewellery': 'Traditional Jewellery',
  e12: 'Miniature Paintings',
  e13: 'Rajasthani Handicrafts',
  'rajasthani-textiles': 'Rajasthani Textiles',
  e15: 'Kundan Jewellery',
  'cultural-festivals': 'Rajasthani Cultural Festivals',
}

function imageQualityStatus(id: string, url: string | null): ImageRecord['image_quality_status'] {
  if (!url) return 'unavailable'
  const dimensions = auditedImageDimensions[id]
  if (!dimensions) return 'pending-review'
  return Math.max(...dimensions) >= 1200 ? 'high' : 'standard'
}

const commonsFile = (name: string) => `https://commons.wikimedia.org/wiki/File:${name}`

export const foodImageRecords: Record<string, FoodImageRecord> = {
  'dal-baati-churma': {
    id: 'dal-baati-churma',
    name: 'Dal Baati Churma',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Dal_baati_churma.jpg/1280px-Dal_baati_churma.jpg',
    image_source: 'Wikimedia Commons',
    image_source_url: commonsFile('Dal_baati_churma.jpg'),
    image_alt: 'Dal baati churma, Rajasthan’s signature baked wheat baati, dal and churma dish, photographed in Udaipur.',
    image_verified: true,
    author: 'Reema Jalihal',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'pyaaz-kachori': {
    id: 'pyaaz-kachori',
    name: 'Pyaaz Kachori',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Pyaaz_ki_Kachori.jpg/1280px-Pyaaz_ki_Kachori.jpg',
    image_source: 'Wikimedia Commons',
    image_source_url: commonsFile('Pyaaz_ki_Kachori.jpg'),
    image_alt: 'Rajasthani pyaaz kachori with an onion-and-potato filling and crisp fried pastry.',
    image_verified: true,
    author: 'Harshitdenovo',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  ghewar: {
    id: 'ghewar',
    name: 'Ghewar',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Ghevar_with_Malai_Topping.jpg',
    image_source: 'Wikimedia Commons',
    image_source_url: commonsFile('Ghevar_with_Malai_Topping.jpg'),
    image_alt: 'Round honeycomb-textured Rajasthani ghevar topped with malai and pistachios.',
    image_verified: true,
    author: 'Pradeep717',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'gatte-ki-sabzi': {
    id: 'gatte-ki-sabzi',
    name: 'Gatte Ki Sabzi',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Gatte_ki_sabzi_served_with_aamras_and_garlic_chutney.jpg',
    image_source: 'Wikimedia Commons',
    image_source_url: commonsFile('Gatte_ki_sabzi_served_with_aamras_and_garlic_chutney.jpg'),
    image_alt: 'Gatte ki sabzi served with aamras and garlic chutney.',
    image_verified: true,
    author: 'Kanikatwl',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'ker-sangri': {
    id: 'ker-sangri',
    name: 'Ker Sangri',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/70/KerSangri.JPG',
    image_source: 'Wikimedia Commons',
    image_source_url: commonsFile('KerSangri.JPG'),
    image_alt: 'Ker sangri curry in a serving dish, photographed at a hotel dining event.',
    image_verified: true,
    author: 'Maccess Corporation',
    license: 'CC BY 3.0',
    license_url: 'https://creativecommons.org/licenses/by/3.0/',
  },
  'mawa-kachori': {
    id: 'mawa-kachori',
    name: 'Mawa Kachori',
    image_url: null,
    image_source: null,
    image_source_url: null,
    image_alt: 'No verified photograph of Jodhpur-style mawa kachori is available.',
    image_verified: false,
    author: null,
    license: null,
    license_url: null,
  },
}

export const imageRecords: Record<string, ImageRecord> = {
  'ajmer-sharif-dargah': {
    destination_id: 'ajmer-sharif-dargah',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Ajmer_Sharif%2C_Dargah_of_Mainuddin_Chisti_in_Ajmer%2C_Rajasthan_11.jpg/1280px-Ajmer_Sharif%2C_Dargah_of_Mainuddin_Chisti_in_Ajmer%2C_Rajasthan_11.jpg',
    alt_text: 'Ajmer Sharif Dargah in Ajmer, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Ajmer_Sharif,_Dargah_of_Mainuddin_Chisti_in_Ajmer,_Rajasthan_11.jpg'),
    is_verified: true,
    author: 'Pinakpani',
    license: 'CC BY 4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    image_quality_status: 'high',
  },
  'ana-sagar-lake': {
    destination_id: 'ana-sagar-lake',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/20191216_Ana_Sagar_Lake_Ajmer_1123_8852_DxO.jpg/1280px-20191216_Ana_Sagar_Lake_Ajmer_1123_8852_DxO.jpg',
    alt_text: 'Ana Sagar Lake in Ajmer, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('20191216_Ana_Sagar_Lake_Ajmer_1123_8852_DxO.jpg'),
    is_verified: true,
    author: 'Jakub Hałun',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    image_quality_status: 'high',
  },
  'hawa-mahal': {
    destination_id: 'hawa-mahal',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg/1280px-East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg',
    alt_text: 'East facade of Hawa Mahal in Jaipur, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('East_facade_Hawa_Mahal_Jaipur_from_ground_level_(July_2022)_-_img_01.jpg'),
    is_verified: true,
  },
  'amer-fort': {
    destination_id: 'amer-fort',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/20191219_Fort_Amber%2C_Amer%2C_Jaipur_0955_9481.jpg/1280px-20191219_Fort_Amber%2C_Amer%2C_Jaipur_0955_9481.jpg',
    alt_text: 'Amer (Amber) Fort in Amer near Jaipur, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('20191219_Fort_Amber,_Amer,_Jaipur_0955_9481.jpg'),
    is_verified: true,
  },
  'city-palace-jaipur': {
    destination_id: 'city-palace-jaipur',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Chandra_Mahal%2C_City_Palace%2C_Jaipur%2C_20191218_0951_9043.jpg/1280px-Chandra_Mahal%2C_City_Palace%2C_Jaipur%2C_20191218_0951_9043.jpg',
    alt_text: 'Chandra Mahal within City Palace in Jaipur, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Chandra_Mahal,_City_Palace,_Jaipur,_20191218_0951_9043.jpg'),
    is_verified: true,
  },
  'jantar-mantar': {
    destination_id: 'jantar-mantar',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Jantar_Mantar_at_Jaipur.jpg/1280px-Jantar_Mantar_at_Jaipur.jpg',
    alt_text: 'Historic astronomical instruments at Jantar Mantar in Jaipur.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Jantar_Mantar_at_Jaipur.jpg'),
    is_verified: true,
  },
  'mehrangarh-fort': {
    destination_id: 'mehrangarh-fort',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Mehrangarh_Fort_sanhita.jpg',
    alt_text: 'Mehrangarh Fort overlooking Jodhpur, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Mehrangarh_Fort_sanhita.jpg'),
    is_verified: true,
  },
  'umaid-bhawan': {
    destination_id: 'umaid-bhawan',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Umaid_Bhawan%2C_Jodhpur.jpg/1280px-Umaid_Bhawan%2C_Jodhpur.jpg',
    alt_text: 'Umaid Bhawan Palace in Jodhpur, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Umaid_Bhawan,_Jodhpur.jpg'),
    is_verified: true,
  },
  'lake-pichola': {
    destination_id: 'lake-pichola',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d2/Pichola_lake_sunset.JPG/1280px-Pichola_lake_sunset.JPG',
    alt_text: 'Lake Pichola at sunset in Udaipur, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Pichola_lake_sunset.JPG'),
    is_verified: true,
  },
  'city-palace-udaipur': {
    destination_id: 'city-palace-udaipur',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/City_Palace_Udaipur_Rajasthan_India.JPG/1280px-City_Palace_Udaipur_Rajasthan_India.JPG',
    alt_text: 'City Palace complex beside Lake Pichola in Udaipur.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('City_Palace_Udaipur_Rajasthan_India.JPG'),
    is_verified: true,
  },
  'jag-mandir': {
    destination_id: 'jag-mandir',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Jag_Mandir_Palace.jpg/1280px-Jag_Mandir_Palace.jpg',
    alt_text: 'Jag Mandir island palace on Lake Pichola in Udaipur.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Jag_Mandir_Palace.jpg'),
    is_verified: true,
  },
  'jaisalmer-fort': {
    destination_id: 'jaisalmer-fort',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Jaisalmer_forteresse.jpg/1280px-Jaisalmer_forteresse.jpg',
    alt_text: 'Golden sandstone Jaisalmer Fort in Jaisalmer, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Jaisalmer_forteresse.jpg'),
    is_verified: true,
  },
  'sam-sand-dunes': {
    destination_id: 'sam-sand-dunes',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Sam_dunes_%28Jaisalmer%29.jpg/1280px-Sam_dunes_%28Jaisalmer%29.jpg',
    alt_text: 'Sam Sand Dunes in Jaisalmer, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Sam_dunes_(Jaisalmer).jpg'),
    is_verified: true,
    author: 'Roshanrajverma',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    image_quality_status: 'high',
  },
  'junagarh-fort': {
    destination_id: 'junagarh-fort',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/India_Bikaner_Junagarh_Fort.jpg/1280px-India_Bikaner_Junagarh_Fort.jpg',
    alt_text: 'Junagarh Fort in Bikaner, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('India_Bikaner_Junagarh_Fort.jpg'),
    is_verified: true,
  },
  'pushkar-lake': {
    destination_id: 'pushkar-lake',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Evening_lights_by_the_Pushkar_Lake%2C_Pushkar.jpg/1280px-Evening_lights_by_the_Pushkar_Lake%2C_Pushkar.jpg',
    alt_text: 'Pushkar Lake and its ghats at evening in Pushkar, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Evening_lights_by_the_Pushkar_Lake,_Pushkar.jpg'),
    is_verified: true,
  },
  'chittorgarh-fort': {
    destination_id: 'chittorgarh-fort',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Chittorgarh_fort.JPG/1280px-Chittorgarh_fort.JPG',
    alt_text: 'Chittorgarh Fort, the historic Mewar hill fort in Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Chittorgarh_fort.JPG'),
    is_verified: true,
  },
  'dilwara-temples': {
    destination_id: 'dilwara-temples',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Dilwara_temple_at_mount_abu.jpg/1280px-Dilwara_temple_at_mount_abu.jpg',
    alt_text: 'Dilwara Jain temple in Mount Abu, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Dilwara_temple_at_mount_abu.jpg'),
    is_verified: true,
    author: 'Ranjith Kumar Inbasekaran',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    image_quality_status: 'high',
  },
  h1: { destination_id: 'h1', image_url: null, alt_text: 'Sample hotel Royal Fern Haveli in Jaipur; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  h2: { destination_id: 'h2', image_url: null, alt_text: 'Sample hotel The Palace Courtyard in Jaipur; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  h3: { destination_id: 'h3', image_url: null, alt_text: 'Sample hotel Jodhpur Blue Stay in Jodhpur; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  h4: { destination_id: 'h4', image_url: null, alt_text: 'Sample hotel Lakeview Aravalli in Udaipur; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  h5: { destination_id: 'h5', image_url: null, alt_text: 'Sample hotel Desert Dune Camp in Jaisalmer; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  h6: { destination_id: 'h6', image_url: null, alt_text: 'Sample hotel Marwar Boutique Hotel in Jodhpur; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  h7: { destination_id: 'h7', image_url: null, alt_text: 'Sample hotel Pink City Guesthouse in Jaipur; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  h8: { destination_id: 'h8', image_url: null, alt_text: 'Sample hotel Pushkar Sacred Inn in Pushkar; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  h9: { destination_id: 'h9', image_url: null, alt_text: 'Sample hotel Camel Country Resort in Bikaner; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  h10: { destination_id: 'h10', image_url: null, alt_text: 'Sample hotel Hill Crown Retreat in Mount Abu; no verified property photograph available.', source_name: null, source_url: null, is_verified: false },
  e8: { destination_id: 'e8', image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Blue_Pottery%2C_Jaipur_School_of_Art.jpg/1280px-Blue_Pottery%2C_Jaipur_School_of_Art.jpg', alt_text: 'Blue pottery from Jaipur displayed at Albert Hall Museum.', source_name: 'Wikimedia Commons', source_url: commonsFile('Blue_Pottery,_Jaipur_School_of_Art.jpg'), is_verified: true, author: 'Neek-Theri', license: 'CC BY-SA 4.0', license_url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  e9: { destination_id: 'e9', image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Bandhani_tie_and_dye_work_on_cloth%2Cjaipur_rajasthan_India.jpg/1280px-Bandhani_tie_and_dye_work_on_cloth%2Cjaipur_rajasthan_India.jpg', alt_text: 'Bandhani tie-dye work on cloth from Jaipur, Rajasthan.', source_name: 'Wikimedia Commons', source_url: commonsFile('Bandhani_tie_and_dye_work_on_cloth,jaipur_rajasthan_India.jpg'), is_verified: true, author: 'Swapnil.Karambelkar', license: 'CC BY-SA 4.0', license_url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  mojari: {
    destination_id: 'mojari',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Indian_mojaris%2C_Rajasthan%2C_worn_by_temple_dancer%2C_c._1840_AD%2C_gold_embroidery%2C_jade_beads%2C_brass_bells_-_Bata_Shoe_Museum_-_DSC00033.JPG/1280px-Indian_mojaris%2C_Rajasthan%2C_worn_by_temple_dancer%2C_c._1840_AD%2C_gold_embroidery%2C_jade_beads%2C_brass_bells_-_Bata_Shoe_Museum_-_DSC00033.JPG',
    alt_text: 'Historic embroidered Rajasthani mojaris displayed at the Bata Shoe Museum.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Indian_mojaris,_Rajasthan,_worn_by_temple_dancer,_c._1840_AD,_gold_embroidery,_jade_beads,_brass_bells_-_Bata_Shoe_Museum_-_DSC00033.JPG'),
    is_verified: true,
    author: 'Daderot',
    license: 'CC0',
    license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  'traditional-jewellery': {
    destination_id: 'traditional-jewellery',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Earrings_made_of_Thewa_Technique%2C_Rajasthan._Thewa_is_the_technique_of_Metal_framing_that_became_popular_in_Rajasthan_under_the_Mughal_Rule%2C_circa_16th_century_CE.jpg',
    alt_text: 'Gold and turquoise Thewa earrings, a traditional Rajasthani jewellery craft.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Earrings made of Thewa Technique, Rajasthan. Thewa is the technique of Metal framing that became popular in Rajasthan under the Mughal Rule, circa 16th century CE.jpg'),
    is_verified: true,
    author: 'SpeakingArch',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  e12: { destination_id: 'e12', image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Rajasthani_Miniature_painting.jpg/1280px-Rajasthani_Miniature_painting.jpg', alt_text: 'A traditional Rajasthani miniature painting.', source_name: 'Wikimedia Commons', source_url: commonsFile('Rajasthani_Miniature_painting.jpg'), is_verified: true, author: 'Onef9day', license: 'CC BY 3.0', license_url: 'https://creativecommons.org/licenses/by/3.0/' },
  e13: { destination_id: 'e13', image_url: null, alt_text: 'No verified Rajasthan-specific handicraft photograph is available.', source_name: null, source_url: null, is_verified: false, image_quality_status: 'unavailable' },
  'rajasthani-textiles': {
    destination_id: 'rajasthani-textiles',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Woman_doing_Block_Printing_at_Bagru_village%2C_Jaipur%2C_India.jpg',
    alt_text: 'A woman applying traditional hand block printing to fabric in Bagru village, Jaipur, Rajasthan.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Woman_doing_Block_Printing_at_Bagru_village,_Jaipur,_India.jpg'),
    is_verified: true,
    author: 'Anildiggiwal',
    license: 'CC0',
    license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  e15: { destination_id: 'e15', image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/British_Museum_The_Islamic_world_Necklace_Kundan_India_21022019_7703.jpg/1280px-British_Museum_The_Islamic_world_Necklace_Kundan_India_21022019_7703.jpg', alt_text: 'Kundan necklace from India displayed in the British Museum.', source_name: 'Wikimedia Commons', source_url: commonsFile('British_Museum_The_Islamic_world_Necklace_Kundan_India_21022019_7703.jpg'), is_verified: true, author: 'Vassil', license: 'CC0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  'cultural-festivals': {
    destination_id: 'cultural-festivals',
    image_url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/Kalbeliya.jpg/1280px-Kalbeliya.jpg',
    alt_text: 'Kalbeliya folk dancers performing a traditional Rajasthani dance.',
    source_name: 'Wikimedia Commons',
    source_url: commonsFile('Kalbeliya.jpg'),
    is_verified: true,
    author: 'Gauravvaishnav111',
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  ...Object.fromEntries(Array.from({ length: 10 }, (_, index) => {
    const id = `b${index + 1}`
    return [id, {
      destination_id: id,
      image_url: null,
      alt_text: `Simulated Travel Buddy profile ${index + 1}; no real profile photograph.`,
      source_name: null,
      source_url: null,
      is_verified: false,
    }]
  })),
}

export function getImageRecord(id: string): ImageRecord {
  const record = imageRecords[id]
  if (record) return {
    ...record,
    item_name: record.item_name ?? imageItemNames[id] ?? id.replace(/-/g, ' '),
    image_quality_status: record.image_quality_status ?? imageQualityStatus(id, record.image_url),
    image_width: record.image_width ?? auditedImageDimensions[id]?.[0],
    image_height: record.image_height ?? auditedImageDimensions[id]?.[1],
  }
  const foodRecord = foodImageRecords[id]
  if (foodRecord) return getFoodImageRecord(id)
  return {
    destination_id: id,
    item_name: imageItemNames[id] ?? id.replace(/-/g, ' '),
    image_url: null,
    alt_text: `No verified photograph is available for ${id}.`,
    source_name: null,
    source_url: null,
    is_verified: false,
    image_quality_status: 'unavailable',
  }
}

export function getFoodImageRecord(id: string): ImageRecord {
  const food = foodImageRecords[id]
  if (!food) {
    return {
      destination_id: id,
      item_name: id.replace(/-/g, ' '),
      image_url: null,
      alt_text: `No verified food photograph is available for ${id}.`,
      source_name: null,
      source_url: null,
      is_verified: false,
      image_quality_status: 'unavailable',
    }
  }
  return {
    destination_id: food.id,
    item_name: food.name,
    image_url: food.image_url,
    alt_text: food.image_alt,
    source_name: food.image_source,
    source_url: food.image_source_url,
    is_verified: food.image_verified,
    author: food.author,
    license: food.license,
    license_url: food.license_url,
    image_quality_status: imageQualityStatus(id, food.image_url),
    image_width: auditedImageDimensions[id]?.[0],
    image_height: auditedImageDimensions[id]?.[1],
  }
}
