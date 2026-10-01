import React from 'react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { formatWaitTime } from '../../utils/formatters';

export default function TokenCard({
  token,
  onCancel = null,
  showFullDetails = true,
  className = ''
}) {
  if (!token) return null;

  const isCalled = token.status === 'called';
  const isInService = token.status === 'in_service';

  return (
    <Card className={`token-display-card ${className}`} style={{
      border: isCalled ? '2px solid var(--info)' : isInService ? '2px solid var(--primary)' : '1px solid var(--border)',
      background: isCalled ? 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)' : 'var(--bg-card)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {token.type === 'appointment' ? 'Appointment Token' : 'Walk-in Token'}
          </span>
          {token.readiness_status && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: token.readiness_status === 'READY' ? 'var(--success-light)' : 'var(--warning-light)',
              color: token.readiness_status === 'READY' ? '#047857' : '#b45309'
            }}>
              ✓ {token.readiness_status} ({token.readiness_percentage || 100}%)
            </span>
          )}
        </div>
        <Badge status={token.status} />
      </div>

      {isCalled && (
        <div style={{
          backgroundColor: 'var(--info)',
          color: 'white',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-md)',
          textAlign: 'center',
          fontWeight: 600,
          animation: 'pulse 2s infinite'
        }}>
          📢 PLEASE PROCEED TO {token.counter_name ? token.counter_name.toUpperCase() : 'YOUR ASSIGNED COUNTER'}
        </div>
      )}

      <div style={{
        textAlign: 'center',
        padding: 'var(--space-md) 0',
        borderBottom: '1px dashed var(--border)',
        marginBottom: 'var(--space-md)'
      }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>YOUR TOKEN NUMBER</div>
        <div style={{
          fontSize: '3rem',
          fontWeight: 800,
          color: isCalled ? 'var(--info)' : isInService ? 'var(--primary)' : 'var(--text-primary)',
          letterSpacing: '1px',
          lineHeight: 1.1,
          margin: '6px 0'
        }}>
          {token.token_number}
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {token.service_name} • {token.department_name}
        </div>
        {token.missing_requirements && (
          <div style={{
            fontSize: '11px',
            color: '#b45309',
            backgroundColor: '#fef3c7',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            marginTop: 6,
            display: 'inline-block'
          }}>
            ⚠️ Missing: {token.missing_requirements}
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-sm)',
        textAlign: 'center',
        marginBottom: 'var(--space-md)'
      }}>
        <div style={{ backgroundColor: 'var(--bg-body)', padding: '10px 6px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Position Ahead</div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {token.status === 'waiting' ? (token.people_ahead ?? 0) : '0'}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-body)', padding: '10px 6px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Est. Wait</div>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--primary)' }}>
            {token.status === 'waiting' ? formatWaitTime(token.estimated_wait_minutes) : 'Now'}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-body)', padding: '10px 6px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Assigned Counter</div>
          <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {token.counter_name || (token.current_serving_counter ? 'Wait' : 'Pending')}
          </div>
        </div>
      </div>

      {token.current_serving_token && (
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-md)'
        }}>
          <span>Current Serving in Branch:</span>
          <strong>Token {token.current_serving_token} ({token.current_serving_counter || 'Counter'})</strong>
        </div>
      )}

      {onCancel && token.status === 'waiting' && (
        <Button variant="danger" size="sm" onClick={onCancel} style={{ width: '100%' }}>
          Leave Queue / Cancel Token
        </Button>
      )}
    </Card>
  );
}
