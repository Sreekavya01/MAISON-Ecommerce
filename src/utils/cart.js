export const getCartItemKey = (productOrId) => {
  if (productOrId && typeof productOrId === 'object') {
    if (productOrId.cartItemKey) return productOrId.cartItemKey;

    return [
      productOrId.id,
      productOrId.selectedColor || '',
      productOrId.selectedSize || '',
    ]
      .map((value) => encodeURIComponent(String(value ?? '')))
      .join('__');
  }

  return encodeURIComponent(String(productOrId ?? ''));
};

export const groupCartItems = (cart) => {
  const groupedItems = new Map();

  cart.forEach((product) => {
    const cartItemKey = getCartItemKey(product);
    const existing = groupedItems.get(cartItemKey);

    if (existing) {
      existing.quantity += 1;
      return;
    }

    groupedItems.set(cartItemKey, {
      ...product,
      cartItemKey,
      quantity: 1,
    });
  });

  return [...groupedItems.values()];
};
