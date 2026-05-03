/**
 * Loading State
 *
 * Generic session loading screen — now delegates to ParticipantLoadingShell
 * so every participant-side transition state looks identical.
 */

import React from 'react';
import ParticipantLoadingShell from './ParticipantLoadingShell';

const LoadingState = () => (
  <ParticipantLoadingShell phase="connecting" />
);

export default LoadingState;
