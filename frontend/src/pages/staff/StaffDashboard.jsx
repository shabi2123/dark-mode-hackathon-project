import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import StatusIndicator from '../../components/common/StatusIndicator';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';
import { formatTime } from '../../utils/formatters';

export default function StaffDashboard() {
  const { counter, refreshCounter } = useOutletContext();
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef(null);

  const fetchQueue = async () => {
    try {
      const res = await api.get('/staff/queue');
      setQueueData(res.data);
    } catch (err) {
      console.error('Error fetching staff queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // 5s staff polling
    return () => clearInterval(interval);
  }, []);

  // Voice synthesis & audio announcement
  const playAnnouncement = (text) => {
    setAnnouncement(text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Timer for active service
  const currentToken = queueData?.current_token;
  useEffect(() => {
    if (currentToken && currentToken.status === 'in_service' && currentToken.service_started_at) {
      const startTime = new Date(currentToken.service_started_at).getTime();
      const updateTimer = () => {
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
      return () => clearInterval(timerRef.current);
    } else {
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [currentToken]);

  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/staff/call-next');
      playAnnouncement(res.data.call_announcement);
      await fetchQueue();
      await refreshCounter();
    } catch (err) {
      alert(err.message || 'Failed to call next token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecall = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/staff/recall');
      playAnnouncement(res.data.call_announcement);
    } catch (err) {
      alert(err.message || 'Failed to recall token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!window.confirm('Mark this customer as no-show / skip?')) return;
    setActionLoading(true);
    try {
      await api.post('/staff/skip');
      setAnnouncement('');
      await fetchQueue();
      await refreshCounter();
    } catch (err) {
      alert(err.message || 'Failed to skip token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartService = async () => {
    setActionLoading(true);
    try {
      await api.post('/staff/start-service');
      await fetchQueue();
      await refreshCounter();
    } catch (err) {
      alert(err.message || 'Failed to start service');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async () => {
    setActionLoading(true);
    try {
      await api.post('/staff/complete-service');
      setAnnouncement('');
      await fetchQueue();
      await refreshCounter();
    } catch (err) {
      alert(err.message || 'Failed to complete service');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Connecting to counter operational dispatch..." />;

  const waitingQueue = queueData?.waiting_queue || [];
  const otherCounters = queueData?.counters || [];

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Speech / Announcement Banner */}
      {announcement && (
        <div className="call-banner">
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.85 }}>
              Active Counter Audio Announcement
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 2 }}>
              "{announcement}"
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => playAnnouncement(announcement)}>
            🔊 Replay
          </Button>
        </div>
      )}

      {/* Main Grid: Active Serving Hero Card & Waiting Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 480px) 1fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
        
        {/* Left Column: Currently Serving Hero Console */}
        <div>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
            🎯 Counter Service Console
          </h2>

          <Card style={{
            border: currentToken ? '2px solid var(--primary)' : '1px solid var(--border)',
            background: currentToken ? 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)' : 'var(--bg-card)',
            boxShadow: 'var(--shadow-md)'
          }}>
            {currentToken ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    Currently At Counter
                  </span>
                  <Badge status={currentToken.status} />
                </div>

                <div style={{ textAlign: 'center', padding: 'var(--space-md) 0', borderBottom: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>CALLING TOKEN</div>
                  <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 1, lineHeight: 1.1 }}>
                    {currentToken.token_number}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                    {currentToken.service_name}
                  </div>
                </div>

                {/* Customer Details */}
                <div style={{ padding: 'var(--space-md) 0', fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Customer Name:</span>
                    <strong>{currentToken.customer_name}</strong>
                  </div>
                  {currentToken.customer_phone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Contact:</span>
                      <span>{currentToken.customer_phone}</span>
                    </div>
                  )}
                  {currentToken.appointment_number && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Linked Appointment:</span>
                      <strong style={{ color: 'var(--info)' }}>{currentToken.appointment_number}</strong>
                    </div>
                  )}

                  {/* Customer Service Readiness */}
                  <div style={{
                    backgroundColor: currentToken.readiness_status === 'READY' ? 'var(--success-light)' : 'var(--warning-light)',
                    border: currentToken.readiness_status === 'READY' ? '1px solid #bbf7d0' : '1px solid #fef3c7',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    marginTop: 4
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: currentToken.readiness_status === 'READY' ? '#166534' : '#92400e' }}>
                        Document Readiness: {currentToken.readiness_status || 'READY'} ({currentToken.readiness_percentage || 100}%)
                      </span>
                    </div>
                    {currentToken.missing_requirements && (
                      <div style={{ fontSize: '11px', color: '#b45309', marginTop: 2 }}>
                        ⚠️ Missing: <strong>{currentToken.missing_requirements}</strong>
                      </div>
                    )}
                  </div>

                  {currentToken.status === 'in_service' && (
                    <div style={{
                      backgroundColor: 'var(--primary-light)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 8
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: 'var(--font-size-xs)' }}>
                        Service Elapsed Time:
                      </span>
                      <strong style={{ fontSize: 'var(--font-size-lg)', color: 'var(--primary-dark)', fontFamily: 'monospace' }}>
                        ⏱ {formatTimer(elapsedSeconds)}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Counter Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginTop: 'var(--space-md)' }}>
                  {currentToken.status === 'called' && (
                    <>
                      <Button
                        variant="success"
                        size="lg"
                        loading={actionLoading}
                        onClick={handleStartService}
                        style={{ width: '100%' }}
                      >
                        ▶️ Start Service (Customer Arrived)
                      </Button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)' }}>
                        <Button variant="secondary" size="sm" loading={actionLoading} onClick={handleRecall}>
                          📢 Recall Token
                        </Button>
                        <Button variant="danger" size="sm" loading={actionLoading} onClick={handleSkip}>
                          🚫 Skip (No-Show)
                        </Button>
                      </div>
                    </>
                  )}

                  {currentToken.status === 'in_service' && (
                    <Button
                      variant="primary"
                      size="lg"
                      loading={actionLoading}
                      onClick={handleCompleteService}
                      style={{ width: '100%' }}
                    >
                      ✅ Complete Service & Free Counter
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-xs)' }}>🪑</div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Counter is Ready</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                  {waitingQueue.length > 0
                    ? `${waitingQueue.length} customer(s) waiting in queue.`
                    : 'No customers currently waiting in this department queue.'}
                </p>

                <Button
                  variant="primary"
                  size="lg"
                  loading={actionLoading}
                  disabled={waitingQueue.length === 0 || counter?.status === 'break' || counter?.status === 'closed'}
                  onClick={handleCallNext}
                  style={{ width: '100%', padding: '16px' }}
                >
                  📢 CALL NEXT CUSTOMER
                </Button>

                {counter?.status === 'break' && (
                  <div style={{ color: 'var(--warning)', fontSize: 'var(--font-size-xs)', marginTop: 8 }}>
                    Counter is currently on break. Change status to Available in the top bar to call customers.
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Department Counters Overview */}
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
              Branch Counters Status
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)' }}>
              {otherCounters.map(c => (
                <div
                  key={c.id}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 'var(--font-size-xs)' }}>{c.name}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {c.staff_name || 'Unassigned'}
                    </div>
                  </div>
                  <Badge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Waiting Queue Table */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
            <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>
              📋 Waiting Customers ({waitingQueue.length})
            </h2>
            <Button variant="outline" size="sm" onClick={fetchQueue}>
              🔄 Refresh Queue
            </Button>
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {waitingQueue.length === 0 ? (
              <EmptyState
                icon="🎉"
                title="Queue is empty!"
                description="There are currently no waiting customers in this department."
              />
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Token</th>
                      <th>Type</th>
                      <th>Customer</th>
                      <th>Service</th>
                      <th>Readiness</th>
                      <th>Est. Wait</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitingQueue.map((item, idx) => (
                      <tr key={item.id} style={{ backgroundColor: item.type === 'appointment' ? '#fdf8f6' : 'transparent' }}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong style={{ fontSize: 'var(--font-size-base)', color: 'var(--primary)' }}>
                            {item.token_number}
                          </strong>
                        </td>
                        <td>
                          {item.type === 'appointment' ? (
                            <span style={{
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-full)'
                            }}>
                              ⭐ APPT ({item.appointment_time ? formatTime(item.appointment_time) : 'Priority'})
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: 'var(--border-light)',
                              color: 'var(--text-secondary)',
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-full)'
                            }}>
                              Walk-in
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.customer_name}</div>
                          {item.customer_phone && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.customer_phone}</div>
                          )}
                        </td>
                        <td>{item.service_name}</td>
                        <td>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: item.readiness_status === 'READY' ? 'var(--success-light)' : 'var(--warning-light)',
                            color: item.readiness_status === 'READY' ? '#047857' : '#b45309'
                          }}>
                            {item.readiness_status === 'READY' ? '✓ Ready' : '⚠️ Action Req'}
                          </span>
                        </td>
                        <td>~{item.estimated_wait_minutes} min</td>
                        <td>
                          <StatusIndicator status={item.status} pulse={idx === 0} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
