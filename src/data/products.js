const productImage = (photoId, adjustments = '') =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=85${adjustments}`;

export const products = [
  {
    id: 1,
    name: 'Elegant Summer Dress',
    category: "Women's Fashion",
    price: 1899,
    image: productImage('photo-1539008835657-9e8e9680c956', '&hue-set=40&sat=12'),
    colorImages: {
      Beige: productImage('photo-1539008835657-9e8e9680c956', '&hue-set=40&sat=12'),
      Black: productImage('photo-1539008835657-9e8e9680c956', '&sat=-100&bri=-16'),
      White: productImage('photo-1539008835657-9e8e9680c956', '&sat=-100&bri=12')
    },
    description: 'A beautifully designed summer dress combining comfort and elegance. Perfect for casual outings, vacations and special occasions.',
    rating: 4.8,
    reviews: 124,
    stock: 25,
    colors: ['Beige', 'Black', 'White'],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 2,
    name: 'Classic Beige Blazer',
    category: "Women's Fashion",
    price: 2499,
    image: productImage('photo-1591047139829-d91aecb6caea', '&hue-set=40&sat=14'),
    colorImages: {
      Beige: productImage('photo-1591047139829-d91aecb6caea', '&hue-set=40&sat=14'),
      Black: productImage('photo-1591047139829-d91aecb6caea', '&sat=-100&bri=-16'),
      Brown: productImage('photo-1591047139829-d91aecb6caea', '&hue-set=25&sat=28&bri=-8')
    },
    description: 'A timeless blazer designed to bring sophistication to your everyday wardrobe. Ideal for office wear and formal occasions.',
    rating: 4.7,
    reviews: 86,
    stock: 18,
    colors: ['Beige', 'Black', 'Brown'],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 3,
    name: 'Premium Casual Shirt',
    category: "Men's Fashion",
    price: 1499,
    image: productImage('photo-1603252109303-2751441dd157', '&sat=-70&bri=18'),
    colorImages: {
      White: productImage('photo-1603252109303-2751441dd157', '&sat=-70&bri=18'),
      Blue: productImage('photo-1603252109303-2751441dd157', '&hue-set=220&sat=30'),
      Black: productImage('photo-1603252109303-2751441dd157', '&sat=-100&bri=-16')
    },
    description: 'A versatile casual shirt made for effortless everyday styling. Comfortable, stylish and easy to pair with different outfits.',
    rating: 4.6,
    reviews: 92,
    stock: 30,
    colors: ['White', 'Blue', 'Black'],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 4,
    name: 'Modern Slim-Fit Suit',
    category: "Men's Fashion",
    price: 1999,
    image: productImage('photo-1617137968427-85924c800a22', '&sat=-100&bri=-15'),
    colorImages: {
      Black: productImage('photo-1617137968427-85924c800a22', '&sat=-100&bri=-15'),
      Grey: productImage('photo-1617137968427-85924c800a22', '&sat=-100&bri=3'),
      Navy: productImage('photo-1617137968427-85924c800a22', '&hue-set=220&sat=28&bri=-18')
    },
    description: 'Modern fashion essentials designed for a confident and refined look. A stylish choice for everyday wear.',
    rating: 4.5,
    reviews: 74,
    stock: 20,
    colors: ['Black', 'Grey', 'Navy'],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 5,
    name: 'Classic Sneakers',
    category: 'Footwear',
    price: 2299,
    image: productImage('photo-1542291026-7eec264c27ff', '&hue-set=0&sat=35'),
    colorImages: {
      Red: productImage('photo-1542291026-7eec264c27ff', '&hue-set=0&sat=35'),
      Grey: productImage('photo-1542291026-7eec264c27ff', '&sat=-100&bri=14'),
      Black: productImage('photo-1542291026-7eec264c27ff', '&sat=-100&bri=-16')
    },
    description: 'Comfortable everyday sneakers with a contemporary design. Made to complement casual outfits and everyday adventures.',
    rating: 4.8,
    reviews: 156,
    stock: 22,
    colors: ['Red', 'Grey', 'Black'],
    sizes: ['6', '7', '8', '9', '10']
  },
  {
    id: 6,
    name: 'Premium Handbag',
    category: 'Bags & Accessories',
    price: 2999,
    image: productImage('photo-1584917865442-de89df76afd3', '&hue-set=28&sat=28'),
    colorImages: {
      Brown: productImage('photo-1584917865442-de89df76afd3', '&hue-set=28&sat=28'),
      Black: productImage('photo-1584917865442-de89df76afd3', '&sat=-100&bri=-16'),
      Cream: productImage('photo-1584917865442-de89df76afd3', '&hue-set=45&sat=10&bri=12')
    },
    description: 'An elegant handbag that combines everyday practicality with a premium look. A beautiful addition to your accessories collection.',
    rating: 4.9,
    reviews: 112,
    stock: 15,
    colors: ['Brown', 'Black', 'Cream'],
    sizes: ['Standard']
  },
  {
    id: 7,
    name: 'Wireless Headphones',
    category: 'Electronics',
    price: 3499,
    image: productImage('photo-1505740420928-5e560c06d30e', '&sat=-100&bri=-15'),
    colorImages: {
      Black: productImage('photo-1505740420928-5e560c06d30e', '&sat=-100&bri=-15'),
      White: productImage('photo-1505740420928-5e560c06d30e', '&sat=-100&bri=14'),
      Blue: productImage('photo-1505740420928-5e560c06d30e', '&hue-set=220&sat=32')
    },
    description: 'Enjoy your favourite music with stylish wireless headphones designed for everyday listening and entertainment.',
    rating: 4.7,
    reviews: 203,
    stock: 35,
    colors: ['Black', 'White', 'Blue'],
    sizes: ['Standard']
  },
  {
    id: 8,
    name: 'Smart Watch',
    category: 'Electronics',
    price: 2599,
    image: productImage('photo-1523275335684-37898b6baf30', '&sat=-100&bri=-14'),
    colorImages: {
      Black: productImage('photo-1523275335684-37898b6baf30', '&sat=-100&bri=-14'),
      Silver: productImage('photo-1523275335684-37898b6baf30', '&sat=-100&bri=14'),
      'Rose Gold': productImage('photo-1523275335684-37898b6baf30', '&hue-set=15&sat=20&bri=8')
    },
    description: 'A modern smartwatch with a sleek design. A practical everyday accessory for staying connected and organised.',
    rating: 4.6,
    reviews: 178,
    stock: 28,
    colors: ['Black', 'Silver', 'Rose Gold'],
    sizes: ['Standard']
  },
  {
    id: 9,
    name: 'Modern Modular Kitchen',
    category: 'Home Appliances',
    price: 1799,
    image: productImage('photo-1556911220-bff31c812dba', '&sat=-50&bri=12'),
    colorImages: {
      White: productImage('photo-1556911220-bff31c812dba', '&sat=-70&bri=18'),
      Grey: productImage('photo-1556911220-bff31c812dba', '&sat=-100&bri=-5')
    },
    description: 'A modern modular kitchen concept with streamlined storage, practical work surfaces and an elegant contemporary finish.',
    rating: 4.5,
    reviews: 67,
    stock: 16,
    colors: ['White', 'Grey'],
    sizes: ['Standard']
  },
  {
    id: 10,
    name: 'Premium Table Lamp',
    category: 'Home Appliances',
    price: 1299,
    image: productImage('photo-1507473885765-e6ed057f782c', '&hue-set=45&sat=34'),
    colorImages: {
      Gold: productImage('photo-1507473885765-e6ed057f782c', '&hue-set=45&sat=34'),
      White: productImage('photo-1507473885765-e6ed057f782c', '&sat=-100&bri=14'),
      Black: productImage('photo-1507473885765-e6ed057f782c', '&sat=-100&bri=-16')
    },
    description: 'Add warmth and character to your living space with this elegant table lamp. Perfect for bedrooms and living rooms.',
    rating: 4.8,
    reviews: 89,
    stock: 19,
    colors: ['Gold', 'White', 'Black'],
    sizes: ['Standard']
  },
  {
    id: 11,
    name: 'Kids Building Blocks',
    category: 'Toys & Kids',
    price: 899,
    image: productImage('photo-1599623560574-39d485900c95'),
    colorImages: {
      Multicolor: productImage('photo-1599623560574-39d485900c95')
    },
    description: 'A fun building block set that encourages creativity, imagination and playful learning for children.',
    rating: 4.7,
    reviews: 95,
    stock: 40,
    colors: ['Multicolor'],
    sizes: ['Standard']
  },
  {
    id: 12,
    name: 'Cute Teddy Bear',
    category: 'Toys & Kids',
    price: 699,
    image: productImage('photo-1559454403-b8fb88521f11', '&hue-set=28&sat=22'),
    colorImages: {
      Brown: productImage('photo-1559454403-b8fb88521f11', '&hue-set=28&sat=22'),
      Cream: productImage('photo-1559454403-b8fb88521f11', '&hue-set=45&sat=8&bri=12')
    },
    description: 'A soft and adorable teddy bear that makes a lovely gift for children and loved ones.',
    rating: 4.9,
    reviews: 143,
    stock: 32,
    colors: ['Brown', 'Cream'],
    sizes: ['Standard']
  }
];

const legacyProductNames = {
  'modern menswear': 4,
  'modern kitchen essentials': 9,
};

export const applyCuratedProductMedia = (item = {}) => {
  const normalizedName = String(item.name || '').trim().toLowerCase();
  const matchedProduct = products.find(
    (product) =>
      String(product.name).trim().toLowerCase() === normalizedName ||
      product.id === legacyProductNames[normalizedName]
  );

  if (!matchedProduct) return item;

  return {
    ...item,
    name: matchedProduct.name,
    image: matchedProduct.image,
    images: [...new Set(Object.values(matchedProduct.colorImages))],
    colorImages: { ...matchedProduct.colorImages },
    colors: [...matchedProduct.colors],
  };
};

export const categories = [
  'All',
  "Women's Fashion",
  "Men's Fashion",
  'Footwear',
  'Bags & Accessories',
  'Electronics',
  'Home Appliances',
  'Toys & Kids'
];
