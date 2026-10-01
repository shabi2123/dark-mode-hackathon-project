import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ReadinessCheckModal({
  isOpen,
  onClose,
  service,
  onConfirm,
  actionType = 'queue' // 'queue' or 'appointment'
}) {
  const requirements = service?.requirements || [
    'Original Valid CNIC / Government ID',
    'Required Account Information'
  ];

  const [checkedItems, setCheckedItems] = useState({});

  // Reset checked state when modal opens or service changes
  useEffect(() => {
    if (isOpen) {
      const initial = {};
      requirements.forEach((_, idx) => {
        initial[idx] = true; // default to checked for quick flow, but let customer toggle
      });
      setCheckedItems(initial);
    }
  }, [isOpen, service]);

  if (!isOpen || !service) return null;

  const total = requirements.length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const percentage = total > 0 ? Math.round((checkedCount / total) * 100) : 100;

  let status = 'READY';
  let statusColor = 'var(--success)';
  let statusBg = 'var(--success-light)';
  let statusText = '100% Ready for Service';

  if (percentage < 50) {
    status = 'NOT READY';
    statusColor = 'var(--danger)';
    statusBg = 'var(--danger-light)';
    statusText = 'Missing critical requirements';
  } else if (percentage < 100) {
    status = 'ACTION REQUIRED';
    statusColor = 'var(--warning)';
    statusBg = 'var(--warning-light)';
    statusText = 'Some requirements are missing';
  }

  const missingItems = requirements.filter((_, idx) => !checkedItems[idx]);

  const toggleCheck = (idx) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleConfirm = () => {
    onConfirm({
      readiness_percentage: percentage,
      readiness_status: status,
      missing_requirements: missingItems.length > 0 ? missingItems.join('; ') : null
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Service Readiness Check"
      maxWidth="560px"
    >
      <div>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
            {service.department_name}
          </div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 4px' }}>
            {service.name}
          </h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
            Before joining the queue, verify that you have the mandatory documents ready to prevent wasted waiting time.
          </p>
        </div>

        {/* Readiness Meter Gauge */}
        <div style={{
          backgroundColor: 'var(--bg-body)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-lg)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>
              DOCUMENT READINESS
            </span>
            <span style={{
              backgroundColor: statusBg,
              color: statusColor,
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)'
            }}>
              {status} ({percentage}%)
            </span>
          </div>

          <div style={{ width: '100%', height: 10, backgroundColor: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                backgroundColor: statusColor,
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.3s ease, background-color 0.3s ease'
              }}
            />
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>{checkedCount} of {total} items confirmed</span>
            <span>{statusText}</span>
          </div>
        </div>

        {/* Interactive Checklist */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
            Required Items Checklist:
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {requirements.map((req, idx) => {
              const isChecked = !!checkedItems[idx];
              return (
                <label
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: isChecked ? '1px solid #bbf7d0' : '1px solid var(--border)',
                    backgroundColor: isChecked ? '#f0fdf4' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // handled by parent label click
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: isChecked ? 600 : 400,
                    color: isChecked ? '#166534' : 'var(--text-primary)'
                  }}>
                    {req}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Warning if incomplete */}
        {percentage < 100 && (
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-lg)',
            fontSize: 'var(--font-size-xs)',
            color: '#92400e'
          }}>
            ⚠️ <strong>Missing items:</strong> If you proceed without all required documents, the bank officer may not be able to complete your service. You can still join the queue and arrange alternative proof before your token is called.
          </div>
        )}

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          {percentage === 100 ? (
            <Button variant="success" onClick={handleConfirm}>
              ✓ Everything Ready — {actionType === 'queue' ? 'Join Queue' : 'Confirm Slot'}
            </Button>
          ) : (
            <Button variant="warning" onClick={handleConfirm}>
              Continue Anyway ({percentage}% Ready)
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
