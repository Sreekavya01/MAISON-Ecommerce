import { useState, useEffect, useRef } from 'react';

import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  IndianRupee,
  Boxes,
  AlertTriangle,
  CheckCircle,
  Image as ImageIcon,
  Star,
  Maximize,
} from 'lucide-react';

import {
  applyCuratedProductMedia,
  products,
  categories,
} from '../data/products';

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase';

import toast from 'react-hot-toast';

import './ProductManagement.css';

function ProductManagement() {
  const loadStarted = useRef(false);

  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const emptyForm = {
    name: '',
    category: "Women's Fashion",
    price: '',
    stock: '',
    image: '',
    imageUrls: '',
    colorImagesText: '',
    imageFit: 'cover',
    imageSize: 'medium',
    description: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  // LOAD PRODUCTS FROM FIREBASE

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);

        const productsRef = collection(db, 'products');

        const snapshot = await getDocs(productsRef);

        if (snapshot.empty && products.length > 0) {
          const migratedProducts = [];

          for (const product of products) {
            const productData = Object.fromEntries(
              Object.entries(product).filter(([key]) => key !== 'id')
            );

            const newProduct = {
              ...productData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            const addedProduct = await addDoc(
              productsRef,
              newProduct
            );

            migratedProducts.push({
              id: addedProduct.id,
              ...productData,
            });
          }

          setProductList(migratedProducts);

          toast.success('Existing products saved to Firebase!');

          return;
        }

        const loadedProducts = snapshot.docs.map((productDoc) =>
          applyCuratedProductMedia({
            id: productDoc.id,
            ...productDoc.data(),
          })
        );

        setProductList(loadedProducts);

      } catch (error) {
        console.error('Error loading products:', error);

        toast.error(
          'Unable to load products. Please check Firebase permissions.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (loadStarted.current) return;

    loadStarted.current = true;
    loadProducts();
  }, []);

  const formatPrice = (amount) =>
    `₹${Number(amount).toLocaleString('en-IN')}`;

  const getImageOptions = () => {
    return formData.imageUrls
      .split(/[\n,]+/)
      .map((url) => url.trim())
      .filter(Boolean);
  };

  const imageOptions = getImageOptions();

  const filteredProducts = productList.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'All' ||
      product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalProducts = productList.length;

  const totalStock = productList.reduce(
    (total, product) => total + Number(product.stock || 0),
    0
  );

  const lowStockProducts = productList.filter(
    (product) =>
      Number(product.stock) < 10 &&
      Number(product.stock) > 0
  ).length;

  const outOfStockProducts = productList.filter(
    (product) => Number(product.stock) === 0
  ).length;

  // OPEN ADD FORM

  const openAddForm = () => {
    setEditingProduct(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  // OPEN EDIT FORM

  const openEditForm = (product) => {
    const existingImages =
      product.images?.length > 0
        ? product.images
        : [product.image];

    setEditingProduct(product);

    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      image: product.image,
      imageUrls: existingImages.join('\n'),

      colorImagesText: Object.entries(product.colorImages || {})
        .filter(([color]) => color !== 'Standard')
        .map(([color, url]) => `${color} | ${url}`)
        .join('\n'),

      imageFit: product.imageFit || 'cover',
      imageSize: product.imageSize || 'medium',
      description: product.description,
    });

    setShowForm(true);
  };

  // CLOSE FORM

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData(emptyForm);
  };

  // HANDLE INPUT CHANGES

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // HANDLE MULTIPLE IMAGE URLS

  const handleImageUrlsChange = (event) => {
    const value = event.target.value;

    const urls = value
      .split(/[\n,]+/)
      .map((url) => url.trim())
      .filter(Boolean);

    setFormData((previous) => ({
      ...previous,
      imageUrls: value,
      image: urls.includes(previous.image)
        ? previous.image
        : urls[0] || '',
    }));
  };

  // READ COLOUR-WISE IMAGE URLS

  // Enter one colour per line using:
  // Colour | Image URL

  const getColorImageOptions = () => {
    const entries = formData.colorImagesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const colorImages = {};

    for (const entry of entries) {
      const separatorIndex = entry.indexOf('|');

      if (separatorIndex === -1) continue;

      const color = entry.slice(0, separatorIndex).trim();
      const url = entry.slice(separatorIndex + 1).trim();

      if (color && url) {
        colorImages[color] = url;
      }
    }

    return colorImages;
  };

  // ADD OR UPDATE PRODUCT IN FIREBASE

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.price ||
      formData.stock === '' ||
      !formData.description.trim()
    ) {
      toast.error('Please complete all product details.');
      return;
    }

    if (
      Number(formData.price) <= 0 ||
      Number(formData.stock) < 0
    ) {
      toast.error('Enter a valid price and stock quantity.');
      return;
    }

    const images = getImageOptions();

    if (images.length === 0) {
      toast.error('Please add at least one product image URL.');
      return;
    }

    if (!formData.image || !images.includes(formData.image)) {
      toast.error('Please select a valid priority image.');
      return;
    }

    const enteredColorImages = getColorImageOptions();
    const colorImageEntries = Object.entries(enteredColorImages);

    const colors = colorImageEntries.length > 0
      ? colorImageEntries.map(([color]) => color)
      : editingProduct?.colors?.length
        ? editingProduct.colors
        : ['Standard'];

    const colorImages = colorImageEntries.length > 0
      ? enteredColorImages
      : editingProduct?.colorImages &&
        Object.keys(editingProduct.colorImages).length > 0
        ? editingProduct.colorImages
        : { Standard: formData.image };

    const updatedProductData = {
      name: formData.name.trim(),
      category: formData.category,
      price: Number(formData.price),
      stock: Number(formData.stock),
      image: formData.image,
      images,
      colors,
      colorImages,
      imageFit: formData.imageFit,
      imageSize: formData.imageSize,
      description: formData.description.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingProduct) {
        await updateDoc(
          doc(db, 'products', editingProduct.id),
          updatedProductData
        );

        setProductList((previous) =>
          previous.map((product) =>
            product.id === editingProduct.id
              ? {
                  ...product,
                  ...updatedProductData,
                }
              : product
          )
        );

        toast.success('Product updated successfully!');

      } else {
        const newProductData = {
          ...updatedProductData,
          rating: 0,
          reviews: 0,
          sizes: ['Standard'],
          createdAt: serverTimestamp(),
        };

        const addedProduct = await addDoc(
          collection(db, 'products'),
          newProductData
        );

        const newProduct = {
          id: addedProduct.id,
          ...newProductData,
        };

        setProductList((previous) => [
          newProduct,
          ...previous,
        ]);

        toast.success('New product added successfully!');
      }

      closeForm();

    } catch (error) {
      console.error('Error saving products:', error);

      toast.error(
        'Unable to save product. Please check Firebase permissions.'
      );
    }
  };

  // DELETE PRODUCT

  const handleDelete = async (productId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this product?'
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(db, 'products', productId)
      );

      setProductList((previous) =>
        previous.filter((product) => product.id !== productId)
      );

      toast.success('Product deleted successfully!');

    } catch (error) {
      console.error('Error deleting product:', error);

      toast.error(
        'Unable to delete product. Please check Firebase permissions.'
      );
    }
  };

  return (
    <div className="product-management-page">

      {/* HEADER */}

      <div className="product-management-header">

        <div>
          <span className="product-management-breadcrumb">
            MAISON / ADMIN / PRODUCTS
          </span>

          <h1>Product Management</h1>

          <p>
            Manage your store inventory, product details and pricing.
          </p>
        </div>

        <button
          type="button"
          className="product-add-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add New Product
        </button>

      </div>

      {/* STATISTICS */}

      <section className="product-management-stats">

        <div className="product-management-stat">
          <div className="product-management-stat-icon navy">
            <Package size={21} />
          </div>

          <div>
            <span>Total Products</span>
            <h2>{totalProducts}</h2>
          </div>
        </div>

        <div className="product-management-stat">
          <div className="product-management-stat-icon gold">
            <Boxes size={21} />
          </div>

          <div>
            <span>Total Stock Units</span>
            <h2>{totalStock.toLocaleString('en-IN')}</h2>
          </div>
        </div>

        <div className="product-management-stat">
          <div className="product-management-stat-icon orange">
            <AlertTriangle size={21} />
          </div>

          <div>
            <span>Low Stock Products</span>
            <h2>{lowStockProducts}</h2>
          </div>
        </div>

        <div className="product-management-stat">
          <div className="product-management-stat-icon green">
            <CheckCircle size={21} />
          </div>

          <div>
            <span>Out of Stock</span>
            <h2>{outOfStockProducts}</h2>
          </div>
        </div>

      </section>

      {/* PRODUCT TABLE */}

      <section className="product-management-panel">

        <div className="product-management-panel-heading">

          <div>
            <span>STORE INVENTORY</span>
            <h2>All Products</h2>
          </div>

          <span className="product-count">
            {filteredProducts.length} Products
          </span>

        </div>

        {/* SEARCH AND FILTER */}

        <div className="product-management-toolbar">

          <div className="product-management-search">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            className="product-category-filter"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

        </div>

        {/* TABLE */}

        <div className="product-management-table-wrapper">

          <table className="product-management-table">

            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>CATEGORY</th>
                <th>PRICE</th>
                <th>STOCK</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td colSpan="6" className="product-empty-state">
                    Loading products from Firebase...
                  </td>
                </tr>

              ) : (

                <>

                  {filteredProducts.map((product) => (

                    <tr key={product.id}>

                      <td>
                        <div className="managed-product-info">

                          <img
                            src={product.image}
                            alt={product.name}
                            className={`managed-product-image ${product.imageSize || 'medium'}`}
                            style={{
                              objectFit: product.imageFit || 'cover',
                            }}
                          />

                          <div>
                            <strong>{product.name}</strong>
                            <span>Product #{product.id}</span>

                            {product.images?.length > 1 && (
                              <small className="managed-image-count">
                                {product.images.length} images
                              </small>
                            )}

                          </div>

                        </div>
                      </td>

                      <td>
                        <span className="managed-product-category">
                          {product.category}
                        </span>
                      </td>

                      <td className="managed-product-price">
                        {formatPrice(product.price)}
                      </td>

                      <td>
                        <strong>{product.stock} Units</strong>
                      </td>

                      <td>

                        {Number(product.stock) === 0 ? (
                          <span className="product-stock-badge out">
                            Out of Stock
                          </span>
                        ) : Number(product.stock) < 10 ? (
                          <span className="product-stock-badge low">
                            Low Stock
                          </span>
                        ) : (
                          <span className="product-stock-badge available">
                            In Stock
                          </span>
                        )}

                      </td>

                      <td>
                        <div className="managed-product-actions">

                          <button
                            className="product-edit-action"
                            onClick={() => openEditForm(product)}
                            title="Edit Product"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="product-delete-action"
                            onClick={() => handleDelete(product.id)}
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
                          </button>

                        </div>
                      </td>

                    </tr>

                  ))}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="6" className="product-empty-state">
                        No products found.
                      </td>
                    </tr>
                  )}

                </>

              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* ADD / EDIT PRODUCT MODAL */}

      {showForm && (

        <div
          className="product-form-overlay"
          onClick={closeForm}
        >

          <div
            className="product-form-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="product-form-heading">

              <div>
                <span>PRODUCT DETAILS</span>

                <h2>
                  {editingProduct
                    ? 'Edit Product'
                    : 'Add New Product'}
                </h2>
              </div>

              <button
                className="product-form-close"
                onClick={closeForm}
                aria-label="Close form"
              >
                <X size={21} />
              </button>

            </div>

            <form
              className="product-management-form"
              onSubmit={handleSubmit}
            >

              <div className="product-form-field">
                <label>Product Name</label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="product-form-field">
                <label>Category</label>

                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  {categories
                    .filter((category) => category !== 'All')
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                </select>
              </div>

              <div className="product-form-row">

                <div className="product-form-field">
                  <label>Price (₹)</label>

                  <input
                    type="number"
                    name="price"
                    min="1"
                    placeholder="Enter price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="product-form-field">
                  <label>Stock Quantity</label>

                  <input
                    type="number"
                    name="stock"
                    min="0"
                    placeholder="Enter stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                  />
                </div>

              </div>

              {/* MULTIPLE PRODUCT IMAGES */}

              <div className="product-image-management">

                <div className="product-image-section-title">
                  <ImageIcon size={18} />

                  <div>
                    <h3>Product Images</h3>
                    <p>Add and manage your product photographs.</p>
                  </div>
                </div>

                <div className="product-form-field">
                  <label>Product Image URLs</label>

                  <textarea
                    name="imageUrls"
                    rows="3"
                    placeholder={'Enter image URLs, one per line.\nhttps://example.com/image1.jpg\nhttps://example.com/image2.jpg'}
                    value={formData.imageUrls}
                    onChange={handleImageUrlsChange}
                  />

                  <small className="product-field-help">
                    Add multiple image URLs, one URL per line.
                  </small>
                </div>

                <div className="product-form-field">
                  <label>
                    <Star size={14} className="priority-star" />
                    Priority Product Image
                  </label>

                  <select
                    name="image"
                    value={formData.image}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">
                      Select primary image
                    </option>

                    {imageOptions.map((url, index) => (
                      <option key={`${url}-${index}`} value={url}>
                        Image {index + 1}
                      </option>
                    ))}
                  </select>

                  <small className="product-field-help">
                    This image will be displayed as the main product image.
                  </small>
                </div>

                {/* COLOUR-WISE PRODUCT IMAGES */}

                <div className="product-form-field product-color-images-field">
                  <label>Colour-wise Product Images</label>

                  <textarea
                    name="colorImagesText"
                    rows="4"
                    placeholder={'Enter one colour and its image URL per line, separated by |\nBeige | https://example.com/beige.jpg\nBlack | https://example.com/black.jpg\nWhite | https://example.com/white.jpg'}
                    value={formData.colorImagesText}
                    onChange={handleInputChange}
                  />

                  <small className="product-field-help">
                    Add a separate real product photo for each colour.
                    Use the format: Colour | Image URL. These images will
                    be connected to the colour options shown on the
                    product page.
                  </small>
                </div>

                {/* IMAGE DISPLAY SETTINGS */}

                <div className="product-image-settings">

                  <div className="product-image-section-title">
                    <Maximize size={18} />

                    <div>
                      <h3>Image Display Settings</h3>
                      <p>Customize the product image appearance.</p>
                    </div>
                  </div>

                  <div className="product-form-row">

                    <div className="product-form-field">
                      <label>Image Fit</label>

                      <select
                        name="imageFit"
                        value={formData.imageFit}
                        onChange={handleInputChange}
                      >
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                      </select>
                    </div>

                    <div className="product-form-field">
                      <label>Display Size</label>

                      <select
                        name="imageSize"
                        value={formData.imageSize}
                        onChange={handleInputChange}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                  </div>

                </div>

                {/* LIVE IMAGE PREVIEW */}

                <div className="product-image-preview-section">

                  <span className="product-preview-label">
                    LIVE IMAGE PREVIEW
                  </span>

                  {formData.image ? (

                    <div className="product-image-preview">
                      <img
                        src={formData.image}
                        alt="Selected product preview"
                        style={{
                          objectFit: formData.imageFit,
                        }}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                        onLoad={(event) => {
                          event.currentTarget.style.display = 'block';
                        }}
                      />

                      <span className="product-preview-primary">
                        <Star size={13} fill="currentColor" />
                        PRIMARY IMAGE
                      </span>
                    </div>

                  ) : (

                    <div className="product-image-preview-empty">
                      <ImageIcon size={30} />
                      <p>Your selected image will appear here.</p>
                    </div>

                  )}

                </div>

              </div>

              <div className="product-form-field">
                <label>Product Description</label>

                <textarea
                  name="description"
                  rows="4"
                  placeholder="Write a product description..."
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="product-form-actions">

                <button
                  type="button"
                  className="product-cancel-button"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="product-save-button"
                >
                  {editingProduct
                    ? 'Save Changes'
                    : 'Add Product'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* FIREBASE NOTE */}

      <div className="product-management-note">
        <IndianRupee size={17} />

        <p>
          Product information is now saved in Firebase Firestore.
          Changes remain available after refreshing the page.
        </p>
      </div>

    </div>
  );
}

export default ProductManagement;
