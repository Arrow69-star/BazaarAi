

function runNotificationAgent(bookingOutput, logger) {
  logger.logAgentStart('NotificationAgent', {
    booking_id: bookingOutput.booking_id,
    confirmed: bookingOutput.confirmed
  });

  if (!bookingOutput.confirmed) {
    logger.logAgentComplete('NotificationAgent', { sent: [] }, 'No booking to notify about');
    return { notifications_sent: [] };
  }

  const { booking } = bookingOutput;
  const slotTime = new Date(booking.schedule.slot_start);
  const reminderTime = new Date(slotTime.getTime() - 60 * 60000); 

  const notifications = [
    {
      type: 'CONFIRMATION',
      channel: 'SMS',
      recipient: 'User',
      scheduled_at: new Date().toISOString(),
      status: 'SENT',
      message: `✅ BazaarAI: Booking CONFIRMED!\n` +
        `Service: ${booking.service_type}\n` +
        `Provider: ${booking.provider.name}\n` +
        `Time: ${booking.schedule.display}\n` +
        `Total: PKR ${booking.pricing.total}\n` +
        `Booking ID: ${booking.booking_id}`
    },
    {
      type: 'PROVIDER_ASSIGNED',
      channel: 'SMS',
      recipient: 'Provider',
      scheduled_at: new Date().toISOString(),
      status: 'SENT',
      message: `📋 BazaarAI New Job!\n` +
        `Service: ${booking.service_type}\n` +
        `Location: ${booking.location?.sector}\n` +
        `Time: ${booking.schedule.display}\n` +
        `Contact ID: ${booking.booking_id}`
    },
    {
      type: 'REMINDER',
      channel: 'PUSH',
      recipient: 'User',
      scheduled_at: reminderTime.toISOString(),
      status: 'SCHEDULED',
      message: `⏰ Reminder: Your ${booking.service_type} appointment is in 1 hour!\n` +
        `Provider: ${booking.provider.name} | ${booking.provider.phone}\n` +
        `Be home at: ${booking.schedule.display.split('–')[0].trim()}`
    },
    {
      type: 'EN_ROUTE',
      channel: 'PUSH',
      recipient: 'User',
      scheduled_at: new Date(slotTime.getTime() - 15 * 60000).toISOString(),
      status: 'SCHEDULED',
      message: `🚗 ${booking.provider.name} is on the way!\n` +
        `Estimated arrival: 15 minutes\n` +
        `Track: bazaarai.pk/track/${booking.booking_id}`
    }
  ];

  const output = {
    booking_id: booking.booking_id,
    notifications_sent: notifications,
    total_notifications: notifications.length,
    channels_used: ['SMS', 'PUSH'],
    notification_timeline: notifications.map(n => ({
      type: n.type,
      scheduled_at: n.scheduled_at,
      status: n.status
    }))
  };

  logger.logAgentComplete('NotificationAgent', {
    total_sent: notifications.length,
    types: notifications.map(n => n.type)
  }, `${notifications.length} notifications queued/sent`);

  return output;
}

module.exports = { runNotificationAgent };
