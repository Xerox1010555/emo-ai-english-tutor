import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { supabase } from '@/lib/supabase';
import { parseNaturalDate, formatDateTime } from '@/lib/dateParser';
import { notificationSupport, requestNotificationPermission } from '@/lib/notifications/service';
import type { Appointment } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCountdown } from '@/components/ui/Animations';
import { PageHeader } from '@/components/ui/primitives';
import { Calendar, Plus, Clock, Bell, Trash2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export function AppointmentsScreen() {
  const { user } = useAuth();
  const { settings, updateSettings } = useNotifications();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const [parseConfidence, setParseConfidence] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('appointment_at', { ascending: true });
    if (data) setAppointments(data as Appointment[]);
  }, [user]);

  useEffect(() => {
    void loadAppointments().finally(() => setLoading(false));
  }, [loadAppointments]);

  // Reminders respect the user's notification toggle rather than firing
  // unconditionally, which the previous inline implementation did.
  useEffect(() => {
    if (appointments.length === 0 || !settings.enabled) return;
    if (notificationSupport() !== 'granted') return;

    const now = new Date();
    for (const apt of appointments) {
      const aptTime = new Date(apt.appointment_at);
      const remindAt = new Date(aptTime.getTime() - apt.remind_before_hours * 3600 * 1000);
      if (apt.notified || now < remindAt || now >= aptTime) continue;

      try {
        new Notification('Emo Reminder', {
          body: `${apt.title} — ${formatDateTime(aptTime)}`,
          tag: `emo-apt-${apt.id}`,
        });
      } catch {
        // Some mobile browsers block the constructor; the appointment is
        // still visible in-app, so this is not worth surfacing as an error.
      }
      void supabase.from('appointments').update({ notified: true }).eq('id', apt.id);
    }
  }, [appointments, settings.enabled]);

  function handleDateInput(text: string) {
    setDateInput(text);
    if (text.trim().length > 3) {
      const parsed = parseNaturalDate(text);
      setParsedDate(parsed.date);
      setParseConfidence(parsed.confidence);
    } else {
      setParsedDate(null);
      setParseConfidence(0);
    }
  }

  async function addAppointment() {
    if (!user || !title.trim() || !parsedDate) {
      setError('Please enter a title and a valid date/time.');
      return;
    }
    setError(null);
    const { data, error: insertErr } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        title: title.trim(),
        appointment_at: parsedDate.toISOString(),
        remind_before_hours: 24,
      })
      .select()
      .single();

    if (insertErr) {
      setError('Could not save the appointment. Try again.');
      return;
    }

    if (data) {
      setAppointments((prev) => [...prev, data as Appointment].sort(
        (a, b) => new Date(a.appointment_at).getTime() - new Date(b.appointment_at).getTime()
      ));
    }

    // Ask for notification permission the first time an appointment is added,
    // and keep the app's reminder preference in sync with that outcome.
    const state = notificationSupport();
    if (state === 'default') {
      const result = await requestNotificationPermission();
      if (result === 'granted') updateSettings({ enabled: true });
    }

    setTitle('');
    setDateInput('');
    setParsedDate(null);
    setShowAdd(false);
  }

  async function deleteAppointment(id: string) {
    await supabase.from('appointments').delete().eq('id', id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) {
    return (
      <div className="px-5 py-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 shimmer-bg animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  const upcoming = appointments.filter((a) => new Date(a.appointment_at) > new Date());
  const past = appointments.filter((a) => new Date(a.appointment_at) <= new Date());

  return (
    <div className="px-5 py-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <PageHeader
          title="Schedule"
          subtitle="Appointments and reminders"
          action={
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          }
        />
      </div>

      {/* Upcoming */}
      <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <Card className="text-center py-10">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500 mb-1">No upcoming appointments</p>
            <p className="text-xs text-gray-600 mb-4">Add an exam, meeting, or study session</p>
            <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Appointment
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} onDelete={deleteAppointment} />
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Past</h2>
          <div className="space-y-2">
            {past.map((apt) => (
              <Card key={apt.id} className="py-3 opacity-50">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-400 line-through truncate">{apt.title}</p>
                    <p className="text-xs text-gray-600">{formatDateTime(new Date(apt.appointment_at))}</p>
                  </div>
                  <button
                    onClick={() => deleteAppointment(apt.id)}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Appointment">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">What's the appointment?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., IELTS exam, Meeting with tutor"
              className="w-full px-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary-400" /> When? (natural language)
            </label>
            <input
              type="text"
              value={dateInput}
              onChange={(e) => handleDateInput(e.target.value)}
              placeholder='e.g., "Oct 5 at 3pm", "tomorrow 9am", "next Friday"'
              className="w-full px-4 py-3 bg-black/30 border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40 transition-colors"
            />
            {parsedDate && parseConfidence > 0 && (
              <div className="mt-2 flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-success-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300">{formatDateTime(parsedDate)}</p>
                  {parseConfidence < 0.7 && (
                    <p className="text-xs text-warning-400 mt-0.5">Low confidence — please verify the date.</p>
                  )}
                </div>
              </div>
            )}
            {dateInput.length > 3 && !parsedDate && (
              <div className="mt-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">Couldn't parse the date. Try a format like "Oct 5 at 3pm".</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/[0.02] rounded-lg px-3 py-2.5">
            <Bell className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
            <span>
              {settings.enabled
                ? "You'll get a reminder 24 hours before the appointment."
                : 'Reminders are off. Turn them on in Settings to get notified before appointments.'}
            </span>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <Button fullWidth size="lg" onClick={addAppointment}>
            <Plus className="w-4 h-4" /> Add Appointment
          </Button>
        </div>
      </Modal>
    </div>
  );
}

interface AppointmentCardProps {
  appointment: Appointment;
  onDelete: (id: string) => void;
}

function AppointmentCard({ appointment, onDelete }: AppointmentCardProps) {
  const target = new Date(appointment.appointment_at);
  const countdown = useCountdown(target);
  const isSoon = target.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <Card className="space-y-3" hover>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{appointment.title}</h3>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {formatDateTime(target)}
          </p>
        </div>
        <button
          onClick={() => onDelete(appointment.id)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        isSoon ? 'bg-primary-500/10 border border-primary-500/20' : 'bg-white/[0.02]'
      }`}>
        <span className="text-xs text-gray-500 flex items-center gap-1.5">
          <Bell className={`w-3 h-3 ${isSoon ? 'text-primary-400' : 'text-gray-600'}`} />
          {isSoon ? 'Coming up soon' : 'Reminder set'}
        </span>
        <span className={`text-sm font-bold tabular-nums ${isSoon ? 'text-primary-400' : 'text-gray-300'}`}>
          {countdown}
        </span>
      </div>
    </Card>
  );
}
