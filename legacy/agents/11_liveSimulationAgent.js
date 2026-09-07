

function runLiveSimulationAgent(bookingOutput, logger) {
  logger.logAgentStart('LiveSimulationAgent', { booking_id: bookingOutput.booking_id });

  if (!bookingOutput.confirmed) {
    return { simulated: false, stages: [] };
  }

  const { booking } = bookingOutput;
  const slotStart = new Date(booking.schedule.slot_start);

  const stages = [
    {
      stage: 'PROVIDER_ASSIGNED',
      timestamp: new Date(slotStart.getTime() - 30 * 60000).toISOString(),
      status: '✅ Confirmed',
      message: `${booking.provider.name} has accepted your booking`,
      provider_location: { lat: booking.provider?.lat || 33.685, lng: booking.provider?.lng || 73.049, status: 'AT_BASE' }
    },
    {
      stage: 'EN_ROUTE',
      timestamp: new Date(slotStart.getTime() - 15 * 60000).toISOString(),
      status: '🚗 Travelling',
      message: `${booking.provider.name} is on the way — ETA 15 min`,
      provider_location: { lat: 33.683, lng: 73.051, status: 'MOVING' }
    },
    {
      stage: 'ARRIVED',
      timestamp: slotStart.toISOString(),
      status: '📍 Arrived',
      message: `${booking.provider.name} has arrived at ${booking.location?.sector}`,
      provider_location: { lat: booking.location?.lat || 33.684, lng: booking.location?.lng || 73.048, status: 'AT_LOCATION' }
    },
    {
      stage: 'JOB_STARTED',
      timestamp: new Date(slotStart.getTime() + 5 * 60000).toISOString(),
      status: '🔧 In Progress',
      message: `Service started — ${booking.service_type} underway`,
      provider_location: { lat: booking.location?.lat || 33.684, lng: booking.location?.lng || 73.048, status: 'AT_LOCATION' }
    },
    {
      stage: 'JOB_COMPLETED',
      timestamp: new Date(slotStart.getTime() + (booking.schedule.duration_min || 90) * 60000).toISOString(),
      status: '✅ Completed',
      message: `${booking.service_type} service completed successfully by ${booking.provider.name}`,
      provider_location: { lat: booking.location?.lat || 33.684, lng: booking.location?.lng || 73.048, status: 'LEAVING' }
    }
  ];

  const output = {
    booking_id: bookingOutput.booking_id,
    simulated: true,
    current_stage: 'PROVIDER_ASSIGNED',
    stages,
    total_stages: stages.length,
    completion_time: stages[stages.length - 1].timestamp
  };

  logger.logAgentComplete('LiveSimulationAgent', {
    stages: stages.map(s => s.stage),
    completion: stages[stages.length - 1].timestamp
  }, `Simulated ${stages.length} service lifecycle stages`);

  return output;
}

module.exports = { runLiveSimulationAgent };
