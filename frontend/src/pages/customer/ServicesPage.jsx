import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../api/client';

export default function ServicesPage() {
  const [departments, setDepartments] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, servRes] = await Promise.all([
          api.get('/departments'),
          api.get('/services')
        ]);
        setDepartments(deptRes.data);
        setServices(servRes.data);
      } catch (err) {
        console.error('Error fetching services', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredServices = services.filter(s => {
    const matchesDept = selectedDept === 'all' || s.department_id === parseInt(selectedDept);
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                          s.description.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  if (loading) return <LoadingSpinner text="Loading bank services..." />;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Branch Banking Services</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Browse all services offered at our branch. Schedule an appointment ahead of time or request an instant walk-in token.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          <Button
            variant={selectedDept === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedDept('all')}
          >
            All Departments
          </Button>
          {departments.map(d => (
            <Button
              key={d.id}
              variant={selectedDept === String(d.id) ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedDept(String(d.id))}
            >
              {d.name}
            </Button>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: 300 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Service Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 'var(--space-lg)'
      }}>
        {filteredServices.map(s => (
          <Card key={s.id} hover style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {s.department_name}
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', backgroundColor: 'var(--bg-body)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  ⏱ ~{s.avg_duration_minutes} min
                </span>
              </div>

              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                {s.name}
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-md)' }}>
                {s.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-md)' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/customer/join-queue?service_id=${s.id}`)}
              >
                🎟️ Join Queue
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/customer/book?service_id=${s.id}`)}
              >
                📅 Book Slot
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
