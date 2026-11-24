
import './ContactMessages.css';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

import {
  Search,
  Mail,
  MailOpen,
  Trash2,
  Eye,
  X,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { db } from '../firebase';

function ContactMessages() {
  const location = useLocation();
  const relatedDocumentId = location.state?.relatedDocumentId;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filter, setFilter] = useState('All');
  const [deletingId, setDeletingId] = useState(null);

  // FETCH MESSAGES FROM FIRESTORE

  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'contactMessages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messageList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setMessages(messageList);
        setLoading(false);
      },
      (error) => {
        console.error('Contact messages error:', error);
        toast.error('Unable to load contact messages.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // FORMAT DATE

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) return 'Unknown date';

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // MARK MESSAGE AS READ OR UNREAD

  const toggleReadStatus = async (message) => {
    const newStatus =
      message.status === 'Read' ? 'Unread' : 'Read';

    try {
      await updateDoc(
        doc(db, 'contactMessages', message.id),
        { status: newStatus }
      );

      toast.success(`Message marked as ${newStatus}.`);

      if (selectedMessage?.id === message.id) {
        setSelectedMessage({
          ...message,
          status: newStatus,
        });
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Unable to update message status.');
    }
  };

  // DELETE MESSAGE

  const handleDelete = async (messageId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this message?'
    );

    if (!confirmed) return;

    setDeletingId(messageId);

    try {
      await deleteDoc(
        doc(db, 'contactMessages', messageId)
      );

      setSelectedMessage((current) =>
        current?.id === messageId ? null : current
      );

      toast.success('Message deleted successfully.');
    } catch (error) {
      console.error('Delete message error:', error);
      toast.error('Unable to delete this message.');
    } finally {
      setDeletingId(null);
    }
  };

  // OPEN MESSAGE DETAILS

  const openMessage = useCallback(async (message) => {
    setSelectedMessage(message);

    if (message.status !== 'Read') {
      try {
        await updateDoc(
          doc(db, 'contactMessages', message.id),
          { status: 'Read' }
        );

        setSelectedMessage({
          ...message,
          status: 'Read',
        });
      } catch (error) {
        console.error('Read status error:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!relatedDocumentId || loading) return;

    const relatedMessage = messages.find(
      (message) => message.id === relatedDocumentId
    );

    if (relatedMessage) {
      const frame = window.requestAnimationFrame(() => {
        setSearchTerm('');
        setFilter('All');
        openMessage(relatedMessage);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    return undefined;
  }, [
    loading,
    messages,
    openMessage,
    relatedDocumentId,
  ]);

  // SEARCH AND FILTER

  const filteredMessages = messages.filter((message) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      message.name?.toLowerCase().includes(search) ||
      message.email?.toLowerCase().includes(search) ||
      message.subject?.toLowerCase().includes(search) ||
      message.message?.toLowerCase().includes(search);

    const matchesFilter =
      filter === 'All' ||
      message.status === filter;

    return matchesSearch && matchesFilter;
  });

  // MESSAGE COUNTS

  const totalMessages = messages.length;

  const unreadMessages = messages.filter(
    (message) => message.status !== 'Read'
  ).length;

  const readMessages = messages.filter(
    (message) => message.status === 'Read'
  ).length;

  return (
    <div className="contact-messages-page">

      {/* PAGE HEADER */}

      <div className="contact-messages-header">
        <div>
          <span className="contact-messages-eyebrow">
            CUSTOMER COMMUNICATION
          </span>

          <h1>Contact Messages</h1>

          <p>
            View and manage messages received from your customers.
          </p>
        </div>

        <div className="contact-header-icon">
          <MessageSquare size={27} />
        </div>
      </div>

      {/* STATISTICS */}

      <div className="contact-message-stats">

        <div className="contact-stat-card">
          <div className="contact-stat-icon total">
            <Mail size={21} />
          </div>

          <div>
            <span>Total Messages</span>
            <h2>{totalMessages}</h2>
          </div>
        </div>

        <div className="contact-stat-card">
          <div className="contact-stat-icon unread">
            <MailOpen size={21} />
          </div>

          <div>
            <span>Unread Messages</span>
            <h2>{unreadMessages}</h2>
          </div>
        </div>

        <div className="contact-stat-card">
          <div className="contact-stat-icon read">
            <Eye size={21} />
          </div>

          <div>
            <span>Read Messages</span>
            <h2>{readMessages}</h2>
          </div>
        </div>

      </div>

      {/* MESSAGES SECTION */}

      <div className="contact-messages-container">

        <div className="contact-messages-toolbar">

          <div className="contact-search-box">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search by name, email or subject..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />
          </div>

          <div className="contact-filter-buttons">
            {['All', 'Unread', 'Read'].map((item) => (
              <button
                key={item}
                className={filter === item ? 'active' : ''}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

        </div>

        {/* MESSAGE LIST */}

        {loading ? (

          <div className="contact-messages-loading">
            <RefreshCw size={25} className="loading-icon" />
            <p>Loading customer messages...</p>
          </div>

        ) : filteredMessages.length === 0 ? (

          <div className="contact-messages-empty">
            <div className="empty-message-icon">
              <MessageSquare size={35} />
            </div>

            <h3>No messages found</h3>

            <p>
              {searchTerm
                ? 'Try changing your search.'
                : 'Customer messages will appear here when submitted.'}
            </p>
          </div>

        ) : (

          <div className="contact-message-list">

            {filteredMessages.map((message) => (

              <div
                className={`contact-message-card ${
                  message.status !== 'Read' ? 'unread-message' : ''
                }`}
                key={message.id}
              >

                <div className="contact-message-main">

                  <div className="contact-message-avatar">
                    {message.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  <div className="contact-message-content">

                    <div className="contact-message-topline">

                      <h3>{message.name || 'Unknown Customer'}</h3>

                      <span
                        className={`contact-status ${
                          message.status === 'Read'
                            ? 'read-status'
                            : 'unread-status'
                        }`}
                      >
                        {message.status || 'Unread'}
                      </span>

                    </div>

                    <p className="contact-message-email">
                      {message.email}
                    </p>

                    <h4>{message.subject}</h4>

                    <p className="contact-message-preview">
                      {message.message}
                    </p>

                    <span className="contact-message-date">
                      {formatDate(message.createdAt)}
                    </span>

                  </div>

                </div>

                {/* ACTION BUTTONS */}

                <div className="contact-message-actions">

                  <button
                    title="View message"
                    onClick={() => openMessage(message)}
                  >
                    <Eye size={17} />
                  </button>

                  <button
                    title={
                      message.status === 'Read'
                        ? 'Mark as unread'
                        : 'Mark as read'
                    }
                    onClick={() => toggleReadStatus(message)}
                  >
                    {message.status === 'Read'
                      ? <Mail size={17} />
                      : <MailOpen size={17} />}
                  </button>

                  <button
                    title="Delete message"
                    className="delete-action"
                    disabled={deletingId === message.id}
                    onClick={() => handleDelete(message.id)}
                  >
                    <Trash2 size={17} />
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* MESSAGE DETAILS MODAL */}

      {selectedMessage && (

        <div
          className="contact-modal-overlay"
          onClick={() => setSelectedMessage(null)}
        >

          <div
            className="contact-message-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="contact-modal-header">

              <div>
                <span>CUSTOMER MESSAGE</span>
                <h2>Message Details</h2>
              </div>

              <button
                onClick={() => setSelectedMessage(null)}
                aria-label="Close message"
              >
                <X size={22} />
              </button>

            </div>

            <div className="contact-modal-body">

              <div className="contact-detail-row">
                <span>Customer Name</span>
                <strong>{selectedMessage.name}</strong>
              </div>

              <div className="contact-detail-row">
                <span>Email Address</span>

                <a href={`mailto:${selectedMessage.email}`}>
                  {selectedMessage.email}
                </a>
              </div>

              <div className="contact-detail-row">
                <span>Subject</span>
                <strong>{selectedMessage.subject}</strong>
              </div>

              <div className="contact-detail-row">
                <span>Received On</span>
                <strong>
                  {formatDate(selectedMessage.createdAt)}
                </strong>
              </div>

              <div className="contact-detail-row">
                <span>Status</span>

                <strong>
                  {selectedMessage.status || 'Unread'}
                </strong>
              </div>

              <div className="contact-full-message">
                <span>MESSAGE</span>

                <p>{selectedMessage.message}</p>
              </div>

            </div>

            <div className="contact-modal-footer">

              {/* REPLY DIRECTLY THROUGH GMAIL */}

              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                  selectedMessage.email || ''
                )}&su=${encodeURIComponent(
                  `Re: ${selectedMessage.subject || 'Your enquiry'}`
                )}&body=${encodeURIComponent(
                  `Hi ${selectedMessage.name || 'there'},\n\nThank you for contacting MAISON.\n\n`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-reply-button"
              >
                <Mail size={17} />
                Reply via Gmail
              </a>

              <button
                className="contact-close-button"
                onClick={() => setSelectedMessage(null)}
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default ContactMessages;
