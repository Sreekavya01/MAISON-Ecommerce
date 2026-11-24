import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Home,
  BriefcaseBusiness,
  Check,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';

import { onAuthStateChanged } from 'firebase/auth';

import { auth, db } from '../firebase';

import SEO from '../components/SEO';

import './MyAddresses.css';

function MyAddresses() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const emptyForm = {
    name: '',
    phone: '',
    type: 'Home',
    address: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  };

  const [formData, setFormData] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Load addresses after Firebase authentication is restored
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAddresses([]);
        setUserId(null);
        setLoading(false);
        navigate('/login');
        return;
      }

      setUserId(user.uid);

      try {
        const addressRef = collection(
          db,
          'users',
          user.uid,
          'addresses'
        );

        const snapshot = await getDocs(addressRef);

        const savedAddresses = snapshot.docs.map(document => ({
          id: document.id,
          ...document.data(),
        }));

        setAddresses(savedAddresses);
      } catch (error) {
        console.error('Address loading error:', error);
        toast.error('Unable to load your saved addresses.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const openAddForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (address) => {
    setFormData({
      name: address.name,
      phone: address.phone,
      type: address.type,
      address: address.address,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    });

    setEditingId(address.id);
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData(previous => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Save or update an address
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId) {
      toast.error('Please log in first.');
      return;
    }

    if (
      !formData.name.trim() ||
      !formData.phone.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim()
    ) {
      toast.error('Please fill in all the required fields.');
      return;
    }

    if (!/^\d{10}$/.test(formData.phone.trim())) {
      toast.error('Enter a valid 10-digit phone number.');
      return;
    }

    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      toast.error('Enter a valid 6-digit PIN code.');
      return;
    }

    try {
      const addressRef = collection(
        db,
        'users',
        userId,
        'addresses'
      );

      const shouldBeDefault =
        formData.isDefault || addresses.length === 0;

      const updatedAddress = {
        ...formData,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        isDefault: shouldBeDefault,
      };

      const batch = writeBatch(db);

      // If this address is becoming the default,
      // remove the default status from other addresses.
      if (shouldBeDefault) {
        addresses.forEach(address => {
          if (address.isDefault && address.id !== editingId) {
            batch.update(
              doc(db, 'users', userId, 'addresses', address.id),
              { isDefault: false }
            );
          }
        });
      }

      let savedId = editingId;

      if (editingId) {
        batch.update(
          doc(db, 'users', userId, 'addresses', editingId),
          updatedAddress
        );
      } else {
        const newAddressRef = doc(addressRef);
        savedId = newAddressRef.id;

        batch.set(newAddressRef, updatedAddress);
      }

      await batch.commit();

      const refreshedAddresses = await getDocs(addressRef);

      setAddresses(
        refreshedAddresses.docs.map(document => ({
          id: document.id,
          ...document.data(),
        }))
      );

      toast.success(
        editingId
          ? 'Address updated successfully!'
          : 'Address added successfully!'
      );

      setShowForm(false);
      setFormData(emptyForm);
      setEditingId(null);

    } catch (error) {
      console.error('Address saving error:', error);
      toast.error('Unable to save address. Please try again.');
    }
  };

  // Delete an address
  const handleDelete = async (id) => {
    if (!userId) return;

    try {
      await deleteDoc(
        doc(db, 'users', userId, 'addresses', id)
      );

      const remainingAddresses = addresses.filter(
        address => address.id !== id
      );

      // If the deleted address was the default,
      // make the first remaining address the default.
      if (
        remainingAddresses.length > 0 &&
        !remainingAddresses.some(address => address.isDefault)
      ) {
        const firstAddress = remainingAddresses[0];

        await updateDoc(
          doc(db, 'users', userId, 'addresses', firstAddress.id),
          { isDefault: true }
        );

        firstAddress.isDefault = true;
      }

      setAddresses(remainingAddresses);

      toast.success('Address deleted successfully!');

    } catch (error) {
      console.error('Address deletion error:', error);
      toast.error('Unable to delete address.');
    }
  };

  // Set default address
  const setDefaultAddress = async (id) => {
    if (!userId) return;

    try {
      const batch = writeBatch(db);

      addresses.forEach(address => {
        batch.update(
          doc(db, 'users', userId, 'addresses', address.id),
          { isDefault: address.id === id }
        );
      });

      await batch.commit();

      setAddresses(previous =>
        previous.map(address => ({
          ...address,
          isDefault: address.id === id,
        }))
      );

      toast.success('Default address updated!');

    } catch (error) {
      console.error('Default address error:', error);
      toast.error('Unable to update default address.');
    }
  };

  if (loading) {
    return (
      <main className="my-addresses-page">
        <p style={{ textAlign: 'center', padding: '100px 20px' }}>
          Loading your saved addresses...
        </p>
      </main>
    );
  }

  return (
    <main className="my-addresses-page">

      <SEO
        title="My Saved Addresses | MAISON"
        description="Manage your saved delivery addresses with MAISON."
        robots="noindex, nofollow"
      />

      <section className="addresses-hero">
        <div>
          <span>YOUR MAISON ACCOUNT</span>
          <h1>My <i>Addresses</i></h1>
          <p>
            Manage your delivery addresses for a smoother shopping experience.
          </p>
        </div>

        <MapPin size={55} strokeWidth={1.2} />
      </section>

      <section className="addresses-content">

        <div className="addresses-heading">
          <div>
            <h2>Saved Addresses</h2>
            <p>{addresses.length} saved address(es)</p>
          </div>

          <button className="add-address-button" onClick={openAddForm}>
            <Plus size={18} />
            ADD NEW ADDRESS
          </button>
        </div>

        {showForm && (
          <form className="address-form" onSubmit={handleSubmit}>

            <div className="address-form-heading">
              <h3>{editingId ? 'Edit Address' : 'Add New Address'}</h3>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </div>

            <div className="address-form-grid">

              <div className="address-field">
                <label>Full Name *</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </div>

              <div className="address-field">
                <label>Phone Number *</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit phone number"
                  maxLength="10"
                />
              </div>

              <div className="address-field address-full-width">
                <label>Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="House number, street and area"
                  rows="3"
                />
              </div>

              <div className="address-field">
                <label>City *</label>
                <input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>

              <div className="address-field">
                <label>State *</label>
                <input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                />
              </div>

              <div className="address-field">
                <label>PIN Code *</label>
                <input
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="6-digit PIN code"
                  maxLength="6"
                />
              </div>

              <div className="address-field">
                <label>Address Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="Home">Home</option>
                  <option value="Office">Office</option>
                  <option value="Other">Other</option>
                </select>
              </div>

            </div>

            <label className="default-address-option">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
              />
              Set as my default delivery address
            </label>

            <div className="address-form-actions">
              <button
                type="button"
                onClick={() => setShowForm(false)}
              >
                CANCEL
              </button>

              <button type="submit">
                <Check size={17} />
                {editingId ? 'UPDATE ADDRESS' : 'SAVE ADDRESS'}
              </button>
            </div>

          </form>
        )}

        {addresses.length === 0 ? (
          <div className="empty-addresses">
            <MapPin size={45} />
            <h3>No Saved Addresses</h3>
            <p>
              Add a delivery address to make your checkout easier.
            </p>
            <button onClick={openAddForm}>
              ADD YOUR FIRST ADDRESS
            </button>
          </div>
        ) : (
          <div className="addresses-grid">

            {addresses.map(address => (
              <article className="address-card" key={address.id}>

                <div className="address-card-top">
                  <div className="address-type">
                    {address.type === 'Office' ? (
                      <BriefcaseBusiness size={20} />
                    ) : (
                      <Home size={20} />
                    )}

                    <span>{address.type}</span>
                  </div>

                  {address.isDefault && (
                    <span className="default-address-badge">
                      <Check size={13} />
                      DEFAULT
                    </span>
                  )}
                </div>

                <h3>{address.name}</h3>

                <p>{address.address}</p>

                <p>
                  {address.city}, {address.state} - {address.pincode}
                </p>

                <p className="address-phone">
                  Phone: {address.phone}
                </p>

                <div className="address-card-actions">

                  <button onClick={() => openEditForm(address)}>
                    <Pencil size={15} />
                    EDIT
                  </button>

                  <button onClick={() => handleDelete(address.id)}>
                    <Trash2 size={15} />
                    DELETE
                  </button>

                  {!address.isDefault && (
                    <button onClick={() => setDefaultAddress(address.id)}>
                      SET DEFAULT
                    </button>
                  )}

                </div>

              </article>
            ))}

          </div>
        )}

      </section>

    </main>
  );
}

export default MyAddresses;