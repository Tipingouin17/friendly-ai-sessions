/**
 * Empty Participant List
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';

const EmptyParticipantList: React.FC = () => {
  return (
    <div className="text-center py-8 px-4">
      <p className="text-gray-500 mb-2">No participants have joined yet.</p>
      <p className="text-sm text-gray-400">
        Share the session link or QR code to invite participants.
      </p>
    </div>
  );
};

export default EmptyParticipantList;
